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
  /** Raw HTML placed above the CTA buttons — for block content a <p> can't hold, e.g. an order-items table. */
  beforeCtasHtml?: string
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

  return `${greetingHtml}${headingHtml}${paragraphsHtml}${listHtml}${params.beforeCtasHtml ?? ''}${ctasHtml}${signatureHtml}${params.extraHtml ?? ''}`
}

function renderLogoLockup(iconSize: number, fontSize: number, textColor: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" align="center">
      <tr>
        <td bgcolor="${EMAIL_BRAND.primary}" width="${iconSize}" height="${iconSize}" style="border-radius: ${Math.round(iconSize * 0.28)}px; text-align: center; vertical-align: middle;">
          <span style="font-family: 'DM Sans', system-ui, sans-serif; font-weight: 700; font-size: ${Math.round(iconSize * 0.4)}px; color: ${EMAIL_BRAND.surface};">t4</span>
        </td>
        <td style="padding-left: 12px; font-family: 'DM Sans', system-ui, sans-serif; font-weight: 700; font-size: ${fontSize}px; color: ${textColor};">
          talam4shop
        </td>
      </tr>
    </table>`
}

export function renderEmailShell(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>talam4shop</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${EMAIL_BRAND.bg};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${EMAIL_BRAND.bg}">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;" bgcolor="${EMAIL_BRAND.surface}">
          <tr>
            <td bgcolor="${EMAIL_BRAND.primary}" style="background-image: linear-gradient(135deg, ${EMAIL_BRAND.surface} 0%, ${EMAIL_BRAND.bg} 55%, #F3E3DC 100%); padding: 32px 0;">
              ${renderLogoLockup(32, 17, EMAIL_BRAND.ink)}
            </td>
          </tr>
          <tr>
            <td bgcolor="${EMAIL_BRAND.primary}" height="3" style="font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>
          <tr>
            <td bgcolor="${EMAIL_BRAND.surface}" style="padding: 40px 48px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td bgcolor="${EMAIL_BRAND.bgDark}" style="background-image: linear-gradient(160deg, ${EMAIL_BRAND.bgDark} 0%, #241B18 60%, #2B1E19 100%); padding: 28px 24px;">
              <div style="text-align: center; padding-bottom: 16px;">
                ${renderLogoLockup(22, 13, EMAIL_BRAND.surface)}
              </div>
              <p style="margin: 0 0 4px 0; text-align: center; font-family: 'DM Sans', system-ui, sans-serif; font-size: 12px; color: #FFFFFF8C;">
                &copy; 2026 talam4shop. All rights reserved.
              </p>
              <p style="margin: 0 0 12px 0; text-align: center; font-family: 'DM Sans', system-ui, sans-serif; font-size: 12px; color: #FFFFFF8C;">
                ${EMAIL_BRAND.address} &middot; ${EMAIL_BRAND.contactEmail}
              </p>
              <p style="margin: 0; text-align: center; font-family: 'DM Sans', system-ui, sans-serif; font-size: 12px; font-weight: 500;">
                <a href="mailto:${EMAIL_BRAND.contactEmail}" style="color: ${EMAIL_BRAND.primaryTint}; text-decoration: none;">Help Center</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
