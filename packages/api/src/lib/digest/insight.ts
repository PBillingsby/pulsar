import Anthropic from '@anthropic-ai/sdk'
import type { BehavioralPatterns, DigestContext, PulsarStats, WeeklySnapshot } from '@/types/index'
import { rankSignals } from '@/lib/analytics/signals/index'
import type { RankedSignal } from '@/lib/analytics/signals/types'
import type { CorrelatedSignal } from '@/lib/analytics/signals/correlate'

const client: Anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

function toPath(url: string): string {
  try { return new URL(url).pathname } catch { return url }
}

function buildInsightPayload(
  signals: RankedSignal[],
  correlated: CorrelatedSignal | null,
  patterns: BehavioralPatterns,
  current: PulsarStats
): {
  observationFacts: string[]
  interpretationCandidates: string[]
  recommendedAction: string
  dataVolume: string
} {
  const activationPath: string | null = patterns.activationPage
    ? toPath(patterns.activationPage)
    : null

  const dataVolume: string = current.totalVisitors < 20
    ? 'low — under 20 visitors, treat as directional only'
    : current.totalVisitors < 50
      ? 'moderate — patterns emerging but not statistically reliable'
      : 'sufficient — patterns are meaningful'

  const observationFacts: string[] = []
  const interpretationCandidates: string[] = []

  if (correlated) {
    // correlated signal — pull facts from contributing signals
    const frictionSignal: RankedSignal | undefined = signals.find(
      (s: RankedSignal) => s.type === 'activation_friction'
    )
    const retentionSignal: RankedSignal | undefined = signals.find(
      (s: RankedSignal) => s.type === 'retention_risk'
    )
    const funnelSignal: RankedSignal | undefined = signals.find(
      (s: RankedSignal) => s.type === 'funnel_drop'
    )

    if (frictionSignal) observationFacts.push(frictionSignal.evidence[0])
    if (retentionSignal) observationFacts.push(retentionSignal.evidence[0])
    if (funnelSignal) observationFacts.push(funnelSignal.evidence[0])
    if (activationPath) {
      observationFacts.push(`Users who reach ${activationPath} are significantly more likely to return`)
    }

    interpretationCandidates.push(
      activationPath
        ? `The combination of a comeback rate drop and rage clicks on ${activationPath} suggests this page may be a bottleneck in the activation flow`
        : `There may be friction on a page that plays an important role in activation`
    )

    const topContributor: RankedSignal | undefined = frictionSignal ?? retentionSignal ?? signals[0]
    return {
      observationFacts,
      interpretationCandidates,
      recommendedAction: topContributor?.recommendedAction ?? `Review session recordings on ${activationPath ?? 'your activation page'}`,
      dataVolume,
    }
  }

  // no correlation — use top signal only
  const top: RankedSignal | undefined = signals[0]
  if (!top) {
    return {
      observationFacts: [`${current.totalVisitors} visitors this week`, `Comeback rate: ${current.comebackRate ?? 'unavailable'}%`],
      interpretationCandidates: ['No signals above threshold this week'],
      recommendedAction: 'Keep driving traffic and check back next week',
      dataVolume,
    }
  }

  // trend signals lead with full weekly evidence, not current week stats
  if (top.type === 'declining_retention' || top.type === 'activation_decay') {
    observationFacts.push(...top.evidence)

    const frictionSignal: RankedSignal | undefined = signals.find(
      (s: RankedSignal) => s.type === 'activation_friction' || s.type === 'dead_click_friction'
    )
    if (frictionSignal) {
      observationFacts.push(frictionSignal.evidence[0])
    }

    const hasCounterSignal: boolean = top.evidence.some(
      (e: string) => e.toLowerCase().includes('comeback rate improved')
    )

    interpretationCandidates.push(
      hasCounterSignal && top.type === 'activation_decay'
        ? `The problem appears to be getting users to activation rather than retaining them — users who activate are increasingly likely to return`
        : top.type === 'declining_retention'
          ? `A multi-week decline suggests this is a pattern, not a one-off fluctuation — something may have changed in the product or traffic that is systematically reducing return visits`
          : `A consistent week-over-week drop suggests more users are dropping off before reaching activation`)

    const trendActivationPath: string | null = top.type === 'activation_decay'
      ? toPath(top.headline.match(/\/[a-z0-9\-\/]+/)?.[0] ?? '')
      : activationPath
    return {
      observationFacts,
      interpretationCandidates,
      recommendedAction: trendActivationPath
        ? `Investigate changes in the funnel leading to ${trendActivationPath}`
        : top.recommendedAction,
      dataVolume,
    }
  }

  observationFacts.push(...top.evidence.slice(0, 2))
  if (activationPath) {
    observationFacts.push(`Users who reach ${activationPath} are significantly more likely to return`)
  }

  interpretationCandidates.push(
    top.type === 'positive_trend' && activationPath
      ? `The rise in comeback rate may be connected to users reaching ${activationPath} — this page appears to be playing a role in retention`
      : top.type === 'positive_trend'
        ? `Something shifted this week that appears to be driving more users back to the product`
        : top.headline
  )

  return {
    observationFacts,
    interpretationCandidates,
    recommendedAction: top.recommendedAction,
    dataVolume,
  }
}

