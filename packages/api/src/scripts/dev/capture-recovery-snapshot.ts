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
    totalVisitors: 50,
    comebackRate: 35,
    returning: 18,
    totalEvents: 300,
    rageClickCount: 0,
    activationPage: 'https://myapp.com/connect-integration',
  },
  {
    weekStart: weekStartDate(2),
    totalVisitors: 60,
    comebackRate: 18,
    returning: 11,
    totalEvents: 340,
    rageClickCount: 38,
    activationPage: 'https://myapp.com/connect-integration',
  },
  {
    weekStart: weekStartDate(1),
    totalVisitors: 57,
    comebackRate: 22,
    returning: 13,
    totalEvents: 320,
    rageClickCount: 12,
    activationPage: 'https://myapp.com/connect-integration',
  },
  {
    weekStart: weekStartDate(0),
    totalVisitors: 58,
    comebackRate: 42,
    returning: 24,
    totalEvents: 330,
    rageClickCount: 0,
    activationPage: 'https://myapp.com/connect-integration',
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

  console.log('\nAll 4 weekly snapshots created.')
  await prisma.$disconnect()
}

run().catch(console.error)