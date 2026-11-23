import { projectsRouter } from '@/routes/projects'
import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { Hono } from 'hono'

const VALID_BETA_CODE = 'PULSAR-BETA-001'

const mockCreate = mock(async (args: { data: { projectKey: string; secretKey: string; name: string; email: string; beta: boolean } }) => ({
  projectKey: args.data.projectKey,
  secretKey: args.data.secretKey,
  name: args.data.name,
  email: args.data.email,
  domain: null,
  beta: true,
  language: 'English',
  digestDay: 1,
  digestHour: 8,
  createdAt: new Date('2026-01-01'),
  betaCode: VALID_BETA_CODE,
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
  code: VALID_BETA_CODE,
}))

const mockFindFirst = mock(async (): Promise<Record<string, unknown> | null> => ({
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
  code: VALID_BETA_CODE,
}))

const mockUpdate = mock(async () => ({
  projectKey: 'my-app-abc123',
  deletedAt: new Date(),
  code: VALID_BETA_CODE,
}))

const mockBetaCodeFindUnique = mock(async () => ({
  id: 'beta-code-id',
  code: VALID_BETA_CODE,
  description: 'Test beta code',
  usedCount: 0,
  maxUses: 10,
  active: true,
  createdAt: new Date('2026-01-01'),
}))

const mockBetaCodeUpdate = mock(async () => ({
  id: 'beta-code-id',
  code: VALID_BETA_CODE,
  description: 'Test beta code',
  usedCount: 1,
  maxUses: 10,
  active: true,
  createdAt: new Date('2026-01-01'),
}))

const mockTokenCreate = mock(async () => ({
  token: 'a'.repeat(64),
  code: VALID_BETA_CODE,
}))

const mockTokenFindUnique = mock(async (): Promise<Record<string, unknown> | null> => ({
  token: 'a'.repeat(64),
  projectKey: 'my-app-abc123',
  email: 'founder@myapp.com',
  expiresAt: new Date(Date.now() + 60_000),
  usedAt: null,
  code: VALID_BETA_CODE,
}))

const mockTokenUpdate = mock(async () => ({
  token: 'a'.repeat(64),
  usedAt: new Date(),
  code: VALID_BETA_CODE,
}))

const mockBetaCodeUpdateMany = mock(async (): Promise<{ count: number }> => ({ count: 1 }))

// Supports both forms: an array of queries, or an interactive callback given a tx client
const mockTransaction = mock(async (ops: Promise<unknown>[] | ((tx: unknown) => Promise<unknown>)) =>
  typeof ops === 'function'
    ? ops({
      project: { create: mockCreate },
      betaCode: { updateMany: mockBetaCodeUpdateMany },
    })
    : Promise.all(ops)
)

mock.module('@/db/client', () => ({
  prisma: {
    project: {
      create: mockCreate,
      findUnique: mockFindUnique,
      findFirst: mockFindFirst,
      update: mockUpdate,
    },
    betaCode: {
      findUnique: mockBetaCodeFindUnique,
      update: mockBetaCodeUpdate,
      updateMany: mockBetaCodeUpdateMany,
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
    mockBetaCodeFindUnique.mockClear()
    mockBetaCodeUpdate.mockClear()
    mockTransaction.mockClear()
  })

  it('returns a secret key once, separate from the public project key', async () => {
    const res = await app.request('/projects/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'My App',
        email: 'founder@myapp.com',
        betaCode: VALID_BETA_CODE,
        termsAccepted: true,
      }),
    })
    const body = await res.json()

    expect(body.data.secretKey).toMatch(/^psk_[a-f0-9]{64}$/)
    expect(body.data.secretKey).not.toContain(body.data.projectKey)
  })

  it('rejects registration when the last beta slot is taken concurrently', async () => {
    mockBetaCodeUpdateMany.mockImplementationOnce(async () => ({ count: 0 }))

    const res = await app.request('/projects/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'My App',
        email: 'founder@myapp.com',
        betaCode: VALID_BETA_CODE,
        termsAccepted: true,
      }),
    })
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('This beta code has reached its maximum uses')
  })

  it('registers a project with valid input', async () => {
    const res = await app.request('/projects/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'My App',
        email: 'founder@myapp.com',
        betaCode: VALID_BETA_CODE,
        termsAccepted: true,
      }),
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
      body: JSON.stringify({
        email: 'founder@myapp.com',
        betaCode: VALID_BETA_CODE,
      }),
    })
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.success).toBe(false)
  })

  it('rejects missing email', async () => {
    const res = await app.request('/projects/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'My App',
        betaCode: VALID_BETA_CODE,
      }),
    })

    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.success).toBe(false)
  })

  it('rejects invalid email format', async () => {
    const res = await app.request('/projects/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'My App',
        email: 'notanemail',
        betaCode: VALID_BETA_CODE,
      }),
    })

    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.success).toBe(false)
  })

  it('generates a project key derived from the name', async () => {
    const res = await app.request('/projects/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'My Cool App',
        email: 'founder@myapp.com',
        betaCode: VALID_BETA_CODE,
        termsAccepted: true,
      }),
    })
    const body = await res.json()

    expect(body.data.projectKey).toMatch(/^my-cool-app-/)
  })

  it('lowercases the email', async () => {
    const res = await app.request('/projects/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'My App',
        email: 'Founder@MyApp.com',
        betaCode: VALID_BETA_CODE,
        termsAccepted: true,
      }),
    })
    const body = await res.json()

    expect(body.data.email).toBe('founder@myapp.com')
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