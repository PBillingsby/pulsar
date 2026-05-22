import { prisma } from '@/db/client'

export async function getWeekStart(date: Date = new Date()): Promise<Date> {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - d.getUTCDay())
  return d
}

export async function captureWeeklySnapshot(projectKey: string): Promise<void> {
  const weekStart: Date = await getWeekStart()
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7)

  const [pageViews, sessionData, topPages] = await Promise.all([
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
  ])

  const totalVisitors = sessionData.length
  const returning = sessionData.filter((s) => {
    const first = s._min.timestamp
    const last = s._max.timestamp
    if (!first || !last) return false
    return new Date(first).toISOString().slice(0, 10) !== new Date(last).toISOString().slice(0, 10)
  }).length

  const comebackRate = totalVisitors >= 10
    ? Math.round((returning / totalVisitors) * 100)
    : null

  await prisma.weeklySnapshot.upsert({
    where: { projectKey_weekStart: { projectKey, weekStart } },
    update: { totalVisitors, returning, comebackRate, topPage: topPages[0]?.url ?? null, totalEvents: pageViews },
    create: { projectKey, weekStart, totalVisitors, returning, comebackRate, topPage: topPages[0]?.url ?? null, totalEvents: pageViews },
  })
}

export async function getRecentSnapshots(projectKey: string, weeks = 4) {
  return prisma.weeklySnapshot.findMany({
    where: { projectKey },
    orderBy: { weekStart: 'desc' },
    take: weeks,
  })
}