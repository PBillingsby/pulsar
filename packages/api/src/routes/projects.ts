import { Hono } from 'hono'
import { prisma } from '@/db/client'
import { sendWelcomeEmail } from '@/lib/email/welcome'
import type { ApiResponse, RegisterProjectInput, ProjectResponse } from '@/types/index'

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

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
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

const SUPPORTED_LANGUAGES: string[] = [
  'English', 'Spanish', 'French', 'German',
  'Portuguese', 'Turkish', 'Italian', 'Dutch',
]

projectsRouter.post('/register', async (c) => {
  const body = await c.req.json<RegisterProjectInput>()

  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Project name is required' }, 400)
  }

  if (!body.email || !isValidEmail(body.email)) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Valid email is required' }, 400)
  }

  // domain is optional but validated if provided
  let domain: string | null = null
  if (body.domain) {
    domain = normaliseDomain(body.domain)
    if (!isValidDomain(domain)) {
      return c.json<ApiResponse<null>>({ success: false, error: 'Invalid domain format. Use myapp.com not https://myapp.com' }, 400)
    }

    // check uniqueness
    const existing = await prisma.project.findUnique({ where: { domain } })
    if (existing) {
      return c.json<ApiResponse<null>>({ success: false, error: 'A project is already registered for this domain' }, 409)
    }
  }

  // validate language
  const language: string = body.language && SUPPORTED_LANGUAGES.includes(body.language)
    ? body.language
    : 'English'

  // validate digest schedule
  const digestDay: number = typeof body.digestDay === 'number' && body.digestDay >= 0 && body.digestDay <= 6
    ? body.digestDay
    : 1 // Monday

  const digestHour: number = typeof body.digestHour === 'number' && body.digestHour >= 0 && body.digestHour <= 23
    ? body.digestHour
    : 8 // 8am UTC

  const projectKey: string = generateProjectKey(body.name.trim())

  const project = await prisma.project.create({
    data: {
      projectKey,
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      domain,
      beta: true,
      language,
      digestDay,
      digestHour,
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