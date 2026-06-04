export type SignalType =
  | 'retention_risk'
  | 'positive_trend'
  | 'activation_friction'
  | 'funnel_drop'
  | 'high_intent_no_convert'
  | 'hidden_winner'

export type Urgency = 'critical' | 'monitor' | 'positive'

export interface RankedSignal {
  priority: 1 | 2 | 3
  type: SignalType
  urgency: Urgency
  headline: string
  evidence: string[]
  recommendedAction: string
}

export interface SignalInput {
  patterns: import('@/types/index').BehavioralPatterns
  current: import('@/types/index').PulsarStats
  snapshots: import('@/types/index').WeeklySnapshot[]
}