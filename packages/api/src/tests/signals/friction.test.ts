import { detectActivationFriction } from '@/lib/analytics/signals/detectors/friction'
import type { SignalInput } from '@/lib/analytics/signals/types'
import type { BehavioralPatterns, PulsarStats, WeeklySnapshot } from '@/types/index'
import { describe, expect, it } from 'bun:test'

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
    deadClickPages: [],
    deviceBreakdown: null,
    referrerBreakdown: null,
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
  currentOverrides: Partial<PulsarStats> = {},
  patternOverrides: Partial<BehavioralPatterns> = {},
  snapshots: WeeklySnapshot[] = []
): SignalInput {
  return {
    current: makeStats(currentOverrides),
    patterns: makePatterns(patternOverrides),
    snapshots,
    plan: 'beta'
  }
}

describe('detectActivationFriction', () => {
  it('returns null when no rage clicks', () => {
    const input = makeInput()
    expect(detectActivationFriction(input)).toBeNull()
  })

  it('returns null when count below threshold', () => {
    const input = makeInput(
      {},
      { rageClickPages: [{ url: 'https://app.com/onboarding', count: 5 }] }
    )
    expect(detectActivationFriction(input)).toBeNull()
  })

  it('returns null when rate below threshold', () => {
    // 10 rage clicks / 500 sessions = 2% — below 5% threshold
    const input = makeInput(
      { totalVisitors: 500 },
      { rageClickPages: [{ url: 'https://app.com/onboarding', count: 10 }] }
    )
    expect(detectActivationFriction(input)).toBeNull()
  })

  it('returns signal when count and rate both meet thresholds', () => {
    // 10 rage clicks / 100 sessions = 10% — above both thresholds
    const input = makeInput(
      { totalVisitors: 100 },
      { rageClickPages: [{ url: 'https://app.com/onboarding', count: 10 }] }
    )
    const signal = detectActivationFriction(input)
    expect(signal).not.toBeNull()
    expect(signal?.type).toBe('activation_friction')
    expect(signal?.urgency).toBe('critical')
    expect(signal?.headline).toContain('/onboarding')
  })

  it('sets priority 1 when friction is on activation page', () => {
    const input = makeInput(
      { totalVisitors: 100 },
      {
        rageClickPages: [{ url: 'https://app.com/onboarding', count: 15 }],
        activationPage: 'https://app.com/onboarding',
      }
    )
    const signal = detectActivationFriction(input)
    expect(signal?.priority).toBe(1)
    expect(signal?.evidence.some((e: string) => e.includes('activation page'))).toBe(true)
  })

  it('sets priority 2 when friction is not on activation page', () => {
    const input = makeInput(
      { totalVisitors: 100 },
      {
        rageClickPages: [{ url: 'https://app.com/settings', count: 15 }],
        activationPage: 'https://app.com/onboarding',
      }
    )
    const signal = detectActivationFriction(input)
    expect(signal?.priority).toBe(2)
  })

  it('includes rate percentage in evidence', () => {
    const input = makeInput(
      { totalVisitors: 100 },
      { rageClickPages: [{ url: 'https://app.com/onboarding', count: 20 }] }
    )
    const signal = detectActivationFriction(input)
    expect(signal?.evidence.some((e: string) => e.includes('20%'))).toBe(true)
  })
})