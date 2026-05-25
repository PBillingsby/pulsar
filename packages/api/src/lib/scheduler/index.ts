import cron from 'node-cron'
import { prisma } from '@/db/client'
import { buildDigest } from '@/lib/digest/index'
import { sendDigest } from '@/lib/email/index'
import { captureWeeklySnapshot, cleanupOldSnapshots } from '@/lib/analytics/snapshots'
import type { DigestData } from '@/types/index'

const MAX_ATTEMPTS: number = 3
const RETRY_DELAYS_MS: number[] = [5000, 15000, 45000] // 5s, 15s, 45s

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function sendWithRetry(
  projectKey: string,
  email: string,
  digest: DigestData
): Promise<void> {
  let lastError: unknown = null

  for (let attempt: number = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      await sendDigest(email, digest)
      // success — if there was a previous failure record, mark it resolved
      await prisma.digestFailure.updateMany({
        where: { projectKey, resolved: false },
        data: { resolved: true },
      })
      return
    } catch (err: unknown) {
      lastError = err
      console.warn(`[Pulsar] Digest send attempt ${attempt + 1} failed for ${projectKey}:`, err)

      if (attempt < MAX_ATTEMPTS - 1) {
        const delay: number = RETRY_DELAYS_MS[attempt]
        console.log(`[Pulsar] Retrying in ${delay / 1000}s...`)
        await sleep(delay)
      }
    }
  }

  // all attempts failed — record the failure
  const reason: string = lastError instanceof Error ? lastError.message : String(lastError)
  console.error(`[Pulsar] All ${MAX_ATTEMPTS} attempts failed for ${projectKey}. Recording failure.`)

  await prisma.digestFailure.create({
    data: {
      projectKey,
      email,
      reason,
      attempts: MAX_ATTEMPTS,
      resolved: false,
    },
  })
}

async function runDailyDigest(): Promise<void> {
  console.log('[Pulsar] Running daily digest...')

  const projects = await prisma.project.findMany({
    where: { beta: true },
  })

  if (projects.length === 0) {
    console.log('[Pulsar] No projects found.')
    return
  }

  console.log(`[Pulsar] Processing ${projects.length} project(s)`)

  const results = await Promise.allSettled(
    projects.map(async (project) => {
      try {
        await captureWeeklySnapshot(project.projectKey)
        const digest: DigestData = await buildDigest(project.projectKey)
        await sendWithRetry(project.projectKey, project.email, digest)
        await cleanupOldSnapshots(project.projectKey)
        console.log(`[Pulsar] Sent to ${project.email} for ${project.projectKey}`)
      } catch (err: unknown) {
        const reason: string = err instanceof Error ? err.message : String(err)
        console.error(`[Pulsar] Failed to process ${project.projectKey}:`, reason)

        await prisma.digestFailure.create({
          data: {
            projectKey: project.projectKey,
            email: project.email,
            reason,
            attempts: 1,
            resolved: false,
          },
        })
      }
    })
  )

  const failed: number = results.filter((r) => r.status === 'rejected').length
  if (failed > 0) {
    console.error(`[Pulsar] ${failed} project(s) failed completely.`)
  }

  console.log('[Pulsar] Daily digest complete.')
}

export function startScheduler(): void {
  cron.schedule('0 8 * * *', () => {
    runDailyDigest().catch(console.error)
  })
  console.log('[Pulsar] Scheduler started — digest runs daily at 8am UTC')
}

export { runDailyDigest }