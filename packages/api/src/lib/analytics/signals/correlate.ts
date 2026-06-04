import type { BehavioralPatterns } from '@/types/index'
import type { RankedSignal, SignalInput } from './types'

export interface CorrelatedSignal {
  priority: 0
  type: 'activation_page_convergence'
  urgency: 'critical'
  headline: string
  evidence: string[]
  contributingSignals: RankedSignal['type'][]
}

function toPath(url: string): string {
  try { return new URL(url).pathname } catch { return url }
}

export function correlateSignals(
  signals: RankedSignal[],
  input: SignalInput
): CorrelatedSignal | null {
  const { patterns }: { patterns: BehavioralPatterns } = input

  if (!patterns.activationPage) return null

  const activationPath: string = toPath(patterns.activationPage)

  // find signals that are directly related to the activation page
  const frictionOnActivation: RankedSignal | undefined = signals.find(
    (s: RankedSignal) =>
      s.type === 'activation_friction' &&
      s.evidence.some((e: string) => e.includes(activationPath))
  )

  const funnelDrop: RankedSignal | undefined = signals.find(
    (s: RankedSignal) => s.type === 'funnel_drop'
  )

  const highIntentNoConvert: RankedSignal | undefined = signals.find(
    (s: RankedSignal) => s.type === 'high_intent_no_convert'
  )

  const retentionRisk: RankedSignal | undefined = signals.find(
    (s: RankedSignal) => s.type === 'retention_risk'
  )

  // collect which signals are converging
  const converging: RankedSignal[] = [
    frictionOnActivation,
    funnelDrop,
    highIntentNoConvert,
    retentionRisk,
  ].filter((s): s is RankedSignal => s !== undefined)

  // only fire if 2 or more signals point at the same problem
  if (converging.length < 2) return null

  const contributingSignals: RankedSignal['type'][] = converging.map(
    (s: RankedSignal) => s.type
  )

  // build evidence from contributing signals
  const evidence: string[] = [
    `${activationPath} is your detected activation page — users who reach it return significantly more`,
  ]

  if (frictionOnActivation) {
    evidence.push(...frictionOnActivation.evidence.slice(0, 2))
  }

  if (funnelDrop) {
    evidence.push(funnelDrop.evidence[0])
  }

  if (highIntentNoConvert) {
    evidence.push(highIntentNoConvert.evidence[0])
  }

  if (retentionRisk) {
    evidence.push(retentionRisk.evidence[0])
  }

  // build headline based on which signals converged
  const hasFriction: boolean = frictionOnActivation !== undefined
  const hasDrop: boolean = funnelDrop !== undefined
  const hasRetention: boolean = retentionRisk !== undefined

  let headline: string
  if (hasFriction && hasRetention) {
    headline = `${activationPath} is your most important page and may be broken — friction and retention risk are converging here`
  } else if (hasFriction && hasDrop) {
    headline = `${activationPath} is losing sessions and showing friction — fewer users are reaching it and those who do are hitting problems`
  } else if (hasFriction) {
    headline = `${activationPath} is your activation page and appears to have UI friction — multiple signals converging here`
  } else {
    headline = `Multiple signals are converging on ${activationPath} — this page deserves immediate attention`
  }

  return {
    priority: 0,
    type: 'activation_page_convergence',
    urgency: 'critical',
    headline,
    evidence,
    contributingSignals,
  }
}