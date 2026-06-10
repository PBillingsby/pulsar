import { describe, it, expect } from 'bun:test'
import { detectDecliningRetention, detectActivationDecay } from '@/lib/analytics/signals/detectors/trends'
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
    referrerBreakdown: null,
    ...overrides,
  }
}

function makeStats(overrides: Partial<PulsarStats> = {}): PulsarStats {
  return {
    projectKey: 'test',
    totalVisitors: 50,
    totalPageViews: 200,
    comebackRate: 20,
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
    returning: 10,
    comebackRate: 30,
    topPage: null,
    totalEvents: 200,
    activationPage: 'https://app.com/onboarding',
    avgDepthReturners: null,
    avgDepthBouncers: null,
    returnerTopPage: null,
    bouncerTopPage: null,
    returnerFirstPage: null,
    activationReachRate: 40,
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
  }
}

// ── detectDecliningRetention ──

describe('detectDecliningRetention', () => {
  it('returns null when current comebackRate is null', () => {
    const input = makeInput(
      { comebackRate: null },
      {},
      [
        makeSnapshot({ comebackRate: 20 }),
        makeSnapshot({ comebackRate: 25 }),
        makeSnapshot({ comebackRate: 30 }),
      ]
    )
    expect(detectDecliningRetention(input)).toBeNull()
  })

  it('returns null when fewer than 3 snapshots with comeback rates', () => {
    const input = makeInput(
      { comebackRate: 15 },
      {},
      [
        makeSnapshot({ comebackRate: 20 }),
        makeSnapshot({ comebackRate: 25 }),
      ]
    )
    expect(detectDecliningRetention(input)).toBeNull()
  })

  it('returns null when no consecutive declines', () => {
    const input = makeInput(
      { comebackRate: 30 },
      {},
      [
        makeSnapshot({ comebackRate: 30 }),
        makeSnapshot({ comebackRate: 20 }),
        makeSnapshot({ comebackRate: 25 }),
      ]
    )
    expect(detectDecliningRetention(input)).toBeNull()
  })

  it('returns null when total drop below threshold', () => {
    // decline but only 5pts total — below 10pt threshold
    const input = makeInput(
      { comebackRate: 20 },
      {},
      [
        makeSnapshot({ comebackRate: 20 }),
        makeSnapshot({ comebackRate: 22 }),
        makeSnapshot({ comebackRate: 25 }),
      ]
    )
    expect(detectDecliningRetention(input)).toBeNull()
  })

  it('returns signal when 2 consecutive declines with sufficient drop', () => {
    // snapshots[0] = most recent = 20%, [1] = 30%, [2] = 42%
    // 42 → 30 → 20 = 2 consecutive declines, 22pt total drop
    const input = makeInput(
      { comebackRate: 20 },
      {},
      [
        makeSnapshot({ comebackRate: 20, weekStart: new Date('2026-05-18') }),
        makeSnapshot({ comebackRate: 30, weekStart: new Date('2026-05-11') }),
        makeSnapshot({ comebackRate: 42, weekStart: new Date('2026-05-04') }),
      ]
    )
    const signal = detectDecliningRetention(input)
    expect(signal).not.toBeNull()
    expect(signal?.type).toBe('declining_retention')
    expect(signal?.urgency).toBe('critical')
    expect(signal?.priority).toBe(1)
    expect(signal?.headline).toContain('2 weeks in a row')
  })

  it('returns signal when 3 consecutive declines', () => {
    const input = makeInput(
      { comebackRate: 15 },
      {},
      [
        makeSnapshot({ comebackRate: 15, weekStart: new Date('2026-05-25') }),
        makeSnapshot({ comebackRate: 22, weekStart: new Date('2026-05-18') }),
        makeSnapshot({ comebackRate: 30, weekStart: new Date('2026-05-11') }),
        makeSnapshot({ comebackRate: 42, weekStart: new Date('2026-05-04') }),
      ]
    )
    const signal = detectDecliningRetention(input)
    expect(signal).not.toBeNull()
    expect(signal?.headline).toContain('3 weeks in a row')
    expect(signal?.evidence.some((e: string) => e.includes('27pts'))).toBe(true)
  })

  it('includes weekly trend in evidence', () => {
    const input = makeInput(
      { comebackRate: 20 },
      {},
      [
        makeSnapshot({ comebackRate: 20, weekStart: new Date('2026-05-18') }),
        makeSnapshot({ comebackRate: 30, weekStart: new Date('2026-05-11') }),
        makeSnapshot({ comebackRate: 42, weekStart: new Date('2026-05-04') }),
      ]
    )
    const signal = detectDecliningRetention(input)
    expect(signal?.evidence.some((e: string) => e.includes('→'))).toBe(true)
  })
})

