import { detectHiddenWinner } from '@/lib/analytics/signals/detectors/winner'
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

describe('detectHiddenWinner', () => {
  it('returns null when no returner first pages', () => {
    const input = makeInput()
    expect(detectHiddenWinner(input)).toBeNull()
  })

  it('returns null when returnerTopPage is null', () => {
    const input = makeInput(
      {},
      {
        returnerFirstPages: [{ url: 'https://app.com/templates', count: 10 }],
        returnerTopPage: null,
        bouncerTopPage: 'https://app.com/',
      }
    )
    expect(detectHiddenWinner(input)).toBeNull()
  })

  it('returns null when bouncerTopPage is null', () => {
    const input = makeInput(
      {},
      {
        returnerFirstPages: [{ url: 'https://app.com/templates', count: 10 }],
        returnerTopPage: 'https://app.com/templates',
        bouncerTopPage: null,
      }
    )
    expect(detectHiddenWinner(input)).toBeNull()
  })

  it('returns null when returner visits below threshold', () => {
    const input = makeInput(
      {},
      {
        returnerFirstPages: [{ url: 'https://app.com/templates', count: 2 }],
        returnerTopPage: 'https://app.com/templates',
        bouncerTopPage: 'https://app.com/',
      }
    )
    expect(detectHiddenWinner(input)).toBeNull()
  })

  it('returns null when multiplier below threshold', () => {
    // 5 visits / 50 total = 10%, 3 pages = 33% expected, multiplier = 0.3
    const input = makeInput(
      { totalVisitors: 50 },
      {
        returnerFirstPages: [
          { url: 'https://app.com/templates', count: 5 },
          { url: 'https://app.com/dashboard', count: 25 },
          { url: 'https://app.com/settings', count: 20 },
        ],
        returnerTopPage: 'https://app.com/templates',
        bouncerTopPage: 'https://app.com/',
      }
    )
    expect(detectHiddenWinner(input)).toBeNull()
  })

  it('returns signal when multiplier meets threshold', () => {
    // 40 visits / 50 total = 80%, 1 page = 100% expected, multiplier = 0.8
    // With 1 page in list: expectedRate = 1/1 = 1.0, returnerRate = 40/50 = 0.8, multiplier = 0.8 — still too low
    // Need: returnerRate / expectedRate >= 2.5
    // With 4 pages: expectedRate = 0.25, returnerRate = 40/50 = 0.8, multiplier = 3.2 ✓
    const input = makeInput(
      { totalVisitors: 50 },
      {
        returnerFirstPages: [
          { url: 'https://app.com/templates', count: 40 },
          { url: 'https://app.com/dashboard', count: 4 },
          { url: 'https://app.com/settings', count: 3 },
          { url: 'https://app.com/billing', count: 3 },
        ],
        returnerTopPage: 'https://app.com/templates',
        bouncerTopPage: 'https://app.com/',
      }
    )
    const signal = detectHiddenWinner(input)
    expect(signal).not.toBeNull()
    expect(signal?.type).toBe('hidden_winner')
    expect(signal?.urgency).toBe('positive')
    expect(signal?.priority).toBe(2)
    expect(signal?.headline).toContain('/templates')
  })

  it('notes reinforcement when hidden winner is activation page', () => {
    const input = makeInput(
      { totalVisitors: 50 },
      {
        returnerFirstPages: [
          { url: 'https://app.com/templates', count: 40 },
          { url: 'https://app.com/dashboard', count: 4 },
          { url: 'https://app.com/settings', count: 3 },
          { url: 'https://app.com/billing', count: 3 },
        ],
        returnerTopPage: 'https://app.com/templates',
        bouncerTopPage: 'https://app.com/',
        activationPage: 'https://app.com/templates',
      }
    )
    const signal = detectHiddenWinner(input)
    expect(signal?.evidence.some((e: string) => e.includes('activation page'))).toBe(true)
  })
})