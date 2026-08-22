import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  assignShiprocketAwb,
  createShiprocketOrder,
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
  it('maps our order onto the adhoc-order payload and returns the shipment id', async () => {
    const fetchMock = stubFetch(ok({ order_id: 555, shipment_id: 999 }))

    expect(await createShiprocketOrder('tok', 'Chennai Store', VALID_INPUT)).toEqual({ shipmentId: 999 })

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
