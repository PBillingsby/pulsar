import { detectPositiveTrend, detectRetentionRisk } from '@/lib/analytics/signals/detectors/retention'
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

function makeSnapshot(overrides: Partial<WeeklySnapshot> = {}): WeeklySnapshot {
  return {
    id: 'snap-1',
    projectKey: 'test',
    weekStart: new Date('2026-01-01'),
    totalVisitors: 50,
    returning: 12,
    comebackRate: 40,
    topPage: null,
    totalEvents: 200,
    activationPage: null,
    avgDepthReturners: null,
    avgDepthBouncers: null,
    returnerTopPage: null,
    bouncerTopPage: null,
    returnerFirstPage: null,
    activationReachRate: null,
    activationPageViews: null,
    createdAt: new Date(),
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

describe('detectRetentionRisk', () => {
  it('returns null when not enough visitors', () => {
    const input = makeInput(
      { totalVisitors: 10, comebackRate: 10 },
      {},
      [makeSnapshot(), makeSnapshot({ comebackRate: 40 })]
    )
    expect(detectRetentionRisk(input)).toBeNull()
  })

  it('returns null when comebackRate is null', () => {
    const input = makeInput(
      { totalVisitors: 50, comebackRate: null },
      {},
      [makeSnapshot(), makeSnapshot()]
    )
    expect(detectRetentionRisk(input)).toBeNull()
  })

  it('returns null when no previous snapshot with comeback rate', () => {
    const input = makeInput(
      { totalVisitors: 50, comebackRate: 20 },
      {},
      [makeSnapshot({ comebackRate: 20 })]
    )
    expect(detectRetentionRisk(input)).toBeNull()
  })

  it('returns null when drop is below threshold', () => {
    const input = makeInput(
      { totalVisitors: 50, comebackRate: 30 },
      {},
      [makeSnapshot({ comebackRate: 30 }), makeSnapshot({ comebackRate: 40 })]
    )
    expect(detectRetentionRisk(input)).toBeNull()
  })

  it('returns signal when drop meets threshold', () => {
    const input = makeInput(
      { totalVisitors: 50, comebackRate: 15 },
      {},
      [makeSnapshot({ comebackRate: 15 }), makeSnapshot({ comebackRate: 40 })]
    )
    const signal = detectRetentionRisk(input)
    expect(signal).not.toBeNull()
    expect(signal?.type).toBe('retention_risk')
    expect(signal?.urgency).toBe('critical')
    expect(signal?.priority).toBe(1)
    expect(signal?.headline).toContain('25pts')
  })

  it('includes rage click evidence when present', () => {
    const input = makeInput(
      { totalVisitors: 50, comebackRate: 15 },
      { rageClickPages: [{ url: 'https://app.com/onboarding', count: 12 }] },
      [makeSnapshot({ comebackRate: 15 }), makeSnapshot({ comebackRate: 40 })]
    )

    const signal = detectRetentionRisk(input)

    expect(signal).not.toBeNull()
    expect(signal?.evidence.some((e: string) => e.toLowerCase().includes('rage clicks'))).toBe(true)
  })
})

describe('detectPositiveTrend', () => {
  it('returns null when not enough visitors', () => {
    const input = makeInput(
      { totalVisitors: 5, comebackRate: 40 },
      {},
      [makeSnapshot({ comebackRate: 40 }), makeSnapshot({ comebackRate: 20 })]
    )
    expect(detectPositiveTrend(input)).toBeNull()
  })

  it('returns null when comebackRate is null', () => {
    const input = makeInput(
      { totalVisitors: 50, comebackRate: null },
      {},
      [makeSnapshot(), makeSnapshot()]
    )
    expect(detectPositiveTrend(input)).toBeNull()
  })

  it('returns null when rise is below threshold', () => {
    const input = makeInput(
      { totalVisitors: 30, comebackRate: 25 },
      {},
      [makeSnapshot({ comebackRate: 25 }), makeSnapshot({ comebackRate: 20 })]
    )
    expect(detectPositiveTrend(input)).toBeNull()
  })

  it('returns signal when rise meets threshold', () => {
    const input = makeInput(
      { totalVisitors: 30, comebackRate: 35 },
      {},
      [makeSnapshot({ comebackRate: 35 }), makeSnapshot({ comebackRate: 20 })]
    )
    const signal = detectPositiveTrend(input)
    expect(signal).not.toBeNull()
    expect(signal?.type).toBe('positive_trend')
    expect(signal?.urgency).toBe('positive')
    expect(signal?.priority).toBe(1)
    expect(signal?.headline).toContain('15pts')
  })

  it('includes activation page evidence when present', () => {
    const input = makeInput(
      { totalVisitors: 30, comebackRate: 35 },
      { activationPage: 'https://app.com/onboarding' },
      [makeSnapshot({ comebackRate: 35 }), makeSnapshot({ comebackRate: 20 })]
    )
    const signal = detectPositiveTrend(input)

    expect(signal?.evidence.some(e => e.includes('/onboarding'))).toBe(true)
  })
})