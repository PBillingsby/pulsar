import { Resend } from 'resend'
import type { DigestData } from '@/types/index'

const resend = new Resend(process.env.RESEND_API_KEY)

function renderEmail(digest: DigestData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your Product Pulse</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9f9f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color: #0f0f0f; padding: 32px 40px;">
              <p style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Pulsar</p>
              <p style="margin: 6px 0 0; font-size: 13px; color: #888888;">${digest.date}</p>
            </td>
          </tr>

          <!-- Pulse line -->
          <tr>
            <td style="padding: 32px 40px 0;">
              <p style="margin: 0; font-size: 13px; font-weight: 600; color: #22C55E; text-transform: uppercase; letter-spacing: 1px;">Today's Pulse</p>
              <p style="margin: 12px 0 0; font-size: 22px; font-weight: 500; color: #1a1a1a; line-height: 1.4;">${digest.summary}</p>
            </td>
          </tr>

          <!-- Comeback Rate -->
          <tr>
            <td style="padding: 32px 40px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #f4f4f4; border-radius: 8px; padding: 24px;">
                    <p style="margin: 0; font-size: 13px; color: #888888; text-transform: uppercase; letter-spacing: 1px;">Comeback Rate</p>
                    <p style="margin: 8px 0 0; font-size: 48px; font-weight: 700; color: #1a1a1a; line-height: 1;">${digest.comebackRate}%</p>
                    <p style="margin: 8px 0 0; font-size: 14px; color: #555555;">of visitors returned</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Insight -->
          <tr>
            <td style="padding: 24px 40px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-left: 3px solid #22C55E; padding-left: 16px;">
                    <p style="margin: 0; font-size: 15px; color: #333333; line-height: 1.6;">${digest.insight}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Stats row -->
          <tr>
            <td style="padding: 24px 40px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding-right: 8px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background-color: #f4f4f4; border-radius: 8px; padding: 20px;">
                          <p style="margin: 0; font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 1px;">Visitors</p>
                          <p style="margin: 6px 0 0; font-size: 28px; font-weight: 700; color: #1a1a1a;">${digest.totalVisitors}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="50%" style="padding-left: 8px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background-color: #f4f4f4; border-radius: 8px; padding: 20px;">
                          <p style="margin: 0; font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 1px;">Top Page</p>
                          <p style="margin: 6px 0 0; font-size: 18px; font-weight: 700; color: #1a1a1a;">${digest.topPage}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px 40px;">
              <p style="margin: 0; font-size: 12px; color: #aaaaaa; line-height: 1.6;">
                You're receiving this because you installed Pulsar on <strong>${digest.projectKey}</strong>.<br>
                Pulsar — know if your product is working.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

export async function sendDigest(
  to: string,
  digest: DigestData
): Promise<void> {
  await resend.emails.send({
    // TODO: Change from email
    from: 'Pulsar <onboarding@resend.dev>',
    to,
    subject: `Your Product Pulse — ${digest.date}`,
    html: renderEmail(digest),
  })
}