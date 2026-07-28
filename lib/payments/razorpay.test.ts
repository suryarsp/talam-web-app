import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import crypto from 'node:crypto'
import { getRazorpayKeys, verifyRazorpaySignature, verifyRazorpayWebhook } from './razorpay'

const SECRET = 'test_secret'

beforeEach(() => {
  process.env.TALAM_RAZORPAY_KEY_ID = 'rzp_test_key'
  process.env.TALAM_RAZORPAY_KEY_SECRET = SECRET
  process.env.TALAM_RAZORPAY_WEBHOOK_SECRET = SECRET
})

afterEach(() => {
  delete process.env.TALAM_RAZORPAY_KEY_ID
  delete process.env.TALAM_RAZORPAY_KEY_SECRET
  delete process.env.TALAM_RAZORPAY_WEBHOOK_SECRET
})

const sign = (payload: string) => crypto.createHmac('sha256', SECRET).update(payload).digest('hex')

describe('getRazorpayKeys', () => {
  it('returns null when either key is missing, so callers can degrade instead of throwing', () => {
    delete process.env.TALAM_RAZORPAY_KEY_SECRET
    expect(getRazorpayKeys()).toBeNull()
  })
})

describe('verifyRazorpaySignature', () => {
  const params = { razorpayOrderId: 'order_123', razorpayPaymentId: 'pay_456' }

  it('accepts a signature over "<orderId>|<paymentId>"', () => {
    expect(verifyRazorpaySignature({ ...params, signature: sign('order_123|pay_456') })).toBe(true)
  })

  it('rejects a signature computed over different ids', () => {
    expect(verifyRazorpaySignature({ ...params, signature: sign('order_999|pay_456') })).toBe(false)
  })

  it('rejects a signature of the wrong length without throwing', () => {
    expect(verifyRazorpaySignature({ ...params, signature: 'abc' })).toBe(false)
  })

  it('rejects everything when keys are not configured', () => {
    const signature = sign('order_123|pay_456')
    delete process.env.TALAM_RAZORPAY_KEY_SECRET
    expect(verifyRazorpaySignature({ ...params, signature })).toBe(false)
  })
})

describe('verifyRazorpayWebhook', () => {
  const body = JSON.stringify({ event: 'payment.captured' })

  it('accepts a signature over the exact raw body', () => {
    expect(verifyRazorpayWebhook(body, sign(body))).toBe(true)
  })

  it('rejects a body that was altered after signing', () => {
    expect(verifyRazorpayWebhook(`${body} `, sign(body))).toBe(false)
  })

  it('rejects when no webhook secret is configured', () => {
    const signature = sign(body)
    delete process.env.TALAM_RAZORPAY_WEBHOOK_SECRET
    expect(verifyRazorpayWebhook(body, signature)).toBe(false)
  })
})
