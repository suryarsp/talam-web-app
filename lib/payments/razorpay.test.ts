import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import crypto from 'node:crypto'
import { getRazorpayKeys, refundRazorpayPayment, verifyRazorpaySignature, verifyRazorpayWebhook } from './razorpay'

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

describe('refundRazorpayPayment', () => {
  const ok = (body: unknown) =>
    vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body, text: async () => '' })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('refunds the given payment for the exact amount in paise', async () => {
    const fetchMock = ok({ id: 'rfnd_1', amount: 269900, status: 'processed' })
    vi.stubGlobal('fetch', fetchMock)

    await refundRazorpayPayment('pay_456', 269900)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.razorpay.com/v1/payments/pay_456/refund')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ amount: 269900 })
  })

  it('returns the refund id so the cancellation can be traced back to Razorpay', async () => {
    vi.stubGlobal('fetch', ok({ id: 'rfnd_1', amount: 269900, status: 'processed' }))

    await expect(refundRazorpayPayment('pay_456', 269900)).resolves.toEqual(
      expect.objectContaining({ id: 'rfnd_1', status: 'processed' })
    )
  })

  it('throws rather than reporting success when Razorpay rejects the refund', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 400, text: async () => 'insufficient balance' })
    )

    await expect(refundRazorpayPayment('pay_456', 269900)).rejects.toThrow(/400.*insufficient balance/)
  })

  it('throws without calling Razorpay when keys are not configured', async () => {
    const fetchMock = ok({})
    vi.stubGlobal('fetch', fetchMock)
    delete process.env.TALAM_RAZORPAY_KEY_SECRET

    await expect(refundRazorpayPayment('pay_456', 100)).rejects.toThrow('Razorpay keys are not configured')
    expect(fetchMock).not.toHaveBeenCalled()
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
