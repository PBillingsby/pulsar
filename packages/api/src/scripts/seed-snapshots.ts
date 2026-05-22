import { prisma } from '@/db/client'

const PROJECT_KEY: string = 'my-app-xgb9f8'

// seed 3 previous weeks so trend data is meaningful
const snapshots: {
  projectKey: string
  weekStart: Date
  totalVisitors: number
  returning: number
  comebackRate: number
  topPage: string
  totalEvents: number
}[] = [
    {
      projectKey: PROJECT_KEY,
      weekStart: new Date('2026-04-27T00:00:00.000Z'),
      totalVisitors: 55,
      returning: 8,
      comebackRate: 15,
      topPage: 'https://myapp.com/',
      totalEvents: 72,
    },
    {
      projectKey: PROJECT_KEY,
      weekStart: new Date('2026-05-04T00:00:00.000Z'),
      totalVisitors: 38,
      returning: 8,
      comebackRate: 21,
      topPage: 'https://myapp.com/onboarding',
      totalEvents: 94,
    },
    {
      projectKey: PROJECT_KEY,
      weekStart: new Date('2026-05-11T00:00:00.000Z'),
      totalVisitors: 42,
      returning: 13,
      comebackRate: 31,
      topPage: 'https://myapp.com/settings',
      totalEvents: 148,
    },
  ]

for (const snap of snapshots) {
  await prisma.weeklySnapshot.upsert({
    where: { projectKey_weekStart: { projectKey: snap.projectKey, weekStart: snap.weekStart } },
    update: snap,
    create: snap,
  })
}

console.log('Seeded 3 historical snapshots')
console.log('Trend: 15% → 21% → 31% → 46% (current)')
await prisma.$disconnect()