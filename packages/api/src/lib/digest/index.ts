import { prisma } from '@/db/client'
import { getStats } from '@/lib/analytics/index'
import { detectPatterns } from '@/lib/analytics/patterns'
import { captureWeeklySnapshot, getRecentSnapshots } from '@/lib/analytics/snapshots'
import { generateLLMInsight } from '@/lib/digest/insight'
import type { DigestData, DigestContext, PulsarStats, WeeklySnapshot, BehavioralPatterns } from '@/types/index'

function getTopPage(url: string): string {
  try {
    const parsed: URL = new URL(url)
    return parsed.pathname === '/' ? 'homepage' : parsed.pathname
  } catch {
    return url
  }
}

export async function buildDigest(projectKey: string): Promise<DigestData> {
  // capture snapshot for this week before generating
  await captureWeeklySnapshot(projectKey)

  const [current, snapshots, patterns]: [PulsarStats, WeeklySnapshot[], BehavioralPatterns] = await Promise.all([
    getStats(projectKey),
    getRecentSnapshots(projectKey),
    detectPatterns(projectKey),
  ])

  const ctx: DigestContext = { current, snapshots, patterns }
  const insight: string = await generateLLMInsight(ctx)

  const returning: number = snapshots[0]?.returning ?? current.recentSessions.filter((s) => s.returned).length
  const topPage: string = current.topPages[0]?.url ?? ''
  const topPagePath: string = topPage ? getTopPage(topPage) : ''

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
    if (topPagePath) {
      lines.push(`Most visited: ${topPagePath}.`)
    }
  }

  // comeback trend
  const previousSnapshot: WeeklySnapshot | undefined = snapshots[1]
  let comebackTrend: string | null = null
  if (previousSnapshot?.comebackRate != null && current.comebackRate != null) {
    const diff: number = current.comebackRate - previousSnapshot.comebackRate
    if (diff > 0) comebackTrend = `+${diff}% vs last week`
    else if (diff < 0) comebackTrend = `${diff}% vs last week`
    else comebackTrend = 'unchanged from last week'
  }

  return {
    projectKey,
    date: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    summary: lines.join(' '),
    comebackRate: current.comebackRate,
    comebackTrend,
    totalVisitors: current.totalVisitors,
    topPage: topPagePath,
    returning,
    insight,
  }
}