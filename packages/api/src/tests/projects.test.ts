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

const mockFindFirst = mock(async () => ({
  projectKey: 'my-app-abc123',
  name: 'My App',
  email: 'founder@myapp.com',
  domain: null,
  beta: true,
  language: 'English',
  digestDay: 1,
  digestHour: 8,
  createdAt: new Date('2026-01-01'),
  deletedAt: null,
}))

const mockUpdate = mock(async () => ({
  projectKey: 'my-app-abc123',
  deletedAt: new Date(),
}))

const mockTokenCreate = mock(async () => ({
  token: 'a'.repeat(64),
}))

const mockTokenFindUnique = mock(async () => ({
  token: 'a'.repeat(64),
  projectKey: 'my-app-abc123',
  email: 'founder@myapp.com',
  expiresAt: new Date(Date.now() + 60_000),
  usedAt: null,
}))

const mockTokenUpdate = mock(async () => ({
  token: 'a'.repeat(64),
  usedAt: new Date(),
}))

const mockTransaction = mock(async () => [])

mock.module('@/db/client', () => ({
  prisma: {
    project: {
      create: mockCreate,
      findUnique: mockFindUnique,
      findFirst: mockFindFirst,
      update: mockUpdate,
    },
    projectDeletionToken: {
      create: mockTokenCreate,
      findUnique: mockTokenFindUnique,
      update: mockTokenUpdate,
    },
    $transaction: mockTransaction,
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
    mockFindFirst.mockImplementationOnce(async () => null)

    const res = await app.request('/projects/unknown-key')
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.success).toBe(false)
    expect(body.error).toBe('Project not found')
  })
})

describe('POST /projects/delete-request', () => {
  beforeEach(() => {
    mockFindFirst.mockClear()
    mockTokenCreate.mockClear()
    mockTokenFindUnique.mockClear()
    mockTokenUpdate.mockClear()
    mockTransaction.mockClear()
  })

  it('creates a deletion token for a matching project and email', async () => {
    const res = await app.request('/projects/delete-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectKey: 'my-app-abc123',
        email: 'founder@myapp.com',
      }),
    })

    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(mockTokenCreate).toHaveBeenCalledTimes(1)
  })

  it('returns success without creating a token for unknown project/email', async () => {
    mockFindFirst.mockImplementationOnce(async () => null)

    const res = await app.request('/projects/delete-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectKey: 'unknown-key',
        email: 'founder@myapp.com',
      }),
    })

    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(mockTokenCreate).not.toHaveBeenCalled()
  })

  it('rejects missing projectKey', async () => {
    const res = await app.request('/projects/delete-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'founder@myapp.com',
      }),
    })

    expect(res.status).toBe(400)
  })

  it('rejects missing email', async () => {
    const res = await app.request('/projects/delete-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectKey: 'my-app-abc123',
      }),
    })

    expect(res.status).toBe(400)
  })
})

describe('POST /projects/delete-confirm', () => {
  beforeEach(() => {
    mockTokenFindUnique.mockClear()
    mockTransaction.mockClear()
  })

  it('soft deletes project with a valid token', async () => {
    const res = await app.request('/projects/delete-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: 'a'.repeat(64),
      }),
    })

    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(mockTransaction).toHaveBeenCalledTimes(1)
  })

  it('rejects invalid token', async () => {
    mockTokenFindUnique.mockImplementationOnce(async () => null)

    const res = await app.request('/projects/delete-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: 'a'.repeat(64),
      }),
    })

    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.success).toBe(false)
    expect(body.error).toBe('Invalid or expired deletion token')
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('rejects missing token', async () => {
    const res = await app.request('/projects/delete-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(400)
  })
})