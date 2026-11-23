import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Hono } from 'hono';

const SECRET = `psk_${'a'.repeat(64)}`

const mockFindFirst = mock(async (): Promise<{ projectKey: string; email: string; language: string; secretKey: string } | null> => ({
  projectKey: 'my-app-abc123',
  email: 'owner@myapp.com',
  language: 'English',
  secretKey: SECRET,
}))
const mockSendDigest = mock(async (_email: string, _digest: unknown, _language: string) => { })

mock.module('@/db/client', () => ({ prisma: { project: { findFirst: mockFindFirst } } }))
mock.module('@/lib/analytics/snapshots', () => ({ captureWeeklySnapshot: mock(async () => { }) }))
mock.module('@/lib/digest/index', () => ({ buildDigest: mock(async () => ({ summary: 'ok' })) }))
mock.module('@/lib/email/index', () => ({ sendDigest: mockSendDigest }))

const { statsRouter } = await import('@/routes/stats')
const { digestRouter } = await import('@/routes/digest')

const app = new Hono()
app.route('/stats', statsRouter)
app.route('/digest', digestRouter)

const auth = (token: string) => ({ authorization: `Bearer ${token}` })

// Stats success path is covered in analytics.test.ts; these cover the auth gate only.
describe('GET /stats/:projectKey', () => {
  it('rejects a request with only the public project key', async () => {
    const res = await app.request('/stats/my-app-abc123')
    expect(res.status).toBe(401)
  })

  it('rejects a wrong secret key', async () => {
    const res = await app.request('/stats/my-app-abc123', { headers: auth(`psk_${'b'.repeat(64)}`) })
    expect(res.status).toBe(401)
  })

  it('gives the same answer for an unknown project as for a wrong key', async () => {
    mockFindFirst.mockImplementationOnce(async () => null)
    const res = await app.request('/stats/does-not-exist', { headers: auth(SECRET) })
    expect(res.status).toBe(401)
  })
})

describe('POST /digest/:projectKey', () => {
  beforeEach(() => mockSendDigest.mockClear())

  it('rejects a request without the secret key', async () => {
    const res = await app.request('/digest/my-app-abc123', { method: 'POST' })
    expect(res.status).toBe(401)
    expect(mockSendDigest).not.toHaveBeenCalled()
  })

  it('only sends to the email on file, ignoring any address in the body', async () => {
    const res = await app.request('/digest/my-app-abc123', {
      method: 'POST',
      headers: { ...auth(SECRET), 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'attacker@evil.com' }),
    })
    expect(res.status).toBe(200)
    expect(mockSendDigest).toHaveBeenCalledTimes(1)
    expect(mockSendDigest.mock.calls[0][0]).toBe('owner@myapp.com')
  })
})