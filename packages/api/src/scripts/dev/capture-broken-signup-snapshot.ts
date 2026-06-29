import { prisma } from '@/db/client'

const PROJECT_KEY: string = 'testing-terms-and-pr-9ezqui'

function weekStartDate(weeksAgo: number): Date {
  const date: Date = new Date()
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() - date.getUTCDay() - (weeksAgo * 7))
  return date
}

interface SnapshotInput {
  weekStart: Date
  totalVisitors: number
  comebackRate: number
  returning: number
  totalEvents: number
  rageClickCount: number | null
  activationPage: string
}

const snapshots: SnapshotInput[] = [
  {
    weekStart: weekStartDate(3),
    totalVisitors: 100,
    comebackRate: 28,
    returning: 28,
    totalEvents: 420,
    rageClickCount: 0,
    activationPage: 'https://myapp.com/dashboard',
  },
  {
    weekStart: weekStartDate(2),
    totalVisitors: 100,
    comebackRate: 26,
    returning: 26,
    totalEvents: 410,
    rageClickCount: 0,
    activationPage: 'https://myapp.com/dashboard',
  },
  {
    weekStart: weekStartDate(1),
    totalVisitors: 100,
    comebackRate: 27,
    returning: 27,
    totalEvents: 415,
    rageClickCount: 0,
    activationPage: 'https://myapp.com/dashboard',
  },
]

async function run(): Promise<void> {
  console.log('Clearing existing snapshots for project...')
  await prisma.weeklySnapshot.deleteMany({ where: { projectKey: PROJECT_KEY } })

  for (const snap of snapshots) {
    await prisma.weeklySnapshot.create({
      data: {
        projectKey: PROJECT_KEY,
        weekStart: snap.weekStart,
        totalVisitors: snap.totalVisitors,
        comebackRate: snap.comebackRate,
        returning: snap.returning,
        totalEvents: snap.totalEvents,
        rageClickCount: snap.rageClickCount,
        activationPage: snap.activationPage,
      },
    })
    console.log(`Created snapshot for week of ${snap.weekStart.toISOString().slice(0, 10)} — comeback: ${snap.comebackRate}%`)
  }

  console.log('\nAll 3 historical snapshots created.')
  await prisma.$disconnect()
}

run().catch(console.error)