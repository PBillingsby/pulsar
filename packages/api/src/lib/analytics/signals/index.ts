import type { RankedSignal, SignalInput } from './types'
import type { CorrelatedSignal } from './correlate'
import { detectRetentionRisk, detectPositiveTrend } from './detectors/retention'
import { detectActivationFriction } from './detectors/friction'
import { detectFunnelDrop } from './detectors/funnel'
import { detectHighIntentNoConvert } from './detectors/intent'
import { detectHiddenWinner } from './detectors/winner'
import { correlateSignals } from './correlate'

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
    detectHighIntentNoConvert(input),
    detectHiddenWinner(input),
  ]

  const urgencyOrder: Record<string, number> = { critical: 0, monitor: 1, positive: 2 }

  const signals: RankedSignal[] = results
    .filter((s): s is RankedSignal => s !== null)
    .sort((a: RankedSignal, b: RankedSignal) => {
      if (a.priority !== b.priority) return a.priority - b.priority
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
    })

  const correlated: CorrelatedSignal | null = correlateSignals(signals, input)

  return { correlated, signals }
}