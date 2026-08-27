import crypto from 'node:crypto'
import { withTenant } from '@/lib/prisma'
import { decrypt, encrypt } from '@/lib/crypto'
import { ShiprocketLoginError, shiprocketLogin } from './shiprocket-client'
import {
  DEFAULT_SHIPPING_CONFIG,
  normalizeShippingConfig,
  type ShippingConfig,
  type ShippingConnectedBy,
} from './shipping-config'

/**
 * Connect/disconnect lifecycle for a tenant's own Shiprocket account.
 *
 * Both onboarding paths share these functions: the tenant self-serving in
 * Settings → Shipping, and Talam staff entering credentials on the tenant's behalf from
 * super-admin after walking them through signup by phone. Only the caller's auth guard and
 * the recorded `actor` differ.
 *
 * Authorization is the caller's job — every entry point must already have run
 * requireOwnerTenant() or requireSuperAdmin(). `withTenant` only scopes queries to a tenant
 * id; it does not authenticate anyone.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_PICKUP_LOCATION_LENGTH = 100

/** Deliberately vague: Shiprocket's raw response must never reach a tenant-facing screen. */
const LOGIN_FAILED_MESSAGE =
  'Could not verify that Shiprocket login — double-check the email and password and try again.'

/**
 * Shown for anything that isn't an actual 401/403 credential rejection — a 5xx, a rate
 * limit, or a network hiccup on Shiprocket's side. Telling a tenant their correct
 * credentials are wrong is worse than telling them to retry.
 */
const LOGIN_UNAVAILABLE_MESSAGE =
  'Could not reach Shiprocket to verify that login — try again in a few minutes.'

export type ConnectShiprocketInput = {
  tenantId: string
  email: string
  password: string
  pickupLocation: string
  actor: ShippingConnectedBy
}

function newWebhookToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

async function readConfig(
  db: { tenant: { findUnique: (args: unknown) => Promise<{ shippingConfig: unknown } | null> } },
  tenantId: string
): Promise<ShippingConfig> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { shippingConfig: true },
  })
  return normalizeShippingConfig(tenant?.shippingConfig)
}

export async function getShippingConfig(tenantId: string): Promise<ShippingConfig> {
  return withTenant(tenantId, (db) => readConfig(db as never, tenantId))
}

/** The tenant's own webhook secret, for display in Settings. Null until they connect. */
export async function getShippingWebhookToken(tenantId: string): Promise<string | null> {
  return withTenant(tenantId, async (db) => {
    const row = await db.shippingCredential.findUnique({
      where: { tenantId },
      select: { webhookToken: true },
    })
    return row?.webhookToken ?? null
  })
}

/**
 * Verifies credentials against Shiprocket's real login endpoint, then stores them encrypted
 * and marks the tenant connected.
 *
 * Shiprocket has no sandbox, so a real login is the only way to know the credentials work —
 * the same reason the Razorpay connect flow round-trips to Razorpay. That call happens
 * *before* the transaction opens: withTenant is a $transaction and the production pool is
 * max:1, so a network round-trip inside it would pin the only connection.
 */
export async function connectShiprocketAccount(
  input: ConnectShiprocketInput
): Promise<{ error?: string }> {
  const email = input.email.trim()
  const password = input.password
  const pickupLocation = input.pickupLocation.trim()

  if (!email) return { error: 'Enter the Shiprocket account email.' }
  if (!EMAIL_PATTERN.test(email)) return { error: 'Enter a valid email address.' }
  if (!password) return { error: 'Enter the Shiprocket account password.' }
  if (!pickupLocation) {
    return {
      error: 'Enter the pickup location nickname exactly as it appears in your Shiprocket dashboard.',
    }
  }
  if (pickupLocation.length > MAX_PICKUP_LOCATION_LENGTH) {
    return { error: `Pickup location must be ${MAX_PICKUP_LOCATION_LENGTH} characters or fewer.` }
  }

  try {
    await shiprocketLogin(email, password)
  } catch (err) {
    // Logged for ops, not surfaced: the thrown message is "(status): body" and never
    // contains the password, but it is still upstream text we don't show tenants.
    console.error('[shiprocket] credential verification failed', err)
    const isBadCredentials = err instanceof ShiprocketLoginError && (err.status === 401 || err.status === 403)
    return { error: isBadCredentials ? LOGIN_FAILED_MESSAGE : LOGIN_UNAVAILABLE_MESSAGE }
  }

  const emailCipher = encrypt(email)
  const passwordCipher = encrypt(password)

  await withTenant(input.tenantId, async (db) => {
    const current = await readConfig(db as never, input.tenantId)

    await db.shippingCredential.upsert({
      where: { tenantId: input.tenantId },
      create: {
        tenantId: input.tenantId,
        emailCipher,
        passwordCipher,
        webhookToken: newWebhookToken(),
      },
      // No webhookToken here on purpose — re-entering a corrected password must not
      // invalidate a token the tenant has already pasted into their Shiprocket dashboard.
      update: { emailCipher, passwordCipher },
    })

    await db.tenant.update({
      where: { id: input.tenantId },
      data: {
        shippingConfig: {
          ...current,
          mode: 'connected',
          pickupLocation,
          connectedAt: new Date().toISOString(),
          connectedBy: input.actor,
          lastError: null,
        },
      },
    })
  })

  return {}
}

