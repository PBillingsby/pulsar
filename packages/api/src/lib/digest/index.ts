import { prisma } from '@/db/client'
import { getStats } from '@/lib/analytics/index'
import { detectPatterns } from '@/lib/analytics/patterns'
import { getRecentSnapshots } from '@/lib/analytics/snapshots'
import { generateLLMInsight } from '@/lib/digest/insight'
import { getStrings, LOCALE_MAP, t } from '@/lib/i18n/index'
import type { DigestContext, DigestData, WeeklySnapshot } from '@/types/index'

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
    prisma.project.findUnique({ where: { projectKey }, select: { language: true, email: true, plan: true } }),
  ])

  console.log('[debug] totalVisitors:', current.totalVisitors)
  console.log('[debug] snapshots:', snapshots.length)

  const language = project?.language ?? 'English'
  const s = getStrings(language)
  const ctx: DigestContext = { current, snapshots, patterns, language, plan: project?.plan ?? 'free' }
  const insight: string = await generateLLMInsight(ctx)

  const returning: number = Math.round(
    current.totalVisitors * ((current.comebackRate ?? 0) / 100)
  )

  const activationUrl: string | null = patterns.activationPage
  const topUrl: string = current.topPages[0]?.url ?? ''
  const keyPageUrl: string = activationUrl ?? topUrl
  const keyPagePath: string = keyPageUrl ? getPathFromUrl(keyPageUrl) : ''
  const isActivationPage: boolean = activationUrl !== null

  // @TODO - Add english strings to locale files
  const lines: string[] = []
  if (current.totalVisitors === 0) {
    lines.push('No visitors yet.')
  } else {
    lines.push(`${current.totalVisitors} ${current.totalVisitors === 1 ? 'visitor' : 'visitors'} in the last 7 days.`)
    if (returning > 0) {
      lines.push(`${returning} came back.`)
    } else {
      lines.push('No one has returned yet — keep driving traffic.')
    }
    if (keyPagePath) {
      const pageLabel: string = isActivationPage
        ? `Users who reach ${keyPagePath} are significantly more likely to return.`
        : `Most visited: ${keyPagePath}.`
      lines.push(pageLabel)
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