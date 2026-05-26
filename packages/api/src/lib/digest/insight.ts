import Anthropic from '@anthropic-ai/sdk'
import type { DigestContext, WeeklySnapshot } from '@/types/index'

const client: Anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

function toPath(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    return url
  }
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
      s.avgSessionDurationReturners ? `avg session ${s.avgSessionDurationReturners}s` : '',
    ].filter(Boolean)
    return parts.join(', ')
  })

  return lines.join('\n')
}

function detectPatternChanges(snapshots: WeeklySnapshot[]): string {
  const valid: WeeklySnapshot[] = snapshots.filter((s: WeeklySnapshot) => s.comebackRate !== null)
  if (valid.length < 2) return 'Not enough history to detect changes.'

  const current: WeeklySnapshot = valid[0]
  const previous: WeeklySnapshot = valid[1]
  const changes: string[] = []

  if (current.activationPage !== previous.activationPage) {
    if (current.activationPage && previous.activationPage) {
      changes.push(`Activation page shifted from ${toPath(previous.activationPage)} to ${toPath(current.activationPage)}`)
    } else if (current.activationPage && !previous.activationPage) {
      changes.push(`A new activation page emerged this week: ${toPath(current.activationPage)}`)
    } else if (!current.activationPage && previous.activationPage) {
      changes.push(`The activation page signal (${toPath(previous.activationPage)}) disappeared this week`)
    }
  }

  if (current.activationReachRate !== null && previous.activationReachRate !== null) {
    const funnelDelta: number = current.activationReachRate - previous.activationReachRate
    if (Math.abs(funnelDelta) >= 5) {
      changes.push(
        `Activation completion rate for ${toPath(current.activationPage ?? '')} ${funnelDelta > 0 ? 'rose' : 'fell'} from ${previous.activationReachRate}% to ${current.activationReachRate}%`
      )
    }
  }

  if (current.avgDepthReturners !== null && previous.avgDepthReturners !== null) {
    const depthDelta: number = current.avgDepthReturners - previous.avgDepthReturners
    if (Math.abs(depthDelta) >= 1) {
      changes.push(`Returning user session depth ${depthDelta > 0 ? 'increased' : 'decreased'} by ${Math.abs(depthDelta).toFixed(1)} pages`)
    }
  }

  if (current.returnerFirstPage !== previous.returnerFirstPage) {
    if (current.returnerFirstPage && previous.returnerFirstPage) {
      changes.push(`Returning users now most commonly start on ${toPath(current.returnerFirstPage)} instead of ${toPath(previous.returnerFirstPage)}`)
    }
  }

  return changes.length > 0
    ? changes.join('. ')
    : 'Behavioral patterns are consistent with last week.'
}

function buildFunnelContext(snapshots: WeeklySnapshot[]): string {
  const current: WeeklySnapshot | undefined = snapshots[0]
  const previous: WeeklySnapshot | undefined = snapshots.find(
    (s: WeeklySnapshot, i: number) => i > 0 && s.activationReachRate !== null
  )

  if (!current?.activationReachRate || !previous?.activationReachRate) {
    return 'No funnel comparison data available yet.'
  }

  const delta: number = current.activationReachRate - previous.activationReachRate
  return `${current.activationReachRate}% of sessions reached ${toPath(current.activationPage ?? '')} this week vs ${previous.activationReachRate}% last week (${delta > 0 ? '+' : ''}${delta} points)`
}

