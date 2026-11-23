import { detectReferrerFriction } from '@/lib/analytics/signals/detectors/referrer'
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
    deadClickPages: [],
    formSubmissionRate: null,
    highIntentPages: [],
    activationPageScrollDepth: null,
    deviceBreakdown: null,
    referrerBreakdown: null,
    ...overrides,
  }
}

function makeStats(overrides: Partial<PulsarStats> = {}): PulsarStats {
  return {
    projectKey: 'test',
    totalVisitors: 50,
    totalPageViews: 200,
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

describe('detectReferrerFriction', () => {
  it('returns null when no referrer breakdown', () => {
    const input = makeInput()
    expect(detectReferrerFriction(input)).toBeNull()
  })

  it('returns null when not enough sessions', () => {
    const input = makeInput(
      { totalVisitors: 5 },
      {
        referrerBreakdown: [{ source: 'twitter.com', count: 3 }],
        rageClickPages: [{ url: 'https://app.com/onboarding', count: 10 }],
      }
    )
    expect(detectReferrerFriction(input)).toBeNull()
  })

  it('returns null when referrer rate below threshold', () => {
    const input = makeInput(
      { totalVisitors: 50 },
      {
        referrerBreakdown: [{ source: 'twitter.com', count: 5 }],
        rageClickPages: [{ url: 'https://app.com/onboarding', count: 10 }],
      }
    )
    expect(detectReferrerFriction(input)).toBeNull()
  })

  it('returns null when no friction or high bounce', () => {
    const input = makeInput(
      { totalVisitors: 50 },
      {
        referrerBreakdown: [{ source: 'twitter.com', count: 20 }],
      }
    )
    expect(detectReferrerFriction(input)).toBeNull()
  })

  it('returns signal when high referrer rate and rage clicks present', () => {
    const input = makeInput(
      { totalVisitors: 50 },
      {
        referrerBreakdown: [{ source: 'twitter.com', count: 20 }],
        rageClickPages: [{ url: 'https://app.com/onboarding', count: 10 }],
      }
    )
    const signal = detectReferrerFriction(input)
    expect(signal).not.toBeNull()
    expect(signal?.type).toBe('referrer_friction')
    expect(signal?.urgency).toBe('monitor')
    expect(signal?.priority).toBe(2)
    expect(signal?.headline).toContain('twitter.com')
  })

  it('returns signal when high referrer rate and high bounce rate', () => {
    const input = makeInput(
      { totalVisitors: 50 },
      {
        referrerBreakdown: [{ source: 'reddit.com', count: 20 }],
        avgSessionDurationBouncers: 15,
      }
    )
    const signal = detectReferrerFriction(input)
    expect(signal).not.toBeNull()
    expect(signal?.type).toBe('referrer_friction')
  })

  it('includes referrer percentage in evidence', () => {
    const input = makeInput(
      { totalVisitors: 50 },
      {
        referrerBreakdown: [{ source: 'twitter.com', count: 20 }],
        rageClickPages: [{ url: 'https://app.com/onboarding', count: 10 }],
      }
    )
    const signal = detectReferrerFriction(input)
    expect(signal?.evidence.some((e: string) => e.includes('40%'))).toBe(true)
  })

  it('recommendedAction references the referrer source', () => {
    const input = makeInput(
      { totalVisitors: 50 },
      {
        referrerBreakdown: [{ source: 'twitter.com', count: 20 }],
        rageClickPages: [{ url: 'https://app.com/onboarding', count: 10 }],
      }
    )
    const signal = detectReferrerFriction(input)
    expect(signal?.recommendedAction).toContain('twitter.com')
  })
})