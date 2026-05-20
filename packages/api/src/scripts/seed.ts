import { prisma } from '@/db/client'

const PROJECT_KEY = 'test-key'

const PAGES = [
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

function randomDate(daysAgo: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  date.setHours(Math.floor(Math.random() * 23))
  date.setMinutes(Math.floor(Math.random() * 59))
  return date
}

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

async function seed() {
  console.log('Clearing existing test data...')
  await prisma.event.deleteMany({ where: { projectKey: PROJECT_KEY } })

  const events = []

  // 20 one-time visitors over the last 7 days
  for (let i = 0; i < 20; i++) {
    const sessionId = generateSessionId()
    const daysAgo = Math.floor(Math.random() * 7)
    const pageCount = Math.floor(Math.random() * 3) + 1

    for (let p = 0; p < pageCount; p++) {
      events.push({
        type: 'page_view',
        sessionId,
        projectKey: PROJECT_KEY,
        url: randomItem(PAGES),
        timestamp: randomDate(daysAgo),
        metadata: {},
      })
    }
  }

  // 8 returning users who came back on different days
  for (let i = 0; i < 8; i++) {
    const sessionId = generateSessionId()

    // first visit
    const firstVisitPages = Math.floor(Math.random() * 4) + 1
    for (let p = 0; p < firstVisitPages; p++) {
      events.push({
        type: 'page_view',
        sessionId,
        projectKey: PROJECT_KEY,
        url: randomItem(PAGES),
        timestamp: randomDate(5),
        metadata: {},
      })
    }

    // return visit on a different day
    const returnVisitPages = Math.floor(Math.random() * 3) + 1
    for (let p = 0; p < returnVisitPages; p++) {
      events.push({
        type: 'page_view',
        sessionId,
        projectKey: PROJECT_KEY,
        url: randomItem(PAGES),
        timestamp: randomDate(1),
        metadata: {},
      })
    }
  }

  // 5 power users who visit frequently
  for (let i = 0; i < 5; i++) {
    const sessionId = generateSessionId()

    for (let day = 0; day < 5; day++) {
      const pageCount = Math.floor(Math.random() * 5) + 3
      for (let p = 0; p < pageCount; p++) {
        events.push({
          type: 'page_view',
          sessionId,
          projectKey: PROJECT_KEY,
          url: randomItem(PAGES),
          timestamp: randomDate(day),
          metadata: {},
        })
      }
    }
  }

  // some click events
  for (let i = 0; i < 30; i++) {
    events.push({
      type: 'click',
      sessionId: generateSessionId(),
      projectKey: PROJECT_KEY,
      url: randomItem(PAGES),
      timestamp: randomDate(Math.floor(Math.random() * 7)),
      metadata: {
        label: randomItem(['get-started', 'pricing-cta', 'login', 'signup', 'learn-more']),
      },
    })
  }

  console.log(`Inserting ${events.length} events...`)
  await prisma.event.createMany({ data: events })
  console.log('Done.')

  // show what we seeded
  const stats = await prisma.event.groupBy({
    by: ['type'],
    where: { projectKey: PROJECT_KEY },
    _count: { type: true },
  })

  console.log('\nSeeded data summary:')
  stats.forEach((s) => console.log(`  ${s.type}: ${s._count.type} events`))

  const sessions = await prisma.event.findMany({
    where: { projectKey: PROJECT_KEY },
    select: { sessionId: true },
    distinct: ['sessionId'],
  })
  console.log(`  unique sessions: ${sessions.length}`)
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect())