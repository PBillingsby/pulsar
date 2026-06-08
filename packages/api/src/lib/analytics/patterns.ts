import { prisma } from '@/db/client'
import type { BehavioralPatterns } from '@/types/index'

export async function detectPatterns(projectKey: string): Promise<BehavioralPatterns> {
  const since: Date = new Date()
  since.setDate(since.getDate() - 30)

  const sessionData = await prisma.event.groupBy({
    by: ['sessionId'],
    where: { projectKey, type: 'page_view', timestamp: { gte: since } },
    _count: { sessionId: true },
    _min: { timestamp: true },
    _max: { timestamp: true },
  })

  const returnerSessions: string[] = sessionData
    .filter((s) => {
      const first: Date | null = s._min.timestamp
      const last: Date | null = s._max.timestamp
      if (!first || !last) return false
      return new Date(first).toISOString().slice(0, 10) !== new Date(last).toISOString().slice(0, 10)
    })
    .map((s) => s.sessionId)

  const bouncerSessions: string[] = sessionData
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
      avgSessionDurationReturners: null,
      avgSessionDurationBouncers: null,
      rageClickPages: [],
      deadClickPages: [],
      formSubmissionRate: null,
      highIntentPages: [],
      activationPageScrollDepth: null,
      deviceBreakdown: null,
      referrerBreakdown: null,
    }
  }

  const [
    returnerPages,
    bouncerPages,
    returnerFirstEvents,
    sessionEndEvents,
    rageClickEvents,
    formSubmitEvents,
    copyEvents,
    deadClickEvents,
    firstPageViewEvents,
    referrerEvents,
  ] = await Promise.all([
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
    // session end events for duration calculation
    prisma.event.findMany({
      where: { projectKey, type: 'session_end', timestamp: { gte: since } },
      select: { sessionId: true, metadata: true },
    }),
    // rage click events grouped by page
    prisma.event.groupBy({
      by: ['url'],
      where: { projectKey, type: 'rage_click', timestamp: { gte: since } },
      _count: { url: true },
      orderBy: { _count: { url: 'desc' } },
      take: 5,
    }),
    // form submit events
    prisma.event.findMany({
      where: { projectKey, type: 'form_submit', timestamp: { gte: since } },
      select: { sessionId: true, url: true },
    }),
    // copy events — high intent pages
    prisma.event.groupBy({
      by: ['url'],
      where: { projectKey, type: 'copy', timestamp: { gte: since } },
      _count: { url: true },
      orderBy: { _count: { url: 'desc' } },
      take: 5,
    }),
    // dead click events grouped by page
    prisma.event.groupBy({
      by: ['url'],
      where: { projectKey, type: 'dead_click', timestamp: { gte: since } },
      _count: { url: true },
      orderBy: { _count: { url: 'desc' } },
      take: 5,
    }),
    // first page_view per session for device detection
    prisma.event.findMany({
      where: { projectKey, type: 'page_view', timestamp: { gte: since } },
      orderBy: { timestamp: 'asc' },
      distinct: ['sessionId'],
      select: { sessionId: true, metadata: true },
    }),
    // first page_view per session for referrer
    prisma.event.findMany({
      where: { projectKey, type: 'page_view', timestamp: { gte: since } },
      orderBy: { timestamp: 'asc' },
      distinct: ['sessionId'],
      select: { sessionId: true, referrer: true },
    }),
  ])

  // activation page
  const bouncerTopUrl: string | null = bouncerPages[0]?.url ?? null
  const activationPage: string | null = returnerPages.find(
    (p) => p.url !== bouncerTopUrl
  )?.url ?? returnerPages[0]?.url ?? null

  // returner first pages
  const firstPageCounts: Record<string, number> = {}
  for (const e of returnerFirstEvents) {
    firstPageCounts[e.url] = (firstPageCounts[e.url] ?? 0) + 1
  }
  const returnerFirstPages = Object.entries(firstPageCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([url, count]) => ({ url, count }))

  // avg session depth
  const avgDepthReturners: number = returnerSessions.length > 0
    ? sessionData.filter((s) => returnerSessions.includes(s.sessionId))
      .reduce((sum, s) => sum + (s._count.sessionId ?? 0), 0) / returnerSessions.length
    : 0

  const avgDepthBouncers: number = bouncerSessions.length > 0
    ? sessionData.filter((s) => bouncerSessions.includes(s.sessionId))
      .reduce((sum, s) => sum + (s._count.sessionId ?? 0), 0) / bouncerSessions.length
    : 0

  // session durations
  const returnerDurations: number[] = sessionEndEvents
    .filter((e) => returnerSessions.includes(e.sessionId))
    .map((e) => {
      const meta = e.metadata as Record<string, unknown>
      return typeof meta?.durationSeconds === 'number' ? meta.durationSeconds : null
    })
    .filter((d): d is number => d !== null)

  const bouncerDurations: number[] = sessionEndEvents
    .filter((e) => bouncerSessions.includes(e.sessionId))
    .map((e) => {
      const meta = e.metadata as Record<string, unknown>
      return typeof meta?.durationSeconds === 'number' ? meta.durationSeconds : null
    })
    .filter((d): d is number => d !== null)

  const avgSessionDurationReturners: number | null = returnerDurations.length > 0
    ? Math.round(returnerDurations.reduce((a, b) => a + b, 0) / returnerDurations.length)
    : null

  const avgSessionDurationBouncers: number | null = bouncerDurations.length > 0
    ? Math.round(bouncerDurations.reduce((a, b) => a + b, 0) / bouncerDurations.length)
    : null

  // rage click pages
  const rageClickPages = rageClickEvents.map((e) => ({
    url: e.url,
    count: e._count.url,
  }))

  // dead click pages
  const deadClickPages = deadClickEvents.map((e) => ({
    url: e.url,
    count: e._count.url,
  }))

  // form submission rate
  const formSubmitSessions: Set<string> = new Set(formSubmitEvents.map((e) => e.sessionId))
  const totalSessions: number = sessionData.length
  const formSubmissionRate: number | null = totalSessions > 0 && formSubmitEvents.length > 0
    ? Math.round((formSubmitSessions.size / totalSessions) * 100)
    : null

  // high intent pages from copy events
  const highIntentPages = copyEvents.map((e) => ({
    url: e.url,
    count: e._count.url,
  }))

  // scroll depth on activation page
  let activationPageScrollDepth: number | null = null
  if (activationPage) {
    const scrollEvents = await prisma.event.findMany({
      where: { projectKey, type: 'scroll_depth', url: activationPage, timestamp: { gte: since } },
      select: { metadata: true },
    })

    const depths: number[] = scrollEvents
      .map((e) => {
        const meta = e.metadata as Record<string, unknown>
        return typeof meta?.depth === 'number' ? meta.depth : null
      })
      .filter((d): d is number => d !== null)

    activationPageScrollDepth = depths.length > 0
      ? Math.round(depths.reduce((a, b) => a + b, 0) / depths.length)
      : null
  }

  // device breakdown
  const deviceCounts = { mobile: 0, tablet: 0, desktop: 0 }
  let hasDeviceData: boolean = false

  for (const e of firstPageViewEvents) {
    const meta = e.metadata as Record<string, unknown>
    const deviceType = meta?.deviceType as string | undefined
    if (deviceType === 'mobile') { deviceCounts.mobile++; hasDeviceData = true }
    else if (deviceType === 'tablet') { deviceCounts.tablet++; hasDeviceData = true }
    else if (deviceType === 'desktop') { deviceCounts.desktop++; hasDeviceData = true }
  }

  // referrer breakdown
  const referrerCounts: Record<string, number> = {}
  for (const e of referrerEvents) {
    if (!e.referrer) continue
    try {
      const source: string = new URL(e.referrer).hostname.replace('www.', '')
      referrerCounts[source] = (referrerCounts[source] ?? 0) + 1
    } catch {
      continue
    }
  }

  const referrerBreakdown = Object.entries(referrerCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([source, count]) => ({ source, count }))

  return {
    returnerTopPage: returnerPages[0]?.url ?? null,
    bouncerTopPage: bouncerTopUrl,
    activationPage,
    avgDepthReturners: Math.round(avgDepthReturners * 10) / 10,
    avgDepthBouncers: Math.round(avgDepthBouncers * 10) / 10,
    returnerFirstPages,
    avgSessionDurationReturners,
    avgSessionDurationBouncers,
    rageClickPages,
    deadClickPages,
    formSubmissionRate,
    highIntentPages,
    activationPageScrollDepth,
    deviceBreakdown: hasDeviceData ? deviceCounts : null,
    referrerBreakdown: referrerBreakdown.length > 0 ? referrerBreakdown : null,
  }
}