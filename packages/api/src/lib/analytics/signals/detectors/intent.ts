import type { BehavioralPatterns } from '@/types/index'
import type { RankedSignal, SignalInput } from '../types'
import { THRESHOLDS } from '../thresholds'

function toPath(url: string): string {
  try { return new URL(url).pathname } catch { return url }
}

export function detectHighIntentNoConvert(input: SignalInput): RankedSignal | null {
  const { patterns }: { patterns: BehavioralPatterns } = input

  if (patterns.highIntentPages.length === 0) return null
  if (patterns.formSubmissionRate === null) return null

  const topPage: { url: string; count: number } = patterns.highIntentPages[0]
  if (topPage.count < THRESHOLDS.highIntentNoConvert.minCopyEvents) return null
  if (patterns.formSubmissionRate > 25) return null

  const evidence: string[] = [
    `${topPage.count} sessions copied content from ${toPath(topPage.url)}`,
    `Only ${patterns.formSubmissionRate}% of sessions submitted a form`,
    'Users are researching but not converting',
  ]

  if (patterns.activationPageScrollDepth !== null && patterns.activationPageScrollDepth > 70) {
    evidence.push(`Users are scrolling ${patterns.activationPageScrollDepth}% deep on the activation page — intent is there`)
  }

  return {
    priority: 2,
    type: 'high_intent_no_convert',
    urgency: 'monitor',
    headline: `High engagement on ${toPath(topPage.url)} but low conversion`,
    evidence,
    recommendedAction: "Review the conversion flow from {page} — identify what's preventing users from completing the next step"
  }
}