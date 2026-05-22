import { prisma } from '@/db/client'

export interface BehavioralPatterns {
  returnerTopPage: string | null
  bouncerTopPage: string | null
  activationPage: string | null
  avgDepthReturners: number
  avgDepthBouncers: number
  returnerFirstPages: { url: string; count: number }[]
}

export async function detectPatterns(projectKey: string): Promise<BehavioralPatterns> {
  const since = new Date()
  since.setDate(since.getDate() - 30)

  // get all sessions with their events
  const sessionData = await prisma.event.groupBy({
    by: ['sessionId'],
    where: { projectKey, type: 'page_view', timestamp: { gte: since } },
    _count: { sessionId: true },
    _min: { timestamp: true },
    _max: { timestamp: true },
  })

  const returnerSessions = sessionData
    .filter((s) => {
      const first = s._min.timestamp
      const last = s._max.timestamp
      if (!first || !last) return false
      return new Date(first).toISOString().slice(0, 10) !== new Date(last).toISOString().slice(0, 10)
    })
    .map((s) => s.sessionId)

  const bouncerSessions = sessionData
    .filter((s) => !returnerSessions.includes(s.sessionId) && (s._count.sessionId ?? 0) === 1)
    .map((s) => s.sessionId)

  if (returnerSessions.length === 0) {
    return {
      returnerTopPage: null,
      bouncerTopPage: null,
      activationPage: null,
      avgDepthReturners: 0,
      avgDepthBouncers: 0,
      returnerFirstPages: [],
    }
  }

  const [returnerPages, bouncerPages, returnerFirstEvents] = await Promise.all([
    // top pages for returners
    prisma.event.groupBy({
      by: ['url'],
      where: { projectKey, type: 'page_view', sessionId: { in: returnerSessions } },
      _count: { url: true },
      orderBy: { _count: { url: 'desc' } },
      take: 3,
    }),
    // top pages for bouncers
    prisma.event.groupBy({
      by: ['url'],
      where: { projectKey, type: 'page_view', sessionId: { in: bouncerSessions } },
      _count: { url: true },
      orderBy: { _count: { url: 'desc' } },
      take: 1,
    }),
    // first page of each returner session
    prisma.event.findMany({
      where: { projectKey, type: 'page_view', sessionId: { in: returnerSessions } },
      orderBy: { timestamp: 'asc' },
      distinct: ['sessionId'],
      select: { url: true, sessionId: true },
    }),
  ])

  // count first pages for returners
  const firstPageCounts: Record<string, number> = {}
  for (const e of returnerFirstEvents) {
    firstPageCounts[e.url] = (firstPageCounts[e.url] ?? 0) + 1
  }
  const returnerFirstPages = Object.entries(firstPageCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([url, count]) => ({ url, count }))

  // activation page = top returner page that bouncers don't visit much
  const bouncerTopUrl = bouncerPages[0]?.url ?? null
  const activationPage = returnerPages.find((p) => p.url !== bouncerTopUrl)?.url ?? returnerPages[0]?.url ?? null

  // avg session depth
  const avgDepthReturners = returnerSessions.length > 0
    ? sessionData.filter((s) => returnerSessions.includes(s.sessionId))
      .reduce((sum, s) => sum + (s._count.sessionId ?? 0), 0) / returnerSessions.length
    : 0

  const avgDepthBouncers = bouncerSessions.length > 0
    ? sessionData.filter((s) => bouncerSessions.includes(s.sessionId))
      .reduce((sum, s) => sum + (s._count.sessionId ?? 0), 0) / bouncerSessions.length
    : 0

  return {
    returnerTopPage: returnerPages[0]?.url ?? null,
    bouncerTopPage: bouncerTopUrl,
    activationPage,
    avgDepthReturners: Math.round(avgDepthReturners * 10) / 10,
    avgDepthBouncers: Math.round(avgDepthBouncers * 10) / 10,
    returnerFirstPages,
  }
}