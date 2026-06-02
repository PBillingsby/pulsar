import { Resend } from 'resend'
import { getStrings, t, LOCALE_MAP, Locale } from '@/lib/i18n/index'

const resend = new Resend(process.env.RESEND_API_KEY)

type DeleteProjectEmailInput = {
  email: string
  projectName: string
  projectKey: string
  language: string
  confirmUrl: string
}

function renderDeleteProjectEmail(input: DeleteProjectEmailInput): string {
  const s: Locale = getStrings(input.language)
  const d: Record<string, string> = s.deleteProject
  const lang: string = LOCALE_MAP[input.language]?.split('-')[0] ?? 'en'

  return `<!DOCTYPE html>
<html lang="${lang}">
<body style="margin:0;padding:0;background:#EEEAE3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#EEEAE3;padding:40px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

<tr>
<td style="background:#111111;border-radius:16px 16px 0 0;padding:28px 40px;">
  <table width="100%">
    <tr>
      <td><p style="margin:0;font-size:20px;font-weight:800;color:#fff;">PULSAR<span style="display:inline-block;width:6px;height:6px;background:#22C55E;border-radius:50%;margin-left:4px;"></span></p></td>
      <td align="right"><p style="margin:0;font-size:12px;color:rgba(255,255,255,0.35);">Project Stop</p></td>
    </tr>
  </table>
</td>
</tr>

<tr>
<td style="background:#ffffff;padding:36px 40px 28px;">
  <p style="margin:0 0 8px;font-size:10px;font-weight:700;color:#EF4444;text-transform:uppercase;letter-spacing:0.12em;">${d.title}</p>
  <p style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111;line-height:1.3;">${t(d.body, { name: input.projectName })}</p>
  <p style="margin:0;font-size:15px;color:#555;line-height:1.7;">${d.warning}</p>
</td>
</tr>

<tr>
<td style="background:#ffffff;padding:0 40px 28px;">
  <table width="100%">
    <tr>
      <td style="background:#F9F7F2;border:1px solid #E8E4DC;border-radius:12px;padding:20px 24px;">
        <p style="margin:0 0 8px;font-size:10px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:0.1em;">Project Key</p>
        <p style="margin:0;font-size:18px;font-weight:800;color:#111;font-family:'Courier New',monospace;">${input.projectKey}</p>
      </td>
    </tr>
  </table>
</td>
</tr>

<tr>
<td style="background:#ffffff;padding:0 40px 36px;">
  <table width="100%">
    <tr>
      <td style="background:#1a1a1a;border-radius:12px;padding:28px;text-align:center;">
        <a href="${input.confirmUrl}" style="display:inline-block;background:#EF4444;color:#ffffff;text-decoration:none;font-size:14px;font-weight:800;padding:14px 22px;border-radius:999px;">
          ${d.button}
        </a>
        <p style="margin:18px 0 0;font-size:12px;color:rgba(255,255,255,0.55);line-height:1.6;">${d.ignore}</p>
      </td>
    </tr>
  </table>
</td>
</tr>

<tr>
<td style="background:#F9F7F2;border-top:1px solid #E8E4DC;border-radius:0 0 16px 16px;padding:20px 40px;">
  <p style="margin:0;font-size:11px;color:#999;line-height:1.6;">${d.footerNote}</p>
</td>
</tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

export async function sendDeleteProjectEmail(input: DeleteProjectEmailInput): Promise<void> {
  const s = getStrings(input.language)

  await resend.emails.send({
    from: 'Pulsar <onboarding@resend.dev>',
    to: input.email,
    subject: s.deleteProject.subject,
    html: renderDeleteProjectEmail(input),
  })
}