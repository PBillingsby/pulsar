import { describe, it, expect } from 'bun:test'
import { detectMobileFriction } from '@/lib/analytics/signals/detectors/device'
import type { SignalInput } from '@/lib/analytics/signals/types'
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
    deadClickPages: [],
    formSubmissionRate: null,
    highIntentPages: [],
    activationPageScrollDepth: null,
    deviceBreakdown: null,
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

describe('detectMobileFriction', () => {
  it('returns null when no device breakdown', () => {
    const input = makeInput({}, { deviceBreakdown: null })
    expect(detectMobileFriction(input)).toBeNull()
  })

  it('returns null when not enough sessions with device data', () => {
    const input = makeInput(
      {},
      {
        deviceBreakdown: { mobile: 3, tablet: 0, desktop: 4 },
        rageClickPages: [{ url: 'https://app.com/onboarding', count: 10 }],
      }
    )
    expect(detectMobileFriction(input)).toBeNull()
  })

  it('returns null when mobile rate below threshold', () => {
    const input = makeInput(
      {},
      {
        deviceBreakdown: { mobile: 20, tablet: 0, desktop: 80 },
        rageClickPages: [{ url: 'https://app.com/onboarding', count: 10 }],
      }
    )
    expect(detectMobileFriction(input)).toBeNull()
  })

  it('returns null when no friction signals present', () => {
    const input = makeInput(
      {},
      {
        deviceBreakdown: { mobile: 60, tablet: 5, desktop: 35 },
      }
    )
    expect(detectMobileFriction(input)).toBeNull()
  })

  it('returns signal when high mobile rate and rage clicks present', () => {
    const input = makeInput(
      {},
      {
        deviceBreakdown: { mobile: 60, tablet: 5, desktop: 35 },
        rageClickPages: [{ url: 'https://app.com/onboarding', count: 10 }],
      }
    )
    const signal = detectMobileFriction(input)
    expect(signal).not.toBeNull()
    expect(signal?.type).toBe('mobile_friction')
    expect(signal?.urgency).toBe('critical')
    expect(signal?.priority).toBe(2)
    expect(signal?.headline).toContain('/onboarding')
  })

  it('returns signal when high mobile rate and dead clicks present', () => {
    const input = makeInput(
      {},
      {
        deviceBreakdown: { mobile: 50, tablet: 0, desktop: 50 },
        deadClickPages: [{ url: 'https://app.com/signup', count: 8 }],
      }
    )
    const signal = detectMobileFriction(input)
    expect(signal).not.toBeNull()
    expect(signal?.type).toBe('mobile_friction')
  })

  it('notes activation page in evidence when friction is on activation page', () => {
    const input = makeInput(
      {},
      {
        deviceBreakdown: { mobile: 60, tablet: 5, desktop: 35 },
        rageClickPages: [{ url: 'https://app.com/onboarding', count: 10 }],
        activationPage: 'https://app.com/onboarding',
      }
    )
    const signal = detectMobileFriction(input)
    expect(signal?.evidence.some((e: string) => e.includes('activation page'))).toBe(true)
  })

  it('includes mobile percentage in evidence', () => {
    const input = makeInput(
      {},
      {
        deviceBreakdown: { mobile: 60, tablet: 5, desktop: 35 },
        rageClickPages: [{ url: 'https://app.com/onboarding', count: 10 }],
      }
    )
    const signal = detectMobileFriction(input)
    expect(signal?.evidence.some((e: string) => e.includes('60%'))).toBe(true)
  })

  it('recommendedAction references the friction page', () => {
    const input = makeInput(
      {},
      {
        deviceBreakdown: { mobile: 60, tablet: 5, desktop: 35 },
        rageClickPages: [{ url: 'https://app.com/onboarding', count: 10 }],
      }
    )
    const signal = detectMobileFriction(input)
    expect(signal?.recommendedAction).toContain('/onboarding')
  })
})