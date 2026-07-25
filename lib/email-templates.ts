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
