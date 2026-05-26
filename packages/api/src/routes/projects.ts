import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { prisma } from '@/db/client'
import { sendWelcomeEmail } from '@/lib/email/welcome'
import { registerProjectSchema, type RegisterProjectInput } from '@/lib/validate/schemas'
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

projectsRouter.post('/register', zValidator('json', registerProjectSchema), async (c) => {
  const body: RegisterProjectInput = c.req.valid('json')

  let domain: string | null = null
  if (body.domain) {
    domain = normaliseDomain(body.domain)
    if (!isValidDomain(domain)) {
      return c.json<ApiResponse<null>>({
        success: false,
        error: 'Invalid domain format. Use myapp.com not https://myapp.com',
      }, 400)
    }

    const existing = await prisma.project.findUnique({ where: { domain } })
    if (existing) {
      return c.json<ApiResponse<null>>({
        success: false,
        error: 'A project is already registered for this domain',
      }, 409)
    }
  }

  const projectKey: string = generateProjectKey(body.name.trim())

  const project = await prisma.project.create({
    data: {
      projectKey,
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      domain,
      beta: true,
      language: body.language ?? 'English',
      digestDay: body.digestDay ?? 1,
      digestHour: body.digestHour ?? 8,
    },
  })

  const response: ProjectResponse = {
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

  sendWelcomeEmail(response).catch((err: unknown) => {
    console.error('[Pulsar] Welcome email failed:', err)
  })

  return c.json<ApiResponse<ProjectResponse>>({ success: true, data: response }, 201)
})

projectsRouter.get('/:projectKey', async (c) => {
  const projectKey: string = c.req.param('projectKey')

  const project = await prisma.project.findUnique({ where: { projectKey } })

  if (!project) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Project not found' }, 404)
  }

  return c.json<ApiResponse<ProjectResponse>>({
    success: true,
    data: {
      projectKey: project.projectKey,
      name: project.name,
      email: project.email,
      domain: project.domain,
      beta: project.beta,
      language: project.language,
      digestDay: project.digestDay,
      digestHour: project.digestHour,
      createdAt: project.createdAt,
    },
  })
})