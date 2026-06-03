import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { projectsRouter } from '@/routes/projects'

const mockCreate = mock(async (args: { data: { projectKey: string; name: string; email: string; beta: boolean } }) => ({
  projectKey: args.data.projectKey,
  name: args.data.name,
  email: args.data.email,
  domain: null,
  beta: true,
  language: 'English',
  digestDay: 1,
  digestHour: 8,
  createdAt: new Date('2026-01-01'),
}))

const mockFindUnique = mock(async () => ({
  projectKey: 'my-app-abc123',
  name: 'My App',
  email: 'founder@myapp.com',
  domain: null,
  beta: true,
  language: 'English',
  digestDay: 1,
  digestHour: 8,
  createdAt: new Date('2026-01-01'),
}))

const mockUpdate = mock(async () => ({
  projectKey: 'my-app-abc123',
  beta: false,
}))

mock.module('@/db/client', () => ({
  prisma: {
    project: {
      create: mockCreate,
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
  },
}))

const app = new Hono()
app.route('/projects', projectsRouter)

describe('POST /projects/register', () => {
  beforeEach(() => {
    mockCreate.mockClear()
    mockFindUnique.mockClear()
    mockUpdate.mockClear()
  })

  it('registers a project with valid input', async () => {
    const res = await app.request('/projects/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'My App', email: 'founder@myapp.com' }),
    })
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.success).toBe(true)
    expect(body.data.name).toBe('My App')
    expect(body.data.email).toBe('founder@myapp.com')
    expect(body.data.beta).toBe(true)
    expect(typeof body.data.projectKey).toBe('string')
    expect(body.data.projectKey.length).toBeGreaterThan(0)
  })

  it('rejects missing name', async () => {
    const res = await app.request('/projects/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'founder@myapp.com' }),
    })
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.success).toBe(false)
  })

  it('rejects missing email', async () => {
    const res = await app.request('/projects/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'My App' }),
    })

    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.success).toBe(false)
  })

  it('rejects invalid email format', async () => {
    const res = await app.request('/projects/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'My App', email: 'notanemail' }),
    })

    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.success).toBe(false)
  })

  it('generates a project key derived from the name', async () => {
    const res = await app.request('/projects/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'My Cool App', email: 'founder@myapp.com' }),
    })
    const body = await res.json()
    expect(body.data.projectKey).toMatch(/^my-cool-app-/)
  })

  it('lowercases the email', async () => {
    const res = await app.request('/projects/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'My App', email: 'Founder@MyApp.com' }),
    })
    const body = await res.json()
    expect(body.data.email).toBe('founder@myapp.com')
  })
})

describe('GET /projects/:projectKey', () => {
  it('returns a project by key', async () => {
    const res = await app.request('/projects/my-app-abc123')
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.projectKey).toBe('my-app-abc123')
    expect(body.data.name).toBe('My App')
  })

  it('returns 404 for unknown project key', async () => {
    mockFindUnique.mockImplementationOnce(async () => null)
    const res = await app.request('/projects/unknown-key')
    const body = await res.json()
    expect(res.status).toBe(404)
    expect(body.success).toBe(false)
    expect(body.error).toBe('Project not found')
  })
})

describe('DELETE /projects/:projectKey', () => {
  beforeEach(() => {
    mockFindUnique.mockClear()
    mockUpdate.mockClear()
  })

  it('deactivates a project with matching email', async () => {
    const res = await app.request('/projects/my-app-abc123', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'founder@myapp.com' }),
    })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(mockUpdate).toHaveBeenCalledTimes(1)
  })

  it('rejects wrong email', async () => {
    const res = await app.request('/projects/my-app-abc123', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'wrong@email.com' }),
    })
    const body = await res.json()
    expect(res.status).toBe(403)
    expect(body.success).toBe(false)
    expect(body.error).toBe('Email does not match this project')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns 404 for unknown project key', async () => {
    mockFindUnique.mockImplementationOnce(async () => null)
    const res = await app.request('/projects/unknown-key', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'founder@myapp.com' }),
    })
    const body = await res.json()
    expect(res.status).toBe(404)
    expect(body.success).toBe(false)
    expect(body.error).toBe('Project not found')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('rejects missing email', async () => {
    const res = await app.request('/projects/my-app-abc123', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.success).toBe(false)
  })

  it('is case insensitive on email', async () => {
    const res = await app.request('/projects/my-app-abc123', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'FOUNDER@MYAPP.COM' }),
    })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
  })
})