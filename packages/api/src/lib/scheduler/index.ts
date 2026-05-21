import cron from 'node-cron'
import { prisma } from '@/db/client'
import { getStats } from '@/lib/analytics/index'
import { generateDigest } from '@/lib/digest/index'
import { sendDigest } from '@/lib/email/index'

async function runDailyDigest(): Promise<void> {
  console.log('[Pulsar] Running daily digest...')

  const projects = await prisma.project.findMany({
    where: { beta: true },
  })

  if (projects.length === 0) {
    console.log('[Pulsar] No projects to send digest for.')
    return
  }

  console.log(`[Pulsar] Sending digest to ${projects.length} project(s)`)

  const results = await Promise.allSettled(
    projects.map(async (project) => {
      const stats = await getStats(project.projectKey)
      const digest = generateDigest(stats)
      await sendDigest(project.email, digest)
      console.log(`[Pulsar] Digest sent to ${project.email} for ${project.projectKey}`)
    })
  )

  const failed = results.filter((r) => r.status === 'rejected')
  if (failed.length > 0) {
    console.error(`[Pulsar] ${failed.length} digest(s) failed to send`)
    failed.forEach((r) => {
      if (r.status === 'rejected') console.error(r.reason)
    })
  }

  console.log('[Pulsar] Daily digest complete.')
}

export function startScheduler(): void {
  // runs every day at 8am UTC
  cron.schedule('0 8 * * *', () => {
    runDailyDigest().catch(console.error)
  })

  console.log('[Pulsar] Scheduler started — digest runs daily at 8am UTC')
}

export { runDailyDigest }