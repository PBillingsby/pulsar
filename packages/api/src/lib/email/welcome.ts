import { Resend } from 'resend'
import type { ProjectResponse } from '@/types/index'

const resend: Resend = new Resend(process.env.RESEND_API_KEY)

function renderWelcomeEmail(project: ProjectResponse): string {
  const DAYS: string[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const digestDayName: string = DAYS[project.digestDay] ?? 'Monday'
  const digestTimeFormatted: string = `${project.digestHour.toString().padStart(2, '0')}:00 UTC`
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Welcome to Pulsar</title>
</head>
<body style="margin:0;padding:0;background:#EEEAE3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#EEEAE3;padding:40px 16px;">
  <tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

    <!-- HEADER -->
    <tr>
      <td style="background:#111111;border-radius:16px 16px 0 0;padding:28px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <p style="margin:0;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">PULSAR<span style="display:inline-block;width:6px;height:6px;background:#22C55E;border-radius:50%;margin-left:4px;vertical-align:middle;margin-bottom:3px;"></span></p>
            </td>
            <td align="right">
              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.35);">Beta Access</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- WELCOME -->
    <tr>
      <td style="background:#ffffff;padding:36px 40px 28px;">
        <p style="margin:0 0 8px;font-size:10px;font-weight:700;color:#22C55E;text-transform:uppercase;letter-spacing:0.12em;">You're in.</p>
        <p style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111111;line-height:1.3;letter-spacing:-0.5px;">Welcome to Pulsar, ${project.name}.</p>
        <p style="margin:0;font-size:15px;color:#555555;line-height:1.7;">Your project is registered and your first Weekly Signal arrives tomorrow morning at 8am. Here's everything you need to get set up in the next 2 minutes.</p>
      </td>
    </tr>

    <!-- PROJECT KEY -->
    <tr>
      <td style="background:#ffffff;padding:0 40px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:#F9F7F2;border:1px solid #E8E4DC;border-radius:12px;padding:20px 24px;">
              <p style="margin:0 0 8px;font-size:10px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:0.1em;">Your Project Key</p>
              <p style="margin:0;font-size:20px;font-weight:800;color:#111111;font-family:'Courier New',monospace;letter-spacing:-0.5px;">${project.projectKey}</p>
              <p style="margin:6px 0 0;font-size:12px;color:#AAAAAA;">Keep this safe — it identifies your project in Pulsar.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- STEP 1 -->
    <tr>
      <td style="background:#ffffff;padding:0 40px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="border-left:3px solid #22C55E;padding-left:16px;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#22C55E;text-transform:uppercase;letter-spacing:0.1em;">Step 1 — Install</p>
              <p style="margin:0 0 10px;font-size:14px;color:#555555;">Run this in your project:</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#111111;border-radius:8px;padding:12px 16px;">
                    <p style="margin:0;font-family:'Courier New',monospace;font-size:13px;color:#22C55E;">npm install pulsar-sdk</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- STEP 2 -->
    <tr>
      <td style="background:#ffffff;padding:0 40px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="border-left:3px solid #22C55E;padding-left:16px;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#22C55E;text-transform:uppercase;letter-spacing:0.1em;">Step 2 — Initialise</p>
              <p style="margin:0 0 10px;font-size:14px;color:#555555;">Add this to your app's entry point:</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#111111;border-radius:8px;padding:14px 16px;">
                    <p style="margin:0;font-family:'Courier New',monospace;font-size:12px;color:#aaaaaa;line-height:1.8;">import { Pulsar } from 'pulsar-sdk'<br/><br/>Pulsar.init({<br/>&nbsp;&nbsp;projectKey: '<span style="color:#22C55E;">${project.projectKey}</span>'<br/>})</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- STEP 3 — ignoreMe -->
    <tr>
      <td style="background:#ffffff;padding:0 40px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="border-left:3px solid #F59E0B;padding-left:16px;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#F59E0B;text-transform:uppercase;letter-spacing:0.1em;">Step 3 — Exclude your own visits</p>
              <p style="margin:0 0 10px;font-size:14px;color:#555555;">Add <code style="background:#F4F4F0;padding:2px 6px;border-radius:4px;font-size:12px;">ignoreMe: true</code> on your own device so your testing doesn't pollute your data:</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#111111;border-radius:8px;padding:14px 16px;">
                    <p style="margin:0;font-family:'Courier New',monospace;font-size:12px;color:#aaaaaa;line-height:1.8;">Pulsar.init({<br/>&nbsp;&nbsp;projectKey: '<span style="color:#22C55E;">${project.projectKey}</span>',<br/>&nbsp;&nbsp;<span style="color:#F59E0B;">ignoreMe: true</span> <span style="color:#555555;">// your device only</span><br/>})</p>
                  </td>
                </tr>
              </table>
              <p style="margin:8px 0 0;font-size:12px;color:#AAAAAA;">Remove this line in production. Only add it on devices you use for testing.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- WHAT TO EXPECT -->
    <tr>
      <td style="background:#ffffff;padding:0 40px 36px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:#1a1a1a;border-radius:12px;padding:24px 28px;">
              <p style="margin:0 0 12px;font-size:10px;font-weight:700;color:#22C55E;text-transform:uppercase;letter-spacing:0.12em;">What happens next</p>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <span style="color:#22C55E;font-weight:700;">
                    ${digestDayName} at ${digestTimeFormatted}
                  </span> — your first Weekly Signal lands in this inbox in ${project.language}.
                </tr>
                <tr>
                  <td>
                    <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.7);line-height:1.6;"><span style="color:#F59E0B;font-weight:700;">After a week</span> — Pulsar will start detecting behavioral patterns: which pages returning users visit, where one-time visitors drop off, and what your activation moment might be.</p>
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
                You registered <strong style="color:#888888;">${project.name}</strong> for Pulsar beta.<br/>
                <span style="color:#BBBBBB;">Pulsar — know if your product is working.</span>
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

export async function sendWelcomeEmail(project: ProjectResponse): Promise<void> {
  await resend.emails.send({
    from: 'Pulsar <onboarding@resend.dev>',
    to: project.email,
    subject: `You're in! Here's your Pulsar project key`,
    html: renderWelcomeEmail(project),
  })
}