import type { WeeklySnapshot } from '@/types/index'
import type { RankedSignal, SignalInput } from '../types'
import { THRESHOLDS } from '../thresholds'

function toPath(url: string): string {
  try { return new URL(url).pathname } catch { return url }
}

function completedSnapshots(snapshots: WeeklySnapshot[]): WeeklySnapshot[] {
  const oneWeekAgo: Date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  return snapshots.filter((s: WeeklySnapshot) => new Date(s.weekStart) < oneWeekAgo)
}

function formatTrend(values: (number | null)[]): string {
  return values.filter((v): v is number => v !== null).map(v => `${v}%`).join(' → ')
}

function countConsecutiveDeclines(values: number[]): number {
  let count = 0
  for (let i = 0; i < values.length - 1; i++) {
    if (values[i] < values[i + 1]) count++
    else break
  }
  return count
}

export function detectDecliningRetention(input: SignalInput): RankedSignal | null {
  const { snapshots, current } = input

  const valid: WeeklySnapshot[] = completedSnapshots(snapshots)
    .filter((s: WeeklySnapshot) => s.comebackRate !== null)
    .slice(0, 4)

  if (valid.length < THRESHOLDS.decliningRetention.minWeeks) return null

  const rates: number[] = valid.map((s: WeeklySnapshot) => s.comebackRate as number)
  const consecutiveDeclines: number = countConsecutiveDeclines(rates)

  if (consecutiveDeclines < THRESHOLDS.decliningRetention.minConsecutiveDeclines) return null

  const oldest: number = rates[consecutiveDeclines]
  const newest: number = rates[0]
  const totalDrop: number = oldest - newest

  if (totalDrop < THRESHOLDS.decliningRetention.minTotalDrop) return null

  const trendValues: number[] = rates.slice(0, consecutiveDeclines + 1).reverse()

  const evidence: string[] = [
    `Comeback rate has declined for ${consecutiveDeclines} consecutive weeks`,
    `Total drop: ${oldest}% down to ${newest}% (${totalDrop}pts)`,
    `Weekly trend: ${formatTrend(trendValues)}`,
    current.totalVisitors >= 30
      ? `Based on ${current.totalVisitors} visitors this week — pattern is statistically meaningful`
      : `Low visitor count (${current.totalVisitors}) — treat as directional`,
  ]

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

  const valid: WeeklySnapshot[] = completedSnapshots(snapshots)
    .filter((s: WeeklySnapshot) =>
      s.activationReachRate !== null &&
      s.activationPage !== null
    )
    .slice(0, 4)

  if (valid.length < THRESHOLDS.activationDecay.minWeeks) return null

  const activationPages = new Set(valid.map((s: WeeklySnapshot) => s.activationPage))
  if (activationPages.size > 1) return null

  const rates: number[] = valid.map((s: WeeklySnapshot) => s.activationReachRate as number)
  const consecutiveDeclines: number = countConsecutiveDeclines(rates)

  if (consecutiveDeclines < THRESHOLDS.activationDecay.minConsecutiveDeclines) return null

  const oldest: number = rates[consecutiveDeclines]
  const newest: number = rates[0]
  const totalDrop: number = oldest - newest

  if (totalDrop < THRESHOLDS.activationDecay.minTotalDrop) return null

  const activationPath: string = toPath(valid[0].activationPage as string)
  const trendValues: number[] = rates.slice(0, consecutiveDeclines + 1).reverse()

  // check if comeback rate is improving over the same period
  const comebackRates: (number | null)[] = valid
    .slice(0, consecutiveDeclines + 1)
    .reverse()
    .map((s: WeeklySnapshot) => s.comebackRate)

  const comebackImproving: boolean = comebackRates.every(r => r !== null) &&
    (comebackRates[comebackRates.length - 1] as number) > (comebackRates[0] as number)

  const evidence: string[] = [
    `Fewer sessions are reaching ${activationPath} each week for ${consecutiveDeclines} consecutive weeks`,
    `Total drop: ${oldest}% down to ${newest}% activation reach (${totalDrop}pts)`,
    `Activation trend: ${formatTrend(trendValues)}`,
  ]

  if (comebackImproving) {
    const comebackOldest = comebackRates[0] as number
    const comebackNewest = comebackRates[comebackRates.length - 1] as number
    evidence.push(
      `Comeback rate improved from ${comebackOldest}% to ${comebackNewest}% over the same period — users who activate are increasingly likely to return`
    )
  }

  return {
    priority: 0,
    type: 'activation_decay',
    urgency: 'critical',
    headline: `Activation reach on ${activationPath} has declined ${consecutiveDeclines} weeks in a row`,
    evidence,
    recommendedAction: `Investigate what changed in the funnel leading to ${activationPath} — look for steps users are dropping off before reaching it`,
  }
}