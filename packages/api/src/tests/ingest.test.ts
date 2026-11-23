import { ingestRouter, isAllowedOrigin } from '@/routes/ingest'
import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { Hono } from 'hono'

const mockCreateMany = mock(async () => ({ count: 1 }))
const mockProjectFindFirst = mock(async (): Promise<{ projectKey: string; domain: string | null; deletedAt: null } | null> => ({
  projectKey: 'test-key',
  domain: null,
  deletedAt: null,
}))

function pageView(projectKey: string = 'test-key') {
  return {
    type: 'page_view',
    sessionId: 'test-session',
    projectKey,
    url: 'https://example.com',
    timestamp: new Date().toISOString(),
  }
}

function post(events: unknown[], headers: Record<string, string> = {}) {
  return app.request('/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ events }),
  })
}

mock.module('@/db/client', () => ({
  prisma: {
    project: {
      findFirst: mockProjectFindFirst,
    },
    event: {
      createMany: mockCreateMany,
    },
  },
}))

const app = new Hono()
app.route('/events', ingestRouter)

describe('POST /events', () => {
  beforeEach(() => {
    mockCreateMany.mockClear()
    mockProjectFindFirst.mockClear()
  })

  it('accepts a valid event payload', async () => {
    const res = await app.request('/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: [{
          type: 'page_view',
          sessionId: 'test-session',
          projectKey: 'test-key',
          url: 'https://example.com',
          timestamp: new Date().toISOString(),
        }],
      }),
    })

    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.received).toBe(1)
  })

  it('rejects an empty events array', async () => {
    const res = await app.request('/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [] }),
    })

    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.success).toBe(false)
  })

  it('rejects a payload with no events key', async () => {
    const res = await app.request('/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.success).toBe(false)
  })

  it('rejects an event with missing required fields', async () => {
    const res = await app.request('/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: [{
          type: 'page_view',
          sessionId: 'test-session',
        }],
      }),
    })

    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.success).toBe(false)
  })

  it('rejects an invalid event type', async () => {
    const res = await app.request('/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: [{
          type: 'invalid_type',
          sessionId: 'test-session',
          projectKey: 'test-key',
          url: 'https://example.com',
          timestamp: new Date().toISOString(),
        }],
      }),
    })

    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.success).toBe(false)
  })

  it('rejects events for unknown or deleted project', async () => {
    mockProjectFindFirst.mockImplementationOnce(async () => null)

    const res = await app.request('/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: [{
          type: 'page_view',
          sessionId: 'test-session',
          projectKey: 'deleted-key',
          url: 'https://example.com',
          timestamp: new Date().toISOString(),
        }],
      }),
    })

    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.success).toBe(false)
    expect(body.error).toBe('Project not found or deleted')
    expect(mockCreateMany).not.toHaveBeenCalled()
  })

  it('calls prisma createMany with correct data', async () => {
    await app.request('/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: [{
          type: 'click',
          sessionId: 'test-session',
          projectKey: 'test-key',
          url: 'https://example.com',
          timestamp: new Date().toISOString(),
          metadata: { label: 'submit-btn' },
        }],
      }),
    })

    expect(mockCreateMany).toHaveBeenCalledTimes(1)
  })

  it('rejects a batch that mixes project keys', async () => {
    const res = await post([pageView('test-key'), pageView('someone-elses-key')])
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('All events in a batch must share one projectKey')
    expect(mockProjectFindFirst).not.toHaveBeenCalled()
    expect(mockCreateMany).not.toHaveBeenCalled()
  })

  it('accepts events from the registered domain and its subdomains', async () => {
    mockProjectFindFirst.mockImplementation(async () => ({ projectKey: 'test-key', domain: 'example.com', deletedAt: null }))

    expect((await post([pageView()], { origin: 'https://example.com' })).status).toBe(200)
    expect((await post([pageView()], { origin: 'https://app.example.com' })).status).toBe(200)

    mockProjectFindFirst.mockImplementation(async () => ({ projectKey: 'test-key', domain: null, deletedAt: null }))
  })

  it('rejects look-alike origins and missing origins when a domain is registered', async () => {
    mockProjectFindFirst.mockImplementation(async () => ({ projectKey: 'test-key', domain: 'example.com', deletedAt: null }))

    expect((await post([pageView()], { origin: 'https://example.com.evil.net' })).status).toBe(403)
    expect((await post([pageView()], { origin: 'https://notexample.com' })).status).toBe(403)
    expect((await post([pageView()])).status).toBe(403)
    expect(mockCreateMany).not.toHaveBeenCalled()

    mockProjectFindFirst.mockImplementation(async () => ({ projectKey: 'test-key', domain: null, deletedAt: null }))
  })
})

describe('isAllowedOrigin', () => {
  it('matches the exact domain, www, and subdomains only', () => {
    expect(isAllowedOrigin('https://example.com', 'example.com')).toBe(true)
    expect(isAllowedOrigin('https://www.example.com', 'example.com')).toBe(true)
    expect(isAllowedOrigin('https://app.example.com/page', 'example.com')).toBe(true)
    expect(isAllowedOrigin('https://example.com.evil.net', 'example.com')).toBe(false)
    expect(isAllowedOrigin('https://badexample.com', 'example.com')).toBe(false)
    expect(isAllowedOrigin('not a url', 'example.com')).toBe(false)
  })
})