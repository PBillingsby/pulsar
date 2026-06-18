import { formatHour, getDay, getStrings, Locale, LOCALE_MAP, t } from '@/lib/i18n/index'
import type { ProjectResponse } from '@/types/index'
import { Resend } from 'resend'

const resend: Resend = new Resend(process.env.RESEND_API_KEY)

function renderWelcomeEmail(project: ProjectResponse): string {
  const s: Locale = getStrings(project.language)
  const w: Record<string, string> = s.welcome
  const day: string = getDay(project.language, project.digestDay)
  const time: string = formatHour(project.digestHour)
  const lang: string = LOCALE_MAP[project.language]?.split('-')[0] ?? 'en'

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${t(w.title, { name: project.name })}</title>
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
        <p style="margin:0 0 8px;font-size:10px;font-weight:700;color:#22C55E;text-transform:uppercase;letter-spacing:0.12em;">${w.youreIn}</p>
        <p style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111111;line-height:1.3;letter-spacing:-0.5px;">${t(w.title, { name: project.name })}</p>
        <p style="margin:0;font-size:15px;color:#555555;line-height:1.7;">${t(w.body, { day, time })}</p>
      </td>
    </tr>

    <!-- PROJECT KEY -->
    <tr>
      <td style="background:#ffffff;padding:0 40px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:#F9F7F2;border:1px solid #E8E4DC;border-radius:12px;padding:20px 24px;">
              <p style="margin:0 0 8px;font-size:10px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:0.1em;">${w.projectKeyLabel}</p>
              <p style="margin:0;font-size:20px;font-weight:800;color:#111111;font-family:'Courier New',monospace;letter-spacing:-0.5px;">${project.projectKey}</p>
              <p style="margin:6px 0 0;font-size:12px;color:#AAAAAA;">${w.projectKeyNote}</p>
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
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#22C55E;text-transform:uppercase;letter-spacing:0.1em;">${w.stepInstall}</p>
              <p style="margin:0 0 10px;font-size:14px;color:#555555;">${w.stepInstallBody}</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#111111;border-radius:8px;padding:12px 16px;">
                    <p style="margin:0;font-family:'Courier New',monospace;font-size:13px;color:#22C55E;">npm install pulsardev</p>
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
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#22C55E;text-transform:uppercase;letter-spacing:0.1em;">${w.stepInit}</p>
              <p style="margin:0 0 10px;font-size:14px;color:#555555;">${w.stepInitBody}</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#111111;border-radius:8px;padding:14px 16px;">
                    <p style="margin:0;font-family:'Courier New',monospace;font-size:12px;color:#aaaaaa;line-height:1.8;">import { Pulsar } from 'pulsardev'<br/><br/>Pulsar.init({<br/>&nbsp;&nbsp;projectKey: '<span style="color:#22C55E;">${project.projectKey}</span>'<br/>})</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- STEP 3 -->
    <tr>
      <td style="background:#ffffff;padding:0 40px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="border-left:3px solid #F59E0B;padding-left:16px;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#F59E0B;text-transform:uppercase;letter-spacing:0.1em;">${w.stepIgnore}</p>
              <p style="margin:0 0 10px;font-size:14px;color:#555555;">${w.stepIgnoreBody}</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#111111;border-radius:8px;padding:14px 16px;">
                    <p style="margin:0;font-family:'Courier New',monospace;font-size:12px;color:#aaaaaa;line-height:1.8;">Pulsar.init({<br/>&nbsp;&nbsp;projectKey: '<span style="color:#22C55E;">${project.projectKey}</span>',<br/>&nbsp;&nbsp;<span style="color:#F59E0B;">ignoreMe: true</span> <span style="color:#555555;">// your device only</span><br/>})</p>
                  </td>
                </tr>
              </table>
              <p style="margin:8px 0 0;font-size:12px;color:#AAAAAA;">${w.stepIgnoreNote}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- WHAT HAPPENS NEXT -->
    <tr>
      <td style="background:#ffffff;padding:0 40px 36px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:#1a1a1a;border-radius:12px;padding:24px 28px;">
              <p style="margin:0 0 16px;font-size:10px;font-weight:700;color:#22C55E;text-transform:uppercase;letter-spacing:0.12em;">${w.whatNext}</p>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding-bottom:12px;">
                    <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.7);line-height:1.6;">
                      <span style="color:#22C55E;font-weight:700;">${t(w.nextFirstSignal, { day, time, language: project.language })}</span>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.7);line-height:1.6;">
                      <span style="color:#F59E0B;font-weight:700;">${w.nextAfterWeek.split('—')[0].trim()}</span>${w.nextAfterWeek.includes('—') ? ' — ' + w.nextAfterWeek.split('—').slice(1).join('—').trim() : ''}
                    </p>
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
                ${t(w.footerNote, { name: project.name })}<br/>
                <span style="color:#BBBBBB;">${w.footerTagline}</span>
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
  const s = getStrings(project.language)
  await resend.emails.send({
    from: 'Pulsar <onboarding@resend.dev>',
    to: project.email,
    subject: s.welcome.subject,
    html: renderWelcomeEmail(project),
  })
}