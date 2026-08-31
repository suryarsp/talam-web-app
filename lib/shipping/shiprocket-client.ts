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

export type ShiprocketShipment = {
  awbCode: string
  courierName: string
  shipmentId: number
  /** Shiprocket's own order id — distinct from both our order id and the shipment id, and the
   *  one their dashboard search is keyed on. */
  shiprocketOrderId: number
}

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
): Promise<{ shiprocketOrderId: number; shipmentId: number }> {
  const [billingFirstName, ...billingLastNameParts] = input.billing.name.trim().split(/\s+/)

  const res = await fetch(`${API_BASE}/orders/create/adhoc`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_id: input.orderId,
      order_date: formatShiprocketDate(input.orderDate),
      pickup_location: pickupLocation,
      billing_customer_name: billingFirstName,
      billing_last_name: billingLastNameParts.join(' '),
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
  return { shiprocketOrderId: json.order_id, shipmentId: json.shipment_id }
}

/** One pickup address on the tenant's Shiprocket account. */
export type ShiprocketPickupLocation = {
  id: number
  /** What Shiprocket calls `pickup_location` — the nickname the tenant typed when creating it. */
  nickname: string
  pincode: string
}

export type ServiceabilityParams = {
  pickupPincode: string
  deliveryPincode: string
  weightKg: number
  codEnabled: boolean
}

export type ServiceabilityQuote =
  | { serviceable: true; etaDays: number | undefined; rate: number; codAvailable: boolean }
  | { serviceable: false }

/**
 * Lists the pickup addresses on the account, so a nickname can be resolved to a real pincode.
 *
 * The tenant only ever types the nickname (see ShippingConfig.pickupLocation), but the
 * serviceability API needs the numeric pincode behind it — this is the only way to get it.
 */
export async function getPickupLocations(token: string): Promise<ShiprocketPickupLocation[]> {
  const res = await fetch(`${API_BASE}/settings/company/pickup`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`Shiprocket pickup locations lookup failed (${res.status}): ${await res.text()}`)

  const json = (await res.json()) as {
    data?: { shipping_address?: { id: number; pickup_location: string; pin_code: string }[] }
  }
  return (json.data?.shipping_address ?? []).map((address) => ({
    id: address.id,
    nickname: address.pickup_location,
    pincode: address.pin_code,
  }))
}

/**
 * A courier row from `data.available_courier_companies`. Only the fields we read are typed;
 * the real row carries ~50 more.
 *
 * The ETA fields are the one place this module guesses at Shiprocket's shape without a
 * sandbox to verify against, so all three plausible candidates are declared and parsed in
 * order — see etaDaysFrom below.
 */
type ShiprocketCourier = {
  rate?: number
  cod?: number
  estimated_delivery_days?: string | number
  etd_hours?: number
  etd?: string
}

const HOURS_PER_DAY = 24
const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Reads a whole-day ETA out of a courier row, preferring the most direct field available.
 *
 * `estimated_delivery_days` is the day count itself (Shiprocket sends it as a numeric
 * string). `etd_hours` is the same thing in hours. `etd` is a human delivery *date*
 * ("Aug 30, 2026 20:44:00") — usable only by diffing against now, hence last. `undefined` means
 * "Shiprocket did not say", which a caller renders as a generic estimate rather than a real date
 * — it must never collide with a genuine 0, which formatDeliveryDate would read as "today".
 */
function etaDaysFrom(courier: ShiprocketCourier): number | undefined {
  const days = Number(courier.estimated_delivery_days)
  if (Number.isFinite(days) && days > 0) return Math.ceil(days)

  if (Number.isFinite(courier.etd_hours) && (courier.etd_hours as number) > 0) {
    return Math.ceil((courier.etd_hours as number) / HOURS_PER_DAY)
  }

  const etd = courier.etd ? Date.parse(courier.etd) : NaN
  if (Number.isFinite(etd)) return Math.max(1, Math.ceil((etd - Date.now()) / MS_PER_DAY))

  return undefined
}

/**
 * Asks Shiprocket which couriers can carry a parcel of this weight between two pincodes.
 *
 * An empty (or absent) courier list means nobody delivers there — an ordinary, expected
 * answer at checkout, so it comes back as `{ serviceable: false }` rather than a throw. Only
 * an actual transport/HTTP failure throws.
 *
 * Of the couriers offered we quote the cheapest, matching what a shopper would be charged if
 * the shop lets Shiprocket pick on price.
 */
export async function checkServiceability(
  token: string,
  params: ServiceabilityParams
): Promise<ServiceabilityQuote> {
  const query = new URLSearchParams({
    pickup_postcode: params.pickupPincode,
    delivery_postcode: params.deliveryPincode,
    weight: String(params.weightKg),
    cod: params.codEnabled ? '1' : '0',
  })

  const res = await fetch(`${API_BASE}/courier/serviceability/?${query}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`Shiprocket serviceability check failed (${res.status}): ${await res.text()}`)

  const json = (await res.json()) as { data?: { available_courier_companies?: ShiprocketCourier[] } }
  const couriers = json.data?.available_courier_companies ?? []
  if (couriers.length === 0) return { serviceable: false }

  const cheapest = couriers.reduce((best, courier) =>
    (courier.rate ?? Infinity) < (best.rate ?? Infinity) ? courier : best
  )

  return {
    serviceable: true,
    etaDays: etaDaysFrom(cheapest),
    rate: cheapest.rate ?? 0,
    codAvailable: cheapest.cod === 1,
  }
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
