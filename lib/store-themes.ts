// The 3 storefront themes from the Claude Design redesign (accent tokens only —
// tints/hovers are derived at runtime via color-mix() on --color-store-primary,
// see app/globals.css). Shared between onboarding and admin settings so a
// merchant sees the same 3 choices everywhere brandColor can be set.
export const STORE_THEMES = [
  { id: 'madder', name: 'Madder', color: '#9E2B2B' },
  { id: 'indigo', name: 'Indigo', color: '#2C3E6B' },
  { id: 'rose', name: 'Rose', color: '#C2426A' },
] as const

export type StoreThemeColor = (typeof STORE_THEMES)[number]['color']
