import { prisma } from '@/db/client'

const PROJECT_KEY = 'early-stage-test-zmoxl3'

function randomDate(daysAgo: number, hourOffset: number = 10): Date {
  const date = new Date()
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

async function seed(): Promise<void> {
  console.log('Clearing existing data...')
  await prisma.event.deleteMany({ where: { projectKey: PROJECT_KEY } })
  await prisma.weeklySnapshot.deleteMany({ where: { projectKey: PROJECT_KEY } })

  const events = []

  // 2 returners — visited on different days
  for (let i = 0; i < 2; i++) {
    const sessionId = generateSessionId()
    const firstVisit = randomDate(6, 10)

    events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/', timestamp: firstVisit, metadata: {} })
    events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/dashboard', timestamp: randomDateOffset(firstVisit, 30), metadata: {} })
    events.push({ type: 'session_end', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/dashboard', timestamp: randomDateOffset(firstVisit, 120), metadata: { durationSeconds: 120, reason: 'beforeunload' } })

    // return visit on a different day
    const returnVisit = randomDate(2, 14)
    events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/', timestamp: returnVisit, metadata: {} })
    events.push({ type: 'session_end', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/', timestamp: randomDateOffset(returnVisit, 60), metadata: { durationSeconds: 60, reason: 'beforeunload' } })
  }

  // 13 one-time visitors — quick bounces, no patterns
  for (let i = 0; i < 13; i++) {
    const sessionId = generateSessionId()
    const sessionStart = randomDate(Math.floor(Math.random() * 7), 10)
    events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/', timestamp: sessionStart, metadata: {} })
    events.push({ type: 'session_end', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/', timestamp: randomDateOffset(sessionStart, 25), metadata: { durationSeconds: 25, reason: 'beforeunload' } })
  }

  console.log(`Inserting ${events.length} events...`)
  await prisma.event.createMany({ data: events })
  console.log('Done.\n')

  const sessions = await prisma.event.findMany({ where: { projectKey: PROJECT_KEY }, select: { sessionId: true }, distinct: ['sessionId'] })
  console.log(`Unique sessions: ${sessions.length}`)
  console.log('Expected: no signals fire, low data volume warning in insight')
  console.log(`\nRun: curl -X POST http://localhost:3001/digest/${PROJECT_KEY} -H "Authorization: Bearer $PULSAR_SECRET_KEY"`)
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect())