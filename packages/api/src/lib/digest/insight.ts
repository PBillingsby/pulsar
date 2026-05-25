import Anthropic from '@anthropic-ai/sdk'
import type { DigestContext, WeeklySnapshot } from '@/types/index'

const client: Anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

function buildPrompt(ctx: DigestContext): string {
  const { current, snapshots, patterns }: DigestContext = ctx

  const trendLine: string = snapshots.length > 1
    ? snapshots
      .slice()
      .reverse()
      .map((s: WeeklySnapshot) => s.comebackRate !== null ? `${s.comebackRate}%` : 'n/a')
      .join(' → ')
    : 'no trend data yet'

  const previousWeek: WeeklySnapshot | undefined = snapshots.find(
    (s: WeeklySnapshot, i: number) => i > 0 && s.comebackRate !== null
  )
  const comebackDelta: number | null = previousWeek?.comebackRate != null && current.comebackRate != null
    ? current.comebackRate - previousWeek.comebackRate
    : null

  const trendContext: string = comebackDelta !== null
    ? `${comebackDelta > 0 ? `UP ${comebackDelta} points` : `DOWN ${Math.abs(comebackDelta)} points'`} vs last week (${previousWeek?.comebackRate}%)`
    : 'no previous week to compare'

  const activationContext: string = patterns.activationPage
    ? `Users who reach ${patterns.activationPage} appear more likely to return — returning users visit it consistently while one-time visitors rarely do. This is correlational, not confirmed causation.`
    : 'No clear activation page pattern detected yet.'

  const depthContext: string = patterns.avgDepthReturners > 0
    ? `Returning users explore ${patterns.avgDepthReturners} pages per session on average versus ${patterns.avgDepthBouncers} for one-time visitors.`
    : ''

  const firstPageContext: string = patterns.returnerFirstPages.length > 0
    ? `Returning users most commonly start on: ${patterns.returnerFirstPages.map((p: { url: string; count: number }) => `${p.url} (${p.count} sessions)`).join(', ')}.`
    : ''

  const dataVolume: string = current.totalVisitors < 20
    ? 'low (under 20 visitors — treat as directional only)'
    : current.totalVisitors < 50
      ? 'moderate (20-50 visitors — patterns are emerging but not yet statistically reliable)'
      : 'sufficient (50+ visitors — patterns are meaningful)'

  return `You are a careful product analyst writing a weekly digest for an early-stage founder. Your job is to surface what the data actually shows — not what you think might be true.

DATA VOLUME: ${dataVolume}

CURRENT WEEK:
- Comeback rate: ${current.comebackRate !== null ? `${current.comebackRate}%` : 'insufficient data'}
- Trend: ${trendContext}
- 4-week history: ${trendLine}
- Total visitors: ${current.totalVisitors}

BEHAVIORAL PATTERNS (last 30 days):
- ${activationContext}
- ${depthContext}
- ${firstPageContext}

Write exactly 3 sentences. Rules:
- Sentence 1: State the comeback rate and trend direction factually. Use measured language — "fell", "rose", "held steady" not "crashed" or "surged".
- Sentence 2: State the most interesting behavioral pattern from the data. Use hedged language — "appears to", "suggests", "users who reach X tend to" not "X is the reason" or "X causes".
- Sentence 3: Give one specific, actionable thing to investigate or double down on this week based on the data.
- Never use the words "strongly", "clearly", "obviously", "definitely", "critical", or "proof".
- Never claim causation. Correlation only.
- If data volume is low, open sentence 1 with a note that patterns are directional given the sample size.
- Do not use bullet points, markdown, or headers.
- Do not start with "Based on", "Looking at", or "Your data shows".`
}

export async function generateLLMInsight(ctx: DigestContext): Promise<string> {
  if (ctx.current.totalVisitors < 3) {
    return 'Not enough visitors yet to surface meaningful patterns. Keep driving traffic and check back tomorrow.'
  }

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: buildPrompt(ctx),
        },
      ],
    })

    const block = message.content[0]
    if (block.type !== 'text') return 'Unable to generate insight.'
    return block.text.trim()
  } catch (err: unknown) {
    console.error('[Pulsar] LLM insight failed:', err)
    return 'Insight generation unavailable right now.'
  }
}