// ── detectActivationDecay ──

describe('detectActivationDecay', () => {
  it('returns null when fewer than 3 snapshots with activation reach', () => {
    const input = makeInput(
      {},
      {},
      [
        makeSnapshot({ activationReachRate: 30 }),
        makeSnapshot({ activationReachRate: 40 }),
      ]
    )
    expect(detectActivationDecay(input)).toBeNull()
  })

  it('returns null when activation page changes across snapshots', () => {
    const input = makeInput(
      {},
      {},
      [
        makeSnapshot({ activationReachRate: 20, activationPage: 'https://app.com/connect' }),
        makeSnapshot({ activationReachRate: 30, activationPage: 'https://app.com/onboarding' }),
        makeSnapshot({ activationReachRate: 40, activationPage: 'https://app.com/onboarding' }),
      ]
    )
    expect(detectActivationDecay(input)).toBeNull()
  })

  it('returns null when no consecutive declines', () => {
    const input = makeInput(
      {},
      {},
      [
        makeSnapshot({ activationReachRate: 40 }),
        makeSnapshot({ activationReachRate: 30 }),
        makeSnapshot({ activationReachRate: 35 }),
      ]
    )
    expect(detectActivationDecay(input)).toBeNull()
  })

  it('returns null when total drop below threshold', () => {
    const input = makeInput(
      {},
      {},
      [
        makeSnapshot({ activationReachRate: 35 }),
        makeSnapshot({ activationReachRate: 38 }),
        makeSnapshot({ activationReachRate: 40 }),
      ]
    )
    expect(detectActivationDecay(input)).toBeNull()
  })

  it('returns signal when 2 consecutive declines with sufficient drop', () => {
    const input = makeInput(
      {},
      {},
      [
        makeSnapshot({ activationReachRate: 25, activationPage: 'https://app.com/onboarding', weekStart: new Date('2026-05-18') }),
        makeSnapshot({ activationReachRate: 35, activationPage: 'https://app.com/onboarding', weekStart: new Date('2026-05-11') }),
        makeSnapshot({ activationReachRate: 48, activationPage: 'https://app.com/onboarding', weekStart: new Date('2026-05-04') }),
      ]
    )
    const signal = detectActivationDecay(input)
    expect(signal).not.toBeNull()
    expect(signal?.type).toBe('activation_decay')
    expect(signal?.urgency).toBe('critical')
    expect(signal?.priority).toBe(1)
    expect(signal?.headline).toContain('/onboarding')
    expect(signal?.headline).toContain('2 weeks in a row')
  })

  it('includes activation page in recommendedAction', () => {
    const input = makeInput(
      {},
      {},
      [
        makeSnapshot({ activationReachRate: 25, activationPage: 'https://app.com/onboarding', weekStart: new Date('2026-05-18') }),
        makeSnapshot({ activationReachRate: 35, activationPage: 'https://app.com/onboarding', weekStart: new Date('2026-05-11') }),
        makeSnapshot({ activationReachRate: 48, activationPage: 'https://app.com/onboarding', weekStart: new Date('2026-05-04') }),
      ]
    )
    const signal = detectActivationDecay(input)
    expect(signal?.recommendedAction).toContain('/onboarding')
  })

  it('includes weekly trend in evidence', () => {
    const input = makeInput(
      {},
      {},
      [
        makeSnapshot({ activationReachRate: 25, activationPage: 'https://app.com/onboarding', weekStart: new Date('2026-05-18') }),
        makeSnapshot({ activationReachRate: 35, activationPage: 'https://app.com/onboarding', weekStart: new Date('2026-05-11') }),
        makeSnapshot({ activationReachRate: 48, activationPage: 'https://app.com/onboarding', weekStart: new Date('2026-05-04') }),
      ]
    )
    const signal = detectActivationDecay(input)
    expect(signal?.evidence.some((e: string) => e.includes('→'))).toBe(true)
  })
})