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

  const [pageViews, sessionData, topPages, patterns]: [
    number,
    {
      sessionId: string
      _count: { sessionId: number }
      _min: { timestamp: Date | null }
      _max: { timestamp: Date | null }
    }[],
    { url: string; _count: { url: number } }[],
    BehavioralPatterns
  ] = await Promise.all([
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
    detectPatterns(projectKey),
  ])

  const totalVisitors: number = sessionData.length
  const returning: number = sessionData.filter((s) => {
    const first: Date | null = s._min.timestamp
    const last: Date | null = s._max.timestamp
    if (!first || !last) return false
    return new Date(first).toISOString().slice(0, 10) !== new Date(last).toISOString().slice(0, 10)
  }).length

  const comebackRate: number | null = totalVisitors >= 10
    ? returning > 0
      ? Math.round((returning / totalVisitors) * 100)
      : null
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
    },
  })
}

export async function getRecentSnapshots(projectKey: string, weeks: number = 5): Promise<WeeklySnapshot[]> {
  return prisma.weeklySnapshot.findMany({
    where: { projectKey },
    orderBy: { weekStart: 'desc' },
    take: weeks,
  }) as Promise<WeeklySnapshot[]>
}