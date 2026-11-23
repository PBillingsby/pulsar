import { detectFunnelDrop } from '@/lib/analytics/signals/detectors/funnel'
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
    comebackRate: 30,
    topPage: null,
    totalEvents: 200,
    activationPage: 'https://app.com/onboarding',
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

describe('detectFunnelDrop', () => {
  it('returns null when not enough visitors', () => {
    const input = makeInput(
      { totalVisitors: 5 },
      {},
      [
        makeSnapshot({ activationReachRate: 30 }),
        makeSnapshot({ activationReachRate: 60 }),
      ]
    )
    expect(detectFunnelDrop(input)).toBeNull()
  })

  it('returns null when no current activation reach rate', () => {
    const input = makeInput(
      {},
      {},
      [
        makeSnapshot({ activationReachRate: null }),
        makeSnapshot({ activationReachRate: 60 }),
      ]
    )
    expect(detectFunnelDrop(input)).toBeNull()
  })

  it('returns null when no previous activation reach rate', () => {
    const input = makeInput(
      {},
      {},
      [
        makeSnapshot({ activationReachRate: 30 }),
        makeSnapshot({ activationReachRate: null }),
      ]
    )
    expect(detectFunnelDrop(input)).toBeNull()
  })

  it('returns null when drop is below threshold', () => {
    const input = makeInput(
      {},
      {},
      [
        makeSnapshot({ activationReachRate: 45 }),
        makeSnapshot({ activationReachRate: 55 }),
      ]
    )
    expect(detectFunnelDrop(input)).toBeNull()
  })

  it('returns signal when drop meets threshold', () => {
    const input = makeInput(
      {},
      {},
      [
        makeSnapshot({ activationReachRate: 30, activationPage: 'https://app.com/onboarding' }),
        makeSnapshot({ activationReachRate: 60 }),
      ]
    )
    const signal = detectFunnelDrop(input)
    expect(signal).not.toBeNull()
    expect(signal?.type).toBe('funnel_drop')
    expect(signal?.urgency).toBe('critical')
    expect(signal?.priority).toBe(1)
    expect(signal?.headline).toContain('30pts')
    expect(signal?.headline).toContain('/onboarding')
  })

  it('uses generic label when no activation page set', () => {
    const input = makeInput(
      {},
      {},
      [
        makeSnapshot({ activationReachRate: 20, activationPage: null }),
        makeSnapshot({ activationReachRate: 60 }),
      ]
    )
    const signal = detectFunnelDrop(input)
    expect(signal?.headline).toContain('activation page')
  })

  it('includes visitor count in evidence', () => {
    const input = makeInput(
      { totalVisitors: 80 },
      {},
      [
        makeSnapshot({ activationReachRate: 30 }),
        makeSnapshot({ activationReachRate: 60 }),
      ]
    )
    const signal = detectFunnelDrop(input)
    expect(signal?.evidence.some((e: string) => e.includes('80 visitors'))).toBe(true)
  })
})