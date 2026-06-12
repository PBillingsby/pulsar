import { prisma } from '@/db/client'
import { getStats } from '@/lib/analytics/index'
import { detectPatterns } from '@/lib/analytics/patterns'
import { getRecentSnapshots } from '@/lib/analytics/snapshots'
import { getStrings } from '@/lib/i18n/index'
import type { BehavioralPatterns, PulsarStats, WeeklySnapshot } from '@/types/index'
import { Resend } from 'resend'

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
}

function toPath(url: string): string {
  try { return new URL(url).pathname } catch { return url }
}

function interpolate(str: string, vars: Record<string, string>): string {
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '')
}

function buildTemplate(anomaly: AnomalyResult, language: string): AnomalyTemplate {
  const s = getStrings(language).anomalies
  const page: string = anomaly.page ?? ''

  return {
    subject: anomaly.page
      ? interpolate(s.anomalySubject, { label: anomaly.label, page })
      : interpolate(s.anomalySubjectNoPage, { label: anomaly.label }),
    headline: interpolate(s.anomalyHeadline, { label: anomaly.label }),
    body: interpolate(s.anomalyBody, {
      label: anomaly.label,
      current: anomaly.current,
      baseline: anomaly.baseline,
    }),
    action: anomaly.action,
  }
}

function detectAnomalies(
  current: PulsarStats,
  patterns: BehavioralPatterns,
  lastSnapshot: WeeklySnapshot,
  language: string
): AnomalyResult[] {
  const anomalies: AnomalyResult[] = []
  const totalSessions: number = current.totalVisitors
  const s = getStrings(language).anomalies

  if (totalSessions < ANOMALY_THRESHOLDS.minSessions) return anomalies

  // rage click spike
  if (patterns.rageClickPages.length > 0) {
    const top = patterns.rageClickPages[0]
    const rate: number = top.count / totalSessions
    if (top.count >= ANOMALY_THRESHOLDS.rageClickMinCount &&
      rate >= ANOMALY_THRESHOLDS.rageClickSessionRate) {
      const path = toPath(top.url)
      anomalies.push({
        type: 'rage_click_spike',
        page: path,
        current: `${Math.round(rate * 100)}% of sessions`,
        baseline: 'not flagged last week',
        label: s.rageClickSpike,
        action: interpolate(s.rageClickAction, { page: path }),
      })
    }
  }

  // dead click spike
  if (patterns.deadClickPages.length > 0) {
    const top = patterns.deadClickPages[0]
    const rate: number = top.count / totalSessions
    if (top.count >= ANOMALY_THRESHOLDS.deadClickMinCount &&
      rate >= ANOMALY_THRESHOLDS.deadClickSessionRate) {
      const path = toPath(top.url)
      anomalies.push({
        type: 'dead_click_spike',
        page: path,
        current: `${Math.round(rate * 100)}% of sessions`,
        baseline: 'below threshold last week',
        label: s.deadClickSpike,
        action: interpolate(s.deadClickAction, { page: path }),
      })
    }
  }

  // activation reach drop
  if (
    current.comebackRate !== null &&
    lastSnapshot.activationReachRate !== null &&
    patterns.activationPage
  ) {
    const currentActivationRate: number | null = lastSnapshot.activationPageViews !== null
      ? Math.round((lastSnapshot.activationPageViews / totalSessions) * 100)
      : null

    if (currentActivationRate !== null) {
      const drop: number = lastSnapshot.activationReachRate - currentActivationRate
      if (drop >= ANOMALY_THRESHOLDS.activationReachDropPts) {
        const path = toPath(patterns.activationPage)
        anomalies.push({
          type: 'activation_drop',
          page: path,
          current: `${currentActivationRate}% of sessions reaching activation`,
          baseline: `${lastSnapshot.activationReachRate}% last week`,
          label: s.activationDrop,
          action: interpolate(s.activationDropAction, { page: path }),
        })
      }
    }
  }

  // comeback rate drop
  if (current.comebackRate !== null && lastSnapshot.comebackRate !== null) {
    const drop: number = lastSnapshot.comebackRate - current.comebackRate
    if (drop >= ANOMALY_THRESHOLDS.comebackDropPts && totalSessions >= 50) {
      anomalies.push({
        type: 'comeback_drop',
        page: null,
        current: `${current.comebackRate}% comeback rate`,
        baseline: `${lastSnapshot.comebackRate}% last week`,
        label: s.comebackDrop,
        action: s.comebackDropAction,
      })
    }
  }

  return anomalies
}

