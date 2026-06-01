import { prisma } from '@/db/client'
import { getStats } from '@/lib/analytics/index'
import { detectPatterns } from '@/lib/analytics/patterns'
import { captureWeeklySnapshot, getRecentSnapshots } from '@/lib/analytics/snapshots'
import { generateLLMInsight } from '@/lib/digest/insight'
import type { DigestData, DigestContext, PulsarStats, WeeklySnapshot, BehavioralPatterns } from '@/types/index'
import { LOCALE_MAP, getEmailStrings } from '../email/translations'

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
    prisma.project.findUnique({ where: { projectKey }, select: { language: true } }),
  ])

  const language = project?.language ?? 'English'
  const t = getEmailStrings(language)
  const ctx: DigestContext = { current, snapshots, patterns, language }
  const insight: string = await generateLLMInsight(ctx)

  const returningCount: number = Math.round(
    current.totalVisitors * ((current.comebackRate ?? 0) / 100)
  )
  const returning: number = returningCount

  const activationUrl: string | null = patterns.activationPage
  const topUrl: string = current.topPages[0]?.url ?? ''

  const keyPageUrl: string = activationUrl ?? topUrl
  const keyPagePath: string = keyPageUrl ? getPathFromUrl(keyPageUrl) : ''
  const isActivationPage: boolean = activationUrl !== null

  const lines: string[] = []
  if (current.totalVisitors === 0) {
    lines.push(t.noVisitors)
  } else {
    const visitorWord = current.totalVisitors === 1 ? t.visitorSingular : t.visitorPlural
    lines.push(`${current.totalVisitors} ${visitorWord} ${t.inTheLast7Days}`)
    if (returning > 0) {
      lines.push(`${returning} ${t.cameBack}`)
    } else {
      lines.push(t.noOneReturned)
    }
    if (keyPagePath) {
      lines.push(isActivationPage
        ? t.activationPageLabel(keyPagePath)
        : t.topPageLabel(keyPagePath)
      )
    }
  }

  const previousSnapshot: WeeklySnapshot | undefined = snapshots.find(
    (s: WeeklySnapshot, i: number) => i > 0 && s.comebackRate !== null
  )

  let comebackTrend: string | null = null
  if (previousSnapshot?.comebackRate != null && current.comebackRate != null) {
    const diff: number = current.comebackRate - previousSnapshot.comebackRate
    if (diff > 0) comebackTrend = t.trendUp(diff)
    else if (diff < 0) comebackTrend = t.trendDown(diff)
    else comebackTrend = t.trendUnchanged
  }

  const locale = LOCALE_MAP[language] ?? 'en-US'

  return {
    projectKey,
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