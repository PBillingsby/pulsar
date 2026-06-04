import type { RankedSignal, SignalInput } from '../types'
import { THRESHOLDS } from '../thresholds'

function toPath(url: string): string {
  try { return new URL(url).pathname } catch { return url }
}

export function detectActivationFriction(input: SignalInput): RankedSignal | null {
  const { patterns, current } = input

  if (patterns.rageClickPages.length === 0) return null

  const totalSessions: number = current.totalVisitors

  // find the first page that meets all thresholds
  const triggering = patterns.rageClickPages.find(page => {
    const meetsCount = page.count >= THRESHOLDS.rageclickFriction.minCount
    const meetsRate = totalSessions > 0
      ? (page.count / totalSessions) * 100 >= THRESHOLDS.rageclickFriction.minRatePercent
      : false
    return meetsCount && meetsRate
  })

  if (!triggering) return null

  const ratePercent = totalSessions > 0
    ? Math.round((triggering.count / totalSessions) * 100)
    : 0

  const evidence: string[] = [
    `${triggering.count} rage clicks on ${toPath(triggering.url)}`,
    `Affects ~${ratePercent}% of sessions this week`,
  ]

  const isOnActivationPage = input.patterns.activationPage === triggering.url
  if (isOnActivationPage) {
    evidence.push('This is your activation page — friction here directly impacts retention')
  }

  return {
    priority: isOnActivationPage ? 1 : 2,
    type: 'activation_friction',
    urgency: 'critical',
    headline: `UI friction detected on ${toPath(triggering.url)}`,
    evidence,
  }
}