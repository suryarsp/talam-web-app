import { escapeHtml, renderEmailBody, renderEmailShell } from '../shell'
import type { EmailTemplate } from '../types'

export const staffInviteTemplate: EmailTemplate<{ name: string; role: string; loginUrl: string }> = (params) => ({
  subject: "You've been added to the Talam super-admin console",
  html: renderEmailShell(
    renderEmailBody({
      greeting: `Hi ${escapeHtml(params.name)},`,
      heading: "You're on the team",
      paragraphs: [
        `You've been added to the Talam super-admin console as <strong>${escapeHtml(params.role)}</strong>.`,
        'Sign in with this email address to get started — you\'ll receive a one-time code, no password needed.',
      ],
      ctas: [{ label: 'Sign in →', href: params.loginUrl }],
      signature: 'The Talam Team',
    })
  ),
})
