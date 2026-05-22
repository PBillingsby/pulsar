import { prisma } from '@/db/client'

const PROJECT_KEY: string = 'my-app-xgb9f8'

const PAGES: string[] = [
  'https://myapp.com/',
  'https://myapp.com/features',
  'https://myapp.com/pricing',
  'https://myapp.com/dashboard',
  'https://myapp.com/onboarding',
  'https://myapp.com/settings',
]

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomDate(daysAgo: number, hourOffset: number = 0): Date {
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
  console.log('Clearing existing test data...')
  await prisma.event.deleteMany({ where: { projectKey: PROJECT_KEY } })
  await prisma.weeklySnapshot.deleteMany({ where: { projectKey: PROJECT_KEY } })

  const events: EventInput[] = []

  // ── WEEK 4 (28-21 days ago) — launch week, lots of curiosity, low retention ──
  // 45 one-time visitors, most bounce after homepage
  for (let i: number = 0; i < 45; i++) {
    const sessionId: string = generateSessionId()
    const daysAgo: number = 21 + Math.floor(Math.random() * 7)
    events.push({
      type: 'page_view', sessionId, projectKey: PROJECT_KEY,
      url: 'https://myapp.com/', timestamp: randomDate(daysAgo, 10), metadata: {},
    })
  }
  // 6 who explored more but didn't come back
  for (let i: number = 0; i < 6; i++) {
    const sessionId: string = generateSessionId()
    const daysAgo: number = 21 + Math.floor(Math.random() * 7)
    for (const page of ['https://myapp.com/', 'https://myapp.com/features', 'https://myapp.com/pricing']) {
      events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: page, timestamp: randomDate(daysAgo, 11), metadata: {} })
    }
  }
  // 4 who came back the next day — early believers
  for (let i: number = 0; i < 4; i++) {
    const sessionId: string = generateSessionId()
    const daysAgo: number = 24
    for (const page of ['https://myapp.com/', 'https://myapp.com/onboarding', 'https://myapp.com/dashboard']) {
      events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: page, timestamp: randomDate(daysAgo, 9), metadata: {} })
    }
    // return visit next day
    for (const page of ['https://myapp.com/dashboard', 'https://myapp.com/settings']) {
      events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: page, timestamp: randomDate(daysAgo - 1, 14), metadata: {} })
    }
  }

  // ── WEEK 3 (21-14 days ago) — post-launch dip, founder tweaks onboarding ──
  // 28 visitors, slightly better retention
  for (let i: number = 0; i < 22; i++) {
    const sessionId: string = generateSessionId()
    const daysAgo: number = 14 + Math.floor(Math.random() * 7)
    events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/', timestamp: randomDate(daysAgo, 10), metadata: {} })
  }
  // 6 who hit onboarding and came back
  for (let i: number = 0; i < 6; i++) {
    const sessionId: string = generateSessionId()
    const daysAgo: number = 17
    for (const page of ['https://myapp.com/', 'https://myapp.com/onboarding', 'https://myapp.com/dashboard', 'https://myapp.com/settings']) {
      events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: page, timestamp: randomDate(daysAgo, 11), metadata: {} })
    }
    for (const page of ['https://myapp.com/dashboard', 'https://myapp.com/settings', 'https://myapp.com/features']) {
      events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: page, timestamp: randomDate(daysAgo - 2, 15), metadata: {} })
    }
  }

  // ── WEEK 2 (14-7 days ago) — things start clicking, onboarding change working ──
  // 38 visitors, noticeably better retention
  for (let i: number = 0; i < 24; i++) {
    const sessionId: string = generateSessionId()
    const daysAgo: number = 7 + Math.floor(Math.random() * 7)
    events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/', timestamp: randomDate(daysAgo, 10), metadata: {} })
  }
  // 14 power users who hit onboarding then came back multiple times
  for (let i: number = 0; i < 14; i++) {
    const sessionId: string = generateSessionId()
    const daysAgo: number = 12
    for (const page of ['https://myapp.com/', 'https://myapp.com/onboarding', 'https://myapp.com/dashboard', 'https://myapp.com/settings']) {
      events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: page, timestamp: randomDate(daysAgo, 9), metadata: {} })
    }
    for (const page of ['https://myapp.com/dashboard', 'https://myapp.com/settings']) {
      events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: page, timestamp: randomDate(daysAgo - 3, 16), metadata: {} })
    }
    if (i < 6) {
      for (const page of ['https://myapp.com/settings', 'https://myapp.com/features']) {
        events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: page, timestamp: randomDate(daysAgo - 5, 11), metadata: {} })
      }
    }
  }

  // ── WEEK 1 / THIS WEEK (last 7 days) — clear signal emerging ──
  // 52 visitors, strong retention pattern
  for (let i: number = 0; i < 30; i++) {
    const sessionId: string = generateSessionId()
    const daysAgo: number = Math.floor(Math.random() * 7)
    events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/', timestamp: randomDate(daysAgo, 10), metadata: {} })
  }
  // 22 who complete onboarding and come back
  for (let i: number = 0; i < 22; i++) {
    const sessionId: string = generateSessionId()
    const daysAgo: number = 5
    for (const page of ['https://myapp.com/', 'https://myapp.com/onboarding', 'https://myapp.com/dashboard', 'https://myapp.com/settings', 'https://myapp.com/features']) {
      events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: page, timestamp: randomDate(daysAgo, 10), metadata: {} })
    }
    for (const page of ['https://myapp.com/dashboard', 'https://myapp.com/settings']) {
      events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: page, timestamp: randomDate(daysAgo - 2, 14), metadata: {} })
    }
    if (i < 10) {
      for (const page of ['https://myapp.com/settings', 'https://myapp.com/dashboard', 'https://myapp.com/features']) {
        events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: page, timestamp: randomDate(daysAgo - 4, 11), metadata: {} })
      }
    }
  }

  // some clicks across all weeks
  const clickLabels: string[] = ['get-started', 'try-free', 'view-pricing', 'start-onboarding', 'connect-integration', 'save-settings']
  for (let i: number = 0; i < 60; i++) {
    events.push({
      type: 'click',
      sessionId: generateSessionId(),
      projectKey: PROJECT_KEY,
      url: randomItem(PAGES),
      timestamp: randomDate(Math.floor(Math.random() * 28), 12),
      metadata: { label: randomItem(clickLabels), tagName: 'button' },
    })
  }

  console.log(`Inserting ${events.length} events...`)
  await prisma.event.createMany({ data: events })
  console.log('Done.\n')

  // capture weekly snapshots for each week so trend data shows up
  const { captureWeeklySnapshot } = await import('@/lib/analytics/snapshots')

  // current week
  await captureWeeklySnapshot(PROJECT_KEY)
  console.log('Snapshots captured.')

  const summary = await prisma.event.groupBy({
    by: ['type'],
    where: { projectKey: PROJECT_KEY },
    _count: { type: true },
  })
  const sessions = await prisma.event.findMany({
    where: { projectKey: PROJECT_KEY },
    select: { sessionId: true },
    distinct: ['sessionId'],
  })
  console.log('\nSeed summary:')
  summary.forEach((s) => console.log(`  ${s.type}: ${s._count.type} events`))
  console.log(`  unique sessions: ${sessions.length}`)
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect())