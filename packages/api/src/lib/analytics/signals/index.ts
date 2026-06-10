import type { RankedSignal, SignalInput } from './types'
import type { CorrelatedSignal } from './correlate'
import { correlateSignals } from './correlate'
import { detectRetentionRisk, detectPositiveTrend } from './detectors/retention'
import { detectActivationFriction } from './detectors/friction'
import { detectFunnelDrop } from './detectors/funnel'
import { detectHighIntentNoConvert } from './detectors/intent'
import { detectHiddenWinner } from './detectors/winner'
import { detectDeadClickFriction } from './detectors/dead-click'
import { detectMobileFriction } from './detectors/device'
import { detectReferrerFriction } from './detectors/referrer'
import { detectDecliningRetention, detectActivationDecay } from './detectors/trends'

export type { RankedSignal, SignalType, Urgency, SignalInput } from './types'
export type { CorrelatedSignal } from './correlate'

export interface RankedSignalResult {
  correlated: CorrelatedSignal | null
  signals: RankedSignal[]
}

export function rankSignals(input: SignalInput): RankedSignalResult {
  const results: (RankedSignal | null)[] = [
    detectRetentionRisk(input),
    detectPositiveTrend(input),
    detectFunnelDrop(input),
    detectActivationFriction(input),
    detectDeadClickFriction(input),
    detectHighIntentNoConvert(input),
    detectHiddenWinner(input),
    detectMobileFriction(input),
    detectReferrerFriction(input),
    detectDecliningRetention(input),
    detectActivationDecay(input),
  ]

  const urgencyOrder: Record<string, number> = { critical: 0, monitor: 1, positive: 2 }

  const allSignals: RankedSignal[] = results
    .filter((s): s is RankedSignal => s !== null)
    .sort((a: RankedSignal, b: RankedSignal) => {
      if (a.priority !== b.priority) return a.priority - b.priority
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
    })

  // when activation_decay fires, suppress retention_risk
  // the story is about funnel reach declining, not retention
  const hasActivationDecay: boolean = allSignals.some(
    (s: RankedSignal) => s.type === 'activation_decay'
  )
  const signals: RankedSignal[] = hasActivationDecay
    ? allSignals.filter((s: RankedSignal) => s.type !== 'retention_risk')
    : allSignals

  const correlated: CorrelatedSignal | null = correlateSignals(signals, input)

  // trend signals take precedence over correlation
  const hasTrendSignal: boolean = signals.some(
    (s: RankedSignal) => s.type === 'declining_retention' || s.type === 'activation_decay'
  )
  console.log('[debug] signals:', signals.map(s => s.type))
  console.log('[debug] correlated:', correlated?.type ?? 'none')
  return {
    correlated: hasTrendSignal ? null : correlated,
    signals,
  }
}