import cron from 'node-cron'
import { prisma } from '@/db/client'
import { buildDigest } from '@/lib/digest/index'
import { sendDigest } from '@/lib/email/index'
import type { DigestData } from '@/types/index'

async function runDailyDigest(): Promise<void> {
  console.log('[Pulsar] Running daily digest...')

  const projects = await prisma.project.findMany({
    where: { beta: true },
  })

  if (projects.length === 0) {
    console.log('[Pulsar] No projects found.')
    return
  }

  console.log(`[Pulsar] Sending digest to ${projects.length} project(s)`)

  const results = await Promise.allSettled(
    projects.map(async (project) => {
      const digest: DigestData = await buildDigest(project.projectKey)
      await sendDigest(project.email, digest)
      console.log(`[Pulsar] Sent to ${project.email} for ${project.projectKey}`)
    })
  )

  const failed = results.filter((r) => r.status === 'rejected')
  if (failed.length > 0) {
    console.error(`[Pulsar] ${failed.length} digest(s) failed`)
    failed.forEach((r) => { if (r.status === 'rejected') console.error(r.reason) })
  }

  console.log('[Pulsar] Done.')
}

export function startScheduler(): void {
  cron.schedule('0 8 * * *', () => { runDailyDigest().catch(console.error) })
  console.log('[Pulsar] Scheduler started — digest runs daily at 8am UTC')
}

export { runDailyDigest }