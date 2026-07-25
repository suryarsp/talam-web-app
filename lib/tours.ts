import type { MissingConfigItem } from './data/tenant'

export type TourStep = {
  key: string
  label: string
  description: string
  /** CSS selector, or a resolver for when duplicate DOM (desktop + mobile nav) needs the visible one. */
  target: string | (() => HTMLElement | null)
  /** Absent = no navigation needed (target already lives in the persistent admin shell). */
  route?: string
  isFixed?: boolean
}

/**
 * Both the desktop sidebar and the mobile bottom nav render every item, one hidden via CSS at a
 * time (`hidden md:flex` / `md:hidden`) — so a plain selector can hand Joyride the hidden node.
 * `getClientRects().length > 0` (not `offsetParent`, which is null for `position: fixed`, and the
 * mobile nav is fixed) picks whichever copy is actually on screen.
 */
export function visibleTarget(selector: string) {
  return () =>
    Array.from(document.querySelectorAll<HTMLElement>(selector)).find((el) => el.getClientRects().length > 0) ?? null
}

const GO_LIVE_TARGETS: Record<MissingConfigItem['key'], { route: string; target: string }> = {
  payments: { route: '/admin/settings?tab=Payments', target: '[data-tour="payments"]' },
  contact: { route: '/admin/settings?tab=Contact Info', target: '[data-tour="contact-info"]' },
  about: { route: '/admin/settings?tab=About', target: '[data-tour="store-about"]' },
  address: { route: '/admin/settings?tab=Contact Info', target: '[data-tour="store-address"]' },
  products: { route: '/admin/products', target: '[data-tour="add-product"]' },
}

export function buildGoLiveSteps(missing: MissingConfigItem[]): TourStep[] {
  return missing.map((item) => ({
    key: item.key,
    label: item.label,
    description: item.description,
    ...GO_LIVE_TARGETS[item.key],
  }))
}

/** Fixed orientation tour, auto-started the first time a tenant lands on the Dashboard. */
export const ORIENTATION_TOUR: TourStep[] = [
  {
    key: 'nav-settings',
    label: 'Settings',
    description: 'Set up your store here: branding, contact details, payments and delivery. Start here.',
    target: visibleTarget('[data-tour="nav-settings"]'),
    isFixed: true,
  },
  {
    key: 'nav-products',
    label: 'Products',
    description:
      "Add what you sell: photos, prices, sizes and stock. You'll need at least 3 published products before you can go live.",
    target: visibleTarget('[data-tour="nav-products"]'),
    isFixed: true,
  },
  {
    key: 'nav-occasions',
    label: 'Occasions',
    description:
      "Your shoppers buy for an event, not a category — Diwali, Weddings, Festive Wear. Tag products into these here, and each becomes its own browsable section on your storefront, with its own layout. It's how customers find the right outfit for the moment they're shopping for.",
    target: visibleTarget('[data-tour="nav-occasions"]'),
    isFixed: true,
  },
  {
    key: 'nav-orders',
    label: 'Orders',
    description: 'Your order command centre — follow every sale from payment confirmed to delivered, without leaving the page.',
    target: visibleTarget('[data-tour="nav-orders"]'),
    isFixed: true,
  },
  {
    key: 'nav-versions',
    label: 'Versions',
    description: 'Every time you publish, we save a snapshot. Come here to see exactly what changed and when.',
    target: visibleTarget('[data-tour="nav-versions"]'),
    isFixed: true,
  },
  {
    key: 'nav-dashboard',
    label: 'Dashboard',
    description: 'Your daily overview: revenue, orders, and anything that needs attention.',
    target: visibleTarget('[data-tour="nav-dashboard"]'),
    isFixed: true,
  },
  {
    key: 'go-live',
    label: 'Go Live',
    description: "When you're ready, publish from here. We'll walk you through anything still missing.",
    target: visibleTarget('[data-tour="go-live-button"]'),
  },
]
