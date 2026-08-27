import { escapeHtml, renderEmailBody, renderEmailShell } from '../shell'
import type { EmailTemplate } from '../types'

export const shippingAssistRequestTemplate: EmailTemplate<{
  tenantName: string
  tenantSlug: string
  contactEmail: string | null
  contactPhone: string | null
  tenantAdminUrl: string
}> = (params) => ({
  subject: `Shiprocket setup requested — ${params.tenantName}`,
  html: renderEmailShell(
    renderEmailBody({
      heading: 'A shop needs help connecting Shiprocket',
      paragraphs: [
        `<strong>${escapeHtml(params.tenantName)}</strong> (${escapeHtml(params.tenantSlug)}) asked Talam to set up their Shiprocket account for them.`,
        'Walk them through signup, KYC and adding a pickup location, then have them create a Shiprocket API user (Settings → API → Configure) — never their main login — and enter that from the super-admin tenant page.',
      ],
      list: [
        `Phone: ${escapeHtml(params.contactPhone ?? 'not provided')}`,
        `Email: ${escapeHtml(params.contactEmail ?? 'not provided')}`,
      ],
      ctas: [{ label: 'Open tenant →', href: params.tenantAdminUrl }],
      signature: 'Talam',
    })
  ),
})
