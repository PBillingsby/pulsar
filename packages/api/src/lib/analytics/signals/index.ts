import type { RankedSignal, SignalInput } from './types'
import { detectRetentionRisk, detectPositiveTrend } from './detectors/retention'
import { detectActivationFriction } from './detectors/friction'
import { detectFunnelDrop } from './detectors/funnel'
import { detectHighIntentNoConvert } from './detectors/intent'
import { detectHiddenWinner } from './detectors/winner'

export type { RankedSignal, SignalType, Urgency, SignalInput } from './types'

export function rankSignals(input: SignalInput): RankedSignal[] {
  const results: (RankedSignal | null)[] = [
    detectRetentionRisk(input),
    detectPositiveTrend(input),
    detectFunnelDrop(input),
    detectActivationFriction(input),
    detectHighIntentNoConvert(input),
    detectHiddenWinner(input),
  ]

  const urgencyOrder: Record<string, number> = { critical: 0, monitor: 1, positive: 2 }

  return results
    .filter((s): s is RankedSignal => s !== null)
    .sort((a: RankedSignal, b: RankedSignal) => {
      if (a.priority !== b.priority) return a.priority - b.priority
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
    })
}