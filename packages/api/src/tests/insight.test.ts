import { verifyInsight, type InsightPayload } from '@/lib/digest/insight'
import { describe, expect, it } from 'bun:test'

const payload: InsightPayload = {
  observationFacts: [
    'Comeback rate fell from 34% to 21% this week',
    '1,240 visitors reached /onboarding/step-2',
  ],
  interpretationCandidates: ['There may be friction on /onboarding/step-2'],
  recommendedAction: 'Review the form on /onboarding/step-2',
  dataVolume: 'sufficient — patterns are meaningful',
}

describe('verifyInsight', () => {
  it('accepts output that only restates numbers from the facts', () => {
    const output = 'Comeback rate fell from 34% to 21% this week. There may be friction on /onboarding/step-2. Review the form on this page.'
    expect(verifyInsight(output, payload)).toEqual({ ok: true })
  })

  it('treats thousands separators as the same number', () => {
    expect(verifyInsight('1240 visitors reached this page.', payload)).toEqual({ ok: true })
  })

  it('rejects a statistic the model invented', () => {
    const result = verifyInsight('Comeback rate fell 13 points to 21%, a 38% relative drop.', payload)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('38')
  })

  it('rejects rounded numbers that are not in the source', () => {
    expect(verifyInsight('About 1,200 visitors reached this page.', payload).ok).toBe(false)
  })

  it('normalises full-width digits from Japanese or Chinese output', () => {
    expect(verifyInsight('再訪率は３４％から２１％に低下しました。', payload)).toEqual({ ok: true })
    expect(verifyInsight('再訪率は５０％です。', payload).ok).toBe(false)
  })

  it('rejects empty output', () => {
    expect(verifyInsight('   ', payload).ok).toBe(false)
  })
})