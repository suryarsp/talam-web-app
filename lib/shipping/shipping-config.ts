/**
 * Single source of truth for `Tenant.shippingConfig` — the same role lib/payments/config.ts
 * plays for `paymentConfig`, and written defensively for the same reason: that file documents
 * how a writer using a different shape silently wiped settings.
 *
 * Only non-secret status lives here. The tenant's actual Shiprocket credentials and their
 * per-tenant webhook token live in the `shipping_credentials` table (see prisma/schema.prisma),
 * deliberately out of reach of the spread-then-overwrite pattern config writers use.
 */

export type ShippingMode =
  /** Default. No Shiprocket account connected — shipping is blocked. Also where a tenant
   *  lands if their stored credentials stop working (see markShiprocketCredentialStale). */
  | 'platform'
  /** Tenant asked Talam to set this up for them; support has not picked it up yet. */
  | 'assist_requested'
  /** A staff member has claimed the request and is working it. */
  | 'assist_in_progress'
  /** Credentials verified against Shiprocket's real login endpoint and stored. */
  | 'connected'

export type ShippingConnectedBy = 'self' | 'staff'

export type ShippingConfig = {
  provider: 'shiprocket'
  mode: ShippingMode
  /** Nickname of a pickup location the tenant already created in their own Shiprocket dashboard. */
  pickupLocation: string | null
  connectedAt: string | null
  connectedBy: ShippingConnectedBy | null
  requestedAt: string | null
  /** Why the last connection attempt or shipment auth failed. Cleared on a successful connect. */
  lastError: string | null
  /**
   * The numeric pincode behind `pickupLocation`. Cached here because resolving it costs an
   * extra Shiprocket API call (the tenant only ever types the nickname), and every delivery
   * estimate needs it. Not tenant-editable — written only by getDeliveryEstimate's lookup.
   */
  pickupPincode: string | null
  /** ISO timestamp of the last successful pickup-pincode resolution, so a caller can re-check
   *  periodically even without an explicit failure signal from Shiprocket. */
  pickupPincodeCheckedAt: string | null
}

export const DEFAULT_SHIPPING_CONFIG: ShippingConfig = {
  provider: 'shiprocket',
  mode: 'platform',
  pickupLocation: null,
  connectedAt: null,
  connectedBy: null,
  requestedAt: null,
  lastError: null,
  pickupPincode: null,
  pickupPincodeCheckedAt: null,
}

const SHIPPING_MODES: readonly ShippingMode[] = [
  'platform',
  'assist_requested',
  'assist_in_progress',
  'connected',
]

const CONNECTED_BY: readonly ShippingConnectedBy[] = ['self', 'staff']

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

/**
 * Normalizes a raw `Tenant.shippingConfig` JSON value into the current shape. Fields are
 * picked explicitly rather than spread, so unknown keys from an older or hand-edited row are
 * dropped instead of flowing through. An unrecognised `mode` falls back to `platform`, which
 * fails closed — shipping stays blocked rather than being allowed on a garbage value.
 */
export function normalizeShippingConfig(raw: unknown): ShippingConfig {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ...DEFAULT_SHIPPING_CONFIG }
  }
  const stored = raw as Record<string, unknown>

  const mode = SHIPPING_MODES.find((m) => m === stored.mode) ?? DEFAULT_SHIPPING_CONFIG.mode
  const connectedBy = CONNECTED_BY.find((c) => c === stored.connectedBy) ?? null

  return {
    provider: 'shiprocket',
    mode,
    pickupLocation: asString(stored.pickupLocation),
    connectedAt: asString(stored.connectedAt),
    connectedBy,
    requestedAt: asString(stored.requestedAt),
    lastError: asString(stored.lastError),
    pickupPincode: asString(stored.pickupPincode),
    pickupPincodeCheckedAt: asString(stored.pickupPincodeCheckedAt),
  }
}
