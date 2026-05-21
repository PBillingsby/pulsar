import { Hono } from 'hono'
import { prisma } from '@/db/client'
import type { ApiResponse, RegisterProjectInput, ProjectResponse } from '@/types/index'

export const projectsRouter = new Hono()

function generateProjectKey(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 20)
  const suffix = Math.random().toString(36).slice(2, 8)
  return `${slug}-${suffix}`
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

projectsRouter.post('/register', async (c) => {
  const body = await c.req.json<RegisterProjectInput>()

  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Project name is required',
    }, 400)
  }

  if (!body.email || !isValidEmail(body.email)) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Valid email is required',
    }, 400)
  }

  const projectKey = generateProjectKey(body.name.trim())

  const project = await prisma.project.create({
    data: {
      projectKey,
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      beta: true,
    },
  })

  return c.json<ApiResponse<ProjectResponse>>({
    success: true,
    data: {
      projectKey: project.projectKey,
      name: project.name,
      email: project.email,
      beta: project.beta,
      createdAt: project.createdAt,
    },
  }, 201)
})

projectsRouter.get('/:projectKey', async (c) => {
  const projectKey = c.req.param('projectKey')

  const project = await prisma.project.findUnique({
    where: { projectKey },
  })

  if (!project) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Project not found',
    }, 404)
  }

  return c.json<ApiResponse<ProjectResponse>>({
    success: true,
    data: {
      projectKey: project.projectKey,
      name: project.name,
      email: project.email,
      beta: project.beta,
      createdAt: project.createdAt,
    },
  })
})