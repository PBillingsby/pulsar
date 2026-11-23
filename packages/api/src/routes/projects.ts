import { prisma } from '@/db/client'
import { generateProjectKey, generateSecretKey } from '@/lib/auth/index'
import { sendDeleteProjectEmail } from '@/lib/email/delete-project'
import { sendWelcomeEmail } from '@/lib/email/welcome'
import {
  confirmDeleteProjectSchema,
  registerProjectSchema,
  requestDeleteProjectSchema,
  validateBetaCodeSchema,
  type ConfirmDeleteProjectInput,
  type RegisterProjectInput,
  type RequestDeleteProjectInput,
  type ValidateBetaCodeInput,
} from '@/lib/validate/schemas'
import type { ApiResponse, ProjectResponse } from '@/types/index'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import crypto from 'node:crypto'

export const projectsRouter = new Hono()

function normaliseDomain(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
    .trim()
}

function isValidDomain(domain: string): boolean {
  return /^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/.test(domain)
}

function toProjectResponse(project: {
  projectKey: string
  name: string
  email: string
  domain: string | null
  beta: boolean
  language: string
  digestDay: number
  digestHour: number
  createdAt: Date
}): ProjectResponse {
  return {
    projectKey: project.projectKey,
    name: project.name,
    email: project.email,
    domain: project.domain,
    beta: project.beta,
    language: project.language,
    digestDay: project.digestDay,
    digestHour: project.digestHour,
    createdAt: project.createdAt,
  }
}

// validate beta code — called by landing page before showing registration form
projectsRouter.post(
  '/validate-code',
  zValidator('json', validateBetaCodeSchema),
  async (c) => {
    const { code }: ValidateBetaCodeInput = c.req.valid('json')

    const betaCode = await prisma.betaCode.findUnique({
      where: { code: code.trim().toUpperCase() },
    })

    if (!betaCode || !betaCode.active) {
      return c.json<ApiResponse<null>>({
        success: false,
        error: 'Invalid or inactive beta code',
      }, 400)
    }

    if (betaCode.usedCount >= betaCode.maxUses) {
      return c.json<ApiResponse<null>>({
        success: false,
        error: 'This beta code has reached its maximum uses',
      }, 400)
    }

    return c.json<ApiResponse<{ valid: boolean }>>({
      success: true,
      data: { valid: true },
    })
  }
)

projectsRouter.post('/register', zValidator('json', registerProjectSchema), async (c) => {
  const body: RegisterProjectInput = c.req.valid('json')

  // validate beta code
  const betaCode = await prisma.betaCode.findUnique({
    where: { code: body.betaCode.trim().toUpperCase() },
  })

  if (!betaCode || !betaCode.active) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Invalid or inactive beta code',
    }, 400)
  }

  if (betaCode.usedCount >= betaCode.maxUses) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'This beta code has reached its maximum uses',
    }, 400)
  }

  if (!body.termsAccepted) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'You must accept the Terms and Privacy Policy.',
    }, 400)
  }

  let domain: string | null = null

  if (body.domain) {
    domain = normaliseDomain(body.domain)

    if (!isValidDomain(domain)) {
      return c.json<ApiResponse<null>>({
        success: false,
        error: 'Invalid domain format. Use myapp.com not https://myapp.com',
      }, 400)
    }

    const existing = await prisma.project.findFirst({
      where: { domain, deletedAt: null },
    })

    if (existing) {
      return c.json<ApiResponse<null>>({
        success: false,
        error: 'A project is already registered for this domain',
      }, 409)
    }
  }

  const projectKey: string = generateProjectKey(body.name.trim())
  const code: string = body.betaCode.trim().toUpperCase()

  // Claim a beta-code slot and create the project atomically. The conditional
  // updateMany means two simultaneous signups can't both take the last slot.
  const project = await prisma.$transaction(async (tx) => {
    const claimed = await tx.betaCode.updateMany({
      where: { code, active: true, usedCount: { lt: betaCode.maxUses } },
      data: { usedCount: { increment: 1 } },
    })

    if (claimed.count === 0) return null

    return tx.project.create({
      data: {
        projectKey,
        secretKey: generateSecretKey(),
        name: body.name.trim(),
        email: body.email.trim().toLowerCase(),
        domain,
        beta: true,
        language: body.language ?? 'English',
        digestDay: body.digestDay ?? 1,
        digestHour: body.digestHour ?? 8,
        betaCode: code,
        termsAcceptedAt: new Date(),
      },
    })
  })

  if (!project) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'This beta code has reached its maximum uses',
    }, 400)
  }

  const response: ProjectResponse = toProjectResponse(project)

  sendWelcomeEmail(response).catch((err: unknown) => {
    console.error('[Pulsar] Welcome email failed:', err)
  })

  // The secret key is only shown here. Never ship it in the SDK.
  return c.json({ success: true, data: { ...response, secretKey: project.secretKey } }, 201)
})

projectsRouter.post(
  '/delete-request',
  zValidator('json', requestDeleteProjectSchema),
  async (c) => {
    const body: RequestDeleteProjectInput = c.req.valid('json')
    const email: string = body.email.trim().toLowerCase()

    const project = await prisma.project.findFirst({
      where: { projectKey: body.projectKey, email, deletedAt: null },
    })

    if (!project) {
      return c.json<ApiResponse<null>>({ success: true, data: null })
    }

    const token: string = crypto.randomBytes(32).toString('hex')
    const expiresAt: Date = new Date(Date.now() + 1000 * 60 * 60 * 24)

    await prisma.projectDeletionToken.create({
      data: {
        token,
        projectKey: project.projectKey,
        email: project.email,
        expiresAt,
      },
    })

    const appUrl = process.env.APP_URL ?? 'http://localhost:3000'
    const confirmUrl = `${appUrl}/delete/confirm?token=${token}`

    sendDeleteProjectEmail({
      email: project.email,
      projectName: project.name,
      projectKey: project.projectKey,
      language: project.language,
      confirmUrl,
    }).catch((err: unknown) => {
      console.error('[Pulsar] Delete confirmation email failed:', err)
    })

    return c.json<ApiResponse<null>>({ success: true, data: null })
  }
)

projectsRouter.post(
  '/delete-confirm',
  zValidator('json', confirmDeleteProjectSchema),
  async (c) => {
    const body: ConfirmDeleteProjectInput = c.req.valid('json')

    const deletionToken = await prisma.projectDeletionToken.findUnique({
      where: { token: body.token },
    })

    if (!deletionToken || deletionToken.usedAt || deletionToken.expiresAt < new Date()) {
      return c.json<ApiResponse<null>>({
        success: false,
        error: 'Invalid or expired deletion token',
      }, 400)
    }

    await prisma.$transaction([
      prisma.project.update({
        where: { projectKey: deletionToken.projectKey },
        data: { deletedAt: new Date() },
      }),
      prisma.projectDeletionToken.update({
        where: { token: body.token },
        data: { usedAt: new Date() },
      }),
    ])

    return c.json<ApiResponse<null>>({ success: true, data: null })
  }
)