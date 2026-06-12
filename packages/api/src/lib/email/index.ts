import { getStrings, LOCALE_MAP } from '@/lib/i18n/index'
import type { DigestData, WeeklySnapshot } from '@/types/index'
import { Resend } from 'resend'

const resend: Resend = new Resend(process.env.RESEND_API_KEY)

function renderTrendChart(snapshots: WeeklySnapshot[], currentRate: number | null, weekTrendLabel: string, language: string): string {
  const locale: string = LOCALE_MAP[language] ?? 'en-US'
  const recentSnapshots: WeeklySnapshot[] = snapshots.slice(1, 5).reverse()

  const allPoints: { label: string; rate: number | null }[] = [
    ...recentSnapshots.map((s: WeeklySnapshot) => ({
      label: new Date(s.weekStart).toLocaleDateString(locale, { month: 'short', day: 'numeric' }),
      rate: s.comebackRate,
    })),
    { label: getStrings(language).weeklySignal, rate: currentRate },
  ]

  const validRates: number[] = allPoints
    .map((p) => p.rate)
    .filter((r): r is number => r !== null)

  if (validRates.length < 2) return ''

  const maxRate: number = Math.max(...validRates)
  const maxBarHeight: number = 48

  const bars: string = allPoints.map((point, i) => {
    const isLast: boolean = i === allPoints.length - 1
    const rate: number = point.rate ?? 0
    const height: number = maxRate > 0 ? Math.round((rate / maxRate) * maxBarHeight) : 4
    const isEmpty: boolean = point.rate === null
    const prevRate: number | null = i > 0 ? allPoints[i - 1].rate : null
    const isDown: boolean = prevRate !== null && rate < prevRate

    const barColor: string = isEmpty
      ? 'rgba(255,255,255,0.08)'
      : isLast && isDown
        ? '#EF4444'
        : isLast
          ? '#22C55E'
          : 'rgba(255,255,255,0.15)'

    const rateColor: string = isEmpty
      ? 'rgba(255,255,255,0.2)'
      : isLast && isDown
        ? '#EF4444'
        : isLast
          ? '#22C55E'
          : 'rgba(255,255,255,0.35)'

    const labelColor: string = isLast ? '#ffffff' : 'rgba(255,255,255,0.3)'
    const fontWeight: string = isLast ? '700' : '400'

    return `
      <td align="center" style="padding:0 4px;vertical-align:bottom;">
        <table cellpadding="0" cellspacing="0" align="center">
          <tr>
            <td align="center" style="padding-bottom:4px;">
              <p style="margin:0;font-size:11px;font-weight:${fontWeight};color:${rateColor};">${isEmpty ? '—' : `${rate}%`}</p>
            </td>
          </tr>
          <tr>
            <td align="center">
              <div style="width:32px;height:${Math.max(height, 4)}px;background:${barColor};border-radius:4px 4px 0 0;"></div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:6px;border-top:1px solid rgba(255,255,255,0.08);">
              <p style="margin:0;font-size:9px;font-weight:${fontWeight};color:${labelColor};white-space:nowrap;">${point.label}</p>
            </td>
          </tr>
        </table>
      </td>`
  }).join('')

  return `
    <tr>
      <td style="background:#111111;padding:0 32px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:20px 24px;">
              <p style="margin:0 0 16px;font-size:9px;font-weight:700;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.18em;">${weekTrendLabel}</p>
              <table cellpadding="0" cellspacing="0" style="width:100%;">
                <tr style="vertical-align:bottom;">${bars}</tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
}

function renderEmail(digest: DigestData, language: string): string {
  const s = getStrings(language)
  const locale: string = LOCALE_MAP[language] ?? 'en-US'

  const comebackDisplay: string = digest.comebackRate !== null ? `${digest.comebackRate}%` : '—'
  const trendValue: number | null = digest.comebackTrend ? parseInt(digest.comebackTrend) : null

  const trendBg: string = trendValue === null ? '#27272a'
    : trendValue > 0 ? '#14532d'
      : trendValue >= -15 ? '#713f12'
        : '#7f1d1d'

  const trendTextColor: string = trendValue === null ? '#a1a1aa'
    : trendValue > 0 ? '#4ade80'
      : trendValue >= -15 ? '#fde047'
        : '#fca5a5'

  const dotColor: string = trendValue === null ? '#f59e0b'
    : trendValue > 0 ? '#22C55E'
      : trendValue >= -15 ? '#EAB308'
        : '#EF4444'

  const trendHtml: string = digest.comebackTrend
    ? `<tr><td style="padding:6px 0 0;">
        <span style="display:inline-block;background:${trendBg};color:${trendTextColor};font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;padding:3px 10px;border-radius:100px;">${digest.comebackTrend}</span>
       </td></tr>`
    : ''

  const trendChart: string = renderTrendChart(digest.snapshots, digest.comebackRate, s.weekTrend, language)

  const comebackCardBg: string = trendValue === null ? '#18181b'
    : trendValue > 0 ? '#14532d'
      : trendValue >= -15 ? '#713f12'
        : '#7f1d1d'

  const comebackCardBorder: string = trendValue === null ? '#27272a'
    : trendValue > 0 ? '#166534'
      : trendValue >= -15 ? '#92400e'
        : '#991b1b'

  function highlightPaths(text: string): string {
    return text.replace(/(\/[a-z0-9\-\/]+)/g, '<code style="background:#27272a;padding:1px 6px;border-radius:4px;font-family:monospace;font-size:13px;color:#4ade80;">$1</code>')
  }

  return `<!DOCTYPE html>
<html lang="${LOCALE_MAP[language]?.split('-')[0] ?? 'en'}">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${s.digestSubject}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
  <tr><td align="center">
  <table cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;">

    <!-- HEADER -->
    <tr>
      <td style="background:#111111;border-radius:16px 16px 0 0;padding:24px 32px;border-bottom:1px solid #27272a;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align:middle;">
              <p style="margin:0;font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                PULSAR<span style="display:inline-block;width:6px;height:6px;background:#22C55E;border-radius:50%;margin-left:4px;vertical-align:middle;margin-bottom:3px;"></span>
              </p>
              <p style="margin:4px 0 0;font-size:10px;font-weight:700;color:#71717a;text-transform:uppercase;letter-spacing:0.18em;">Weekly Pulse</p>
            </td>
            <td align="right" style="vertical-align:middle;">
              <div style="display:inline-block;background:#14532d;border:1px solid #166534;border-radius:100px;padding:5px 12px;">
                <p style="margin:0;font-size:10px;font-weight:700;color:#4ade80;text-transform:uppercase;letter-spacing:0.16em;">Signal Found</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- WHAT CHANGED -->
    <tr>
      <td style="background:#111111;padding:24px 32px 20px;">
        <p style="margin:0 0 10px;font-size:9px;font-weight:700;color:#4ade80;text-transform:uppercase;letter-spacing:0.18em;">What changed</p>
        <p style="margin:0;font-size:20px;font-weight:500;color:#ffffff;line-height:1.45;">${digest.summary}</p>
      </td>
    </tr>

    <!-- COMEBACK RATE -->
    <tr>
      <td style="background:#111111;padding:0 32px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:${comebackCardBg};border:1px solid ${comebackCardBorder};border-radius:14px;padding:24px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:top;">
                    <p style="margin:0;font-size:9px;font-weight:700;color:#71717a;text-transform:uppercase;letter-spacing:0.18em;">${s.comebackRate}</p>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align:bottom;padding-right:12px;">
                          <p style="margin:8px 0 0;font-size:64px;font-weight:800;color:#ffffff;line-height:1;letter-spacing:-3px;">${comebackDisplay}</p>
                          ${trendHtml}
                        </td>
                        <td style="vertical-align:bottom;padding-bottom:6px;">
                          <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.5;">${digest.returning} ${s.ofVisitorsReturned}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align:top;">
                    <div style="width:12px;height:12px;background:${dotColor};border-radius:50%;box-shadow:0 0 12px ${dotColor};margin-top:4px;"></div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    ${trendChart}

    <!-- INSIGHT -->
    <tr>
      <td style="background:#111111;padding:0 32px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:#18181b;border:1px solid #27272a;border-radius:14px;padding:24px 28px;">
              <p style="margin:0 0 10px;font-size:9px;font-weight:700;color:#4ade80;text-transform:uppercase;letter-spacing:0.18em;">${s.insight}</p>
              <p style="margin:0;font-size:15px;color:#e4e4e7;line-height:1.8;font-weight:400;">${highlightPaths(digest.insight)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- STATS ROW -->
    <tr>
      <td style="background:#111111;padding:0 32px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="33%" style="padding-right:5px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#18181b;border:1px solid #27272a;border-radius:10px;padding:16px 18px;">
                    <p style="margin:0;font-size:8px;font-weight:700;color:#71717a;text-transform:uppercase;letter-spacing:0.14em;">${s.visitors}</p>
                    <p style="margin:6px 0 0;font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-1px;">${digest.totalVisitors}</p>
                  </td>
                </tr>
              </table>
            </td>
            <td width="33%" style="padding:0 2px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#14532d;border:1px solid #166534;border-radius:10px;padding:16px 18px;">
                    <p style="margin:0;font-size:8px;font-weight:700;color:#4ade80;text-transform:uppercase;letter-spacing:0.14em;">${s.returned}</p>
                    <p style="margin:6px 0 0;font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-1px;">${digest.returning}</p>
                  </td>
                </tr>
              </table>
            </td>
            <td width="33%" style="padding-left:5px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#18181b;border:1px solid ${digest.isActivationPage ? '#7c2d12' : '#27272a'};border-radius:10px;padding:16px 18px;">
                    <p style="margin:0;font-size:8px;font-weight:700;color:${digest.isActivationPage ? '#fb923c' : '#71717a'};text-transform:uppercase;letter-spacing:0.14em;">${digest.isActivationPage ? s.keyPage : s.topPage}</p>
                    <p style="margin:6px 0 0;font-size:14px;font-weight:800;color:#ffffff;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">${digest.keyPage || 'homepage'}</p>
                    ${digest.isActivationPage ? `<p style="margin:4px 0 0;font-size:9px;color:#fb923c;">${s.returnersVisit}</p>` : ''}
                  </td>
                </tr>
              </table>
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
                ${s.receiving} <strong style="color:#a1a1aa;">${digest.projectKey}</strong>.<br/>
                <span>${s.footer}</span>
              </p>
              <p style="margin:8px 0 0;font-size:11px;">
                <a href="${process.env.APP_URL ?? 'http://localhost:3000'}/delete?projectKey=${digest.projectKey}&email=${encodeURIComponent(digest.email)}" style="color:#a1a1aa;text-decoration:underline;">${s.unsubscribe}</a>
              </p>
            </td>
            <td align="right" style="vertical-align:middle;">
              <p style="margin:0;font-size:13px;font-weight:800;color:#52525b;letter-spacing:-0.3px;">PULSAR<span style="display:inline-block;width:5px;height:5px;background:#22C55E;border-radius:50%;margin-left:3px;vertical-align:middle;margin-bottom:2px;"></span></p>
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

export async function sendDigest(
  to: string,
  digest: DigestData,
  language: string = 'English'
): Promise<void> {
  const s = getStrings(language)
  await resend.emails.send({
    from: 'Pulsar <onboarding@resend.dev>',
    to,
    subject: `${s.digestSubject} — ${digest.date}`,
    html: renderEmail(digest, language),
  })
}