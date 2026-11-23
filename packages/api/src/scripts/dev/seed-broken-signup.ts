import { prisma } from '@/db/client'
import { Prisma } from '@prisma/client'

const PROJECT_KEY: string = 'testing-terms-and-pr-9ezqui'

function weekStartDate(weeksAgo: number): Date {
  const date: Date = new Date()
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() - date.getUTCDay() - (weeksAgo * 7))
  return date
}

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

// healthy session: visits signup, submits successfully
function buildHealthySignupSession(weeksAgo: number, dayOffset: number): EventInput[] {
  const events: EventInput[] = []
  const sid: string = sessionId()
  const start: Date = dateAt(weeksAgo, dayOffset, 10)

  events.push({ type: 'page_view', sessionId: sid, projectKey: PROJECT_KEY, url: 'https://myapp.com/', timestamp: start, metadata: {} })
  events.push({ type: 'page_view', sessionId: sid, projectKey: PROJECT_KEY, url: 'https://myapp.com/signup', timestamp: offset(start, 20), metadata: {} })
  events.push({ type: 'click', sessionId: sid, projectKey: PROJECT_KEY, url: 'https://myapp.com/signup', timestamp: offset(start, 90), metadata: { label: 'submit', tagName: 'button' } })
  events.push({ type: 'form_submit', sessionId: sid, projectKey: PROJECT_KEY, url: 'https://myapp.com/signup', timestamp: offset(start, 92), metadata: { formId: 'signup-form', formName: 'signup', formAction: '/api/signup' } })
  events.push({ type: 'page_view', sessionId: sid, projectKey: PROJECT_KEY, url: 'https://myapp.com/dashboard', timestamp: offset(start, 100), metadata: {} })
  events.push({ type: 'session_end', sessionId: sid, projectKey: PROJECT_KEY, url: 'https://myapp.com/dashboard', timestamp: offset(start, 180), metadata: { durationSeconds: 180, reason: 'beforeunload' } })

  return events
}

// broken session: visits signup, button doesn't respond, dead clicks pile up, gives up
function buildBrokenSignupSession(weeksAgo: number, dayOffset: number, deadClicks: number): EventInput[] {
  const events: EventInput[] = []
  const sid: string = sessionId()
  const start: Date = dateAt(weeksAgo, dayOffset, 10)

  events.push({ type: 'page_view', sessionId: sid, projectKey: PROJECT_KEY, url: 'https://myapp.com/', timestamp: start, metadata: {} })
  events.push({ type: 'page_view', sessionId: sid, projectKey: PROJECT_KEY, url: 'https://myapp.com/signup', timestamp: offset(start, 20), metadata: {} })

  for (let i = 0; i < deadClicks; i++) {
    events.push({ type: 'dead_click', sessionId: sid, projectKey: PROJECT_KEY, url: 'https://myapp.com/signup', timestamp: offset(start, 60 + i * 8), metadata: { label: 'submit', tagName: 'button', x: 412, y: 560 } })
  }

  events.push({ type: 'session_end', sessionId: sid, projectKey: PROJECT_KEY, url: 'https://myapp.com/signup', timestamp: offset(start, 140), metadata: { durationSeconds: 140, reason: 'beforeunload' } })

  return events
}

function buildBouncerSession(weeksAgo: number, dayOffset: number): EventInput[] {
  const sid: string = sessionId()
  const start: Date = dateAt(weeksAgo, dayOffset, 10)
  return [
    { type: 'page_view', sessionId: sid, projectKey: PROJECT_KEY, url: 'https://myapp.com/', timestamp: start, metadata: {} },
    { type: 'session_end', sessionId: sid, projectKey: PROJECT_KEY, url: 'https://myapp.com/', timestamp: offset(start, 15), metadata: { durationSeconds: 15, reason: 'beforeunload' } },
  ]
}

// existing user, returns normally, never touches signup (already has an account)
function buildExistingUserSession(weeksAgo: number, dayOffset: number): EventInput[] {
  const events: EventInput[] = []
  const sid: string = sessionId()
  const start: Date = dateAt(weeksAgo, dayOffset, 9)

  events.push({ type: 'page_view', sessionId: sid, projectKey: PROJECT_KEY, url: 'https://myapp.com/dashboard', timestamp: start, metadata: {} })
  events.push({ type: 'click', sessionId: sid, projectKey: PROJECT_KEY, url: 'https://myapp.com/dashboard', timestamp: offset(start, 30), metadata: { label: 'view-reports', tagName: 'button' } })
  events.push({ type: 'session_end', sessionId: sid, projectKey: PROJECT_KEY, url: 'https://myapp.com/dashboard', timestamp: offset(start, 90), metadata: { durationSeconds: 90, reason: 'beforeunload' } })

  // return visit a couple days later — same session id used loosely to simulate a returner
  const returnStart: Date = dateAt(weeksAgo, dayOffset - 2, 14)
  events.push({ type: 'page_view', sessionId: sid, projectKey: PROJECT_KEY, url: 'https://myapp.com/dashboard', timestamp: returnStart, metadata: {} })
  events.push({ type: 'session_end', sessionId: sid, projectKey: PROJECT_KEY, url: 'https://myapp.com/dashboard', timestamp: offset(returnStart, 60), metadata: { durationSeconds: 60, reason: 'beforeunload' } })

  return events
}

async function seed(): Promise<void> {
  console.log('Clearing existing events for broken signup story...')
  await prisma.event.deleteMany({ where: { projectKey: PROJECT_KEY } })
  await prisma.weeklySnapshot.deleteMany({ where: { projectKey: PROJECT_KEY } })

  let events: EventInput[] = []

  // 3 weeks ago — healthy, ~38% form submission rate
  for (let i = 0; i < 38; i++) events = events.concat(buildHealthySignupSession(3, i % 6))
  for (let i = 0; i < 0; i++) events = events.concat(buildBrokenSignupSession(3, i % 6, 0))
  for (let i = 0; i < 62; i++) events = events.concat(buildBouncerSession(3, i % 6))

  // 2 weeks ago — healthy, ~35%
  for (let i = 0; i < 35; i++) events = events.concat(buildHealthySignupSession(2, i % 6))
  for (let i = 0; i < 0; i++) events = events.concat(buildBrokenSignupSession(2, i % 6, 0))
  for (let i = 0; i < 65; i++) events = events.concat(buildBouncerSession(2, i % 6))

  // last week — healthy, ~36%
  for (let i = 0; i < 36; i++) events = events.concat(buildHealthySignupSession(1, i % 6))
  for (let i = 0; i < 0; i++) events = events.concat(buildBrokenSignupSession(1, i % 6, 0))
  for (let i = 0; i < 64; i++) events = events.concat(buildBouncerSession(1, i % 6))

  // this week — broken, ~8% form submission rate, dead clicks everywhere on signup
  // mixed in: existing users unaffected by the signup bug, returning normally
  for (let i = 0; i < 8; i++) events = events.concat(buildHealthySignupSession(0, i % 6))
  for (let i = 0; i < 42; i++) events = events.concat(buildBrokenSignupSession(0, i % 6, 4))
  for (let i = 0; i < 35; i++) events = events.concat(buildBouncerSession(0, i % 6))
  for (let i = 0; i < 22; i++) events = events.concat(buildExistingUserSession(0, i % 6))

  console.log(`Inserting ${events.length} events...`)
  await prisma.event.createMany({ data: events })
  console.log('Done.\n')

  console.log('Story: signup form submission steady ~35-38% for 3 weeks -> this week craters to ~8%, dead clicks spike on the submit button')
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect())