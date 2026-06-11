import { describe, it, expect } from 'bun:test'
import { detectDeadClickFriction } from '@/lib/analytics/signals/detectors/dead-click'
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

describe('detectDeadClickFriction', () => {
  it('returns null when no dead clicks', () => {
    const input = makeInput()
    expect(detectDeadClickFriction(input)).toBeNull()
  })

  it('returns null when count below threshold', () => {
    const input = makeInput(
      {},
      { deadClickPages: [{ url: 'https://app.com/onboarding', count: 4 }] }
    )
    expect(detectDeadClickFriction(input)).toBeNull()
  })

  it('returns null when rate below threshold', () => {
    // 8 dead clicks / 500 sessions = 1.6% — below 4% threshold
    const input = makeInput(
      { totalVisitors: 500 },
      { deadClickPages: [{ url: 'https://app.com/onboarding', count: 8 }] }
    )
    expect(detectDeadClickFriction(input)).toBeNull()
  })

  it('returns signal when count and rate both meet thresholds', () => {
    // 8 dead clicks / 100 sessions = 8% — above both thresholds
    const input = makeInput(
      { totalVisitors: 100 },
      { deadClickPages: [{ url: 'https://app.com/onboarding', count: 8 }] }
    )
    const signal = detectDeadClickFriction(input)
    expect(signal).not.toBeNull()
    expect(signal?.type).toBe('dead_click_friction')
    expect(signal?.urgency).toBe('critical')
    expect(signal?.headline).toContain('/onboarding')
  })

  it('sets priority 1 when dead clicks on activation page', () => {
    const input = makeInput(
      { totalVisitors: 100 },
      {
        deadClickPages: [{ url: 'https://app.com/onboarding', count: 8 }],
        activationPage: 'https://app.com/onboarding',
      }
    )
    const signal = detectDeadClickFriction(input)
    expect(signal?.priority).toBe(1)
    expect(signal?.evidence.some((e: string) => e.includes('activation page'))).toBe(true)
  })

  it('sets priority 2 when dead clicks not on activation page', () => {
    const input = makeInput(
      { totalVisitors: 100 },
      {
        deadClickPages: [{ url: 'https://app.com/settings', count: 8 }],
        activationPage: 'https://app.com/onboarding',
      }
    )
    const signal = detectDeadClickFriction(input)
    expect(signal?.priority).toBe(2)
  })

  it('includes rate percentage in evidence', () => {
    const input = makeInput(
      { totalVisitors: 100 },
      { deadClickPages: [{ url: 'https://app.com/onboarding', count: 10 }] }
    )
    const signal = detectDeadClickFriction(input)
    expect(signal?.evidence.some((e: string) => e.includes('10%'))).toBe(true)
  })

  it('includes recommended action referencing the page', () => {
    const input = makeInput(
      { totalVisitors: 100 },
      { deadClickPages: [{ url: 'https://app.com/onboarding', count: 8 }] }
    )
    const signal = detectDeadClickFriction(input)
    expect(signal?.recommendedAction).toContain('/onboarding')
  })
})