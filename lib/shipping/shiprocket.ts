import {
  assignShiprocketAwb,
  checkServiceability,
  createShiprocketOrder,
  getPickupLocations,
  ShiprocketLoginError,
  shiprocketLogin,
  type ShiprocketOrderInput,
  type ShiprocketShipment,
} from './shiprocket-client'
import {
  getDecryptedShiprocketCredential,
  getShippingConfig,
  markShiprocketCredentialStale,
  saveResolvedPickupPincode,
} from './shiprocket-account'

/**
 * Creates a shipment in *the tenant's own* Shiprocket account.
 *
 * Model A: every shop holds its own Shiprocket account, so its own KYC, bank account, COD
 * remittance and RTO liability. Talam never ships under a shared platform account — see
 * docs/superpowers/specs/2026-08-19-shiprocket-integration-design.md for the PoC this
 * replaced.
 */

export type { ShiprocketOrderInput, ShiprocketShipment } from './shiprocket-client'

export async function createShiprocketShipment(
  tenantId: string,
  input: ShiprocketOrderInput
): Promise<ShiprocketShipment> {
  const credential = await getDecryptedShiprocketCredential(tenantId)
  if (!credential) throw new Error('No Shiprocket account is connected for this store.')

  const config = await getShippingConfig(tenantId)
  if (!config.pickupLocation) {
    throw new Error('No Shiprocket pickup location is configured for this store.')
  }

  let token: string
  try {
    token = await shiprocketLogin(credential.email, credential.password)
  } catch (err) {
    // Only an actual 401/403 means the shop rotated their Shiprocket password — anything
    // else (5xx, rate limit, network hiccup) is transient and must not flip a working
    // credential to "needs reconnect", or block every retry with the wrong message.
    if (err instanceof ShiprocketLoginError && (err.status === 401 || err.status === 403)) {
      await markShiprocketCredentialStale(tenantId, err.message)
      throw new Error(
        'Your Shiprocket account could not be authenticated — reconnect it in Settings → Shipping.'
      )
    }
    throw new Error('Shiprocket could not be reached right now — try shipping this order again shortly.')
  }

  const { shiprocketOrderId, shipmentId } = await createShiprocketOrder(token, config.pickupLocation, input)
  const { awbCode, courierName } = await assignShiprocketAwb(token, shipmentId)

  return { awbCode, courierName, shipmentId, shiprocketOrderId }
}

export type DeliveryEstimate =
  | { serviceable: boolean; etaDays?: number; rate?: number; codAvailable?: boolean }
  | { error: string }

/**
 * Shiprocket tokens are documented as lasting ~10 days, but the login response carries no
 * expiry we could read, so this is a fixed conservative TTL rather than a real one — a day
 * of slack means a token is replaced before Shiprocket rejects it.
 */
const TOKEN_TTL_MS = 9 * 24 * 60 * 60 * 1000

/** Courier rates and ETAs move slowly; half an hour keeps a shopper's repeated pincode
 *  edits off Shiprocket while still refreshing within one shopping session. */
const SERVICEABILITY_TTL_MS = 30 * 60 * 1000

/**
 * Process-local on purpose, unlike createShiprocketShipment which logs in every time.
 *
 * A delivery estimate runs on every pincode a shopper types, so a login per call would be
 * both slow and a rate-limit risk. A redeploy or a second serverless instance simply pays for
 * one extra login — never a wrong answer — so nothing more durable (Redis, a DB column) is
 * warranted here.
 */
const tokenCache = new Map<string, { token: string; expiresAt: number }>()
const serviceabilityCache = new Map<string, { result: DeliveryEstimate; expiresAt: number }>()

/** Deliberately generic — Shiprocket's own text must never reach a shopper's screen. */
const ESTIMATE_UNAVAILABLE = 'Could not check delivery for this pincode right now.'
const NO_ACCOUNT = 'This store has not connected a delivery account yet.'
const NO_PICKUP_LOCATION = 'This store has not set up a pickup location yet.'
const PICKUP_NOT_FOUND = 'This store’s pickup location could not be matched in Shiprocket.'

async function resolveToken(tenantId: string): Promise<string | null> {
  const cached = tokenCache.get(tenantId)
  if (cached && cached.expiresAt > Date.now()) return cached.token

  const credential = await getDecryptedShiprocketCredential(tenantId)
  if (!credential) return null

  const token = await shiprocketLogin(credential.email, credential.password)
  tokenCache.set(tenantId, { token, expiresAt: Date.now() + TOKEN_TTL_MS })
  return token
}

/**
 * Turns the tenant's pickup-location *nickname* into the numeric pincode the serviceability
 * API needs, and caches it on the tenant so the next shopper skips this extra round-trip.
 *
 * Matched case-insensitively after trimming: the nickname is typed by hand twice — once in
 * Talam's Settings, once in Shiprocket's dashboard — so an exact match would strand tenants
 * whose two spellings differ only in case or a trailing space.
 */
async function resolvePickupPincode(
  tenantId: string,
  token: string,
  nickname: string
): Promise<string | null> {
  const target = nickname.trim().toLowerCase()
  const match = (await getPickupLocations(token)).find(
    (location) => location.nickname.trim().toLowerCase() === target
  )
  if (!match) return null

  await saveResolvedPickupPincode(tenantId, match.pincode)
  return match.pincode
}

/**
 * Quotes what Shiprocket would charge and how long it would take to reach one pincode.
 *
 * Never throws: the checkout and product pages that call this (phase A2) must be able to fall
 * back to the tenant's flat shipping fee, so every failure — no account, unreachable
 * Shiprocket, an unrecognised pickup location — comes back as `{ error }`. An unserviceable
 * pincode is not a failure and comes back as `{ serviceable: false }`.
 */
export async function getDeliveryEstimate(
  tenantId: string,
  params: { pincode: string; weightKg: number }
): Promise<DeliveryEstimate> {
  // Rounded to one decimal so carts differing by grams share an entry — the quote is for a
  // weight *band*, not an exact figure.
  const cacheKey = `${tenantId}:${params.pincode}:${params.weightKg.toFixed(1)}`
  const cached = serviceabilityCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.result

  try {
    const config = await getShippingConfig(tenantId)
    if (!config.pickupPincode && !config.pickupLocation) return { error: NO_PICKUP_LOCATION }

    const token = await resolveToken(tenantId)
    if (!token) return { error: NO_ACCOUNT }

    // Seam for later: if a serviceability call ever comes back reporting the pickup pincode
    // itself as unknown (a tenant deleting and recreating the location in Shiprocket), this
    // is where a re-resolve-and-retry would go — clear config.pickupPincode and fall through.
    const pickupPincode =
      config.pickupPincode ??
      (await resolvePickupPincode(tenantId, token, config.pickupLocation as string))
    if (!pickupPincode) return { error: PICKUP_NOT_FOUND }

    // COD availability is always requested: it costs nothing extra on this call and saves a
    // second round-trip the day a caller needs it.
    const result = await checkServiceability(token, {
      pickupPincode,
      deliveryPincode: params.pincode,
      weightKg: params.weightKg,
      codEnabled: true,
    })

    serviceabilityCache.set(cacheKey, { result, expiresAt: Date.now() + SERVICEABILITY_TTL_MS })
    return result
  } catch (err) {
    // Logged for ops, not surfaced: the thrown message carries Shiprocket's raw status/body.
    console.error('[shiprocket] delivery estimate failed', err)
    return { error: ESTIMATE_UNAVAILABLE }
  }
}
