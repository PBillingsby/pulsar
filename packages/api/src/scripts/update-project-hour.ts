import { prisma } from '@/db/client'

await prisma.project.update({
  where: { projectKey: 'my-app-xgb9f8' },
  data: { digestHour: 16 },
})

console.log('Updated digestHour to 16')
await prisma.$disconnect()