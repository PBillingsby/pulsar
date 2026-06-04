import { describe, it, expect } from 'bun:test'
import { detectHighIntentNoConvert } from '@/lib/analytics/signals/detectors/intent'
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
    formSubmissionRate: null,
    highIntentPages: [],
    activationPageScrollDepth: null,
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
  }
}

describe('detectHighIntentNoConvert', () => {
  it('returns null when no high intent pages', () => {
    const input = makeInput({}, { formSubmissionRate: 10 })
    expect(detectHighIntentNoConvert(input)).toBeNull()
  })

  it('returns null when formSubmissionRate is null', () => {
    const input = makeInput(
      {},
      { highIntentPages: [{ url: 'https://app.com/pricing', count: 8 }] }
    )
    expect(detectHighIntentNoConvert(input)).toBeNull()
  })

  it('returns null when copy events below threshold', () => {
    const input = makeInput(
      {},
      {
        highIntentPages: [{ url: 'https://app.com/pricing', count: 3 }],
        formSubmissionRate: 10,
      }
    )
    expect(detectHighIntentNoConvert(input)).toBeNull()
  })

  it('returns null when form submission rate is high', () => {
    const input = makeInput(
      {},
      {
        highIntentPages: [{ url: 'https://app.com/pricing', count: 8 }],
        formSubmissionRate: 30,
      }
    )
    expect(detectHighIntentNoConvert(input)).toBeNull()
  })

  it('returns signal when copy events meet threshold and conversion is low', () => {
    const input = makeInput(
      {},
      {
        highIntentPages: [{ url: 'https://app.com/pricing', count: 8 }],
        formSubmissionRate: 10,
      }
    )
    const signal = detectHighIntentNoConvert(input)
    expect(signal).not.toBeNull()
    expect(signal?.type).toBe('high_intent_no_convert')
    expect(signal?.urgency).toBe('monitor')
    expect(signal?.priority).toBe(2)
    expect(signal?.headline).toContain('/pricing')
  })

  it('includes scroll depth evidence when above 70%', () => {
    const input = makeInput(
      {},
      {
        highIntentPages: [{ url: 'https://app.com/pricing', count: 8 }],
        formSubmissionRate: 10,
        activationPageScrollDepth: 85,
      }
    )
    const signal = detectHighIntentNoConvert(input)
    expect(signal?.evidence.some((e: string) => e.includes('scrolling'))).toBe(true)
  })

  it('does not include scroll depth evidence when below 70%', () => {
    const input = makeInput(
      {},
      {
        highIntentPages: [{ url: 'https://app.com/pricing', count: 8 }],
        formSubmissionRate: 10,
        activationPageScrollDepth: 50,
      }
    )
    const signal = detectHighIntentNoConvert(input)
    expect(signal?.evidence.some((e: string) => e.includes('scrolling'))).toBe(false)
  })
})