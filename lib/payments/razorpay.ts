import crypto from 'node:crypto'

/**
 * Razorpay via plain fetch + node:crypto — the REST surface we need is two
 * endpoints and one HMAC, so the SDK would be a dependency for nothing.
 *
 * ponytail: platform-level keys (one Talam merchant account, manual payouts to
 * store owners). Per-tenant keys mean moving these two reads into
 * tenant.paymentConfig — nothing else here changes.
 */

const API_BASE = 'https://api.razorpay.com/v1'

export function getRazorpayKeys(): { keyId: string; keySecret: string } | null {
  const keyId = process.env.TALAM_RAZORPAY_KEY_ID
  const keySecret = process.env.TALAM_RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) return null
  return { keyId, keySecret }
}

export type RazorpayOrder = { id: string; amount: number; currency: string }

/** `amount` is in paise — Razorpay rejects decimals. */
export async function createRazorpayOrder(amountPaise: number, receipt: string): Promise<RazorpayOrder> {
  const keys = getRazorpayKeys()
  if (!keys) throw new Error('Razorpay keys are not configured')

  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${keys.keyId}:${keys.keySecret}`).toString('base64')}`,
    },
    body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt }),
  })

  if (!res.ok) {
    throw new Error(`Razorpay order creation failed (${res.status}): ${await res.text()}`)
  }
  return (await res.json()) as RazorpayOrder
}

export type RazorpayRefund = { id: string; amount: number; status: string }

/**
 * Full refund of a captured payment. `amountPaise` is passed explicitly (Razorpay defaults to
 * the full amount when omitted) so the caller's intent is on the wire and a mismatch fails
 * loudly upstream rather than silently refunding something else.
 *
 * Throws on any non-2xx: order cancellation must abort entirely rather than mark an order
 * refunded that Razorpay never refunded.
 */
export async function refundRazorpayPayment(paymentId: string, amountPaise: number): Promise<RazorpayRefund> {
  const keys = getRazorpayKeys()
  if (!keys) throw new Error('Razorpay keys are not configured')

  const res = await fetch(`${API_BASE}/payments/${paymentId}/refund`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${keys.keyId}:${keys.keySecret}`).toString('base64')}`,
    },
    body: JSON.stringify({ amount: amountPaise }),
  })

  if (!res.ok) {
    throw new Error(`Razorpay refund failed (${res.status}): ${await res.text()}`)
  }
  return (await res.json()) as RazorpayRefund
}

/**
 * Checkout callback signature: HMAC-SHA256 of "<razorpayOrderId>|<razorpayPaymentId>"
 * keyed with the account secret. Never mark an order paid without this.
 */
export function verifyRazorpaySignature(params: {
  razorpayOrderId: string
  razorpayPaymentId: string
  signature: string
}): boolean {
  const keys = getRazorpayKeys()
  if (!keys) return false
  return timingSafeEqualHex(
    crypto
      .createHmac('sha256', keys.keySecret)
      .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
      .digest('hex'),
    params.signature
  )
}

/** Webhook signature: HMAC-SHA256 of the raw request body keyed with the webhook secret. */
export function verifyRazorpayWebhook(rawBody: string, signature: string): boolean {
  const secret = process.env.TALAM_RAZORPAY_WEBHOOK_SECRET
  if (!secret) return false
  return timingSafeEqualHex(crypto.createHmac('sha256', secret).update(rawBody).digest('hex'), signature)
}

function timingSafeEqualHex(expected: string, received: string): boolean {
  // timingSafeEqual throws on length mismatch, so guard before comparing.
  if (expected.length !== received.length) return false
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'))
}
