import { Resend } from 'resend'
import type { DigestData, WeeklySnapshot } from '@/types/index'
import { getStrings, t, LOCALE_MAP } from '@/lib/i18n/index'

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
    const barColor: string = isEmpty ? '#E5E7EB' : isLast && isDown ? '#EF4444' : isLast ? '#22C55E' : '#D1D5DB'
    const rateColor: string = isEmpty ? '#9CA3AF' : isLast && isDown ? '#EF4444' : isLast ? '#22C55E' : '#6B7280'
    const labelColor: string = isLast ? '#111111' : '#9CA3AF'
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
            <td align="center" style="padding-top:6px;border-top:1px solid #E5E7EB;">
              <p style="margin:0;font-size:9px;font-weight:${fontWeight};color:${labelColor};white-space:nowrap;">${point.label}</p>
            </td>
          </tr>
        </table>
      </td>`
  }).join('')

  return `
    <tr>
      <td style="background:#ffffff;padding:0 40px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:#F9F7F2;border:1px solid #E8E4DC;border-radius:14px;padding:20px 24px;">
              <p style="margin:0 0 16px;font-size:10px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:0.12em;">${weekTrendLabel}</p>
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

  const comebackDisplay: string = digest.comebackRate !== null ? `${digest.comebackRate}%` : '—'

  const trendValue: number | null = digest.comebackTrend ? parseInt(digest.comebackTrend) : null

  const trendBg: string = trendValue === null ? '#F3F4F6'
    : trendValue > 0 ? '#DCFCE7'
      : trendValue >= -15 ? '#FEF9C3'
        : '#FEE2E2'

  const trendTextColor: string = trendValue === null ? '#6B7280'
    : trendValue > 0 ? '#15803D'
      : trendValue >= -15 ? '#854D0E'
        : '#991B1B'

  const comebackBg: string = trendValue === null ? 'linear-gradient(135deg,#FEF3C7 0%,#FFFBEB 100%)'
    : trendValue > 0 ? 'linear-gradient(135deg,#DCFCE7 0%,#F0FDF4 100%)'
      : trendValue >= -15 ? 'linear-gradient(135deg,#FEF9C3 0%,#FEFCE8 100%)'
        : 'linear-gradient(135deg,#FEE2E2 0%,#FFF5F5 100%)'

  const comebackBorder: string = trendValue === null ? '#FCD34D'
    : trendValue > 0 ? '#86EFAC'
      : trendValue >= -15 ? '#FDE047'
        : '#FECACA'

  const comebackLabelColor: string = trendValue === null ? '#92400E'
    : trendValue > 0 ? '#166534'
      : trendValue >= -15 ? '#713F12'
        : '#991B1B'

  const trendHtml: string = digest.comebackTrend
    ? `<tr><td style="padding:6px 0 0;">
        <span style="display:inline-block;background:${trendBg};color:${trendTextColor};font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;padding:3px 10px;border-radius:100px;">${digest.comebackTrend}</span>
       </td></tr>`
    : ''

  const trendChart: string = renderTrendChart(digest.snapshots, digest.comebackRate, s.weekTrend, language)

  function highlightPaths(text: string): string {
    return text.replace(/(\/[a-z0-9\-\/]+)/g, '<code style="background:#F4F4F0;padding:1px 5px;border-radius:4px;font-family:monospace;font-size:13px;color:#111;">$1</code>')
  }

  return `<!DOCTYPE html>
<html lang="${LOCALE_MAP[language]?.split('-')[0] ?? 'en'}">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${s.digestSubject}</title>
</head>
<body style="margin:0;padding:0;background:#EEEAE3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#EEEAE3;padding:40px 16px;">
  <tr><td align="center">
  <table cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;">

    <!-- HEADER -->
    <tr>
      <td style="background:#111111;border-radius:16px 16px 0 0;padding:28px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align:middle;">
              <p style="margin:0;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">PULSAR<span style="display:inline-block;width:6px;height:6px;background:#22C55E;border-radius:50%;margin-left:4px;vertical-align:middle;margin-bottom:3px;"></span></p>
            </td>
            <td align="right" style="vertical-align:middle;">
              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.35);letter-spacing:0.02em;">${digest.date}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- WEEKLY SIGNAL -->
    <tr>
      <td style="background:#ffffff;padding:32px 40px 24px;">
        <p style="margin:0 0 10px;font-size:10px;font-weight:700;color:#22C55E;text-transform:uppercase;letter-spacing:0.12em;">${s.weeklySignal}</p>
        <p style="margin:0;font-size:22px;font-weight:500;color:#111111;line-height:1.45;">${digest.summary}</p>
      </td>
    </tr>

    <!-- COMEBACK RATE -->
    <tr>
      <td style="background:#ffffff;padding:0 40px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:${comebackBg};border:1px solid ${comebackBorder};border-radius:14px;padding:28px 32px;">
              <p style="margin:0;font-size:10px;font-weight:700;color:${comebackLabelColor};text-transform:uppercase;letter-spacing:0.12em;">${s.comebackRate}</p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:bottom;padding-right:12px;">
                    <p style="margin:10px 0 0;font-size:72px;font-weight:800;color:#111111;line-height:1;letter-spacing:-3px;">${comebackDisplay}</p>
                    ${trendHtml}
                  </td>
                  <td style="vertical-align:bottom;padding-bottom:6px;">
                    <p style="margin:0;font-size:13px;color:#78716C;line-height:1.5;">${digest.returning} ${s.ofVisitorsReturned}</p>
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
      <td style="background:#ffffff;padding:0 40px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:#1a1a1a;border-radius:14px;padding:28px 32px;">
              <p style="margin:0 0 12px;font-size:10px;font-weight:700;color:#22C55E;text-transform:uppercase;letter-spacing:0.12em;">${s.insight}</p>
              <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.8);line-height:1.8;font-weight:300;">${highlightPaths(digest.insight)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- STATS ROW -->
    <tr>
      <td style="background:#ffffff;padding:0 40px 36px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="33%" style="padding-right:6px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#F4F4F0;border-radius:10px;padding:18px 20px;">
                    <p style="margin:0;font-size:10px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:0.1em;">${s.visitors}</p>
                    <p style="margin:6px 0 0;font-size:32px;font-weight:800;color:#111111;letter-spacing:-1px;">${digest.totalVisitors}</p>
                  </td>
                </tr>
              </table>
            </td>
            <td width="33%" style="padding:0 3px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:18px 20px;">
                    <p style="margin:0;font-size:10px;font-weight:700;color:#15803D;text-transform:uppercase;letter-spacing:0.1em;">${s.returned}</p>
                    <p style="margin:6px 0 0;font-size:32px;font-weight:800;color:#111111;letter-spacing:-1px;">${digest.returning}</p>
                  </td>
                </tr>
              </table>
            </td>
            <td width="33%" style="padding-left:6px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:${digest.isActivationPage ? '#FFF7ED' : '#F4F4F0'};border:${digest.isActivationPage ? '1px solid #FED7AA' : 'none'};border-radius:10px;padding:18px 20px;">
                    <p style="margin:0;font-size:10px;font-weight:700;color:${digest.isActivationPage ? '#C2410C' : '#999'};text-transform:uppercase;letter-spacing:0.1em;">${digest.isActivationPage ? s.keyPage : s.topPage}</p>
                    <p style="margin:6px 0 0;font-size:18px;font-weight:800;color:#111111;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">${digest.keyPage || 'homepage'}</p>
                    ${digest.isActivationPage ? `<p style="margin:4px 0 0;font-size:10px;color:#C2410C;">${s.returnersVisit}</p>` : ''}
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
      <td style="background:#F9F7F2;border-top:1px solid #E8E4DC;border-radius:0 0 16px 16px;padding:20px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <p style="margin:0;font-size:11px;color:#AAAAAA;line-height:1.6;">
                ${s.receiving} <strong style="color:#888;">${digest.projectKey}</strong>.<br/>
                <span style="color:#BBBBBB;">${s.footer}</span>
              </p>
            </td>
            <td align="right" style="vertical-align:middle;">
              <p style="margin:0;font-size:13px;font-weight:800;color:#BBBBBB;letter-spacing:-0.3px;">PULSAR<span style="display:inline-block;width:5px;height:5px;background:#22C55E;border-radius:50%;margin-left:3px;vertical-align:middle;margin-bottom:2px;"></span></p>
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