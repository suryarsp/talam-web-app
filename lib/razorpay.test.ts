import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createQrCode, createLinkedAccount, getLinkedAccount, RazorpayApiError } from './razorpay'

const originalFetch = global.fetch

beforeEach(() => {
  process.env.TALAM_RAZORPAY_KEY_ID = 'rzp_test_id'
  process.env.TALAM_RAZORPAY_KEY_SECRET = 'rzp_test_secret'
})

afterEach(() => {
  global.fetch = originalFetch
  vi.restoreAllMocks()
})

describe('createQrCode', () => {
  it('posts to the qr_codes endpoint with Basic auth and returns the parsed QR', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'qr_1', image_url: 'https://rzp.io/qr_1.png', status: 'active' }),
    })
    global.fetch = mockFetch as unknown as typeof fetch

    const result = await createQrCode({ amountPaise: 100, description: 'Talam credential check' })

    expect(result).toEqual({ id: 'qr_1', image_url: 'https://rzp.io/qr_1.png', status: 'active' })
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.razorpay.com/v1/payments/qr_codes')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe(`Basic ${Buffer.from('rzp_test_id:rzp_test_secret').toString('base64')}`)
    expect(JSON.parse(init.body)).toEqual({ type: 'upi_qr', usage: 'single_use', fixed_amount: true, payment_amount: 100, description: 'Talam credential check' })
  })

  it('throws RazorpayApiError on a non-2xx response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { description: 'Authentication failed' } }),
    }) as unknown as typeof fetch

    await expect(createQrCode({ amountPaise: 100, description: 'x' })).rejects.toThrow(RazorpayApiError)
  })
})

describe('createLinkedAccount', () => {
  it('posts to the accounts endpoint and returns id + status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'acc_1', status: 'created' }),
    }) as unknown as typeof fetch

    const result = await createLinkedAccount({ email: 'owner@store.com', phone: '9999999999', businessName: 'Priya Boutique' })
    expect(result).toEqual({ id: 'acc_1', status: 'created' })
  })
})

describe('getLinkedAccount', () => {
  it('GETs the account by id', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'acc_1', status: 'activated' }) })
    global.fetch = mockFetch as unknown as typeof fetch

    const result = await getLinkedAccount('acc_1')
    expect(result).toEqual({ id: 'acc_1', status: 'activated' })
    expect(mockFetch.mock.calls[0][0]).toBe('https://api.razorpay.com/v1/accounts/acc_1')
  })
})