function buildBehavioralContext(ctx: DigestContext): string {
  const { patterns } = ctx
  const lines: string[] = []

  if (patterns.avgSessionDurationReturners !== null && patterns.avgSessionDurationBouncers !== null) {
    lines.push(`Returning users average ${patterns.avgSessionDurationReturners}s per session vs ${patterns.avgSessionDurationBouncers}s for one-time visitors.`)
  }

  if (patterns.rageClickPages.length > 0) {
    const topRage = patterns.rageClickPages[0]
    lines.push(`Rage clicks detected on ${toPath(topRage.url)} (${topRage.count} occurrences) — suggests UI friction or broken interaction.`)
  }

  if (patterns.formSubmissionRate !== null) {
    lines.push(`${patterns.formSubmissionRate}% of sessions resulted in a form submission.`)
  }

  if (patterns.highIntentPages.length > 0) {
    const topCopy = patterns.highIntentPages[0]
    lines.push(`Users are copying content from ${toPath(topCopy.url)} — signals high research intent.`)
  }

  if (patterns.activationPageScrollDepth !== null) {
    lines.push(`Average scroll depth on activation page: ${patterns.activationPageScrollDepth}%.`)
  }

  return lines.length > 0 ? lines.join('\n') : 'No additional behavioral signals available yet.'
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
  const funnelContext: string = buildFunnelContext(snapshots)
  const behavioralContext: string = buildBehavioralContext(ctx)

  const dataVolume: string = current.totalVisitors < 20
    ? 'low (under 20 visitors — treat as directional only)'
    : current.totalVisitors < 50
      ? 'moderate (20-50 visitors — patterns emerging but not statistically reliable)'
      : 'sufficient (50+ visitors — patterns are meaningful)'

  return `You are a careful product analyst writing a weekly digest for an early-stage founder. Reason about what changed this week and why — prioritise funnel completion data over entry point speculation.

DATA VOLUME: ${dataVolume}

THIS WEEK:
- Comeback rate: ${current.comebackRate !== null ? `${current.comebackRate}%` : 'insufficient data'}
- Trend: ${trendDirection}
- Total visitors: ${current.totalVisitors}

PATTERN HISTORY (oldest to newest):
${patternHistory}

WHAT CHANGED THIS WEEK VS LAST WEEK:
${patternChanges}

FUNNEL COMPLETION:
${funnelContext}
BEHAVIORAL SIGNALS:
${behavioralContext}

Write exactly 3 sentences. Rules:
- Sentence 1: State the comeback rate change factually. If funnel completion data exists and also dropped, state both as likely related. If funnel data is missing, say so explicitly and name the activation page path as the unknown variable.
- Sentence 2: State the most diagnostic signal available. Prioritise in this order: (1) funnel completion change, (2) returner depth change, (3) activation page pattern. Use precise metric language — "returning cohort size", "activation-to-return conversion", "session depth among returners". Avoid vague phrases.
- Sentence 3: State one primary hypothesis and one concrete investigation step. The hypothesis must reference the activation page path. Do not offer multiple soft hypotheses — pick the most likely one based on available data.
- Structure your reasoning as: retention change → activation rate status → engagement quality among returners → primary hypothesis.
- Never claim causation. Use "suggests", "appears", "may indicate".
- Never use "strongly", "clearly", "definitely", "proof", "crashed", "surged".
- Page depth does not equal activation quality — acknowledge this if using depth as a signal.
- Always refer to pages by their path only, never full URLs.
- If data volume is low, note it in sentence 1.
- If rage clicks are detected on the activation page, treat this as a high-priority friction signal and mention it specifically in sentence 2 or 3.
- Do not use bullet points, markdown, or headers.
- Do not start with "Based on", "Looking at", or "Your data shows".`
}

function generateRuleBasedInsight(ctx: DigestContext): string {
  const { current, snapshots }: DigestContext = ctx

  const previousWeek: WeeklySnapshot | undefined = snapshots.find(
    (s: WeeklySnapshot, i: number) => i > 0 && s.comebackRate !== null
  )

  const comebackDelta: number | null = previousWeek?.comebackRate != null && current.comebackRate != null
    ? current.comebackRate - previousWeek.comebackRate
    : null

  const trendPart: string = comebackDelta === null
    ? `Your comeback rate is ${current.comebackRate !== null ? `${current.comebackRate}%` : 'not yet available'} this week.`
    : comebackDelta > 0
      ? `Your comeback rate rose ${comebackDelta} points to ${current.comebackRate}% this week, continuing a positive trend.`
      : comebackDelta < 0
        ? `Your comeback rate fell ${Math.abs(comebackDelta)} points to ${current.comebackRate}% this week.`
        : `Your comeback rate held steady at ${current.comebackRate}% this week.`

  const activationPart: string = snapshots[0]?.activationPage
    ? `Users who reach ${toPath(snapshots[0].activationPage)} appear more likely to return than those who do not.`
    : current.topPages[0]?.url
      ? `Most activity this week is concentrated on ${toPath(current.topPages[0].url)}.`
      : 'No clear activation pattern detected yet.'

  const actionPart: string = comebackDelta !== null && comebackDelta < -10
    ? 'Investigate what changed this week in your onboarding or activation flow.'
    : comebackDelta !== null && comebackDelta > 5
      ? 'Keep doing what you\'re doing — double down on whatever drove this week\'s improvement.'
      : 'Keep driving traffic and watch whether the pattern holds next week.'

  return `${trendPart} ${activationPart} ${actionPart}`
}

export async function generateLLMInsight(ctx: DigestContext): Promise<string> {
  if (ctx.current.totalVisitors < 3) {
    return 'Not enough visitors yet to surface meaningful patterns. Keep driving traffic and check back tomorrow.'
  }

  try {
    const message: Anthropic.Message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{ role: 'user' as const, content: buildPrompt(ctx) }],
    })

    const block: Anthropic.ContentBlock = message.content[0]
    if (block.type !== 'text') return generateRuleBasedInsight(ctx)
    const textBlock: Anthropic.TextBlock = block as Anthropic.TextBlock
    return textBlock.text.trim()
  } catch (err: unknown) {
    console.error('[Pulsar] LLM insight failed, using rule-based fallback:', err)
    return generateRuleBasedInsight(ctx)
  }
}