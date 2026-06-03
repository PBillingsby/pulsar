import { prisma } from '@/db/client'

const PROJECT_KEY: string = 'dropframe-qdkuz0'

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

  const events: EventInput[] = []

  // ── COHORT 1: Power users ──
  for (let i: number = 0; i < 18; i++) {
    const sessionId: string = generateSessionId()
    const sessionStart: Date = randomDate(5, 9)

    const onboardingPages: string[] = [
      'https://myapp.com/signup',
      'https://myapp.com/dashboard',
      'https://myapp.com/create-workspace',
      'https://myapp.com/invite-team',
      'https://myapp.com/connect-integration',
    ]

    for (let j: number = 0; j < onboardingPages.length; j++) {
      events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: onboardingPages[j], timestamp: randomDateOffset(sessionStart, j * 45), metadata: {} })
    }

    events.push({ type: 'scroll_depth', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/signup', timestamp: randomDateOffset(sessionStart, 30), metadata: { depth: 75 } })
    events.push({ type: 'scroll_depth', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/signup', timestamp: randomDateOffset(sessionStart, 35), metadata: { depth: 100 } })
    events.push({ type: 'form_submit', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/signup', timestamp: randomDateOffset(sessionStart, 40), metadata: { formId: 'signup-form', formName: 'signup', formAction: '/api/signup' } })
    events.push({ type: 'click', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/connect-integration', timestamp: randomDateOffset(sessionStart, 200), metadata: { label: 'connect-now', tagName: 'button' } })

    // tab focus/blur — user switched tabs mid-session then came back
    events.push({ type: 'tab_blur', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/connect-integration', timestamp: randomDateOffset(sessionStart, 210), metadata: {} })
    events.push({ type: 'tab_focus', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/connect-integration', timestamp: randomDateOffset(sessionStart, 225), metadata: {} })

    events.push({ type: 'session_end', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/connect-integration', timestamp: randomDateOffset(sessionStart, 240), metadata: { durationSeconds: 240, reason: 'visibility_hidden' } })

    const returnStart: Date = randomDate(3, 14)
    for (const page of ['https://myapp.com/dashboard', 'https://myapp.com/connect-integration', 'https://myapp.com/settings']) {
      events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: page, timestamp: randomDateOffset(returnStart, 30), metadata: {} })
    }
    events.push({ type: 'session_end', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/settings', timestamp: randomDateOffset(returnStart, 180), metadata: { durationSeconds: 180, reason: 'beforeunload' } })

    if (i < 8) {
      const thirdSessionId: string = generateSessionId()
      const thirdStart: Date = randomDate(1, 11)
      for (const page of ['https://myapp.com/dashboard', 'https://myapp.com/connect-integration']) {
        events.push({ type: 'page_view', sessionId: thirdSessionId, projectKey: PROJECT_KEY, url: page, timestamp: randomDateOffset(thirdStart, 20), metadata: {} })
      }
      events.push({ type: 'session_end', sessionId: thirdSessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/connect-integration', timestamp: randomDateOffset(thirdStart, 300), metadata: { durationSeconds: 300, reason: 'visibility_hidden' } })
    }
  }

  // ── COHORT 2: Frustrated users ──
  for (let i: number = 0; i < 22; i++) {
    const sessionId: string = generateSessionId()
    const sessionStart: Date = randomDate(Math.floor(Math.random() * 6), 10)

    for (const page of ['https://myapp.com/signup', 'https://myapp.com/dashboard', 'https://myapp.com/create-workspace', 'https://myapp.com/connect-integration']) {
      events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: page, timestamp: randomDateOffset(sessionStart, 30), metadata: {} })
    }

    events.push({ type: 'rage_click', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/connect-integration', timestamp: randomDateOffset(sessionStart, 120), metadata: { element: 'BUTTON#connect-now', clicks: 4, tagName: 'button', id: 'connect-now' } })
    events.push({ type: 'scroll_depth', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/connect-integration', timestamp: randomDateOffset(sessionStart, 130), metadata: { depth: 25 } })

    // tab blur — user gave up and switched away
    events.push({ type: 'tab_blur', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/connect-integration', timestamp: randomDateOffset(sessionStart, 140), metadata: {} })

    events.push({ type: 'session_end', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/connect-integration', timestamp: randomDateOffset(sessionStart, 150), metadata: { durationSeconds: 150, reason: 'beforeunload' } })
  }

  // ── COHORT 3: Pricing explorers ──
  for (let i: number = 0; i < 15; i++) {
    const sessionId: string = generateSessionId()
    const sessionStart: Date = randomDate(Math.floor(Math.random() * 7), 15)

    events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/', timestamp: sessionStart, metadata: {} })
    events.push({ type: 'page_view', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/billing', timestamp: randomDateOffset(sessionStart, 30), metadata: {} })

    for (const depth of [25, 50, 75, 100]) {
      events.push({ type: 'scroll_depth', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/billing', timestamp: randomDateOffset(sessionStart, 30 + depth), metadata: { depth } })
    }

    // tab blur/focus — opened another tab to compare pricing
    events.push({ type: 'tab_blur', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/billing', timestamp: randomDateOffset(sessionStart, 140), metadata: {} })
    events.push({ type: 'tab_focus', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/billing', timestamp: randomDateOffset(sessionStart, 155), metadata: {} })

    events.push({ type: 'copy', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/billing', timestamp: randomDateOffset(sessionStart, 160), metadata: { selectionLength: 45 } })
    events.push({ type: 'session_end', sessionId, projectKey: PROJECT_KEY, url: 'https://myapp.com/billing', timestamp: randomDateOffset(sessionStart, 200), metadata: { durationSeconds: 200, reason: 'beforeunload' } })
  }

  // ── COHORT 4: Pure bouncers ──
  for (let i: number = 0; i < 35; i++) {
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
  console.log('\nStory:')
  console.log('  18 power users — completed onboarding, tab switched mid-session, returned multiple times')
  console.log('  22 frustrated users — rage clicked on /connect-integration, tab blurred and left')
  console.log('  15 pricing explorers — scrolled 100% of billing, opened comparison tab, copied text')
  console.log('  35 bouncers — homepage only, under 30 seconds')
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect())