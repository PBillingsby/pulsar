import type { BehavioralPatterns, PulsarStats } from '@/types/index'
import type { RankedSignal, SignalInput } from '../types'
import { THRESHOLDS } from '../thresholds'

export function detectMobileFriction(input: SignalInput): RankedSignal | null {
  const { patterns, current }: { patterns: BehavioralPatterns; current: PulsarStats } = input

  if (!patterns.deviceBreakdown) return null

  const { mobile, tablet, desktop } = patterns.deviceBreakdown
  const totalWithDevice: number = mobile + tablet + desktop
  if (totalWithDevice < THRESHOLDS.mobileFriction.minSessions) return null

  const mobileRate: number = mobile / totalWithDevice
  if (mobileRate < THRESHOLDS.mobileFriction.minMobileRate) return null

  // check if rage clicks or dead clicks are concentrated in this session pool
  const hasFriction: boolean =
    patterns.rageClickPages.length > 0 || patterns.deadClickPages.length > 0

  if (!hasFriction) return null

  const mobilePercent: number = Math.round(mobileRate * 100)
  const topFrictionPage =
    patterns.rageClickPages[0] ?? patterns.deadClickPages[0]

  function toPath(url: string): string {
    try { return new URL(url).pathname } catch { return url }
  }

  const evidence: string[] = [
    `${mobilePercent}% of sessions this week are on mobile (${mobile} of ${totalWithDevice} sessions with device data)`,
    `Friction detected on ${toPath(topFrictionPage.url)} — may be a mobile-specific layout or interaction issue`,
  ]

  if (patterns.activationPage === topFrictionPage.url) {
    evidence.push('Friction is on your activation page — mobile users may be unable to complete a key step')
  }

  return {
    priority: 2,
    type: 'mobile_friction',
    urgency: 'critical',
    headline: `High mobile traffic with friction detected on ${toPath(topFrictionPage.url)}`,
    evidence,
    recommendedAction: `Test ${toPath(topFrictionPage.url)} on a mobile device — check for elements that are too small to tap, overflow issues, or interactions that don't work on touch`,
  }
}