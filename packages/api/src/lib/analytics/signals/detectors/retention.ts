import type { WeeklySnapshot } from '@/types/index'
import type { RankedSignal, SignalInput } from '../types'
import { THRESHOLDS } from '../thresholds'

function toPath(url: string): string {
  try { return new URL(url).pathname } catch { return url }
}

function getPreviousSnapshot(snapshots: WeeklySnapshot[]): WeeklySnapshot | undefined {
  return snapshots.find((s: WeeklySnapshot, i: number) => i > 0 && s.comebackRate !== null)
}



export function detectRetentionRisk(input: SignalInput): RankedSignal | null {
  const { current, patterns, snapshots } = input

  if (current.totalVisitors < THRESHOLDS.retentionRisk.minVisitors) return null
  if (current.comebackRate === null) return null

  // if completed snapshots show an improving trend, suppress retention_risk
  // the current week drop may be noise against a recovering baseline
  const completedSnapshots: WeeklySnapshot[] = snapshots
    .filter((s: WeeklySnapshot) => s.comebackRate !== null)
    .slice(0, 3)

  if (completedSnapshots.length >= 2) {
    const isImproving: boolean =
      (completedSnapshots[0].comebackRate as number) > (completedSnapshots[1].comebackRate as number)
    if (isImproving) return null
  }

  const previous: WeeklySnapshot | undefined = getPreviousSnapshot(snapshots)
  if (previous?.comebackRate == null) return null

  const drop: number = previous.comebackRate - current.comebackRate
  if (drop < THRESHOLDS.retentionRisk.comebackDropPts) return null

  const evidence: string[] = [
    `Comeback rate dropped ${drop}pts — from ${previous.comebackRate}% to ${current.comebackRate}%`,
    `Based on ${current.totalVisitors} visitors this week`,
  ]

  if (patterns.rageClickPages.length > 0) {
    const top: { url: string; count: number } = patterns.rageClickPages[0]
    evidence.push(`Rage clicks detected on ${toPath(top.url)} (${top.count} occurrences) — may be related`)
  }

  return {
    priority: 1,
    type: 'retention_risk',
    urgency: 'critical',
    headline: `Comeback rate dropped ${drop}pts this week`,
    evidence,
    recommendedAction: "Compare this week's sessions to last week and look for what changed in the onboarding or activation flow",
  }
}

export function detectPositiveTrend(input: SignalInput): RankedSignal | null {
  const { current, patterns, snapshots } = input

  if (current.totalVisitors < THRESHOLDS.positiveTrend.minVisitors) return null
  if (current.comebackRate === null) return null

  const previous: WeeklySnapshot | undefined = getPreviousSnapshot(snapshots)
  if (previous?.comebackRate == null) return null

  const rise: number = current.comebackRate - previous.comebackRate
  if (rise < THRESHOLDS.positiveTrend.comebackRisePts) return null

  const evidence: string[] = [
    `Comeback rate rose ${rise}pts — from ${previous.comebackRate}% to ${current.comebackRate}%`,
    `Based on ${current.totalVisitors} visitors this week`,
  ]

  if (patterns.activationPage) {
    evidence.push(`Activation page ${toPath(patterns.activationPage)} may be contributing`)
  }

  return {
    priority: 1,
    type: 'positive_trend',
    urgency: 'positive',
    headline: `Comeback rate up ${rise}pts this week`,
    evidence,
    recommendedAction: "Identify what changed this week and make sure you can repeat it"
  }
}