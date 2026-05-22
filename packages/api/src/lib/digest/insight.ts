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

  const previousWeek: WeeklySnapshot | undefined = snapshots[1]
  const comebackDelta: number | null = previousWeek?.comebackRate != null && current.comebackRate != null
    ? current.comebackRate - previousWeek.comebackRate
    : null

  const trendContext: string = comebackDelta !== null
    ? `${comebackDelta > 0 ? `UP ${comebackDelta} points` : `DOWN ${Math.abs(comebackDelta)} points`} vs last week (${previousWeek?.comebackRate}%)`
    : 'no previous week to compare'

  const activationContext: string = patterns.activationPage
    ? `The page that most separates returners from bouncers is ${patterns.activationPage}. Returning users visit it consistently. One-time visitors rarely reach it.`
    : 'No clear activation page detected yet.'

  const depthContext: string = patterns.avgDepthReturners > 0
    ? `Returning users explore ${patterns.avgDepthReturners} pages per session on average. One-time visitors see ${patterns.avgDepthBouncers}.`
    : ''

  const firstPageContext: string = patterns.returnerFirstPages.length > 0
    ? `Returning users most commonly start their sessions on: ${patterns.returnerFirstPages.map((p: { url: string; count: number }) => `${p.url} (${p.count} sessions)`).join(', ')}.`
    : ''

  return `You are a sharp product analyst writing a daily digest for an early-stage founder. Be direct, specific, and lead with the most important finding first.

  CURRENT WEEK METRICS:
  - Comeback rate: ${current.comebackRate !== null ? `${current.comebackRate}%` : 'insufficient data'}
  - Trend: ${trendContext}
  - 4-week history: ${trendLine}
  - Total visitors: ${current.totalVisitors}
  - Top page: ${current.topPages[0]?.url ?? 'none'}

  BEHAVIORAL PATTERNS (last 30 days):
  - ${activationContext}
  - ${depthContext}
  - ${firstPageContext}

  Write 2-3 sentences of plain English insight. Rules:
  - Lead with the most important signal — trend direction or activation pattern
  - Use actual numbers and page names from the data
  - If the trend is improving, say so clearly and tell them what to double down on
  - If the trend is declining, say so clearly and tell them what to investigate
  - Do not use bullet points, markdown, or headers
  - Do not start with "Based on" or "Looking at" or "Your data shows"
  - Do not be generic — every sentence should be specific to this product's data
  - If data is too thin to say anything meaningful, say so honestly in one sentence`
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