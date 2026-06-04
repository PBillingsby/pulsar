import { describe, it, expect } from 'bun:test'
import { correlateSignals } from '@/lib/analytics/signals/correlate'
import type { RankedSignal, SignalInput } from '@/lib/analytics/signals/types'
import type { BehavioralPatterns, PulsarStats, WeeklySnapshot } from '@/types/index'

function makePatterns(overrides: Partial<BehavioralPatterns> = {}): BehavioralPatterns {
  return {
    returnerTopPage: null,
    bouncerTopPage: null,
    activationPage: null,
    avgDepthReturners: 0,
    avgDepthBouncers: 0,
    returnerFirstPages: [],
    avgSessionDurationReturners: null,
    avgSessionDurationBouncers: null,
    rageClickPages: [],
    formSubmissionRate: null,
    highIntentPages: [],
    activationPageScrollDepth: null,
    ...overrides,
  }
}

function makeStats(overrides: Partial<PulsarStats> = {}): PulsarStats {
  return {
    projectKey: 'test',
    totalVisitors: 100,
    totalPageViews: 400,
    comebackRate: 25,
    insufficientData: false,
    topPages: [],
    recentSessions: [],
    ...overrides,
  }
}

function makeInput(
  patternOverrides: Partial<BehavioralPatterns> = {},
  currentOverrides: Partial<PulsarStats> = {},
  snapshots: WeeklySnapshot[] = []
): SignalInput {
  return {
    current: makeStats(currentOverrides),
    patterns: makePatterns(patternOverrides),
    snapshots,
  }
}

function makeFrictionSignal(page: string = '/connect-integration'): RankedSignal {
  return {
    priority: 1,
    type: 'activation_friction',
    urgency: 'critical',
    headline: `UI friction detected on ${page}`,
    evidence: [
      `15 rage clicks on ${page}`,
      'Affects ~15% of sessions this week',
      'This is your activation page — friction here directly impacts retention',
    ],
  }
}

function makeRetentionSignal(): RankedSignal {
  return {
    priority: 1,
    type: 'retention_risk',
    urgency: 'critical',
    headline: 'Comeback rate dropped 22pts this week',
    evidence: [
      'Comeback rate dropped 22pts — from 40% to 18%',
      'Based on 100 visitors this week',
    ],
  }
}

function makeFunnelSignal(): RankedSignal {
  return {
    priority: 1,
    type: 'funnel_drop',
    urgency: 'critical',
    headline: 'Funnel to /connect-integration dropped 20pts this week',
    evidence: [
      'Activation reach rate dropped 20pts — from 60% to 40%',
      'Fewer sessions are reaching /connect-integration this week',
    ],
  }
}

function makeIntentSignal(): RankedSignal {
  return {
    priority: 2,
    type: 'high_intent_no_convert',
    urgency: 'monitor',
    headline: 'High engagement on /billing but low conversion',
    evidence: [
      '8 sessions copied content from /billing',
      'Only 12% of sessions submitted a form',
    ],
  }
}

describe('correlateSignals', () => {
  it('returns null when no activation page', () => {
    const signals: RankedSignal[] = [makeFrictionSignal(), makeRetentionSignal()]
    const input = makeInput({ activationPage: null })
    expect(correlateSignals(signals, input)).toBeNull()
  })

  it('returns null when only one signal present', () => {
    const signals: RankedSignal[] = [makeFrictionSignal()]
    const input = makeInput({ activationPage: 'https://app.com/connect-integration' })
    expect(correlateSignals(signals, input)).toBeNull()
  })

  it('returns null when signals do not converge on activation page', () => {
    // intent signal is on /billing, not activation page
    const signals: RankedSignal[] = [makeIntentSignal(), makeIntentSignal()]
    const input = makeInput({ activationPage: 'https://app.com/connect-integration' })
    expect(correlateSignals(signals, input)).toBeNull()
  })

  it('returns correlated signal when friction and retention converge', () => {
    const signals: RankedSignal[] = [makeFrictionSignal(), makeRetentionSignal()]
    const input = makeInput({ activationPage: 'https://app.com/connect-integration' })
    const result = correlateSignals(signals, input)
    expect(result).not.toBeNull()
    expect(result?.priority).toBe(0)
    expect(result?.type).toBe('activation_page_convergence')
    expect(result?.urgency).toBe('critical')
    expect(result?.contributingSignals).toContain('activation_friction')
    expect(result?.contributingSignals).toContain('retention_risk')
  })

  it('returns correlated signal when friction and funnel drop converge', () => {
    const signals: RankedSignal[] = [makeFrictionSignal(), makeFunnelSignal()]
    const input = makeInput({ activationPage: 'https://app.com/connect-integration' })
    const result = correlateSignals(signals, input)
    expect(result).not.toBeNull()
    expect(result?.contributingSignals).toContain('activation_friction')
    expect(result?.contributingSignals).toContain('funnel_drop')
  })

  it('uses appropriate headline when friction and retention both present', () => {
    const signals: RankedSignal[] = [makeFrictionSignal(), makeRetentionSignal()]
    const input = makeInput({ activationPage: 'https://app.com/connect-integration' })
    const result = correlateSignals(signals, input)
    expect(result?.headline).toContain('broken')
    expect(result?.headline).toContain('/connect-integration')
  })

  it('includes activation page context in evidence', () => {
    const signals: RankedSignal[] = [makeFrictionSignal(), makeRetentionSignal()]
    const input = makeInput({ activationPage: 'https://app.com/connect-integration' })
    const result = correlateSignals(signals, input)
    expect(result?.evidence[0]).toContain('/connect-integration')
    expect(result?.evidence[0]).toContain('activation page')
  })

  it('includes all three contributing signals when present', () => {
    const signals: RankedSignal[] = [
      makeFrictionSignal(),
      makeRetentionSignal(),
      makeFunnelSignal(),
    ]
    const input = makeInput({ activationPage: 'https://app.com/connect-integration' })
    const result = correlateSignals(signals, input)
    expect(result?.contributingSignals).toHaveLength(3)
  })
})