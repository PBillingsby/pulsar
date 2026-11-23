import { prisma } from '@/db/client'
import { filterEvents } from '@/lib/filter/index'
import { ingestSchema, type IngestInput } from '@/lib/validate/schemas'
import type { ApiResponse, IncomingEvent } from '@/types/index'
import { zValidator } from '@hono/zod-validator'
import { Prisma } from '@prisma/client'
import { Hono } from 'hono'

export const ingestRouter = new Hono()

function hostnameOf(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return null
  }
}

// Exact match on the registered domain or a subdomain.
// "app.example.com" passes for "example.com"; "example.com.evil.net" does not.
export function isAllowedOrigin(originHeader: string, domain: string): boolean {
  const hostname: string | null = hostnameOf(originHeader)
  if (!hostname) return false
  return hostname === domain || hostname.endsWith(`.${domain}`)
}
ingestRouter.post('/', zValidator('json', ingestSchema), async (c) => {
  const body: IngestInput = c.req.valid('json')
  const isDebug: boolean = c.req.header('x-pulsar-debug') === 'true'
  const isIgnored: boolean = c.req.header('x-pulsar-ignore') === 'true'

  // A batch belongs to one project, or events could be written under someone else's key
  const projectKey: string = body.events[0].projectKey
  if (body.events.some((e) => e.projectKey !== projectKey)) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'All events in a batch must share one projectKey',
    }, 400)
  }

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

  if (project.domain) {
    const origin: string = c.req.header('origin') ?? c.req.header('referer') ?? ''

    if (!isAllowedOrigin(origin, project.domain)) {
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