import crypto from 'node:crypto'

/**
 * Symmetric encryption for secrets we must store and later replay to a third party —
 * currently only per-tenant Shiprocket account credentials (lib/shipping/shiprocket-account.ts).
 *
 * Unlike Razorpay, Shiprocket has no OAuth: pushing an order "as" a tenant means holding
 * that tenant's actual account password, so it cannot be stored as a plain column.
 *
 * KEY ROTATION: there is deliberately no re-encryption runbook. Rotating
 * SHIPPING_CREDENTIALS_ENCRYPTION_KEY invalidates every stored credential and every tenant
 * must reconnect their Shiprocket account. The `v1:` prefix exists so that a future
 * rotation can be *detected* (and a second key tried) rather than failing silently — not
 * because rotation is implemented today.
 */

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12
const KEY_BYTES = 32
const PREFIX = 'v1'

/** Read lazily, never at module load — importing this file must not break callers that never encrypt. */
function getKey(): Buffer {
  const raw = process.env.SHIPPING_CREDENTIALS_ENCRYPTION_KEY
  if (!raw) throw new Error('SHIPPING_CREDENTIALS_ENCRYPTION_KEY is not configured')

  const key = Buffer.from(raw, 'base64')
  if (key.length !== KEY_BYTES) {
    throw new Error('SHIPPING_CREDENTIALS_ENCRYPTION_KEY must be a base64-encoded 32-byte key')
  }
  return key
}

/** Returns `v1:<iv>:<authTag>:<ciphertext>`, all base64. A fresh random IV per call. */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(IV_BYTES)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])

  return [
    PREFIX,
    iv.toString('base64'),
    cipher.getAuthTag().toString('base64'),
    ciphertext.toString('base64'),
  ].join(':')
}

/** Throws on a malformed token, an unknown version prefix, or a failed GCM auth check (tampering). */
export function decrypt(token: string): string {
  const key = getKey()

  const parts = token.split(':')
  if (parts.length !== 4 || parts[0] !== PREFIX) {
    throw new Error('Cannot decrypt: unrecognised encrypted value format')
  }
  const [, ivB64, authTagB64, ciphertextB64] = parts

  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'))

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}

/**
 * Constant-time string comparison for secrets received over the wire (per-tenant webhook
 * tokens). Empty values are always rejected so an unset secret can never match.
 */
export function timingSafeEqualStr(a: string, b: string): boolean {
  if (!a || !b) return false

  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false

  return crypto.timingSafeEqual(bufA, bufB)
}
