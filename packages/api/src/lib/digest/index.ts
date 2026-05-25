import { prisma } from '@/db/client'
import { getStats } from '@/lib/analytics/index'
import { detectPatterns } from '@/lib/analytics/patterns'
import { captureWeeklySnapshot, getRecentSnapshots } from '@/lib/analytics/snapshots'
import { generateLLMInsight } from '@/lib/digest/insight'
import type { DigestData, DigestContext, PulsarStats, WeeklySnapshot, BehavioralPatterns } from '@/types/index'

function getPathFromUrl(url: string): string {
  try {
    const parsed: URL = new URL(url)
    return parsed.pathname === '/' ? 'homepage' : parsed.pathname
  } catch {
    return url
  }
}

export async function buildDigest(projectKey: string): Promise<DigestData> {
  await captureWeeklySnapshot(projectKey)

  const [current, snapshots, patterns]: [PulsarStats, WeeklySnapshot[], BehavioralPatterns] = await Promise.all([
    getStats(projectKey),
    getRecentSnapshots(projectKey),
    detectPatterns(projectKey),
  ])

  const ctx: DigestContext = { current, snapshots, patterns }
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
    lines.push('No visitors yet.')
  } else {
    lines.push(`${current.totalVisitors} ${current.totalVisitors === 1 ? 'visitor' : 'visitors'} in the last 7 days.`)
    if (returning > 0) {
      lines.push(`${returning} came back.`)
    } else {
      lines.push('No one has returned yet.')
    }
    if (keyPagePath) {
      const pageLabel: string = isActivationPage
        ? `Users who reach ${keyPagePath} are significantly more likely to return.`
        : `Most visited: ${keyPagePath}.`
      lines.push(pageLabel)
    }
  }

  const previousSnapshot: WeeklySnapshot | undefined = snapshots.find(
    (s: WeeklySnapshot, i: number) => i > 0 && s.comebackRate !== null
  )

  let comebackTrend: string | null = null
  if (previousSnapshot?.comebackRate != null && current.comebackRate != null) {
    const diff: number = current.comebackRate - previousSnapshot.comebackRate
    if (diff > 0) comebackTrend = `+${diff}pts vs last week`
    else if (diff < 0) comebackTrend = `${diff}pts vs last week`
    else comebackTrend = 'unchanged vs last week'
  }

  return {
    projectKey,
    date: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
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