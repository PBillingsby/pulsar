import Anthropic from '@anthropic-ai/sdk'
import type { DigestContext, WeeklySnapshot } from '@/types/index'

const client: Anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

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
      s.activationPage ? `activation page ${s.activationPage}` : 'no activation page',
      s.avgDepthReturners ? `returner depth ${s.avgDepthReturners} pages` : '',
      s.returnerFirstPage ? `returners start on ${s.returnerFirstPage}` : '',
    ].filter(Boolean)
    return parts.join(', ')
  })

  return lines.join('\n')
}

function detectPatternChanges(snapshots: WeeklySnapshot[]): string {
  const valid: WeeklySnapshot[] = snapshots
    .filter((s: WeeklySnapshot) => s.comebackRate !== null)

  if (valid.length < 2) return 'Not enough history to detect changes.'

  const current: WeeklySnapshot = valid[0]
  const previous: WeeklySnapshot = valid[1]
  const changes: string[] = []

  // activation page change
  if (current.activationPage !== previous.activationPage) {
    if (current.activationPage && previous.activationPage) {
      changes.push(`Activation page shifted from ${previous.activationPage} to ${current.activationPage}`)
    } else if (current.activationPage && !previous.activationPage) {
      changes.push(`A new activation page emerged this week: ${current.activationPage}`)
    } else if (!current.activationPage && previous.activationPage) {
      changes.push(`The activation page signal (${previous.activationPage}) disappeared this week`)
    }
  }

  // session depth change for returners
  if (current.avgDepthReturners !== null && previous.avgDepthReturners !== null) {
    const depthDelta: number = current.avgDepthReturners - previous.avgDepthReturners
    if (Math.abs(depthDelta) >= 1) {
      changes.push(`Returning user session depth ${depthDelta > 0 ? 'increased' : 'decreased'} by ${Math.abs(depthDelta).toFixed(1)} pages`)
    }
  }

  // returner entry point change
  if (current.returnerFirstPage !== previous.returnerFirstPage) {
    if (current.returnerFirstPage && previous.returnerFirstPage) {
      changes.push(`Returning users now most commonly start on ${current.returnerFirstPage} instead of ${previous.returnerFirstPage}`)
    }
  }

  return changes.length > 0
    ? changes.join('. ')
    : 'Behavioral patterns are consistent with last week.'
}

function buildPrompt(ctx: DigestContext): string {
  const { current, snapshots } = ctx

  const previousWeek: WeeklySnapshot | undefined = snapshots.find(
    (s: WeeklySnapshot, i: number) => i > 0 && s.comebackRate !== null
  )

  const comebackDelta: number | null = previousWeek?.comebackRate != null && current.comebackRate != null
    ? current.comebackRate - previousWeek.comebackRate
    : null

  const trendDirection: string = comebackDelta === null ? 'no comparison available'
    : comebackDelta > 0 ? `UP ${comebackDelta} points from ${previousWeek?.comebackRate}% last week`
      : comebackDelta < 0 ? `DOWN ${Math.abs(comebackDelta)} points from ${previousWeek?.comebackRate}% last week`
        : 'unchanged from last week'

  const patternHistory: string = buildPatternHistory(snapshots)
  const patternChanges: string = detectPatternChanges(snapshots)

  const dataVolume: string = current.totalVisitors < 20
    ? 'low (under 20 visitors — treat as directional only)'
    : current.totalVisitors < 50
      ? 'moderate (20-50 visitors — patterns emerging but not statistically reliable)'
      : 'sufficient (50+ visitors — patterns are meaningful)'

  return `You are a careful product analyst writing a weekly digest for an early-stage founder. Your job is to reason about what changed this week and why it might have happened — not just describe the current state.

DATA VOLUME: ${dataVolume}

THIS WEEK:
- Comeback rate: ${current.comebackRate !== null ? `${current.comebackRate}%` : 'insufficient data'}
- Trend: ${trendDirection}
- Total visitors: ${current.totalVisitors}

PATTERN HISTORY (oldest to newest):
${patternHistory}

WHAT CHANGED THIS WEEK VS LAST WEEK:
${patternChanges}

Write exactly 3 sentences. Rules:
- Sentence 1: State what happened to the comeback rate this week and whether the pattern changes explain it. Be specific about numbers and page names.
- Sentence 2: Based on the pattern history, identify the single most important signal — something that changed, emerged, or disappeared that a founder should pay attention to. Use hedged language: "appears to", "suggests", "may indicate".
- Sentence 3: Give one specific investigation or action for this week based on the pattern changes, not just the comeback rate number.
- Never claim causation. Correlation only.
- Never use "strongly", "clearly", "definitely", "proof", "crashed", "surged".
- If data volume is low, note it briefly in sentence 1.
- Do not use bullet points, markdown, or headers.
- Do not start with "Based on", "Looking at", or "Your data shows".`
}

export async function generateLLMInsight(ctx: DigestContext): Promise<string> {
  if (ctx.current.totalVisitors < 3) {
    return 'Not enough visitors yet to surface meaningful patterns. Keep driving traffic and check back tomorrow.'
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{ role: 'user', content: buildPrompt(ctx) }],
    })

    const block = message.content[0]
    if (block.type !== 'text') return 'Unable to generate insight.'
    return block.text.trim()
  } catch (err: unknown) {
    console.error('[Pulsar] LLM insight failed:', err)
    return 'Insight generation unavailable right now.'
  }
}