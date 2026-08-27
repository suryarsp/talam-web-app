import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  assignShiprocketAwb,
  checkServiceability,
  createShiprocketOrder,
  getPickupLocations,
  shiprocketLogin,
  type ShiprocketOrderInput,
} from './shiprocket-client'

afterEach(() => {
  vi.unstubAllGlobals()
})

const VALID_INPUT: ShiprocketOrderInput = {
  orderId: 'order-abc',
  orderDate: new Date('2026-08-19T10:30:00Z'),
  paymentMethod: 'Prepaid',
  subTotal: 1200,
  billing: {
    name: 'Asha Rao',
    line1: '12 MG Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
    phone: '9876543210',
    email: 'asha@example.com',
  },
  items: [{ name: 'Silk Saree', sku: 'prod-1', units: 1, sellingPrice: 1200 }],
}

function stubFetch(response: Record<string, unknown>) {
  const fetchMock = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const ok = (json: unknown) => ({ ok: true, status: 200, json: async () => json })
const failure = (status: number, text: string) => ({ ok: false, status, text: async () => text })

describe('shiprocketLogin', () => {
  it('posts the given credentials and returns the token', async () => {
    const fetchMock = stubFetch(ok({ token: 'sr_token_1' }))

    expect(await shiprocketLogin('shop@example.com', 'pw')).toBe('sr_token_1')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/auth/login')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ email: 'shop@example.com', password: 'pw' })
  })

  it('throws on a non-2xx response', async () => {
    stubFetch(failure(403, 'bad credentials'))
    await expect(shiprocketLogin('shop@example.com', 'wrong')).rejects.toThrow(
      'Shiprocket login failed (403): bad credentials'
    )
  })

  it('takes credentials as arguments rather than reading the environment', async () => {
    // Guards the whole point of Model A: this module must never fall back to a platform account.
    process.env.SHIPROCKET_EMAIL = 'platform@talam4shop.com'
    const fetchMock = stubFetch(ok({ token: 't' }))

    await shiprocketLogin('tenant@shop.com', 'pw')

    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string).email).toBe('tenant@shop.com')
    delete process.env.SHIPROCKET_EMAIL
  })
})

describe('createShiprocketOrder', () => {
  it('maps our order onto the adhoc-order payload and returns both Shiprocket ids', async () => {
    const fetchMock = stubFetch(ok({ order_id: 555, shipment_id: 999 }))

    expect(await createShiprocketOrder('tok', 'Chennai Store', VALID_INPUT)).toEqual({
      shiprocketOrderId: 555,
      shipmentId: 999,
    })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/orders/create/adhoc')
    expect(init.headers.Authorization).toBe('Bearer tok')

    const body = JSON.parse(init.body as string)
    expect(body).toMatchObject({
      order_id: 'order-abc',
      pickup_location: 'Chennai Store',
      billing_customer_name: 'Asha',
      billing_last_name: 'Rao',
      billing_pincode: '560001',
      payment_method: 'Prepaid',
      weight: 0.5,
      length: 10,
      breadth: 10,
      height: 10,
    })
    expect(body.order_items).toEqual([
      { name: 'Silk Saree', sku: 'prod-1', units: 1, selling_price: 1200 },
    ])
  })

  it('uses the pickup location passed in, not an environment variable', async () => {
    process.env.SHIPROCKET_PICKUP_LOCATION = 'Talam Warehouse'
    const fetchMock = stubFetch(ok({ order_id: 1, shipment_id: 2 }))

    await createShiprocketOrder('tok', 'Tenant Pickup', VALID_INPUT)

    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string).pickup_location).toBe('Tenant Pickup')
    delete process.env.SHIPROCKET_PICKUP_LOCATION
  })

  it('falls back to a placeholder billing email when the customer has none', async () => {
    const fetchMock = stubFetch(ok({ order_id: 1, shipment_id: 2 }))
    const noEmail = { ...VALID_INPUT, billing: { ...VALID_INPUT.billing, email: undefined } }

    await createShiprocketOrder('tok', 'Chennai Store', noEmail)

    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string).billing_email).toBe(
      'orders@talam4shop.com'
    )
  })

  it('throws on a non-2xx response', async () => {
    stubFetch(failure(422, 'bad pincode'))
    await expect(createShiprocketOrder('tok', 'Chennai Store', VALID_INPUT)).rejects.toThrow(
      'Shiprocket order creation failed (422): bad pincode'
    )
  })
})

describe('assignShiprocketAwb', () => {
  it('requests an AWB for the shipment and returns it', async () => {
    const fetchMock = stubFetch(
      ok({ response: { data: { awb_code: 'AWB123', courier_name: 'Delhivery' } } })
    )

    expect(await assignShiprocketAwb('tok', 999)).toEqual({
      awbCode: 'AWB123',
      courierName: 'Delhivery',
    })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/courier/assign/awb')
    expect(JSON.parse(init.body as string)).toEqual({ shipment_id: 999 })
  })

  it('throws on a non-2xx response', async () => {
    stubFetch(failure(400, 'no courier available'))
    await expect(assignShiprocketAwb('tok', 999)).rejects.toThrow(
      'Shiprocket AWB assignment failed (400): no courier available'
    )
  })
})

