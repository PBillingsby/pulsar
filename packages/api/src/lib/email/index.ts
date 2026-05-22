import { Resend } from 'resend'
import type { DigestData } from '@/types/index'

const resend: Resend = new Resend(process.env.RESEND_API_KEY)

function renderEmail(digest: DigestData): string {
  const comebackDisplay: string = digest.comebackRate !== null
    ? `${digest.comebackRate}%`
    : 'Not enough data yet'

  const trendHtml: string = digest.comebackTrend
    ? `<tr><td style="padding: 6px 0 0;">
        <span style="display:inline-block;background:#dcfce7;color:#15803d;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;padding:3px 10px;border-radius:100px;">${digest.comebackTrend}</span>
       </td></tr>`
    : ''

  const topPageDisplay: string = digest.topPage || 'homepage'

  const pulsarMark: string = `
    <table cellpadding="0" cellspacing="0" style="display:inline-table;">
      <tr>
        <td style="width:28px;height:28px;background:#111;border-radius:50%;border:2px solid #22C55E;text-align:center;vertical-align:middle;position:relative;">
          <div style="width:6px;height:6px;background:#F59E0B;border-radius:50%;display:inline-block;"></div>
        </td>
      </tr>
    </table>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Your Product Pulse</title>
</head>
<body style="margin:0;padding:0;background:#EEEAE3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#EEEAE3;padding:40px 16px;">
  <tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;">

    <!-- ── HEADER ─────────────────────────────────── -->
    <tr>
      <td style="background:#111111;border-radius:16px 16px 0 0;padding:28px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align:middle;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;">${pulsarMark}</td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.4px;">PULSAR</p>
                  </td>
                </tr>
              </table>
            </td>
            <td align="right" style="vertical-align:middle;">
              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.35);letter-spacing:0.02em;">${digest.date}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ── TODAY'S PULSE ──────────────────────────── -->
    <tr>
      <td style="background:#ffffff;padding:32px 40px 24px;">
        <p style="margin:0 0 10px;font-size:10px;font-weight:700;color:#22C55E;text-transform:uppercase;letter-spacing:0.12em;">Today's Pulse</p>
        <p style="margin:0;font-size:22px;font-weight:500;color:#111111;line-height:1.45;">${digest.summary}</p>
      </td>
    </tr>

    <!-- ── COMEBACK RATE ──────────────────────────── -->
    <tr>
      <td style="background:#ffffff;padding:0 40px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:linear-gradient(135deg,#FEF3C7 0%,#FFFBEB 100%);border:1px solid #FCD34D;border-radius:14px;padding:28px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;font-size:10px;font-weight:700;color:#92400E;text-transform:uppercase;letter-spacing:0.12em;">Comeback Rate</p>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align:bottom;padding-right:12px;">
                          <p style="margin:10px 0 0;font-size:72px;font-weight:800;color:#111111;line-height:1;letter-spacing:-3px;">${comebackDisplay}</p>
                          ${trendHtml}
                        </td>
                        <td style="vertical-align:bottom;padding-bottom:6px;">
                          <p style="margin:0;font-size:13px;color:#78716C;line-height:1.5;">of visitors<br/>returned</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ── INSIGHT ────────────────────────────────── -->
    <tr>
      <td style="background:#ffffff;padding:0 40px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:#1a1a1a;border-radius:14px;padding:28px 32px;">
              <p style="margin:0 0 12px;font-size:10px;font-weight:700;color:#22C55E;text-transform:uppercase;letter-spacing:0.12em;">Pulsar Insight</p>
              <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.8);line-height:1.8;font-weight:300;">${digest.insight}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ── STATS ROW ──────────────────────────────── -->
    <tr>
      <td style="background:#ffffff;padding:0 40px 36px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <!-- Visitors -->
            <td width="33%" style="padding-right:6px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#F4F4F0;border-radius:10px;padding:18px 20px;">
                    <p style="margin:0;font-size:10px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:0.1em;">Visitors</p>
                    <p style="margin:6px 0 0;font-size:32px;font-weight:800;color:#111111;letter-spacing:-1px;">${digest.totalVisitors}</p>
                  </td>
                </tr>
              </table>
            </td>
            <!-- Returned -->
            <td width="33%" style="padding:0 3px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:18px 20px;">
                    <p style="margin:0;font-size:10px;font-weight:700;color:#15803D;text-transform:uppercase;letter-spacing:0.1em;">Returned</p>
                    <p style="margin:6px 0 0;font-size:32px;font-weight:800;color:#111111;letter-spacing:-1px;">${digest.returning}</p>
                  </td>
                </tr>
              </table>
            </td>
            <!-- Top Page -->
            <td width="33%" style="padding-left:6px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#F4F4F0;border-radius:10px;padding:18px 20px;">
                    <p style="margin:0;font-size:10px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:0.1em;">Top Page</p>
                    <p style="margin:6px 0 0;font-size:18px;font-weight:800;color:#111111;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">${topPageDisplay}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ── FOOTER ─────────────────────────────────── -->
    <tr>
      <td style="background:#F9F7F2;border-top:1px solid #E8E4DC;border-radius:0 0 16px 16px;padding:20px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <p style="margin:0;font-size:11px;color:#AAAAAA;line-height:1.6;">
                You're receiving this because you installed Pulsar on <strong style="color:#888;">${digest.projectKey}</strong>.<br/>
                <span style="color:#BBBBBB;">Pulsar — know if your product is working.</span>
              </p>
            </td>
            <td align="right" style="vertical-align:middle;">
              ${pulsarMark}
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
  digest: DigestData
): Promise<void> {
  await resend.emails.send({
    from: 'Pulsar <onboarding@resend.dev>',
    to,
    subject: `Your Product Pulse — ${digest.date}`,
    html: renderEmail(digest),
  })
}