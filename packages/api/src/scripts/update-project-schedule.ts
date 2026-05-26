import { prisma } from '@/db/client'

const now: Date = new Date()
const currentDay: number = now.getUTCDay()
const currentHour: number = now.getUTCHours()

await prisma.project.update({
  where: { projectKey: 'my-app-xgb9f8' },
  data: { digestDay: currentDay, digestHour: currentHour },
})

console.log(`Updated my-app-xgb9f8 to digestDay: ${currentDay}, digestHour: ${currentHour}`)
await prisma.$disconnect()