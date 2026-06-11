import cron from 'node-cron'
import { prisma } from '@/db/client'
import { buildDigest } from '@/lib/digest/index'
import { sendDigest } from '@/lib/email/index'
import { captureWeeklySnapshot, cleanupOldSnapshots } from '@/lib/analytics/snapshots'
import type { DigestData } from '@/types/index'

const MAX_ATTEMPTS: number = 3
const RETRY_DELAYS_MS: number[] = [5000, 15000, 45000]

// retention windows by plan
const RETENTION_DAYS: Record<string, number> = {
  free: 7,
  beta: 30,
  pro: 30,
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function sendWithRetry(
  projectKey: string,
  email: string,
  language: string,
  digest: DigestData
): Promise<void> {
  let lastError: unknown = null

  for (let attempt: number = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      await sendDigest(email, digest, language)
      await prisma.digestFailure.updateMany({
        where: { projectKey, resolved: false },
        data: { resolved: true },
      })
      return
    } catch (err: unknown) {
      lastError = err
      console.warn(`[Pulsar] Digest send attempt ${attempt + 1} failed for ${projectKey}:`, err)
      if (attempt < MAX_ATTEMPTS - 1) {
        await sleep(RETRY_DELAYS_MS[attempt])
      }
    }
  }

  const reason: string = lastError instanceof Error ? lastError.message : String(lastError)
  console.error(`[Pulsar] All ${MAX_ATTEMPTS} attempts failed for ${projectKey}.`)

  await prisma.digestFailure.create({
    data: { projectKey, email, reason, attempts: MAX_ATTEMPTS, resolved: false },
  })
}

async function processProject(project: {
  projectKey: string
  email: string
  language: string
}): Promise<void> {
  try {
    await captureWeeklySnapshot(project.projectKey)

    // idempotency check — skip if already sent this week
    const snapshot = await prisma.weeklySnapshot.findFirst({
      where: { projectKey: project.projectKey },
      orderBy: { weekStart: 'desc' },
    })

    if (snapshot?.digestSentAt) {
      console.log(`[Pulsar] Already sent digest for ${project.projectKey} this week — skipping`)
      return
    }

    const digest: DigestData = await buildDigest(project.projectKey)
    await sendWithRetry(project.projectKey, project.email, project.language, digest)

    // mark as sent
    if (snapshot) {
      await prisma.weeklySnapshot.update({
        where: { id: snapshot.id },
        data: { digestSentAt: new Date() },
      })
    }

    await cleanupOldSnapshots(project.projectKey)
    console.log(`[Pulsar] Sent to ${project.email} for ${project.projectKey}`)
  } catch (err: unknown) {
    const reason: string = err instanceof Error ? err.message : String(err)
    console.error(`[Pulsar] Failed to process ${project.projectKey}:`, reason)
    await prisma.digestFailure.create({
      data: { projectKey: project.projectKey, email: project.email, reason, attempts: 1, resolved: false },
    })
  }
}

async function runScheduledDigests(force: boolean = false): Promise<void> {
  const now: Date = new Date()
  const currentHour: number = now.getUTCHours()
  const currentMinute: number = now.getUTCMinutes()
  const currentDay: number = now.getUTCDay()

  if (!force && currentMinute !== 0) return

  const projects = await prisma.project.findMany({
    where: {
      deletedAt: null,
      beta: true,
      ...(force ? {} : { digestHour: currentHour, digestDay: currentDay }),
    },
    select: {
      projectKey: true,
      email: true,
      language: true,
    },
  })

  if (projects.length === 0) return

  console.log(`[Pulsar] ${projects.length} digest(s) due at ${currentHour}:00 UTC`)
  await Promise.allSettled(projects.map(processProject))
  console.log(`[Pulsar] Done processing ${projects.length} digest(s)`)
}

async function runCleanup(): Promise<void> {
  const projects = await prisma.project.findMany({
    where: { deletedAt: null },
    select: { projectKey: true, plan: true },
  })

  let totalDeleted: number = 0

  for (const project of projects) {
    const retentionDays: number = RETENTION_DAYS[project.plan] ?? RETENTION_DAYS.free
    const cutoff: Date = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)

    const result = await prisma.event.deleteMany({
      where: {
        projectKey: project.projectKey,
        timestamp: { lt: cutoff },
      },
    })

    if (result.count > 0) {
      totalDeleted += result.count
      console.log(`[Pulsar] Cleaned ${result.count} events for ${project.projectKey} (plan: ${project.plan}, cutoff: ${retentionDays}d)`)
    }
  }

  if (totalDeleted > 0) {
    console.log(`[Pulsar] Cleanup complete — ${totalDeleted} events deleted`)
  }
}

export function startScheduler(): void {
  // digest cron — runs every minute, checks who is due
  cron.schedule('* * * * *', () => {
    runScheduledDigests().catch(console.error)
  })

  // cleanup cron — runs every Sunday at 3am UTC
  cron.schedule('0 3 * * 0', () => {
    runCleanup().catch(console.error)
  })

  console.log('[Pulsar] Scheduler started — checking for due digests every minute')
}

export { runScheduledDigests as runDailyDigest }