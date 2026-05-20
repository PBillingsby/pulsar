import { Hono } from 'hono'
import { prisma } from '@/db/client'
import { validatePayload } from '@/lib/validate'
import { filterEvents } from '@/lib/filter'
import type { ApiResponse } from '@/types/index'

export const ingestRouter = new Hono()

ingestRouter.post('/', async (c) => {
  const body = await c.req.json()
  const events = validatePayload(body)

  if (!events) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Invalid payload',
    }, 400)
  }

  const debug = c.req.header('x-pulsar-debug') === 'true'
  const { passed, dropped, reasons } = filterEvents(events, debug)

  if (passed.length === 0) {
    return c.json<ApiResponse<{ received: number; dropped: number }>>({
      success: true,
      data: { received: 0, dropped },
    })
  }

  await prisma.event.createMany({
    data: passed.map((e) => ({
      type: e.type,
      sessionId: e.sessionId,
      projectKey: e.projectKey,
      url: e.url,
      referrer: e.referrer,
      timestamp: new Date(e.timestamp),
      metadata: e.metadata ?? {},
    })),
  })

  return c.json<ApiResponse<{ received: number; dropped: number; reasons?: string[] }>>({
    success: true,
    data: {
      received: passed.length,
      dropped,
      ...(debug && reasons.length > 0 ? { reasons } : {}),
    },
  })
})