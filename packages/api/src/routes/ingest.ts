import { Hono } from 'hono'
import { prisma } from '@/db/client'
import { validatePayload } from '@/lib/validate'
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

  await prisma.event.createMany({
    data: events.map((e) => ({
      type: e.type,
      sessionId: e.sessionId,
      projectKey: e.projectKey,
      url: e.url,
      referrer: e.referrer,
      timestamp: new Date(e.timestamp),
      metadata: e.metadata ?? {},
    })),
  })

  return c.json<ApiResponse<{ received: number }>>({
    success: true,
    data: { received: events.length },
  })
})