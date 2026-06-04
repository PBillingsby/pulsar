import { prisma } from '@/db/client'

// Use a dedicated test project — run bun run src/scripts/dev/seed-all-signals.ts
const PROJECT_KEY: string = 'signal-test-79kh58'

function randomDate(daysAgo: number, hourOffset: number = 10): Date {
  const date: Date = new Date()
  date.setDate(date.getDate() - daysAgo)
  date.setHours(hourOffset + Math.floor(Math.random() * 4))
  date.setMinutes(Math.floor(Math.random() * 59))
  date.setSeconds(Math.floor(Math.random() * 59))
  return date
}

function randomDateOffset(base: Date, offsetSeconds: number): Date {
  return new Date(base.getTime() + offsetSeconds * 1000)
}

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

interface EventInput {
  type: string
  sessionId: string
  projectKey: string
  url: string
  timestamp: Date
  metadata: Record<string, unknown>
}

async function seed(): Promise<void> {
  console.log(`Clearing existing data for ${PROJECT_KEY}...`)
  await prisma.event.deleteMany({ where: { projectKey: PROJECT_KEY } })
  await prisma.weeklySnapshot.deleteMany({ where: { projectKey: PROJECT_KEY } })

  // ── PREVIOUS WEEK SNAPSHOT ──
  // High comeback rate and high activation reach — so this week's drop triggers signals
  await prisma.weeklySnapshot.create({
    data: {
      projectKey: PROJECT_KEY,
      weekStart: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      totalVisitors: 80,
      returning: 37,
      comebackRate: 46,  // this week will be ~18% — drop of 28pts triggers retention_risk
      topPage: 'https://myapp.com/connect-integration',
      totalEvents: 320,
      activationPage: 'https://myapp.com/connect-integration',
      avgDepthReturners: 8.2,
      avgDepthBouncers: 1.0,
      returnerTopPage: 'https://myapp.com/connect-integration',
      bouncerTopPage: 'https://myapp.com/',
      returnerFirstPage: 'https://myapp.com/signup',
      activationReachRate: 58,  // this week will be ~30% — drop of 28pts triggers funnel_drop
      activationPageViews: 46,
    }
  })

  console.log('Seeded previous week snapshot: comeback 46%, activation reach 58%')

  const events: EventInput[] = []

  // ── COHORT 1: Returners (hidden winner signal) ──
  // 12 users who all start on /templates and return — triggers hidden_winner
  for (let i: number = 0; i < 12; i++) {
    const sessionId: string = generateSessionId()
    const sessionStart: Date = randomDate(5, 9)

    for (const page of [
      'https://myapp.com/templates',
      'https://myapp.com/dashboard',
      'https://myapp.com/connect-integration',
    ]) {
      events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: page, timestamp: randomDateOffset(sessionStart, 30), metadata: {} })
    }

    events.push({ type: 'form_submit', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/signup', timestamp: randomDateOffset(sessionStart, 40), metadata: { formId: 'signup-form' } })
    events.push({ type: 'session_end', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/connect-integration', timestamp: randomDateOffset(sessionStart, 200), metadata: { durationSeconds: 200, reason: 'visibility_hidden' } })

    // return visit — same session id = returner
    const returnStart: Date = randomDate(2, 14)
    events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/templates', timestamp: randomDateOffset(returnStart, 10), metadata: {} })
    events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/dashboard', timestamp: randomDateOffset(returnStart, 40), metadata: {} })
    events.push({ type: 'session_end', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/dashboard', timestamp: randomDateOffset(returnStart, 120), metadata: { durationSeconds: 120, reason: 'beforeunload' } })
  }

  // ── COHORT 2: Frustrated users (activation_friction signal) ──
  // 15 users rage clicking on /connect-integration — 15% of sessions triggers friction
  for (let i: number = 0; i < 15; i++) {
    const sessionId: string = generateSessionId()
    const sessionStart: Date = randomDate(Math.floor(Math.random() * 6), 10)

    for (const page of ['https://myapp.com/signup', 'https://myapp.com/dashboard', 'https://myapp.com/connect-integration']) {
      events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: page, timestamp: randomDateOffset(sessionStart, 30), metadata: {} })
    }

    events.push({ type: 'rage_click', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/connect-integration', timestamp: randomDateOffset(sessionStart, 120), metadata: { element: 'BUTTON#connect-now', clicks: 4, tagName: 'button', id: 'connect-now' } })
    events.push({ type: 'scroll_depth', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/connect-integration', timestamp: randomDateOffset(sessionStart, 130), metadata: { depth: 25 } })
    events.push({ type: 'tab_blur', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/connect-integration', timestamp: randomDateOffset(sessionStart, 140), metadata: {} })
    events.push({ type: 'session_end', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/connect-integration', timestamp: randomDateOffset(sessionStart, 150), metadata: { durationSeconds: 150, reason: 'beforeunload' } })
  }

  // ── COHORT 3: High intent no convert (billing page) ──
  // 10 users copying from /billing, none submitting forms
  for (let i: number = 0; i < 10; i++) {
    const sessionId: string = generateSessionId()
    const sessionStart: Date = randomDate(Math.floor(Math.random() * 7), 15)

    events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/', timestamp: sessionStart, metadata: {} })
    events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/billing', timestamp: randomDateOffset(sessionStart, 30), metadata: {} })

    for (const depth of [25, 50, 75, 100]) {
      events.push({ type: 'scroll_depth', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/billing', timestamp: randomDateOffset(sessionStart, 30 + depth), metadata: { depth } })
    }

    events.push({ type: 'copy', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/billing', timestamp: randomDateOffset(sessionStart, 160), metadata: { selectionLength: 45 } })
    events.push({ type: 'tab_blur', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/billing', timestamp: randomDateOffset(sessionStart, 170), metadata: {} })
    events.push({ type: 'session_end', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/billing', timestamp: randomDateOffset(sessionStart, 200), metadata: { durationSeconds: 200, reason: 'beforeunload' } })
  }

  // ── COHORT 4: Pure bouncers ──
  // 60 bouncers — keeps comeback rate low (~18%) to trigger retention_risk vs last week's 46%
  for (let i: number = 0; i < 60; i++) {
    const sessionId: string = generateSessionId()
    const sessionStart: Date = randomDate(Math.floor(Math.random() * 7), 10)
    events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/', timestamp: sessionStart, metadata: {} })
    events.push({ type: 'session_end', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/', timestamp: randomDateOffset(sessionStart, 20), metadata: { durationSeconds: 20, reason: 'beforeunload' } })
  }

  console.log(`Inserting ${events.length} events...`)
  await prisma.event.createMany({ data: events })
  console.log('Done.\n')

  const sessions = await prisma.event.findMany({ where: { projectKey: PROJECT_KEY }, select: { sessionId: true }, distinct: ['sessionId'] })
  const eventCounts = await prisma.event.groupBy({ by: ['type'], where: { projectKey: PROJECT_KEY }, _count: { type: true } })

  console.log('Seed summary:')
  eventCounts.forEach(e => console.log(`  ${e.type}: ${e._count.type}`))
  console.log(`  unique sessions: ${sessions.length}`)
  console.log('\nExpected signals:')
  console.log('  retention_risk     — comeback rate ~18% vs 46% last week (drop of ~28pts)')
  console.log('  funnel_drop        — activation reach ~30% vs 58% last week (drop of ~28pts)')
  console.log('  activation_friction — 15 rage clicks on /connect-integration (~15% of sessions)')
  console.log('  high_intent_no_convert — 10 copy events on /billing, low form submission')
  console.log('  hidden_winner      — /templates visited 4x more by returners than average')
  console.log('\nNote: positive_trend will not fire — it conflicts with retention_risk by design')
  console.log(`\nRun digest: curl -X POST http://localhost:3001/digest/${PROJECT_KEY} -H "Content-Type: application/json" -d \'{ "email": "philbillingsby@gmail.com" }\'`)
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect())