import { prisma } from '@/db/client'
import type { PulsarStats, RecentSession, TopPage } from '@/types/index'

export async function getStats(projectKey: string): Promise<PulsarStats> {
  const sevenDaysAgo: Date = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [totalPageViews, uniqueSessions, topPages, sessionData] = await Promise.all([
    prisma.event.count({
      where: { projectKey, type: 'page_view', timestamp: { gte: sevenDaysAgo } },
    }),
    prisma.event.findMany({
      where: { projectKey, timestamp: { gte: sevenDaysAgo } },
      select: { sessionId: true },
      distinct: ['sessionId'],
    }),
    prisma.event.groupBy({
      by: ['url'],
      where: { projectKey, type: 'page_view', timestamp: { gte: sevenDaysAgo } },
      _count: { url: true },
      orderBy: { _count: { url: 'desc' } },
      take: 5,
    }),
    prisma.event.groupBy({
      by: ['sessionId'],
      where: { projectKey, type: 'page_view', timestamp: { gte: sevenDaysAgo } },
      _count: { sessionId: true },
      _min: { timestamp: true },
      _max: { timestamp: true },
    }),
  ])

  const totalVisitors: number = uniqueSessions.length

  // A session "returned" if its first and last event are on different calendar days
  const returnedSessions = sessionData.filter((s) => {
    const first = s._min.timestamp
    const last = s._max.timestamp
    if (!first || !last) return false

    const firstDay: string = new Date(first).toISOString().slice(0, 10)
    const lastDay: string = new Date(last).toISOString().slice(0, 10)
    return firstDay !== lastDay
  })

  const MIN_SESSIONS_FOR_COMEBACK: number = 10

  const insufficientData: boolean = totalVisitors < MIN_SESSIONS_FOR_COMEBACK

  const comebackRate: number | null = insufficientData
    ? null
    : totalVisitors > 0
      ? Math.round((returnedSessions.length / totalVisitors) * 100)
      : null

  const stats: PulsarStats = {
    projectKey,
    totalVisitors,
    totalPageViews,
    comebackRate,
    insufficientData,
    topPages: topPages.map((p): TopPage => ({
      url: p.url,
      views: p._count.url,
    })),
    recentSessions: sessionData.slice(0, 10).map((s): RecentSession => ({
      sessionId: s.sessionId,
      pageViews: s._count.sessionId ?? 0,
      firstSeen: s._min.timestamp ?? new Date(),
      lastSeen: s._max.timestamp ?? new Date(),
      returned: (() => {
        const first = s._min.timestamp
        const last = s._max.timestamp
        if (!first || !last) return false
        return new Date(first).toISOString().slice(0, 10) !== new Date(last).toISOString().slice(0, 10)
      })(),
    })),
  }

  return stats
}