import crypto from 'node:crypto'

/**
 * Shiprocket via plain fetch — same reasoning as lib/payments/razorpay.ts: the REST
 * surface we need (login, create order, assign AWB) doesn't justify an SDK dependency.
 *
 * ponytail: platform-level credentials (one Talam Shiprocket account). Per-tenant accounts
 * (needed for COD remittance — see docs/superpowers/specs/2026-08-19-shiprocket-integration-design.md)
 * would move these into tenant.shippingConfig — nothing else here changes.
 */

const API_BASE = 'https://apiv2.shiprocket.in/v1/external'

let cachedToken: { token: string; expiresAt: number } | null = null

async function getShiprocketToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token

  const email = process.env.SHIPROCKET_EMAIL
  const password = process.env.SHIPROCKET_PASSWORD
  if (!email || !password) throw new Error('Shiprocket credentials are not configured')

  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`Shiprocket login failed (${res.status}): ${await res.text()}`)

  const json = (await res.json()) as { token: string }
  // Shiprocket tokens last 10 days; refresh a day early rather than racing the exact expiry.
  cachedToken = { token: json.token, expiresAt: Date.now() + 9 * 24 * 60 * 60 * 1000 }
  return json.token
}

export type ShiprocketOrderInput = {
  orderId: string
  orderDate: Date
  paymentMethod: 'COD' | 'Prepaid'
  subTotal: number
  billing: {
    name: string
    line1: string
    line2?: string
    city: string
    state: string
    pincode: string
    phone: string
    email?: string
  }
  items: { name: string; sku: string; units: number; sellingPrice: number }[]
}

export type ShiprocketShipment = { awbCode: string; courierName: string; shipmentId: number }

function formatShiprocketDate(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ')
}

export async function createShiprocketShipment(input: ShiprocketOrderInput): Promise<ShiprocketShipment> {
  const pickupLocation = process.env.SHIPROCKET_PICKUP_LOCATION
  if (!pickupLocation) throw new Error('SHIPROCKET_PICKUP_LOCATION is not configured')

  const token = await getShiprocketToken()
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const orderRes = await fetch(`${API_BASE}/orders/create/adhoc`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      order_id: input.orderId,
      order_date: formatShiprocketDate(input.orderDate),
      pickup_location: pickupLocation,
      billing_customer_name: input.billing.name,
      billing_address: input.billing.line1,
      billing_address_2: input.billing.line2 ?? '',
      billing_city: input.billing.city,
      billing_pincode: input.billing.pincode,
      billing_state: input.billing.state,
      billing_country: 'India',
      billing_email: input.billing.email || 'orders@talam4shop.com',
      billing_phone: input.billing.phone,
      shipping_is_billing: true,
      order_items: input.items.map((item) => ({
        name: item.name,
        sku: item.sku,
        units: item.units,
        selling_price: item.sellingPrice,
      })),
      payment_method: input.paymentMethod,
      sub_total: input.subTotal,
      // ponytail: hardcoded package weight/dims — no per-product weight field yet.
      // Upgrade path: add Product.weight, sum per order.
      length: 10,
      breadth: 10,
      height: 10,
      weight: 0.5,
    }),
  })
  if (!orderRes.ok) throw new Error(`Shiprocket order creation failed (${orderRes.status}): ${await orderRes.text()}`)
  const orderJson = (await orderRes.json()) as { order_id: number; shipment_id: number }

  const awbRes = await fetch(`${API_BASE}/courier/assign/awb`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ shipment_id: orderJson.shipment_id }),
  })
  if (!awbRes.ok) throw new Error(`Shiprocket AWB assignment failed (${awbRes.status}): ${await awbRes.text()}`)
  const awbJson = (await awbRes.json()) as { response: { data: { awb_code: string; courier_name: string } } }

  return {
    awbCode: awbJson.response.data.awb_code,
    courierName: awbJson.response.data.courier_name,
    shipmentId: orderJson.shipment_id,
  }
}

/** Shiprocket has no HMAC webhook option — verification is a static shared-secret header
 *  (configured as a custom header in the Shiprocket dashboard) compared in constant time. */
export function verifyShiprocketWebhookToken(received: string | null): boolean {
  const expected = process.env.SHIPROCKET_WEBHOOK_TOKEN
  if (!expected || !received || expected.length !== received.length) return false
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received))
}
