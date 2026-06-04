import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { ingestRouter } from '@/routes/ingest'

const mockCreateMany = mock(async () => ({ count: 1 }))
const mockProjectFindFirst = mock(async () => ({
  projectKey: 'test-key',
  domain: null,
  deletedAt: null,
}))

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
})