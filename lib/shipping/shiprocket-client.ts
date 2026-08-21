/**
 * Shiprocket REST calls, via plain fetch — same reasoning as lib/payments/razorpay.ts: the
 * surface we need (login, create order, assign AWB) doesn't justify an SDK dependency.
 *
 * This module is deliberately pure: every credential and the pickup location arrive as
 * arguments, and nothing here reads process.env or the database. That is what makes it
 * usable per-tenant — see lib/shipping/shiprocket.ts for the orchestration that supplies
 * one tenant's credentials, and lib/shipping/shiprocket-account.ts for where they're stored.
 */

const API_BASE = 'https://apiv2.shiprocket.in/v1/external'

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

/**
 * Thrown by shiprocketLogin on a non-2xx response. Carries the HTTP status so callers can
 * tell an actual credential rejection (401/403) apart from a transient upstream problem
 * (5xx, 429, ...) instead of treating every failure as "wrong password".
 */
export class ShiprocketLoginError extends Error {
  readonly status: number

  constructor(status: number, body: string) {
    super(`Shiprocket login failed (${status}): ${body}`)
    this.name = 'ShiprocketLoginError'
    this.status = status
  }
}

function formatShiprocketDate(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ')
}

/**
 * Exchanges one Shiprocket account's credentials for a bearer token.
 *
 * Tokens last ~10 days but are deliberately not cached: the previous platform-level
 * singleton was already unreliable across serverless instances, and caching per tenant
 * multiplies that problem for no gain — shipments are created one at a time by hand.
 */
export async function shiprocketLogin(email: string, password: string): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new ShiprocketLoginError(res.status, await res.text())

  const json = (await res.json()) as { token: string }
  return json.token
}

export async function createShiprocketOrder(
  token: string,
  pickupLocation: string,
  input: ShiprocketOrderInput
): Promise<{ shipmentId: number }> {
  const res = await fetch(`${API_BASE}/orders/create/adhoc`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
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
  if (!res.ok) throw new Error(`Shiprocket order creation failed (${res.status}): ${await res.text()}`)

  const json = (await res.json()) as { order_id: number; shipment_id: number }
  return { shipmentId: json.shipment_id }
}

export async function assignShiprocketAwb(
  token: string,
  shipmentId: number
): Promise<{ awbCode: string; courierName: string }> {
  const res = await fetch(`${API_BASE}/courier/assign/awb`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ shipment_id: shipmentId }),
  })
  if (!res.ok) throw new Error(`Shiprocket AWB assignment failed (${res.status}): ${await res.text()}`)

  const json = (await res.json()) as {
    response: { data: { awb_code: string; courier_name: string } }
  }
  return { awbCode: json.response.data.awb_code, courierName: json.response.data.courier_name }
}
