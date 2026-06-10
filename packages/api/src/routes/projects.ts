import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import crypto from 'node:crypto'
import { prisma } from '@/db/client'
import { sendWelcomeEmail } from '@/lib/email/welcome'
import { sendDeleteProjectEmail } from '@/lib/email/delete-project'
import {
  registerProjectSchema,
  validateBetaCodeSchema,
  requestDeleteProjectSchema,
  confirmDeleteProjectSchema,
  type RegisterProjectInput,
  type ValidateBetaCodeInput,
  type RequestDeleteProjectInput,
  type ConfirmDeleteProjectInput,
} from '@/lib/validate/schemas'
import type { ApiResponse, ProjectResponse } from '@/types/index'

export const projectsRouter = new Hono()

function generateProjectKey(name: string): string {
  const slug: string = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 20)

  const suffix: string = Math.random().toString(36).slice(2, 8)
  return `${slug}-${suffix}`
}

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

  const [project] = await prisma.$transaction([
    prisma.project.create({
      data: {
        projectKey,
        name: body.name.trim(),
        email: body.email.trim().toLowerCase(),
        domain,
        beta: true,
        language: body.language ?? 'English',
        digestDay: body.digestDay ?? 1,
        digestHour: body.digestHour ?? 8,
        betaCode: body.betaCode.trim().toUpperCase(),
      },
    }),
    prisma.betaCode.update({
      where: { code: body.betaCode.trim().toUpperCase() },
      data: { usedCount: { increment: 1 } },
    }),
  ])

  const response: ProjectResponse = toProjectResponse(project)

  sendWelcomeEmail(response).catch((err: unknown) => {
    console.error('[Pulsar] Welcome email failed:', err)
  })

  return c.json<ApiResponse<ProjectResponse>>({ success: true, data: response }, 201)
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

projectsRouter.get('/:projectKey', async (c) => {
  const projectKey: string = c.req.param('projectKey')

  const project = await prisma.project.findFirst({
    where: { projectKey, deletedAt: null },
  })

  if (!project) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Project not found' }, 404)
  }

  return c.json<ApiResponse<ProjectResponse>>({
    success: true,
    data: toProjectResponse(project),
  })
})