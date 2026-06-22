import { prisma } from '@/db/client'

await prisma.betaCode.createMany({
  data: [
    // {
    //   code: 'PULSAR-BETA-001',
    //   description: 'General private beta access',
    //   maxUses: 10,
    // },
    // {
    //   code: 'INDIEHACKER-001',
    //   description: 'Indie Hackers outreach',
    //   maxUses: 25,
    // },
    // {
    //   code: 'TWITTER-001',
    //   description: 'Twitter early access',
    //   maxUses: 50,
    // },
    {
      code: 'ARNEN-PULSAR-BETA',
      description: 'Arnen',
      maxUses: 1,
    },
  ],
  skipDuplicates: true,
})