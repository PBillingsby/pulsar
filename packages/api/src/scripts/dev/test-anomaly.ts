import { prisma } from '@/db/client'
import { checkProjectForAnomalies } from '@/lib/scheduler/anomaly'

const PROJECT_KEY = 'my-app-xgb9f8'

const project = await prisma.project.findFirst({
  where: { projectKey: PROJECT_KEY },
  select: { projectKey: true, email: true, language: true, plan: true },
})

if (!project) throw new Error('Project not found')

await checkProjectForAnomalies(project)
console.log('done')