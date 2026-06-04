import Anthropic from '@anthropic-ai/sdk'
import type { DigestContext, WeeklySnapshot } from '@/types/index'
import { rankSignals } from '@/lib/analytics/signals/index'
import type { RankedSignal } from '@/lib/analytics/signals/types'

const client: Anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

function toPath(url: string): string {
  try { return new URL(url).pathname } catch { return url }
}

function buildPatternHistory(snapshots: WeeklySnapshot[]): string {
  const validSnapshots: WeeklySnapshot[] = snapshots
    .filter((s: WeeklySnapshot) => s.comebackRate !== null)
    .slice(0, 4)
    .reverse()

  if (validSnapshots.length < 2) return 'Insufficient history to detect pattern changes.'

  const lines: string[] = validSnapshots.map((s: WeeklySnapshot) => {
    const week: string = new Date(s.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const parts: string[] = [
      `Week of ${week}:`,
      `comeback ${s.comebackRate}%`,
      s.activationPage ? `activation page ${toPath(s.activationPage)}` : 'no activation page',
      s.activationReachRate !== null ? `activation reach ${s.activationReachRate}%` : '',
      s.avgDepthReturners ? `returner depth ${s.avgDepthReturners} pages` : '',
      s.returnerFirstPage ? `returners start on ${toPath(s.returnerFirstPage)}` : '',
    ].filter(Boolean)
    return parts.join(', ')
  })

  return lines.join('\n')
}

function buildRankedSignalsContext(signals: RankedSignal[]): string {
  if (signals.length === 0) return 'No signals above threshold this week.'

  return signals.map((s: RankedSignal, i: number) => {
    const prefix: string = `PRIORITY ${i + 1} [${s.urgency.toUpperCase()}] — ${s.type.replace(/_/g, ' ').toUpperCase()}`
    const headline: string = s.headline
    const evidence: string = s.evidence.map((e: string) => `  - ${e}`).join('\n')
    return `${prefix}\n${headline}\n${evidence}`
  }).join('\n\n')
}

function buildPrompt(ctx: DigestContext, signals: RankedSignal[]): string {
  const { current, snapshots } = ctx

  const patternHistory: string = buildPatternHistory(snapshots)
  const rankedSignals: string = buildRankedSignalsContext(signals)

  const dataVolume: string = current.totalVisitors < 20
    ? 'low (under 20 visitors — treat as directional only)'
    : current.totalVisitors < 50
      ? 'moderate (20-50 visitors — patterns emerging but not statistically reliable)'
      : 'sufficient (50+ visitors — patterns are meaningful)'

  const topSignal: RankedSignal | undefined = signals[0]
  const hasNegativeSignal: boolean = signals.some(
    (s: RankedSignal) => s.urgency === 'critical'
  )

  return `You are a careful product analyst writing a weekly digest for an early-stage founder. The signal ranking layer has already done the analysis — your job is to communicate the most important findings clearly and concisely.

DATA VOLUME: ${dataVolume}

THIS WEEK:
- Comeback rate: ${current.comebackRate !== null ? `${current.comebackRate}%` : 'insufficient data'}
- Total visitors: ${current.totalVisitors}

PATTERN HISTORY (oldest to newest):
${patternHistory}

RANKED SIGNALS (pre-analysed, in priority order):
${rankedSignals}

${topSignal ? `LEAD WITH: ${topSignal.headline}` : ''}
${hasNegativeSignal ? 'TONE: There is something worth investigating. Create urgency without alarm.' : 'TONE: Positive or stable week. Be encouraging but grounded.'}

Write exactly 3 sentences. Rules:
- Sentence 1: Lead with the highest priority signal. State the implication first, then the supporting data. Not "Your comeback rate fell X points" — instead "Something may have broken in your activation flow this week — comeback rate dropped Xpts and rage clicks on /page suggest friction."
- Sentence 2: Surface the second ranked signal only. If no second signal exists, add one grounding observation from the pattern history.
- Sentence 3: One concrete action. The most important investigation step only.
- Never mention more than two signals total across all three sentences.
- Never claim causation. Use "suggests", "appears", "may indicate".
- Never use "strongly", "clearly", "definitely", "proof", "crashed", "surged".
- Always refer to pages by path only, never full URLs.
- If data volume is low, note it in sentence 1.
- Do not use bullet points, markdown, or headers.
- Do not start with "Based on", "Looking at", or "Your data shows".
- Write the entire response in ${ctx.language}. Do not translate idioms literally — use natural phrasing a native ${ctx.language} speaker would use.
- Never editorialize about importance. If a page matters, the signal data shows it 
— Do not add phrases like "right where it matters most", "most critical", or "before it even has a chance".
`
}

function generateRuleBasedInsight(ctx: DigestContext, signals: RankedSignal[]): string {
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
  const signalPart: string = topSignal
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

  const signals: RankedSignal[] = rankSignals({
    current: ctx.current,
    patterns: ctx.patterns,
    snapshots: ctx.snapshots,
  })

  try {
    const message: Anthropic.Message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{ role: 'user' as const, content: buildPrompt(ctx, signals) }],
    })

    const block: Anthropic.ContentBlock = message.content[0]
    if (block.type !== 'text') return generateRuleBasedInsight(ctx, signals)
    const textBlock: Anthropic.TextBlock = block as Anthropic.TextBlock
    return textBlock.text.trim()
  } catch (err: unknown) {
    console.error('[Pulsar] LLM insight failed, using rule-based fallback:', err)
    return generateRuleBasedInsight(ctx, signals)
  }
}