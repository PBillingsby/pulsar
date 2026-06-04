import type { BehavioralPatterns, PulsarStats, WeeklySnapshot } from '@/types/index'
import type { RankedSignal, SignalInput } from '../types'
import { THRESHOLDS } from '../thresholds'

function toPath(url: string): string {
  try { return new URL(url).pathname } catch { return url }
}

export function detectFunnelDrop(input: SignalInput): RankedSignal | null {
  const { current, snapshots }: { current: PulsarStats; snapshots: WeeklySnapshot[] } = input

  if (current.totalVisitors < THRESHOLDS.funnelDrop.minSessions) return null

  const currentSnapshot: WeeklySnapshot | undefined = snapshots[0]
  const previousSnapshot: WeeklySnapshot | undefined = snapshots.find(
    (s: WeeklySnapshot, i: number) => i > 0 && s.activationReachRate !== null
  )

  if (currentSnapshot?.activationReachRate == null) return null
  if (previousSnapshot?.activationReachRate == null) return null

  const drop: number = previousSnapshot.activationReachRate - currentSnapshot.activationReachRate
  if (drop < THRESHOLDS.funnelDrop.activationDropPts) return null

  const activationPath: string = currentSnapshot.activationPage
    ? toPath(currentSnapshot.activationPage)
    : 'activation page'

  const evidence: string[] = [
    `Activation reach rate dropped ${drop}pts — from ${previousSnapshot.activationReachRate}% to ${currentSnapshot.activationReachRate}%`,
    `Fewer sessions are reaching ${activationPath} this week`,
    `Based on ${current.totalVisitors} visitors`,
  ]

  return {
    priority: 1,
    type: 'funnel_drop',
    urgency: 'critical',
    headline: `Funnel to ${activationPath} dropped ${drop}pts this week`,
    evidence,
    recommendedAction: "Check what changed on {page} this week — look for UI changes, copy changes, or broken steps"
  }
}