function buildPrompt(
  ctx: DigestContext,
  signals: RankedSignal[],
  correlated: CorrelatedSignal | null
): string {
  const { current, snapshots, patterns } = ctx

  const payload = buildInsightPayload(signals, correlated, patterns, current)
  console.log('[Pulsar] observation facts:', payload.observationFacts)
  console.log('[Pulsar] interpretation:', payload.interpretationCandidates)
  console.log('[Pulsar] action:', payload.recommendedAction)
  return `You are a copywriter writing a short product insight for an early-stage founder.

The analysis has already been completed. Do not perform analysis. Your only job is to rewrite the information below into natural language.

DATA VOLUME: ${payload.dataVolume}

OBSERVATION FACTS:
${payload.observationFacts.map((f: string) => `- ${f}`).join('\n')}

INTERPRETATION CANDIDATES:
${payload.interpretationCandidates.map((c: string) => `- ${c}`).join('\n')}

RECOMMENDED ACTION:
${payload.recommendedAction}

Use:

* The first observation fact as sentence 1
* The first interpretation candidate as sentence 2
* The recommended action as sentence 3

Write exactly 3 sentences.

HARD RULES:

* Do not add information
* Do not combine multiple observations
* Do not select a different interpretation
* Do not infer new relationships
* Do not claim causation
* Never concatenate words — always include a space between every word
* Use exact numbers when available
* Refer to pages by path only
* No bullet points, markdown, or headings
* Write in ${ctx.language}
* Output only the final 3-sentence insight
  `
}


function generateRuleBasedInsight(
  ctx: DigestContext,
  signals: RankedSignal[],
  correlated: CorrelatedSignal | null
): string {
  const { current, snapshots }: DigestContext = ctx

  const previousWeek: WeeklySnapshot | undefined = snapshots.find(
    (s: WeeklySnapshot, i: number) => i > 0 && s.comebackRate !== null
  )

  const comebackDelta: number | null = previousWeek?.comebackRate != null && current.comebackRate != null
    ? current.comebackRate - previousWeek.comebackRate
    : null

  const trendPart: string = comebackDelta === null
    ? `Comeback rate is ${current.comebackRate !== null ? `${current.comebackRate}%` : 'not yet available'} this week.`
    : comebackDelta > 0
      ? `Comeback rate rose ${comebackDelta} points to ${current.comebackRate}% this week.`
      : comebackDelta < 0
        ? `Comeback rate fell ${Math.abs(comebackDelta)} points to ${current.comebackRate}% this week.`
        : `Comeback rate held steady at ${current.comebackRate}% this week.`

  const topSignal: RankedSignal | undefined = signals[0]
  const signalPart: string = correlated
    ? correlated.headline
    : topSignal
      ? topSignal.headline
      : snapshots[0]?.activationPage
        ? `Users who reach ${toPath(snapshots[0].activationPage)} appear more likely to return.`
        : current.topPages[0]?.url
          ? `Most activity this week is concentrated on ${toPath(current.topPages[0].url)}.`
          : 'No clear activation pattern detected yet.'

  const actionPart: string = comebackDelta !== null && comebackDelta < -10
    ? 'Investigate what changed this week in your onboarding or activation flow.'
    : comebackDelta !== null && comebackDelta > 5
      ? 'Keep doing what you\'re doing — double down on whatever drove this week\'s improvement.'
      : 'Keep driving traffic and watch whether the pattern holds next week.'

  return `${trendPart} ${signalPart} ${actionPart}`
}

export async function generateLLMInsight(ctx: DigestContext): Promise<string> {
  if (ctx.current.totalVisitors < 3) {
    return 'Not enough visitors yet to surface meaningful patterns. Keep driving traffic and check back next week.'
  }

  const { correlated, signals } = rankSignals({
    current: ctx.current,
    patterns: ctx.patterns,
    snapshots: ctx.snapshots,
    plan: ctx.plan,
  })

  try {
    const message: Anthropic.Message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{ role: 'user' as const, content: buildPrompt(ctx, signals, correlated) }],
    })

    const block: Anthropic.ContentBlock = message.content[0]
    if (block.type !== 'text') return generateRuleBasedInsight(ctx, signals, correlated)
    const textBlock: Anthropic.TextBlock = block as Anthropic.TextBlock
    return textBlock.text.trim()
  } catch (err: unknown) {
    console.error('[Pulsar] LLM insight failed, using rule-based fallback:', err)
    return generateRuleBasedInsight(ctx, signals, correlated)
  }
}