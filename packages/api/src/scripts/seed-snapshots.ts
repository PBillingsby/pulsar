import { prisma } from '@/db/client'

const PROJECT_KEY: string = 'testing-d2rl75'

interface SnapshotSeed {
  projectKey: string
  weekStart: Date
  totalVisitors: number
  returning: number
  comebackRate: number
  topPage: string
  totalEvents: number
  activationPage: string | null
  avgDepthReturners: number | null
  avgDepthBouncers: number | null
  returnerTopPage: string | null
  bouncerTopPage: string | null
  returnerFirstPage: string | null
  activationReachRate: number | null
  activationPageViews: number | null
}

const snapshots: SnapshotSeed[] = [
  {
    projectKey: PROJECT_KEY,
    weekStart: new Date('2026-04-27T00:00:00.000Z'),
    totalVisitors: 16,
    returning: 4,
    comebackRate: 25,
    topPage: 'https://myapp.com/signup',
    totalEvents: 39,
    activationPage: null,
    avgDepthReturners: 3.1,
    avgDepthBouncers: 1.0,
    returnerTopPage: 'https://myapp.com/dashboard',
    bouncerTopPage: 'https://myapp.com/signup',
    returnerFirstPage: 'https://myapp.com/signup',
    activationReachRate: null,
    activationPageViews: null,
  },
  {
    projectKey: PROJECT_KEY,
    weekStart: new Date('2026-05-04T00:00:00.000Z'),
    totalVisitors: 73,
    returning: 34,
    comebackRate: 47,
    topPage: 'https://myapp.com/onboarding',
    totalEvents: 284,
    activationPage: 'https://myapp.com/onboarding',
    avgDepthReturners: 7.8,
    avgDepthBouncers: 1.2,
    returnerTopPage: 'https://myapp.com/dashboard',
    bouncerTopPage: 'https://myapp.com/signup',
    returnerFirstPage: 'https://myapp.com/dashboard',
    activationReachRate: 62,
    activationPageViews: 45,
  },
  {
    projectKey: PROJECT_KEY,
    weekStart: new Date('2026-05-11T00:00:00.000Z'),
    totalVisitors: 91,
    returning: 19,
    comebackRate: 21,
    topPage: 'https://myapp.com/signup',
    totalEvents: 213,
    activationPage: 'https://myapp.com/connect-integration',
    avgDepthReturners: 5.4,
    avgDepthBouncers: 1.1,
    returnerTopPage: 'https://myapp.com/settings',
    bouncerTopPage: 'https://myapp.com/signup',
    returnerFirstPage: 'https://myapp.com/signup',
    activationReachRate: 31,
    activationPageViews: 28,
  },
  {
    projectKey: PROJECT_KEY,
    weekStart: new Date('2026-05-18T00:00:00.000Z'),
    totalVisitors: 118,
    returning: 49,
    comebackRate: 42,
    topPage: 'https://myapp.com/connect-integration',
    totalEvents: 521,
    activationPage: 'https://myapp.com/connect-integration',
    avgDepthReturners: 9.6,
    avgDepthBouncers: 1.3,
    returnerTopPage: 'https://myapp.com/connect-integration',
    bouncerTopPage: 'https://myapp.com/signup',
    returnerFirstPage: 'https://myapp.com/dashboard',
    activationReachRate: 58,
    activationPageViews: 68,
  },
]

for (const snap of snapshots) {
  await prisma.weeklySnapshot.upsert({
    where: { projectKey_weekStart: { projectKey: snap.projectKey, weekStart: snap.weekStart } },
    update: snap,
    create: snap,
  })
}

console.log('Seeded 4 historical snapshots with funnel completion data')
console.log('Activation reach trend: n/a → 28% → 52% → 68%')
console.log('Comeback trend: 15% → 22% → 35% → 46%')
await prisma.$disconnect()