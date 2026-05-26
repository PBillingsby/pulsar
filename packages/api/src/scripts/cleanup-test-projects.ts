import { prisma } from '@/db/client'

await prisma.project.deleteMany({
  where: {
    projectKey: {
      in: [
        'test-1-qudjlf',
        'test-2-kwtcc6',
        'test-3-2ke7wt',
        'test-4-t4a24q',
        'test-5-ovgkvh',
        'test-welcome-74l9xk',
        'my-app-jhx0fl',
      ]
    }
  }
})

console.log('Cleaned up test projects')
await prisma.$disconnect()