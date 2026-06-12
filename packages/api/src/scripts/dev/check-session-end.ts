import { prisma } from '@/db/client'

const count = await prisma.event.count({
  where: {
    type: 'session_end',
  },
})

console.log('session_end count:', count)

const latest = await prisma.event.findMany({
  where: {
    type: 'session_end',
  },
  orderBy: {
    timestamp: 'desc',
  },
  take: 10,
})

console.log(latest)