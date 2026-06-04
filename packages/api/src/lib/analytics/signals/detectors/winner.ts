import type { BehavioralPatterns, PulsarStats } from '@/types/index'
import type { RankedSignal, SignalInput } from '../types'
import { THRESHOLDS } from '../thresholds'

function toPath(url: string): string {
  try { return new URL(url).pathname } catch { return url }
}

export function detectHiddenWinner(input: SignalInput): RankedSignal | null {
  const { patterns, current }: { patterns: BehavioralPatterns; current: PulsarStats } = input

  if (patterns.returnerFirstPages.length === 0) return null
  if (!patterns.returnerTopPage) return null
  if (!patterns.bouncerTopPage) return null

  const topReturnerPage: { url: string; count: number } = patterns.returnerFirstPages[0]
  if (topReturnerPage.count < THRESHOLDS.hiddenWinner.minReturnerVisits) return null

  const totalSessions: number = current.totalVisitors
  if (totalSessions === 0) return null

  // actual rate this page appears as returner first page
  const returnerRate: number = topReturnerPage.count / totalSessions

  // expected rate if evenly distributed across all returner first pages
  const expectedRate: number = 1 / Math.max(patterns.returnerFirstPages.length, 1)

  const multiplier: number = returnerRate / expectedRate
  if (multiplier < THRESHOLDS.hiddenWinner.minReturnMultiplier) return null

  const path: string = toPath(topReturnerPage.url)
  const multiplierDisplay: string = multiplier.toFixed(1)

  const evidence: string[] = [
    `Returning users start on ${path} ${multiplierDisplay}x more often than average`,
    `${topReturnerPage.count} returning sessions began here`,
    'This page may be a key driver of retention',
  ]

  if (patterns.activationPage === topReturnerPage.url) {
    evidence.push('This is already your detected activation page — signal is reinforced')
  }

  return {
    priority: 2,
    type: 'hidden_winner',
    urgency: 'positive',
    headline: `${path} appears to be a hidden retention driver`,
    evidence,
  }
}