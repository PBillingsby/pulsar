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
    observationFacts.push(...top.evidence.slice(0, 3))
    interpretationCandidates.push(top.headline)
    return {
      observationFacts,
      interpretationCandidates,
      recommendedAction: top.recommendedAction,
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
  return `You are a copywriter writing a 3-sentence product insight for an early-stage founder. You are not an analyst — the analysis is already done. Your only job is to rewrite the structured data below into clear, human sentences. Do not add new information. Do not connect facts that are not listed together.
 
DATA VOLUME: ${payload.dataVolume}
 
OBSERVATION FACTS (use these in sentence 1):
${payload.observationFacts.map((f: string) => `- ${f}`).join('\n')}
 
INTERPRETATION CANDIDATES (choose the most grounded one for sentence 2):
${payload.interpretationCandidates.map((c: string) => `- ${c}`).join('\n')}
 
RECOMMENDED ACTION (use this exactly in sentence 3):
${payload.recommendedAction}
 
Write exactly 3 sentences:
- Sentence 1: State the observation facts. Plain, factual, no interpretation.
- Sentence 2: State the single most grounded interpretation candidate. Use "suggests", "appears", or "may indicate". Do not go beyond what the facts show.
- Sentence 3: Use the recommended action exactly as written. You may rephrase slightly for flow but do not change the meaning.
 
HARD RULES:
- Do not add information not listed above
- Do not connect facts that are not explicitly paired
- Never claim causation
- Never use: strongly, clearly, definitely, proof, crashed, surged
- Never remove spaces around em dashes
- Never say "right where it matters most", "most critical", "before it even has a chance"
- Refer to pages by path only, never full URLs
- Do not repeat the page name more than twice across all three sentences
- No bullet points, markdown, or headers
- Do not start with "Based on", "Looking at", or "Your data shows"
- Sentence 1 must state ONE observation only — the most important signal fact. Do not list multiple signals.
- Sentence 3 must be a direct instruction. Never use "would be", "it's worth", or "a useful next step".
- Write in ${ctx.language}. Use natural phrasing — do not translate idioms literally.
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