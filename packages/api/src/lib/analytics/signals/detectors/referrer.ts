import type { BehavioralPatterns, PulsarStats } from '@/types/index'
import type { RankedSignal, SignalInput } from '../types'
import { THRESHOLDS } from '../thresholds'

export function detectReferrerFriction(input: SignalInput): RankedSignal | null {
  const { patterns, current }: { patterns: BehavioralPatterns; current: PulsarStats } = input

  if (!patterns.referrerBreakdown || patterns.referrerBreakdown.length === 0) return null

  const totalSessions: number = current.totalVisitors
  if (totalSessions < THRESHOLDS.referrerFriction.minSessions) return null

  const topReferrer: { source: string; count: number } = patterns.referrerBreakdown[0]
  const referrerRate: number = topReferrer.count / totalSessions

  if (referrerRate < THRESHOLDS.referrerFriction.minReferrerRate) return null

  const hasFriction: boolean =
    patterns.rageClickPages.length > 0 || patterns.deadClickPages.length > 0

  const highBounceRate: boolean =
    patterns.avgSessionDurationBouncers !== null &&
    patterns.avgSessionDurationBouncers < 30

  if (!hasFriction && !highBounceRate) return null

  const referrerPercent: number = Math.round(referrerRate * 100)

  const evidence: string[] = [
    `${referrerPercent}% of sessions this week came from ${topReferrer.source} (${topReferrer.count} of ${totalSessions} sessions)`,
  ]

  if (hasFriction) {
    const topFrictionPage = patterns.rageClickPages[0] ?? patterns.deadClickPages[0]
    function toPath(url: string): string {
      try { return new URL(url).pathname } catch { return url }
    }
    evidence.push(`Friction detected on ${toPath(topFrictionPage.url)} — may indicate a mismatch between what ${topReferrer.source} visitors expect and what the product delivers`)
  }

  if (highBounceRate) {
    evidence.push(`Sessions from this referrer have an average duration of ${patterns.avgSessionDurationBouncers}s — visitors may not be finding what they came for`)
  }

  return {
    priority: 2,
    type: 'referrer_friction',
    urgency: 'monitor',
    headline: `High traffic from ${topReferrer.source} with signs of friction`,
    evidence,
    recommendedAction: `Review what ${topReferrer.source} visitors see when they land — check if the landing page matches the expectation set by the referral source`,
  }
}