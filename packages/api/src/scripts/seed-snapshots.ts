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
    totalVisitors: 48,
    returning: 7,
    comebackRate: 15,
    topPage: 'https://myapp.com/',
    totalEvents: 68,
    activationPage: null,
    avgDepthReturners: 2.2,
    avgDepthBouncers: 1.0,
    returnerTopPage: 'https://myapp.com/dashboard',
    bouncerTopPage: 'https://myapp.com/',
    returnerFirstPage: 'https://myapp.com/signup',
  },
  {
    projectKey: PROJECT_KEY,
    weekStart: new Date('2026-05-04T00:00:00.000Z'),
    totalVisitors: 41,
    returning: 9,
    comebackRate: 22,
    topPage: 'https://myapp.com/create-workspace',
    totalEvents: 102,
    activationPage: 'https://myapp.com/create-workspace',
    avgDepthReturners: 4.1,
    avgDepthBouncers: 1.0,
    returnerTopPage: 'https://myapp.com/create-workspace',
    bouncerTopPage: 'https://myapp.com/',
    returnerFirstPage: 'https://myapp.com/signup',
  },
  {
    projectKey: PROJECT_KEY,
    weekStart: new Date('2026-05-11T00:00:00.000Z'),
    totalVisitors: 52,
    returning: 18,
    comebackRate: 35,
    topPage: 'https://myapp.com/connect-integration',
    totalEvents: 198,
    activationPage: 'https://myapp.com/connect-integration',
    avgDepthReturners: 7.3,
    avgDepthBouncers: 1.0,
    returnerTopPage: 'https://myapp.com/connect-integration',
    bouncerTopPage: 'https://myapp.com/',
    returnerFirstPage: 'https://myapp.com/signup',
  },
  {
    projectKey: PROJECT_KEY,
    weekStart: new Date('2026-05-17T00:00:00.000Z'),
    totalVisitors: 61,
    returning: 28,
    comebackRate: 46,
    topPage: 'https://myapp.com/connect-integration',
    totalEvents: 287,
    activationPage: 'https://myapp.com/connect-integration',
    avgDepthReturners: 9.4,
    avgDepthBouncers: 1.0,
    returnerTopPage: 'https://myapp.com/connect-integration',
    bouncerTopPage: 'https://myapp.com/',
    returnerFirstPage: 'https://myapp.com/signup',
  },
]

for (const snap of snapshots) {
  await prisma.weeklySnapshot.upsert({
    where: { projectKey_weekStart: { projectKey: snap.projectKey, weekStart: snap.weekStart } },
    update: snap,
    create: snap,
  })
}

console.log('Seeded 4 historical snapshots')
console.log('Story: activation page evolved from none → create-workspace → connect-integration')
console.log('Trend: 15% → 22% → 35% → 46%')
await prisma.$disconnect()