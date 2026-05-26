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

  const ignored: boolean = c.req.header('x-pulsar-ignore') === 'true'
  const debug: boolean = c.req.header('x-pulsar-debug') === 'true'
  const { passed, dropped, reasons } = filterEvents(events, debug, ignored)

  if (passed.length === 0) {
    return c.json<ApiResponse<{ received: number; dropped: number }>>({
      success: true,
      data: { received: 0, dropped },
    })
  }

  // origin validation — check if request comes from registered domain
  const origin: string = c.req.header('origin') ?? c.req.header('referer') ?? ''

  if (origin) {
    const project = await prisma.project.findUnique({
      where: { projectKey: body.events[0]?.projectKey },
      select: { domain: true },
    })

    if (project?.domain) {
      const normalisedOrigin: string = origin
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0]

      if (!normalisedOrigin.includes(project.domain)) {
        return c.json<ApiResponse<null>>({
          success: false,
          error: 'Origin not permitted for this project key',
        }, 403)
      }
    }
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