import { prisma } from '@/db/client'
import { Prisma } from '@prisma/client'

const PROJECT_KEY: string = 'testing-terms-and-pr-9ezqui'

function dateAt(weeksAgo: number, dayOffset: number, hourOffset: number = 10): Date {
  const date: Date = new Date()
  date.setDate(date.getDate() - (weeksAgo * 7) - dayOffset)
  date.setHours(hourOffset + Math.floor(Math.random() * 4))
  date.setMinutes(Math.floor(Math.random() * 59))
  date.setSeconds(Math.floor(Math.random() * 59))
  return date
}

function offset(base: Date, seconds: number): Date {
  return new Date(base.getTime() + seconds * 1000)
}

function sessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

interface EventInput {
  type: string
  sessionId: string
  projectKey: string
  url: string
  timestamp: Date
  metadata: Prisma.InputJsonValue
}

const ONBOARDING_PAGES: string[] = [
  'https://myapp.com/signup',
  'https://myapp.com/dashboard',
  'https://myapp.com/create-workspace',
  'https://myapp.com/connect-integration',
]

function buildHealthySession(weeksAgo: number, dayOffset: number, withReturn: boolean): EventInput[] {
  const events: EventInput[] = []
  const sid: string = sessionId()
  const start: Date = dateAt(weeksAgo, dayOffset, 9)

  ONBOARDING_PAGES.forEach((url, i) => {
    events.push({ type: 'page_view', sessionId: sid, projectKey: PROJECT_KEY, url, timestamp: offset(start, i * 40), metadata: {} })
  })
  events.push({ type: 'click', sessionId: sid, projectKey: PROJECT_KEY, url: 'https://myapp.com/connect-integration', timestamp: offset(start, 180), metadata: { label: 'connect-now', tagName: 'button' } })
  events.push({ type: 'session_end', sessionId: sid, projectKey: PROJECT_KEY, url: 'https://myapp.com/connect-integration', timestamp: offset(start, 220), metadata: { durationSeconds: 220, reason: 'visibility_hidden' } })

  if (withReturn) {
    const returnStart: Date = dateAt(weeksAgo, dayOffset - 2, 14)
    for (const url of ['https://myapp.com/dashboard', 'https://myapp.com/connect-integration', 'https://myapp.com/settings']) {
      events.push({ type: 'page_view', sessionId: sid, projectKey: PROJECT_KEY, url, timestamp: offset(returnStart, 25), metadata: {} })
    }
    events.push({ type: 'session_end', sessionId: sid, projectKey: PROJECT_KEY, url: 'https://myapp.com/settings', timestamp: offset(returnStart, 160), metadata: { durationSeconds: 160, reason: 'beforeunload' } })
  }

  return events
}

function buildFrustratedSession(weeksAgo: number, dayOffset: number, rageClicks: number): EventInput[] {
  const events: EventInput[] = []
  const sid: string = sessionId()
  const start: Date = dateAt(weeksAgo, dayOffset, 10)

  for (const url of ['https://myapp.com/signup', 'https://myapp.com/dashboard', 'https://myapp.com/create-workspace', 'https://myapp.com/connect-integration']) {
    events.push({ type: 'page_view', sessionId: sid, projectKey: PROJECT_KEY, url, timestamp: offset(start, 30), metadata: {} })
  }

  if (rageClicks > 0) {
    events.push({ type: 'rage_click', sessionId: sid, projectKey: PROJECT_KEY, url: 'https://myapp.com/connect-integration', timestamp: offset(start, 120), metadata: { element: 'BUTTON#connect-now', clicks: rageClicks, tagName: 'button', id: 'connect-now' } })
  }

  events.push({ type: 'session_end', sessionId: sid, projectKey: PROJECT_KEY, url: 'https://myapp.com/connect-integration', timestamp: offset(start, 150), metadata: { durationSeconds: 150, reason: 'beforeunload' } })
  return events
}

function buildBouncerSession(weeksAgo: number, dayOffset: number): EventInput[] {
  const sid: string = sessionId()
  const start: Date = dateAt(weeksAgo, dayOffset, 10)
  return [
    { type: 'page_view', sessionId: sid, projectKey: PROJECT_KEY, url: 'https://myapp.com/', timestamp: start, metadata: {} },
    { type: 'session_end', sessionId: sid, projectKey: PROJECT_KEY, url: 'https://myapp.com/', timestamp: offset(start, 20), metadata: { durationSeconds: 20, reason: 'beforeunload' } },
  ]
}

async function seed(): Promise<void> {
  console.log('Clearing existing data for recovery story...')
  await prisma.event.deleteMany({ where: { projectKey: PROJECT_KEY } })
  await prisma.weeklySnapshot.deleteMany({ where: { projectKey: PROJECT_KEY } })

  let events: EventInput[] = []

  // ── WEEK 3 AGO — healthy baseline (~35% comeback) ──
  for (let i = 0; i < 24; i++) events = events.concat(buildHealthySession(3, i % 6, i < 14))
  for (let i = 0; i < 8; i++) events = events.concat(buildFrustratedSession(3, i % 6, 0))
  for (let i = 0; i < 18; i++) events = events.concat(buildBouncerSession(3, i % 6))

  // ── WEEK 2 AGO — the problem hits (~18% comeback, rage clicks spike) ──
  for (let i = 0; i < 14; i++) events = events.concat(buildHealthySession(2, i % 6, i < 4))
  for (let i = 0; i < 26; i++) events = events.concat(buildFrustratedSession(2, i % 6, 4))
  for (let i = 0; i < 20; i++) events = events.concat(buildBouncerSession(2, i % 6))

  // ── LAST WEEK — early recovery, partial fix (~22% comeback) ──
  for (let i = 0; i < 18; i++) events = events.concat(buildHealthySession(1, i % 6, i < 8))
  for (let i = 0; i < 20; i++) events = events.concat(buildFrustratedSession(1, i % 6, 2))
  for (let i = 0; i < 19; i++) events = events.concat(buildBouncerSession(1, i % 6))

  // ── THIS WEEK — fix confirmed (~42% comeback, rage clicks gone) ──
  for (let i = 0; i < 30; i++) events = events.concat(buildHealthySession(0, i % 6, i < 22))
  for (let i = 0; i < 6; i++) events = events.concat(buildFrustratedSession(0, i % 6, 0))
  for (let i = 0; i < 22; i++) events = events.concat(buildBouncerSession(0, i % 6))

  console.log(`Inserting ${events.length} events...`)
  await prisma.event.createMany({ data: events })
  console.log('Done.\n')

  console.log('Story: baseline healthy week -> rage click spike crashes comeback rate -> partial recovery -> fix confirmed, comeback rate climbs back above baseline')
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect())