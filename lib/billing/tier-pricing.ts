import type { Tier } from '@prisma/client'

/**
 * There is no Payment/Subscription model — tenants only carry a current `tier`, not a
 * price or a billing history. This map is the single source of truth for what each tier
 * is worth right now, used to derive an MRR *snapshot* (today's tier mix × price), never
 * a historical trend — there is no `tierChangedAt` to compute one from.
 */
export const TIER_PRICE_INR: Record<Tier, number> = {
  trial: 0,
  starter: 499,
  growth: 999,
  pro: 1499,
}

export const TIER_LABEL: Record<Tier, string> = {
  trial: 'Trial',
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
}
