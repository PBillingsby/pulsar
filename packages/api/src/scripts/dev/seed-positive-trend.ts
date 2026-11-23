import { prisma } from '@/db/client'

const PROJECT_KEY: string = 'signal-test-2-mhky2x'

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
  console.log('Clearing existing data...')
  await prisma.event.deleteMany({ where: { projectKey: PROJECT_KEY } })
  await prisma.weeklySnapshot.deleteMany({ where: { projectKey: PROJECT_KEY } })

  // ── PREVIOUS WEEK SNAPSHOT ──
  // Low comeback rate last week — so this week's rise triggers positive_trend
  await prisma.weeklySnapshot.create({
    data: {
      projectKey: PROJECT_KEY,
      weekStart: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      totalVisitors: 60,
      returning: 7,
      comebackRate: 12,  // this week will be ~38% — rise of ~26pts triggers positive_trend
      topPage: 'https://myapp.com/onboarding',
      totalEvents: 180,
      activationPage: 'https://myapp.com/onboarding',
      avgDepthReturners: 3.1,
      avgDepthBouncers: 1.0,
      returnerTopPage: 'https://myapp.com/onboarding',
      bouncerTopPage: 'https://myapp.com/',
      returnerFirstPage: 'https://myapp.com/signup',
      activationReachRate: 18,
      activationPageViews: 11,
    }
  })

  console.log('Seeded previous week snapshot: comeback 12%, activation reach 18%')

  const events: EventInput[] = []

  // ── COHORT 1: Strong returners ──
  // 30 users who complete onboarding and come back — drives comeback rate to ~38%
  for (let i: number = 0; i < 30; i++) {
    const sessionId: string = generateSessionId()
    const sessionStart: Date = randomDate(5, 9)

    for (const page of [
      'https://myapp.com/signup',
      'https://myapp.com/onboarding',
      'https://myapp.com/dashboard',
    ]) {
      events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: page, timestamp: randomDateOffset(sessionStart, 30), metadata: {} })
    }

    events.push({ type: 'form_submit', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/signup', timestamp: randomDateOffset(sessionStart, 40), metadata: { formId: 'signup-form' } })
    events.push({ type: 'scroll_depth', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/onboarding', timestamp: randomDateOffset(sessionStart, 90), metadata: { depth: 100 } })
    events.push({ type: 'session_end', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/dashboard', timestamp: randomDateOffset(sessionStart, 200), metadata: { durationSeconds: 200, reason: 'visibility_hidden' } })

    // return visit
    const returnStart: Date = randomDate(2, 14)
    for (const page of ['https://myapp.com/dashboard', 'https://myapp.com/onboarding']) {
      events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: page, timestamp: randomDateOffset(returnStart, 20), metadata: {} })
    }
    events.push({ type: 'session_end', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/onboarding', timestamp: randomDateOffset(returnStart, 120), metadata: { durationSeconds: 120, reason: 'beforeunload' } })
  }

  // ── COHORT 2: One-time visitors ──
  // 50 visitors who don't return — keeps total high so signal is statistically meaningful
  for (let i: number = 0; i < 50; i++) {
    const sessionId: string = generateSessionId()
    const sessionStart: Date = randomDate(Math.floor(Math.random() * 7), 10)

    events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/', timestamp: sessionStart, metadata: {} })
    events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/signup', timestamp: randomDateOffset(sessionStart, 30), metadata: {} })
    events.push({ type: 'session_end', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/signup', timestamp: randomDateOffset(sessionStart, 60), metadata: { durationSeconds: 60, reason: 'beforeunload' } })
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
  console.log('  positive_trend — comeback rate ~38% vs 12% last week (rise of ~26pts)')
  console.log('  hidden_winner  — /onboarding visited significantly more by returners')
  console.log('\nNo negative signals expected')
  console.log(`\nRun digest: curl -X POST http://localhost:3001/digest/${PROJECT_KEY} -H "Authorization: Bearer $PULSAR_SECRET_KEY"`)
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect())