import { prisma } from '@/db/client'
import { Resend } from 'resend'
import { getStrings, LOCALE_MAP } from '@/lib/i18n/index'
import { getStats } from '@/lib/analytics/index'
import { detectPatterns } from '@/lib/analytics/patterns'
import { getRecentSnapshots } from '@/lib/analytics/snapshots'
import type { PulsarStats, BehavioralPatterns, WeeklySnapshot } from '@/types/index'

const resend = new Resend(process.env.RESEND_API_KEY)

export type AnomalyType =
  | 'rage_click_spike'
  | 'dead_click_spike'
  | 'activation_drop'
  | 'comeback_drop'

interface AnomalyResult {
  type: AnomalyType
  page: string | null
  current: string
  baseline: string
  label: string
  action: string
}

interface AnomalyTemplate {
  subject: string
  headline: string
  body: string
  action: string
}

const ANOMALY_THRESHOLDS = {
  minSessions: 30,
  comebackDropPts: 15,
  activationReachDropPts: 20,
  rageClickSessionRate: 0.20,
  rageClickMinCount: 10,
  deadClickSessionRate: 0.15,
  deadClickMinCount: 10,
  formSubmitDropPts: 20,
}

function toPath(url: string): string {
  try { return new URL(url).pathname } catch { return url }
}

function buildTemplate(anomaly: AnomalyResult): AnomalyTemplate {
  const page: string = anomaly.page ?? 'your product'
  return {
    subject: `Pulsar alert: ${anomaly.label}${anomaly.page ? ` on ${page}` : ''}`,
    headline: `${anomaly.label} crossed your alert threshold.`,
    body: `${anomaly.label} is now ${anomaly.current}, compared with ${anomaly.baseline} in the last completed week.`,
    action: anomaly.action,
  }
}

function detectAnomalies(
  current: PulsarStats,
  patterns: BehavioralPatterns,
  lastSnapshot: WeeklySnapshot
): AnomalyResult[] {
  const anomalies: AnomalyResult[] = []
  const totalSessions: number = current.totalVisitors

  if (totalSessions < ANOMALY_THRESHOLDS.minSessions) return anomalies

  // rage click spike
  if (patterns.rageClickPages.length > 0) {
    const top = patterns.rageClickPages[0]
    const rate: number = top.count / totalSessions
    if (top.count >= ANOMALY_THRESHOLDS.rageClickMinCount &&
      rate >= ANOMALY_THRESHOLDS.rageClickSessionRate) {
      const baselineRate: number | null = lastSnapshot.rageClickCount !== null
        ? Math.round((lastSnapshot.rageClickCount / lastSnapshot.totalVisitors) * 100)
        : null
      anomalies.push({
        type: 'rage_click_spike',
        page: toPath(top.url),
        current: `${Math.round(rate * 100)}% of sessions`,
        baseline: baselineRate !== null ? `${baselineRate}% last week` : 'below threshold last week',
        label: 'Rage click rate',
        action: `Review recent sessions on ${toPath(top.url)} to identify what users are hitting.`,
      })
    }
  }

  // dead click spike
  if (patterns.deadClickPages.length > 0) {
    const top = patterns.deadClickPages[0]
    const rate: number = top.count / totalSessions
    if (top.count >= ANOMALY_THRESHOLDS.deadClickMinCount &&
      rate >= ANOMALY_THRESHOLDS.deadClickSessionRate) {
      anomalies.push({
        type: 'dead_click_spike',
        page: toPath(top.url),
        current: `${Math.round(rate * 100)}% of sessions`,
        baseline: 'below threshold last week',
        label: 'Dead click rate',
        action: `Inspect ${toPath(top.url)} for unresponsive elements.`,
      })
    }
  }

  // activation reach drop
  if (
    current.comebackRate !== null &&
    lastSnapshot.activationReachRate !== null &&
    patterns.activationPage
  ) {
    // estimate current activation reach from patterns
    const currentActivationRate: number | null = lastSnapshot.activationPageViews !== null
      ? Math.round((lastSnapshot.activationPageViews / totalSessions) * 100)
      : null

    if (currentActivationRate !== null) {
      const drop: number = lastSnapshot.activationReachRate - currentActivationRate
      if (drop >= ANOMALY_THRESHOLDS.activationReachDropPts) {
        anomalies.push({
          type: 'activation_drop',
          page: toPath(patterns.activationPage),
          current: `${currentActivationRate}% of sessions reaching activation`,
          baseline: `${lastSnapshot.activationReachRate}% last week`,
          label: 'Activation reach',
          action: `Investigate what changed in the funnel leading to ${toPath(patterns.activationPage)}.`,
        })
      }
    }
  }

  // comeback rate drop — only fire if enough sessions this week
  if (current.comebackRate !== null && lastSnapshot.comebackRate !== null) {
    const drop: number = lastSnapshot.comebackRate - current.comebackRate
    if (drop >= ANOMALY_THRESHOLDS.comebackDropPts && totalSessions >= 50) {
      anomalies.push({
        type: 'comeback_drop',
        page: null,
        current: `${current.comebackRate}% comeback rate`,
        baseline: `${lastSnapshot.comebackRate}% last week`,
        label: 'Comeback rate',
        action: 'Review what changed this week in your onboarding or activation flow.',
      })
    }
  }

  return anomalies
}

function renderAlertEmail(template: AnomalyTemplate, projectKey: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#EEEAE3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#EEEAE3;padding:40px 16px;">
  <tr><td align="center">
  <table cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

    <tr>
      <td style="background:#111111;border-radius:16px 16px 0 0;padding:24px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <p style="margin:0;font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                PULSAR<span style="display:inline-block;width:5px;height:5px;background:#EF4444;border-radius:50%;margin-left:4px;vertical-align:middle;margin-bottom:2px;"></span>
              </p>
            </td>
            <td align="right">
              <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.1em;">Alert</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="background:#ffffff;padding:32px;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#EF4444;text-transform:uppercase;letter-spacing:0.1em;">Signal Detected</p>
        <p style="margin:0 0 20px;font-size:20px;font-weight:600;color:#111111;line-height:1.3;">${template.headline}</p>
        <p style="margin:0 0 24px;font-size:15px;color:#444444;line-height:1.6;">${template.body}</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:#F4F4F0;border-radius:10px;padding:16px 20px;">
              <p style="margin:0;font-size:11px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:0.1em;">Recommended Action</p>
              <p style="margin:6px 0 0;font-size:14px;color:#111111;font-weight:500;">${template.action}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="background:#F9F7F2;border-top:1px solid #E8E4DC;border-radius:0 0 16px 16px;padding:16px 32px;">
        <p style="margin:0;font-size:11px;color:#AAAAAA;">
          Alert for <strong style="color:#888;">${projectKey}</strong> · Pulsar
        </p>
      </td>
    </tr>

  </table>
  </td></tr>
</table>
</body>
</html>`
}

async function hasRecentAlert(
  projectKey: string,
  type: AnomalyType
): Promise<boolean> {
  const oneDayAgo: Date = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const existing = await prisma.projectAlert.findFirst({
    where: {
      projectKey,
      type,
      sentAt: { gte: oneDayAgo },
    },
  })
  return existing !== null
}

async function sendAnomalyAlert(
  projectKey: string,
  email: string,
  language: string,
  anomaly: AnomalyResult
): Promise<void> {
  const template: AnomalyTemplate = buildTemplate(anomaly)
  const html: string = renderAlertEmail(template, projectKey)

  await resend.emails.send({
    from: 'Pulsar <onboarding@resend.dev>',
    to: email,
    subject: template.subject,
    html,
  })

  await prisma.projectAlert.create({
    data: {
      projectKey,
      type: anomaly.type,
      message: template.body,
      windowStart: new Date(Date.now() - 24 * 60 * 60 * 1000),
      windowEnd: new Date(),
    },
  })
}

export async function checkProjectForAnomalies(project: {
  projectKey: string
  email: string
  language: string
  plan: string
}): Promise<void> {
  try {
    const [current, patterns, snapshots] = await Promise.all([
      getStats(project.projectKey),
      detectPatterns(project.projectKey),
      getRecentSnapshots(project.projectKey),
    ])

    if (current.totalVisitors < ANOMALY_THRESHOLDS.minSessions) return

    // need at least one completed snapshot to compare against
    const oneWeekAgo: Date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const lastSnapshot: WeeklySnapshot | undefined = snapshots.find(
      (s: WeeklySnapshot) => new Date(s.weekStart) < oneWeekAgo
    )

    if (!lastSnapshot) return

    const anomalies: AnomalyResult[] = detectAnomalies(current, patterns, lastSnapshot)

    for (const anomaly of anomalies) {
      const alreadySent: boolean = await hasRecentAlert(project.projectKey, anomaly.type)
      if (alreadySent) continue

      await sendAnomalyAlert(project.projectKey, project.email, project.language, anomaly)
      console.log(`[Pulsar] Alert sent: ${anomaly.type} for ${project.projectKey}`)
    }
  } catch (err: unknown) {
    console.error(`[Pulsar] Anomaly check failed for ${project.projectKey}:`, err)
  }
}

export async function runAnomalyCheck(): Promise<void> {
  const projects = await prisma.project.findMany({
    where: {
      deletedAt: null,
      plan: { in: ['beta', 'pro'] },
    },
    select: {
      projectKey: true,
      email: true,
      language: true,
      plan: true,
    },
  })

  if (projects.length === 0) return

  console.log(`[Pulsar] Checking ${projects.length} project(s) for anomalies`)
  await Promise.allSettled(projects.map(checkProjectForAnomalies))
}