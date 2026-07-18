// ponytail: platform-curated visual per default occasion, no per-tenant image upload pipeline
// exists yet (see design doc — logo/photo uploads are still unwired). Keyed by ProductTag.themeKey.
export type OccasionTheme = { gradient: string; headline: string }

export const OCCASION_THEMES: Record<string, OccasionTheme> = {
  diwali: {
    gradient: 'linear-gradient(135deg, #4a148c, #ff6f00)',
    headline: 'Light up the celebration',
  },
  pongal: {
    gradient: 'linear-gradient(135deg, #e65100, #2e7d32)',
    headline: 'Harvest season favourites',
  },
  'wedding-gold': {
    gradient: 'linear-gradient(135deg, #b8860b, #4a2c0f)',
    headline: 'Handpicked for your big day',
  },
  'festive-rose': {
    gradient: 'linear-gradient(135deg, #c2185b, #6d4c41)',
    headline: 'Festive favourites, freshly curated',
  },
  'classic-brown': {
    gradient: 'linear-gradient(135deg, #6d4c41, #3e2723)',
    headline: 'Curated for the occasion',
  },
}

// Presets an owner can pick for a custom (non-default) occasion — same registry, just the
// subset worth surfacing in the admin theme picker (excludes platform-only keys, if any appear later).
export const SELECTABLE_OCCASION_THEMES = Object.keys(OCCASION_THEMES) as Array<keyof typeof OCCASION_THEMES>

export const DEFAULT_OCCASION_THEME: OccasionTheme = {
  gradient: 'linear-gradient(135deg, #6d4c41, #3e2723)',
  headline: 'Curated for the occasion',
}

export function getOccasionTheme(themeKey: string | null): OccasionTheme {
  return (themeKey && OCCASION_THEMES[themeKey]) || DEFAULT_OCCASION_THEME
}