describe('getPickupLocations', () => {
  it("maps Shiprocket's shipping_address rows onto nickname/pincode pairs", async () => {
    const fetchMock = stubFetch(
      ok({
        data: {
          shipping_address: [
            { id: 7, pickup_location: 'Chennai Store', pin_code: '600001', city: 'Chennai' },
            { id: 8, pickup_location: 'Warehouse', pin_code: '600042', city: 'Chennai' },
          ],
        },
      })
    )

    expect(await getPickupLocations('tok')).toEqual([
      { id: 7, nickname: 'Chennai Store', pincode: '600001' },
      { id: 8, nickname: 'Warehouse', pincode: '600042' },
    ])

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/settings/company/pickup')
    expect(init.headers.Authorization).toBe('Bearer tok')
  })

  it('returns an empty list when the account has no pickup addresses', async () => {
    stubFetch(ok({ data: {} }))
    expect(await getPickupLocations('tok')).toEqual([])
  })

  it('throws on a non-2xx response', async () => {
    stubFetch(failure(401, 'token expired'))
    await expect(getPickupLocations('tok')).rejects.toThrow(
      'Shiprocket pickup locations lookup failed (401): token expired'
    )
  })
})

describe('checkServiceability', () => {
  const PARAMS = {
    pickupPincode: '600001',
    deliveryPincode: '560001',
    weightKg: 1.5,
    codEnabled: true,
  }

  const courier = (overrides: Record<string, unknown> = {}) => ({
    courier_company_id: 51,
    courier_name: 'Xpressbees Surface',
    rate: 72.5,
    cod: 1,
    estimated_delivery_days: '3',
    etd: 'Aug 30, 2026 20:44:00',
    etd_hours: 72,
    ...overrides,
  })

  it('quotes the cheapest available courier', async () => {
    stubFetch(
      ok({
        data: {
          available_courier_companies: [
            courier({ rate: 120, estimated_delivery_days: '2' }),
            courier({ rate: 72.5, estimated_delivery_days: '4' }),
          ],
        },
      })
    )

    expect(await checkServiceability('tok', PARAMS)).toEqual({
      serviceable: true,
      etaDays: 4,
      rate: 72.5,
      codAvailable: true,
    })
  })

  it('reports COD as unavailable when the cheapest courier does not offer it', async () => {
    stubFetch(ok({ data: { available_courier_companies: [courier({ cod: 0 })] } }))

    expect(await checkServiceability('tok', PARAMS)).toMatchObject({ codAvailable: false })
  })

  it('falls back to etd_hours when the courier omits estimated_delivery_days', async () => {
    // Shiprocket's `etd` is a delivery *date* string, not a day count, so it can't stand in
    // for etaDays directly — etd_hours is the only other numeric ETA field on the row.
    stubFetch(
      ok({
        data: {
          available_courier_companies: [
            courier({ estimated_delivery_days: undefined, etd_hours: 60 }),
          ],
        },
      })
    )

    expect(await checkServiceability('tok', PARAMS)).toMatchObject({ etaDays: 3 })
  })

  it('reports an unserviceable pincode rather than throwing when no courier covers it', async () => {
    // An unserviceable pincode is an expected outcome at checkout, not a failure — the
    // caller has to be able to tell it apart from "Shiprocket is down".
    stubFetch(ok({ data: { available_courier_companies: [] } }))

    expect(await checkServiceability('tok', PARAMS)).toEqual({ serviceable: false })
  })

  it('reports an unserviceable pincode when the response omits the courier list entirely', async () => {
    stubFetch(ok({ data: {} }))

    expect(await checkServiceability('tok', PARAMS)).toEqual({ serviceable: false })
  })

  it('sends the pickup, delivery, weight and COD flag as query parameters', async () => {
    const fetchMock = stubFetch(ok({ data: { available_courier_companies: [courier()] } }))

    await checkServiceability('tok', PARAMS)

    const url = new URL(fetchMock.mock.calls[0][0] as string)
    expect(url.pathname).toContain('/courier/serviceability')
    expect(url.searchParams.get('pickup_postcode')).toBe('600001')
    expect(url.searchParams.get('delivery_postcode')).toBe('560001')
    expect(url.searchParams.get('weight')).toBe('1.5')
    expect(url.searchParams.get('cod')).toBe('1')
  })

  it('sends cod=0 when COD availability was not requested', async () => {
    const fetchMock = stubFetch(ok({ data: { available_courier_companies: [courier()] } }))

    await checkServiceability('tok', { ...PARAMS, codEnabled: false })

    expect(new URL(fetchMock.mock.calls[0][0] as string).searchParams.get('cod')).toBe('0')
  })

  it('throws on a non-2xx response', async () => {
    stubFetch(failure(500, 'upstream error'))
    await expect(checkServiceability('tok', PARAMS)).rejects.toThrow(
      'Shiprocket serviceability check failed (500): upstream error'
    )
  })
})
