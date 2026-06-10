export type SignalType =
  | 'retention_risk'
  | 'dead_click_friction'
  | 'positive_trend'
  | 'activation_friction'
  | 'funnel_drop'
  | 'high_intent_no_convert'
  | 'hidden_winner'
  | 'mobile_friction'
  | 'referrer_friction'
  | 'declining_retention'
  | 'activation_decay'

export type Urgency = 'critical' | 'monitor' | 'positive'

export interface RankedSignal {
  priority: 0 | 1 | 2 | 3
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