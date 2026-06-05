import type { BehavioralPatterns, PulsarStats } from '@/types/index'
import type { RankedSignal, SignalInput } from '../types'
import { THRESHOLDS } from '../thresholds'

function toPath(url: string): string {
  try { return new URL(url).pathname } catch { return url }
}

export function detectDeadClickFriction(input: SignalInput): RankedSignal | null {
  const { patterns, current }: { patterns: BehavioralPatterns; current: PulsarStats } = input

  if (patterns.deadClickPages.length === 0) return null

  const totalSessions: number = current.totalVisitors

  const triggering: { url: string; count: number } | undefined = patterns.deadClickPages.find(
    (page: { url: string; count: number }) => {
      const meetsCount: boolean = page.count >= THRESHOLDS.deadClickFriction.minCount
      const meetsRate: boolean = totalSessions > 0
        ? (page.count / totalSessions) * 100 >= THRESHOLDS.deadClickFriction.minRatePercent
        : false
      return meetsCount && meetsRate
    }
  )

  if (!triggering) return null

  const ratePercent: number = totalSessions > 0
    ? Math.round((triggering.count / totalSessions) * 100)
    : 0

  const isOnActivationPage: boolean = patterns.activationPage === triggering.url

  const evidence: string[] = [
    `${triggering.count} dead clicks on ${toPath(triggering.url)}`,
    `Affects ~${ratePercent}% of sessions this week`,
    'Users are clicking elements that appear interactive but are not responding',
  ]

  if (isOnActivationPage) {
    evidence.push('This is your activation page — unresponsive elements here may be blocking users')
  }

  return {
    priority: isOnActivationPage ? 1 : 2,
    type: 'dead_click_friction',
    urgency: 'critical',
    headline: `Unresponsive elements detected on ${toPath(triggering.url)}`,
    evidence,
    recommendedAction: `Inspect ${toPath(triggering.url)} for elements that look clickable but have no interaction handler — check for missing onClick handlers, disabled states, or overlapping elements`,
  }
}