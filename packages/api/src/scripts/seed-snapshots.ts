import { prisma } from '@/db/client'

const PROJECT_KEY: string = 'my-app-xgb9f8'

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
}

const snapshots: SnapshotSeed[] = [
  {
    projectKey: PROJECT_KEY,
    weekStart: new Date('2026-04-27T00:00:00.000Z'),
    totalVisitors: 55,
    returning: 8,
    comebackRate: 15,
    topPage: 'https://myapp.com/',
    totalEvents: 72,
    activationPage: null,
    avgDepthReturners: 2.1,
    avgDepthBouncers: 1.0,
    returnerTopPage: 'https://myapp.com/dashboard',
    bouncerTopPage: 'https://myapp.com/',
    returnerFirstPage: 'https://myapp.com/',
  },
  {
    projectKey: PROJECT_KEY,
    weekStart: new Date('2026-05-04T00:00:00.000Z'),
    totalVisitors: 38,
    returning: 8,
    comebackRate: 21,
    topPage: 'https://myapp.com/onboarding',
    totalEvents: 94,
    activationPage: 'https://myapp.com/onboarding',
    avgDepthReturners: 3.8,
    avgDepthBouncers: 1.0,
    returnerTopPage: 'https://myapp.com/onboarding',
    bouncerTopPage: 'https://myapp.com/',
    returnerFirstPage: 'https://myapp.com/',
  },
  {
    projectKey: PROJECT_KEY,
    weekStart: new Date('2026-05-11T00:00:00.000Z'),
    totalVisitors: 42,
    returning: 13,
    comebackRate: 31,
    topPage: 'https://myapp.com/settings',
    totalEvents: 148,
    activationPage: 'https://myapp.com/settings',
    avgDepthReturners: 6.2,
    avgDepthBouncers: 1.0,
    returnerTopPage: 'https://myapp.com/settings',
    bouncerTopPage: 'https://myapp.com/',
    returnerFirstPage: 'https://myapp.com/onboarding',
  },
  {
    projectKey: PROJECT_KEY,
    weekStart: new Date('2026-05-17T00:00:00.000Z'),
    totalVisitors: 48,
    returning: 22,
    comebackRate: 46,
    topPage: 'https://myapp.com/settings',
    totalEvents: 210,
    activationPage: 'https://myapp.com/settings',
    avgDepthReturners: 9.1,
    avgDepthBouncers: 1.0,
    returnerTopPage: 'https://myapp.com/settings',
    bouncerTopPage: 'https://myapp.com/',
    returnerFirstPage: 'https://myapp.com/onboarding',
  },
]

for (const snap of snapshots) {
  await prisma.weeklySnapshot.upsert({
    where: { projectKey_weekStart: { projectKey: snap.projectKey, weekStart: snap.weekStart } },
    update: snap,
    create: snap,
  })
}

console.log('Seeded 4 historical snapshots with pattern data')
console.log('Trend: 15% → 21% → 31% → 46%')
console.log('Activation page emerged at week 2 (/onboarding) then shifted to /settings at week 3')
await prisma.$disconnect()