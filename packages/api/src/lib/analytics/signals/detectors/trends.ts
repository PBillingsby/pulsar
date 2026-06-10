import type { WeeklySnapshot } from '@/types/index'
import type { RankedSignal, SignalInput } from '../types'
import { THRESHOLDS } from '../thresholds'

export function detectDecliningRetention(input: SignalInput): RankedSignal | null {
  const { snapshots, current } = input

  // need at least 3 snapshots with comeback rates to detect a trend
  const validSnapshots: WeeklySnapshot[] = snapshots
    .filter((s: WeeklySnapshot) => s.comebackRate !== null)
    .slice(0, 4)

  if (validSnapshots.length < THRESHOLDS.decliningRetention.minWeeks) return null

  // snapshots are ordered newest first — check for consecutive decline
  // validSnapshots[0] = most recent, [1] = week before, etc
  let consecutiveDeclines = 0
  for (let i = 0; i < validSnapshots.length - 1; i++) {
    const newer = validSnapshots[i].comebackRate as number
    const older = validSnapshots[i + 1].comebackRate as number
    if (newer < older) {
      consecutiveDeclines++
    } else {
      break
    }
  }
  console.log('[debug] all snapshots:', snapshots.map(s => ({
    weekStart: s.weekStart,
    activationPage: s.activationPage,
    activationReachRate: s.activationReachRate
  })))
  if (consecutiveDeclines < THRESHOLDS.decliningRetention.minConsecutiveDeclines) return null

  const oldest = validSnapshots[consecutiveDeclines].comebackRate as number
  const newest = validSnapshots[0].comebackRate as number
  const totalDrop = oldest - newest

  if (totalDrop < THRESHOLDS.decliningRetention.minTotalDrop) return null

  const weekLabels = validSnapshots
    .slice(0, consecutiveDeclines + 1)
    .reverse()
    .map((s: WeeklySnapshot) => {
      const d = new Date(s.weekStart)
      return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${s.comebackRate}%`
    })

  const evidence: string[] = [
    `Comeback rate has declined for ${consecutiveDeclines} consecutive weeks`,
    `Total drop: ${oldest}% down to ${newest}% (${totalDrop}pts)`,
    `Weekly trend: ${weekLabels.join(' → ')}`,
  ]

  if (current.totalVisitors >= 30) {
    evidence.push(`Based on ${current.totalVisitors} visitors this week — pattern is statistically meaningful`)
  } else {
    evidence.push(`Low visitor count (${current.totalVisitors}) — treat as directional`)
  }

  return {
    priority: 0,
    type: 'declining_retention',
    urgency: 'critical',
    headline: `Comeback rate has declined ${consecutiveDeclines} weeks in a row`,
    evidence,
    recommendedAction: `Review what changed ${consecutiveDeclines} weeks ago — look for product changes, traffic source shifts, or onboarding friction that appeared around that time`,
  }
}

export function detectActivationDecay(input: SignalInput): RankedSignal | null {
  const { snapshots } = input

  // need at least 3 snapshots with activation reach rates
  const validSnapshots: WeeklySnapshot[] = snapshots
    .filter((s: WeeklySnapshot) => s.activationReachRate !== null && s.activationPage !== null)
    .slice(0, 4)

  console.log('[debug] activation decay snapshots:', validSnapshots.map(s => s.activationPage))

  if (validSnapshots.length < THRESHOLDS.activationDecay.minWeeks) return null

  // check all snapshots reference the same activation page — decay across different pages isn't meaningful
  const activationPages = new Set(validSnapshots.map((s: WeeklySnapshot) => s.activationPage))
  if (activationPages.size > 1) return null

  let consecutiveDeclines = 0
  for (let i = 0; i < validSnapshots.length - 1; i++) {
    const newer = validSnapshots[i].activationReachRate as number
    const older = validSnapshots[i + 1].activationReachRate as number
    if (newer < older) {
      consecutiveDeclines++
    } else {
      break
    }
  }

  if (consecutiveDeclines < THRESHOLDS.activationDecay.minConsecutiveDeclines) return null

  const oldest = validSnapshots[consecutiveDeclines].activationReachRate as number
  const newest = validSnapshots[0].activationReachRate as number
  const totalDrop = oldest - newest

  if (totalDrop < THRESHOLDS.activationDecay.minTotalDrop) return null

  const activationPage = validSnapshots[0].activationPage as string
  function toPath(url: string): string {
    try { return new URL(url).pathname } catch { return url }
  }

  const weekLabels = validSnapshots
    .slice(0, consecutiveDeclines + 1)
    .reverse()
    .map((s: WeeklySnapshot) => {
      const d = new Date(s.weekStart)
      return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${s.activationReachRate}%`
    })

  const evidence: string[] = [
    `Fewer sessions are reaching ${toPath(activationPage)} each week for ${consecutiveDeclines} consecutive weeks`,
    `Total drop: ${oldest}% down to ${newest}% activation reach (${totalDrop}pts)`,
    `Weekly trend: ${weekLabels.join(' → ')}`,
  ]

  return {
    priority: 0,
    type: 'activation_decay',
    urgency: 'critical',
    headline: `Activation reach on ${toPath(activationPage)} has declined ${consecutiveDeclines} weeks in a row`,
    evidence,
    recommendedAction: `Investigate what changed in the funnel leading to ${toPath(activationPage)} — look for steps users are dropping off before reaching it`,
  }
}