const BASE_URL = 'https://api.razorpay.com/v1'

export class RazorpayApiError extends Error {
  status: number
  body: unknown

  constructor(status: number, body: unknown) {
    super(`Razorpay API error (${status}): ${JSON.stringify(body)}`)
    this.status = status
    this.body = body
  }
}

function authHeader(): string {
  const keyId = process.env.TALAM_RAZORPAY_KEY_ID
  const keySecret = process.env.TALAM_RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) throw new Error('TALAM_RAZORPAY_KEY_ID/SECRET are not set')
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`
}

async function razorpayRequest<T>(path: string, init: { method: 'GET' | 'POST'; body?: unknown }): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: init.method,
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: init.body ? JSON.stringify(init.body) : undefined,
  })
  const json = await response.json()
  if (!response.ok) throw new RazorpayApiError(response.status, json)
  return json as T
}

export type RazorpayQrCode = { id: string; image_url: string; status: string }

export function createQrCode(input: { amountPaise: number; description: string }): Promise<RazorpayQrCode> {
  return razorpayRequest<RazorpayQrCode>('/payments/qr_codes', {
    method: 'POST',
    body: { type: 'upi_qr', usage: 'single_use', fixed_amount: true, payment_amount: input.amountPaise, description: input.description },
  })
}

export type RazorpayLinkedAccount = { id: string; status: string }

export function createLinkedAccount(input: { email: string; phone: string; businessName: string }): Promise<RazorpayLinkedAccount> {
  return razorpayRequest<RazorpayLinkedAccount>('/accounts', {
    method: 'POST',
    body: {
      email: input.email,
      phone: input.phone,
      type: 'route',
      legal_business_name: input.businessName,
      business_type: 'individual',
      contact_name: input.businessName,
      profile: { category: 'ecommerce', subcategory: 'ecommerce', addresses: {} },
    },
  })
}

export function getLinkedAccount(accountId: string): Promise<RazorpayLinkedAccount> {
  return razorpayRequest<RazorpayLinkedAccount>(`/accounts/${accountId}`, { method: 'GET' })
}
