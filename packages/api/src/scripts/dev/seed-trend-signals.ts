import { prisma } from '@/db/client'

// Three projects testing different 4-week trend scenarios
// Run: bun run src/scripts/dev/seed-trend-signals.ts

const PROJECTS = {
  decliningRetention: 'trend-test-declining-ghrgtj',
  activationDecay: 'trend-test-activatio-xmq8i3',
  mixed: 'trend-test-mixed-w1x5s9',
}

function weekAgo(n: number): Date {
  return new Date(Date.now() - n * 7 * 24 * 60 * 60 * 1000)
}

async function seed(): Promise<void> {
  console.log('Clearing existing trend test data...')
  for (const key of Object.values(PROJECTS)) {
    await prisma.weeklySnapshot.deleteMany({ where: { projectKey: key } })
  }

  // ── SCENARIO 1: Declining retention ──
  // Comeback rate drops 3 weeks in a row — should trigger declining_retention
  console.log('\nSeeding scenario 1: declining retention...')
  await prisma.weeklySnapshot.createMany({
    data: [
      {
        projectKey: PROJECTS.decliningRetention,
        weekStart: weekAgo(3),
        totalVisitors: 80,
        returning: 37,
        comebackRate: 46,
        topPage: 'https://myapp.com/connect-integration',
        totalEvents: 320,
        activationPage: 'https://myapp.com/connect-integration',
        avgDepthReturners: 9.4,
        avgDepthBouncers: 1.0,
        returnerTopPage: 'https://myapp.com/connect-integration',
        bouncerTopPage: 'https://myapp.com/',
        returnerFirstPage: 'https://myapp.com/signup',
        activationReachRate: 58,
        activationPageViews: 46,
      },
      {
        projectKey: PROJECTS.decliningRetention,
        weekStart: weekAgo(2),
        totalVisitors: 75,
        returning: 26,
        comebackRate: 35,
        topPage: 'https://myapp.com/connect-integration',
        totalEvents: 240,
        activationPage: 'https://myapp.com/connect-integration',
        avgDepthReturners: 7.1,
        avgDepthBouncers: 1.0,
        returnerTopPage: 'https://myapp.com/connect-integration',
        bouncerTopPage: 'https://myapp.com/',
        returnerFirstPage: 'https://myapp.com/signup',
        activationReachRate: 44,
        activationPageViews: 33,
      },
      {
        projectKey: PROJECTS.decliningRetention,
        weekStart: weekAgo(1),
        totalVisitors: 70,
        returning: 14,
        comebackRate: 20,
        topPage: 'https://myapp.com/connect-integration',
        totalEvents: 180,
        activationPage: 'https://myapp.com/connect-integration',
        avgDepthReturners: 5.2,
        avgDepthBouncers: 1.0,
        returnerTopPage: 'https://myapp.com/connect-integration',
        bouncerTopPage: 'https://myapp.com/',
        returnerFirstPage: 'https://myapp.com/signup',
        activationReachRate: 30,
        activationPageViews: 21,
      },
    ],
  })

  // ── SCENARIO 2: Activation decay ──
  // Activation reach drops 3 weeks in a row — should trigger activation_decay
  console.log('Seeding scenario 2: activation decay...')
  await prisma.weeklySnapshot.createMany({
    data: [
      {
        projectKey: PROJECTS.activationDecay,
        weekStart: weekAgo(3),
        totalVisitors: 90,
        returning: 36,
        comebackRate: 40,
        topPage: 'https://myapp.com/onboarding',
        totalEvents: 360,
        activationPage: 'https://myapp.com/onboarding',
        avgDepthReturners: 8.0,
        avgDepthBouncers: 1.0,
        returnerTopPage: 'https://myapp.com/onboarding',
        bouncerTopPage: 'https://myapp.com/',
        returnerFirstPage: 'https://myapp.com/signup',
        activationReachRate: 62,
        activationPageViews: 56,
      },
      {
        projectKey: PROJECTS.activationDecay,
        weekStart: weekAgo(2),
        totalVisitors: 95,
        returning: 38,
        comebackRate: 40,
        topPage: 'https://myapp.com/onboarding',
        totalEvents: 340,
        activationPage: 'https://myapp.com/onboarding',
        avgDepthReturners: 7.5,
        avgDepthBouncers: 1.0,
        returnerTopPage: 'https://myapp.com/onboarding',
        bouncerTopPage: 'https://myapp.com/',
        returnerFirstPage: 'https://myapp.com/signup',
        activationReachRate: 44,
        activationPageViews: 42,
      },
      {
        projectKey: PROJECTS.activationDecay,
        weekStart: weekAgo(1),
        totalVisitors: 100,
        returning: 40,
        comebackRate: 40,
        topPage: 'https://myapp.com/onboarding',
        totalEvents: 300,
        activationPage: 'https://myapp.com/onboarding',
        avgDepthReturners: 6.8,
        avgDepthBouncers: 1.0,
        returnerTopPage: 'https://myapp.com/onboarding',
        bouncerTopPage: 'https://myapp.com/',
        returnerFirstPage: 'https://myapp.com/signup',
        activationReachRate: 28,
        activationPageViews: 28,
      },
    ],
  })

  // ── SCENARIO 3: Mixed — one declining, one recovering ──
  // Comeback rate recovers in week 3 — should NOT trigger declining_retention
  // Activation reach still declining — should trigger activation_decay
  console.log('Seeding scenario 3: mixed signals...')
  await prisma.weeklySnapshot.createMany({
    data: [
      {
        projectKey: PROJECTS.mixed,
        weekStart: weekAgo(3),
        totalVisitors: 60,
        returning: 24,
        comebackRate: 20,
        topPage: 'https://myapp.com/dashboard',
        totalEvents: 200,
        activationPage: 'https://myapp.com/dashboard',
        avgDepthReturners: 5.0,
        avgDepthBouncers: 1.0,
        returnerTopPage: 'https://myapp.com/dashboard',
        bouncerTopPage: 'https://myapp.com/',
        returnerFirstPage: 'https://myapp.com/signup',
        activationReachRate: 55,
        activationPageViews: 33,
      },
      {
        projectKey: PROJECTS.mixed,
        weekStart: weekAgo(2),
        totalVisitors: 65,
        returning: 22,
        comebackRate: 34,
        topPage: 'https://myapp.com/dashboard',
        totalEvents: 220,
        activationPage: 'https://myapp.com/dashboard',
        avgDepthReturners: 5.5,
        avgDepthBouncers: 1.0,
        returnerTopPage: 'https://myapp.com/dashboard',
        bouncerTopPage: 'https://myapp.com/',
        returnerFirstPage: 'https://myapp.com/signup',
        activationReachRate: 40,
        activationPageViews: 26,
      },
      {
        projectKey: PROJECTS.mixed,
        weekStart: weekAgo(1),
        totalVisitors: 70,
        returning: 30,
        comebackRate: 43,
        topPage: 'https://myapp.com/dashboard',
        totalEvents: 260,
        activationPage: 'https://myapp.com/dashboard',
        avgDepthReturners: 6.2,
        avgDepthBouncers: 1.0,
        returnerTopPage: 'https://myapp.com/dashboard',
        bouncerTopPage: 'https://myapp.com/',
        returnerFirstPage: 'https://myapp.com/signup',
        activationReachRate: 25,
        activationPageViews: 18,
      },
    ],
  })

  console.log('\nDone. Expected signals:')
  console.log('\nScenario 1 (trend-test-declining-ret):')
  console.log('  declining_retention — 46% → 35% → 20% (3 weeks, 26pt drop)')
  console.log('  activation_decay    — 58% → 44% → 30% (3 weeks, 28pt drop)')
  console.log('\nScenario 2 (trend-test-act-decay):')
  console.log('  activation_decay    — 62% → 44% → 28% (3 weeks, 34pt drop)')
  console.log('  declining_retention should NOT fire (comeback rate flat at 40%)')
  console.log('\nScenario 3 (trend-test-mixed):')
  console.log('  activation_decay    — 55% → 40% → 25% (3 weeks, 30pt drop)')
  console.log('  declining_retention should NOT fire (comeback rate recovering)')
  console.log('\nRegister these projects first then run:')
  for (const key of Object.values(PROJECTS)) {
    console.log(`  curl -X POST http://localhost:3001/digest/${key} -H "Content-Type: application/json" -d \'{ "email": "philbillingsby@gmail.com" }\'`)
  }
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect())