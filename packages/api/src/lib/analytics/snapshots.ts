import { prisma } from '@/db/client'
import { detectPatterns } from '@/lib/analytics/patterns'
import type { WeeklySnapshot, BehavioralPatterns } from '@/types/index'

export async function getWeekStart(date: Date = new Date()): Promise<Date> {
  const d: Date = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - d.getUTCDay())
  return d
}

export async function captureWeeklySnapshot(projectKey: string): Promise<void> {
  const weekStart: Date = await getWeekStart()
  const weekEnd: Date = new Date(weekStart)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7)

  const patterns: BehavioralPatterns = await detectPatterns(projectKey)

  const [pageViews, sessionData, topPages, activationSessions] = await Promise.all([
    prisma.event.count({
      where: { projectKey, type: 'page_view', timestamp: { gte: weekStart, lt: weekEnd } },
    }),
    prisma.event.groupBy({
      by: ['sessionId'],
      where: { projectKey, type: 'page_view', timestamp: { gte: weekStart, lt: weekEnd } },
      _count: { sessionId: true },
      _min: { timestamp: true },
      _max: { timestamp: true },
    }),
    prisma.event.groupBy({
      by: ['url'],
      where: { projectKey, type: 'page_view', timestamp: { gte: weekStart, lt: weekEnd } },
      _count: { url: true },
      orderBy: { _count: { url: 'desc' } },
      take: 1,
    }),
    patterns.activationPage
      ? prisma.event.groupBy({
        by: ['sessionId'],
        where: {
          projectKey,
          type: 'page_view',
          url: patterns.activationPage,
          timestamp: { gte: weekStart, lt: weekEnd },
        },
        _count: { sessionId: true },
      })
      : Promise.resolve([]),
  ])

  const totalVisitors: number = sessionData.length
  const returning: number = sessionData.filter((s) => {
    const first: Date | null = s._min.timestamp
    const last: Date | null = s._max.timestamp
    if (!first || !last) return false
    return new Date(first).toISOString().slice(0, 10) !== new Date(last).toISOString().slice(0, 10)
  }).length

  const comebackRate: number | null = totalVisitors >= 10
    ? returning > 0 ? Math.round((returning / totalVisitors) * 100) : null
    : null

  const activationPageViews: number = activationSessions.length
  const activationReachRate: number | null = totalVisitors > 0 && activationPageViews > 0
    ? Math.round((activationPageViews / totalVisitors) * 100)
    : null

  await prisma.weeklySnapshot.upsert({
    where: { projectKey_weekStart: { projectKey, weekStart } },
    update: {
      totalVisitors,
      returning,
      comebackRate,
      topPage: topPages[0]?.url ?? null,
      totalEvents: pageViews,
      activationPage: patterns.activationPage,
      avgDepthReturners: patterns.avgDepthReturners,
      avgDepthBouncers: patterns.avgDepthBouncers,
      returnerTopPage: patterns.returnerTopPage,
      bouncerTopPage: patterns.bouncerTopPage,
      returnerFirstPage: patterns.returnerFirstPages[0]?.url ?? null,
      activationReachRate,
      activationPageViews,
    },
    create: {
      projectKey,
      weekStart,
      totalVisitors,
      returning,
      comebackRate,
      topPage: topPages[0]?.url ?? null,
      totalEvents: pageViews,
      activationPage: patterns.activationPage,
      avgDepthReturners: patterns.avgDepthReturners,
      avgDepthBouncers: patterns.avgDepthBouncers,
      returnerTopPage: patterns.returnerTopPage,
      bouncerTopPage: patterns.bouncerTopPage,
      returnerFirstPage: patterns.returnerFirstPages[0]?.url ?? null,
      activationReachRate,
      activationPageViews,
    },
  })
}

export async function getRecentSnapshots(projectKey: string, weeks: number = 8): Promise<WeeklySnapshot[]> {
  return prisma.weeklySnapshot.findMany({
    where: { projectKey },
    orderBy: { weekStart: 'desc' },
    take: weeks,
  }) as Promise<WeeklySnapshot[]>
}

export async function cleanupOldSnapshots(projectKey: string, keepWeeks: number = 12): Promise<void> {
  const cutoff: Date = new Date()
  cutoff.setUTCDate(cutoff.getUTCDate() - keepWeeks * 7)

  await prisma.weeklySnapshot.deleteMany({
    where: {
      projectKey,
      weekStart: { lt: cutoff },
    },
  })
}