function renderAlertEmail(template: AnomalyTemplate, projectKey: string, language: string): string {
  const s = getStrings(language).anomalies

  return `<!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
    <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
      <tr><td align="center">
      <table cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- HEADER -->
        <tr>
          <td style="background:#111111;border-radius:16px 16px 0 0;padding:24px 32px;border-bottom:1px solid #27272a;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;">
                  <p style="margin:0;font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                    PULSAR<span style="display:inline-block;width:6px;height:6px;background:#EF4444;border-radius:50%;margin-left:4px;vertical-align:middle;margin-bottom:3px;"></span>
                  </p>
                  <p style="margin:4px 0 0;font-size:10px;font-weight:700;color:#71717a;text-transform:uppercase;letter-spacing:0.18em;">Weekly Pulse</p>
                </td>
                <td align="right" style="vertical-align:middle;">
                  <div style="display:inline-block;background:#7f1d1d;border:1px solid #991b1b;border-radius:100px;padding:5px 12px;">
                    <p style="margin:0;font-size:10px;font-weight:700;color:#fca5a5;text-transform:uppercase;letter-spacing:0.16em;">${s.anomalyAlertLabel}</p>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- SIGNAL DETECTED -->
        <tr>
          <td style="background:#111111;padding:24px 32px 20px;">
            <p style="margin:0 0 10px;font-size:9px;font-weight:700;color:#EF4444;text-transform:uppercase;letter-spacing:0.18em;">${s.anomalySignalDetected}</p>
            <p style="margin:0;font-size:20px;font-weight:500;color:#ffffff;line-height:1.45;">${template.headline}</p>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="background:#111111;padding:0 32px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#18181b;border:1px solid #27272a;border-radius:14px;padding:24px 28px;">
                  <p style="margin:0;font-size:15px;color:#e4e4e7;line-height:1.8;font-weight:400;">${template.body}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ACTION -->
        <tr>
          <td style="background:#111111;padding:0 32px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#18181b;border:1px solid #27272a;border-radius:14px;padding:24px 28px;">
                  <p style="margin:0 0 8px;font-size:9px;font-weight:700;color:#71717a;text-transform:uppercase;letter-spacing:0.18em;">${s.anomalyAction}</p>
                  <p style="margin:0;font-size:14px;color:#ffffff;font-weight:500;line-height:1.6;">${template.action}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#0b0b0b;border-top:1px solid #27272a;border-radius:0 0 16px 16px;padding:20px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0;font-size:11px;color:#71717a;line-height:1.6;">
                    ${s.anomalyAlertLabel} for <strong style="color:#a1a1aa;">${projectKey}</strong>
                  </p>
                </td>
                <td align="right" style="vertical-align:middle;">
                  <p style="margin:0;font-size:13px;font-weight:800;color:#52525b;letter-spacing:-0.3px;">PULSAR<span style="display:inline-block;width:5px;height:5px;background:#EF4444;border-radius:50%;margin-left:3px;vertical-align:middle;margin-bottom:2px;"></span></p>
                </td>
              </tr>
            </table>
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
    where: { projectKey, type, sentAt: { gte: oneDayAgo } },
  })
  return existing !== null
}

async function sendAnomalyAlert(
  projectKey: string,
  email: string,
  language: string,
  anomaly: AnomalyResult
): Promise<void> {
  const template: AnomalyTemplate = buildTemplate(anomaly, language)
  const html: string = renderAlertEmail(template, projectKey, language)

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

    const oneWeekAgo: Date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const lastSnapshot: WeeklySnapshot | undefined = snapshots.find(
      (s: WeeklySnapshot) => new Date(s.weekStart) < oneWeekAgo
    )

    if (!lastSnapshot) return

    const anomalies: AnomalyResult[] = detectAnomalies(current, patterns, lastSnapshot, project.language)

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