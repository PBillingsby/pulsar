import { prisma } from '@/db/client'

const snaps = await prisma.weeklySnapshot.findMany({
  where: { projectKey: 'testing-d2rl75' },
  orderBy: { weekStart: 'desc' },
})

console.log(JSON.stringify(snaps, null, 2))
await prisma.$disconnect()