/** Revokes the stored credential and the webhook token; shipping is blocked again immediately. */
export async function disconnectShiprocketAccount(tenantId: string): Promise<void> {
  await withTenant(tenantId, async (db) => {
    const current = await readConfig(db as never, tenantId)

    await db.shippingCredential.deleteMany({ where: { tenantId } })
    await db.tenant.update({
      where: { id: tenantId },
      data: {
        shippingConfig: {
          ...DEFAULT_SHIPPING_CONFIG,
          // Not a secret and the tenant typed it themselves — keep it as a reconnect prefill.
          pickupLocation: current.pickupLocation,
        },
      },
    })
  })
}

/**
 * Flags the tenant for Talam support to set Shiprocket up on their behalf.
 *
 * Idempotent while a request is outstanding: the caller sends a staff notification on a
 * non-error result, so re-writing state on every click would spam the ops inbox.
 */
export async function requestShiprocketAssist(tenantId: string): Promise<{ error?: string }> {
  return withTenant(tenantId, async (db) => {
    const current = await readConfig(db as never, tenantId)

    if (current.mode === 'connected') {
      return { error: 'A Shiprocket account is already connected.' }
    }
    if (current.mode === 'assist_requested' || current.mode === 'assist_in_progress') {
      return {}
    }

    await db.tenant.update({
      where: { id: tenantId },
      data: {
        shippingConfig: {
          ...current,
          mode: 'assist_requested',
          requestedAt: new Date().toISOString(),
        },
      },
    })
    return {}
  })
}

/**
 * Called when a stored credential stops working mid-flight — typically because the shop
 * rotated their Shiprocket password. Dropping back to `platform` makes Settings show the
 * reconnect prompt and makes the ship guard block further attempts with a useful message,
 * instead of every order failing at Shiprocket with no explanation.
 */
export async function markShiprocketCredentialStale(
  tenantId: string,
  message: string
): Promise<void> {
  await withTenant(tenantId, async (db) => {
    const current = await readConfig(db as never, tenantId)

    await db.tenant.update({
      where: { id: tenantId },
      data: { shippingConfig: { ...current, mode: 'platform', lastError: message } },
    })
  })
}

/**
 * Caches the numeric pincode behind the tenant's pickup-location nickname.
 *
 * Not a tenant-facing setting — resolving it costs an extra Shiprocket call, so
 * getDeliveryEstimate stores what it looked up rather than repeating the lookup on every
 * shopper's pincode check. Read-modify-write like every other writer here: this runs during
 * checkout, so clobbering `mode` would disconnect a live account mid-order.
 */
export async function saveResolvedPickupPincode(tenantId: string, pincode: string): Promise<void> {
  await withTenant(tenantId, async (db) => {
    const current = await readConfig(db as never, tenantId)

    await db.tenant.update({
      where: { id: tenantId },
      data: {
        shippingConfig: {
          ...current,
          pickupPincode: pincode,
          pickupPincodeCheckedAt: new Date().toISOString(),
        },
      },
    })
  })
}

/** Internal — only lib/shipping/shiprocket.ts should need real credentials. */
export async function getDecryptedShiprocketCredential(
  tenantId: string
): Promise<{ email: string; password: string } | null> {
  return withTenant(tenantId, async (db) => {
    const row = await db.shippingCredential.findUnique({
      where: { tenantId },
      select: { emailCipher: true, passwordCipher: true },
    })
    if (!row) return null

    return { email: decrypt(row.emailCipher), password: decrypt(row.passwordCipher) }
  })
}
