import { prisma } from '@/db/client'

const PROJECT_KEY: string = 'my-app-xgb9f8'

const PAGES: string[] = [
  'https://myapp.com/',
  'https://myapp.com/signup',
  'https://myapp.com/dashboard',
  'https://myapp.com/create-workspace',
  'https://myapp.com/invite-team',
  'https://myapp.com/connect-integration',
  'https://myapp.com/billing',
  'https://myapp.com/settings',
]

function randomDate(daysAgo: number, hourOffset: number = 10): Date {
  const date: Date = new Date()
  date.setDate(date.getDate() - daysAgo)
  date.setHours(hourOffset + Math.floor(Math.random() * 4))
  date.setMinutes(Math.floor(Math.random() * 59))
  return date
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

  const events: EventInput[] = []

  // ── COHORT 1: Users who complete full onboarding (high retention) ──
  // These users go: signup → dashboard → create-workspace → invite-team → connect-integration
  // They come back consistently
  for (let i: number = 0; i < 18; i++) {
    const sessionId: string = generateSessionId()
    const daysAgo: number = 5

    // first session — full onboarding flow
    for (const page of [
      'https://myapp.com/signup',
      'https://myapp.com/dashboard',
      'https://myapp.com/create-workspace',
      'https://myapp.com/invite-team',
      'https://myapp.com/connect-integration',
    ]) {
      events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: page, timestamp: randomDate(daysAgo, 9), metadata: {} })
    }

    // click on connect-integration CTA
    events.push({ type: 'click', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/connect-integration', timestamp: randomDate(daysAgo, 10), metadata: { label: 'connect-now', tagName: 'button' } })

    // return visit 2 days later — go straight to dashboard and connect-integration
    for (const page of [
      'https://myapp.com/dashboard',
      'https://myapp.com/connect-integration',
      'https://myapp.com/settings',
    ]) {
      events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: page, timestamp: randomDate(daysAgo - 2, 14), metadata: {} })
    }

    // some come back a third time
    if (i < 8) {
      for (const page of [
        'https://myapp.com/dashboard',
        'https://myapp.com/invite-team',
        'https://myapp.com/connect-integration',
      ]) {
        events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: page, timestamp: randomDate(daysAgo - 4, 11), metadata: {} })
      }
    }
  }

  // ── COHORT 2: Users who start onboarding but stop at create-workspace ──
  // They never connect an integration and never come back
  for (let i: number = 0; i < 28; i++) {
    const sessionId: string = generateSessionId()
    const daysAgo: number = Math.floor(Math.random() * 6)

    for (const page of [
      'https://myapp.com/signup',
      'https://myapp.com/dashboard',
      'https://myapp.com/create-workspace',
    ]) {
      events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: page, timestamp: randomDate(daysAgo, 10), metadata: {} })
    }
  }

  // ── COHORT 3: Pure bouncers — land on homepage, never go further ──
  for (let i: number = 0; i < 35; i++) {
    const sessionId: string = generateSessionId()
    const daysAgo: number = Math.floor(Math.random() * 7)
    events.push({
      type: 'page_view', sessionId, projectKey: PROJECT_KEY,
      url: 'https://myapp.com/',
      timestamp: randomDate(daysAgo, 10),
      metadata: {},
    })
  }

  // ── COHORT 4: Billing explorers — check pricing but don't convert ──
  for (let i: number = 0; i < 12; i++) {
    const sessionId: string = generateSessionId()
    const daysAgo: number = Math.floor(Math.random() * 7)
    for (const page of ['https://myapp.com/', 'https://myapp.com/billing']) {
      events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: page, timestamp: randomDate(daysAgo, 15), metadata: {} })
    }
  }

  console.log(`Inserting ${events.length} events...`)
  await prisma.event.createMany({ data: events })
  console.log('Done.\n')

  const sessions = await prisma.event.findMany({
    where: { projectKey: PROJECT_KEY },
    select: { sessionId: true },
    distinct: ['sessionId'],
  })

  console.log(`Unique sessions: ${sessions.length}`)
  console.log('Story: 18 users completed connect-integration and returned. 28 stopped at create-workspace and never came back. 35 bounced from homepage. 12 checked billing.')
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect())