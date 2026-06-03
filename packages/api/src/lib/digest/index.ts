import { prisma } from '@/db/client'
import { getStats } from '@/lib/analytics/index'
import { detectPatterns } from '@/lib/analytics/patterns'
import { getRecentSnapshots } from '@/lib/analytics/snapshots'
import { generateLLMInsight } from '@/lib/digest/insight'
import type { DigestData, DigestContext, WeeklySnapshot } from '@/types/index'
import { getStrings, t, LOCALE_MAP } from '@/lib/i18n/index'

function getPathFromUrl(url: string): string {
  try {
    const parsed: URL = new URL(url)
    return parsed.pathname === '/' ? 'homepage' : parsed.pathname
  } catch {
    return url
  }
}

export async function buildDigest(projectKey: string): Promise<DigestData> {
  const [current, snapshots, patterns, project] = await Promise.all([
    getStats(projectKey),
    getRecentSnapshots(projectKey),
    detectPatterns(projectKey),
    prisma.project.findUnique({ where: { projectKey }, select: { language: true, email: true } }),
  ])

  const language = project?.language ?? 'English'
  const s = getStrings(language)
  const ctx: DigestContext = { current, snapshots, patterns, language }
  const insight: string = await generateLLMInsight(ctx)

  const returning: number = Math.round(
    current.totalVisitors * ((current.comebackRate ?? 0) / 100)
  )

  const activationUrl: string | null = patterns.activationPage
  const topUrl: string = current.topPages[0]?.url ?? ''
  const keyPageUrl: string = activationUrl ?? topUrl
  const keyPagePath: string = keyPageUrl ? getPathFromUrl(keyPageUrl) : ''
  const isActivationPage: boolean = activationUrl !== null

  const lines: string[] = []
  if (current.totalVisitors === 0) {
    lines.push(s.noVisitors)
  } else {
    const visitorWord = current.totalVisitors === 1 ? s.visitorSingular : s.visitorPlural
    lines.push(`${current.totalVisitors} ${visitorWord} ${s.inTheLast7Days}`)
    lines.push(returning > 0 ? `${returning} ${s.cameBack}` : s.noOneReturned)
    if (keyPagePath) {
      lines.push(isActivationPage
        ? t(s.activationPageLabel, { path: keyPagePath })
        : t(s.topPageLabel, { path: keyPagePath })
      )
    }
  }

  const previousSnapshot: WeeklySnapshot | undefined = snapshots.find(
    (_s: WeeklySnapshot, i: number) => i > 0 && _s.comebackRate !== null
  )

  let comebackTrend: string | null = null
  if (previousSnapshot?.comebackRate != null && current.comebackRate != null) {
    const diff: number = current.comebackRate - previousSnapshot.comebackRate
    if (diff > 0) comebackTrend = t(s.trendUp, { diff })
    else if (diff < 0) comebackTrend = t(s.trendDown, { diff })
    else comebackTrend = s.trendUnchanged
  }

  const locale = LOCALE_MAP[language] ?? 'en-US'

  return {
    projectKey,
    email: project?.email ?? '',
    date: new Date().toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' }),
    summary: lines.join(' '),
    comebackRate: current.comebackRate,
    comebackTrend,
    totalVisitors: current.totalVisitors,
    keyPage: keyPagePath,
    isActivationPage,
    topPage: keyPagePath,
    returning,
    insight,
    snapshots,
  }
}