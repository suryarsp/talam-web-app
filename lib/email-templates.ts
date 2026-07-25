export const EMAIL_BRAND = {
  primary: '#C1502E', // app/globals.css --color-brand-primary
  primaryTint: '#E8A98D', // lighter mix of primary, used for links on the dark footer
  ink: '#18181B', // --color-fg
  muted: '#8B7D7A', // --color-muted-warm
  mutedBody: '#3F3F46', // paragraph body text — darker than muted for readability at 15px
  surface: '#FFFFFF', // --color-surface
  bg: '#F9F9F9', // --color-bg
  bgDark: '#1A1A1A', // --color-bg-dark
  border: '#E8E8E8', // --color-border
  address: '123 Residency Road, Bengaluru, India',
  contactEmail: 'hello@mailer.talam4shop.com',
} as const

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderCta(cta: { label: string; href: string }): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 16px 0;">
      <tr>
        <td bgcolor="${EMAIL_BRAND.primary}" style="border-radius: 8px;">
          <a href="${cta.href}" style="display: inline-block; padding: 13px 24px; font-family: 'DM Sans', system-ui, sans-serif; font-weight: 600; font-size: 15px; color: ${EMAIL_BRAND.surface}; text-decoration: none;">
            ${cta.label}
          </a>
        </td>
      </tr>
    </table>`
}

export function renderEmailBody(params: {
  greeting?: string
  heading?: string
  paragraphs: string[]
  list?: string[]
  ctas: { label: string; href: string }[]
  signature?: string
  extraHtml?: string
}): string {
  const greetingHtml = params.greeting
    ? `<p style="margin: 0 0 24px 0; font-family: 'DM Sans', system-ui, sans-serif; font-size: 15px; color: ${EMAIL_BRAND.muted};">${params.greeting}</p>`
    : ''

  const headingHtml = params.heading
    ? `<h1 style="margin: 0 0 24px 0; font-family: 'Playfair Display', system-ui, serif; font-weight: 600; font-size: 28px; line-height: 36px; color: ${EMAIL_BRAND.ink};">${params.heading}</h1>`
    : ''

  const paragraphsHtml = params.paragraphs
    .map(
      (paragraph) =>
        `<p style="margin: 0 0 24px 0; font-family: 'DM Sans', system-ui, sans-serif; font-size: 15px; line-height: 24px; color: ${EMAIL_BRAND.mutedBody};">${paragraph}</p>`
    )
    .join('')

  const listHtml = params.list
    ? `<ol style="margin: 0 0 24px 0; padding-left: 20px; font-family: 'DM Sans', system-ui, sans-serif; font-size: 15px; line-height: 24px; color: ${EMAIL_BRAND.mutedBody};">${params.list
        .map((item) => `<li style="margin-bottom: 8px;">${item}</li>`)
        .join('')}</ol>`
    : ''

  const ctasHtml = params.ctas.map(renderCta).join('')

  const signatureHtml = params.signature
    ? `<p style="margin: 24px 0 0 0; font-family: 'DM Sans', system-ui, sans-serif; font-size: 14px; line-height: 22px; color: ${EMAIL_BRAND.muted};">${params.signature}</p>`
    : ''

  return `${greetingHtml}${headingHtml}${paragraphsHtml}${listHtml}${ctasHtml}${signatureHtml}${params.extraHtml ?? ''}`
}
