import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { prisma } from '@/db/client'
import { filterEvents } from '@/lib/filter/index'
import { ingestSchema, type IngestInput } from '@/lib/validate/schemas'
import type { ApiResponse, IncomingEvent } from '@/types/index'
import { Prisma } from '@prisma/client'

export const ingestRouter = new Hono()

ingestRouter.post('/', zValidator('json', ingestSchema), async (c) => {
  const body: IngestInput = c.req.valid('json')
  const isDebug: boolean = c.req.header('x-pulsar-debug') === 'true'
  const isIgnored: boolean = c.req.header('x-pulsar-ignore') === 'true'

  const projectKey: string = body.events[0]?.projectKey ?? ''

  const project = await prisma.project.findFirst({
    where: {
      projectKey,
      deletedAt: null,
    },
    select: {
      domain: true,
    },
  })

  if (!project) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Project not found or deleted',
    }, 404)
  }

  const origin: string = c.req.header('origin') ?? c.req.header('referer') ?? ''

  if (origin && project.domain) {
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

  const incoming: IncomingEvent[] = body.events.map((e) => ({
    type: e.type,
    sessionId: e.sessionId,
    projectKey: e.projectKey,
    url: e.url,
    referrer: e.referrer,
    timestamp: e.timestamp,
    sessionStart: e.sessionStart,
    metadata: e.metadata,
  }))

  const { passed, dropped } = filterEvents(incoming, isIgnored, isDebug)

  if (passed.length > 0) {
    await prisma.event.createMany({
      data: passed.map((e: IncomingEvent): Prisma.EventCreateManyInput => ({
        type: e.type,
        sessionId: e.sessionId,
        projectKey: e.projectKey,
        url: e.url,
        referrer: e.referrer ?? null,
        timestamp: new Date(e.timestamp),
        metadata: e.metadata === undefined
          ? Prisma.JsonNull
          : (e.metadata as Prisma.InputJsonValue),
      })),
    })
  }

  return c.json<ApiResponse<{ received: number; dropped: number }>>({
    success: true,
    data: { received: passed.length, dropped },
  })
})