// ponytail: no per-tenant image upload pipeline exists yet for occasion banners, so images are
// hosted Unsplash URLs — same convention prisma/seed.ts already uses for product photos.
// Keyed by ProductTag.themeKey. Curated for ethnic wear (saree/silk drape, festive Indian attire)
// so the banner photo fits a clothing storefront rather than generic festival props.
export type OccasionTheme = { gradient: string; headline: string; image?: string }

const UNSPLASH = (id: string) => `https://images.unsplash.com/${id}?w=1600&q=80&auto=format&fit=crop`

// Reuses the same handful of ethnic-wear/saree photo IDs already seeded as product images
// (prisma/seed.ts) — verified to resolve, rather than guessing unverified Unsplash IDs per theme.
const SAREE_1 = UNSPLASH('photo-1610030469983-98e550d6193c')
const SAREE_2 = UNSPLASH('photo-1583391733956-3750e0ff4e8b')
const SAREE_3 = UNSPLASH('photo-1594736797933-d0501ba2fe65')
const SAREE_4 = UNSPLASH('photo-1618354691373-d851c5c3a990')

export const OCCASION_THEMES: Record<string, OccasionTheme> = {
  diwali: {
    gradient: 'linear-gradient(135deg, #4a148c, #ff6f00)',
    headline: 'Light up the celebration',
    image: SAREE_2,
  },
  pongal: {
    gradient: 'linear-gradient(135deg, #e65100, #2e7d32)',
    headline: 'Harvest season favourites',
    image: SAREE_1,
  },
  'wedding-gold': {
    gradient: 'linear-gradient(135deg, #b8860b, #4a2c0f)',
    headline: 'Handpicked for your big day',
    image: SAREE_2,
  },
  'festive-rose': {
    gradient: 'linear-gradient(135deg, #c2185b, #6d4c41)',
    headline: 'Festive favourites, freshly curated',
    image: SAREE_3,
  },
  'classic-brown': {
    gradient: 'linear-gradient(135deg, #6d4c41, #3e2723)',
    headline: 'Curated for the occasion',
    image: SAREE_4,
  },
  puthandu: {
    gradient: 'linear-gradient(135deg, #f9a825, #43a047)',
    headline: 'New year, new beginnings',
    image: SAREE_1,
  },
  'aadi-perukku': {
    gradient: 'linear-gradient(135deg, #0277bd, #00838f)',
    headline: 'The season’s biggest sale',
    image: SAREE_3,
  },
  navaratri: {
    gradient: 'linear-gradient(135deg, #ad1457, #6a1b9a)',
    headline: 'Nine nights of colour',
    image: SAREE_2,
  },
  'karthigai-deepam': {
    gradient: 'linear-gradient(135deg, #ef6c00, #b71c1c)',
    headline: 'A festival of lights',
    image: SAREE_4,
  },
  'vinayagar-chaturthi': {
    gradient: 'linear-gradient(135deg, #d84315, #4e342e)',
    headline: 'Blessings for new beginnings',
    image: SAREE_1,
  },
  'akshaya-tritiya': {
    gradient: 'linear-gradient(135deg, #f9a825, #8d6e63)',
    headline: 'An auspicious day to shop',
    image: SAREE_3,
  },
  'christmas-new-year': {
    gradient: 'linear-gradient(135deg, #1b5e20, #b71c1c)',
    headline: 'Season’s greetings, festive picks',
    image: SAREE_4,
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
