import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const originalEnv = { ...process.env }

beforeEach(() => {
  // The module caches its auth token at module scope — reset modules so each test gets
  // a fresh, uncached instance instead of silently reusing a previous test's token.
  vi.resetModules()
  process.env.SHIPROCKET_EMAIL = 'ops@talam4shop.com'
  process.env.SHIPROCKET_PASSWORD = 'secret'
  process.env.SHIPROCKET_PICKUP_LOCATION = 'Talam Warehouse'
  process.env.SHIPROCKET_WEBHOOK_TOKEN = 'whtok_123'
})

afterEach(() => {
  process.env = { ...originalEnv }
  vi.unstubAllGlobals()
})

async function loadShiprocket() {
  return import('./shiprocket')
}

const VALID_INPUT = {
  orderId: 'order-abc',
  orderDate: new Date('2026-08-19T10:30:00Z'),
  paymentMethod: 'Prepaid' as const,
  subTotal: 1200,
  billing: { name: 'Asha Rao', line1: '12 MG Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560001', phone: '9876543210', email: 'asha@example.com' },
  items: [{ name: 'Silk Saree', sku: 'prod-1', units: 1, sellingPrice: 1200 }],
}

function mockLoginThenOrderThenAwb(orderStatus = 200, awbStatus = 200) {
  const fetchMock = vi.fn()
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'sr_token_1' }) })
  fetchMock.mockResolvedValueOnce({
    ok: orderStatus === 200,
    status: orderStatus,
    json: async () => ({ order_id: 555, shipment_id: 999 }),
    text: async () => 'order creation failed',
  })
  fetchMock.mockResolvedValueOnce({
    ok: awbStatus === 200,
    status: awbStatus,
    json: async () => ({ response: { data: { awb_code: 'AWB123', courier_name: 'Delhivery' } } }),
    text: async () => 'awb assignment failed',
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('createShiprocketShipment', () => {
  it('logs in, creates the order, assigns an AWB, and returns the shipment', async () => {
    const { createShiprocketShipment } = await loadShiprocket()
    const fetchMock = mockLoginThenOrderThenAwb()
    const result = await createShiprocketShipment(VALID_INPUT)

    expect(result).toEqual({ awbCode: 'AWB123', courierName: 'Delhivery', shipmentId: 999 })
    expect(fetchMock).toHaveBeenNthCalledWith(1, expect.stringContaining('/auth/login'), expect.objectContaining({ method: 'POST' }))

    const orderCall = fetchMock.mock.calls[1]
    expect(orderCall[0]).toContain('/orders/create/adhoc')
    const orderBody = JSON.parse(orderCall[1].body as string)
    expect(orderBody).toMatchObject({
      order_id: 'order-abc',
      pickup_location: 'Talam Warehouse',
      billing_customer_name: 'Asha Rao',
      billing_pincode: '560001',
      payment_method: 'Prepaid',
      weight: 0.5,
      length: 10,
      breadth: 10,
      height: 10,
    })
    expect(orderBody.order_items).toEqual([{ name: 'Silk Saree', sku: 'prod-1', units: 1, selling_price: 1200 }])

    const awbCall = fetchMock.mock.calls[2]
    expect(awbCall[0]).toContain('/courier/assign/awb')
    expect(JSON.parse(awbCall[1].body as string)).toEqual({ shipment_id: 999 })
  })

  it('reuses a cached token instead of logging in again within the same process', async () => {
    const { createShiprocketShipment } = await loadShiprocket()
    const fetchMock = mockLoginThenOrderThenAwb()
    await createShiprocketShipment(VALID_INPUT)
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ order_id: 1, shipment_id: 2 }) })
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ response: { data: { awb_code: 'AWB2', courier_name: 'X' } } }) })

    await createShiprocketShipment(VALID_INPUT)
    // Only one login call total across both createShiprocketShipment calls.
    const loginCalls = fetchMock.mock.calls.filter((c) => String(c[0]).includes('/auth/login'))
    expect(loginCalls.length).toBe(1)
  })

  it('throws when Shiprocket order creation fails', async () => {
    const { createShiprocketShipment } = await loadShiprocket()
    mockLoginThenOrderThenAwb(422)
    await expect(createShiprocketShipment(VALID_INPUT)).rejects.toThrow('Shiprocket order creation failed')
  })

  it('throws when credentials are not configured', async () => {
    const { createShiprocketShipment } = await loadShiprocket()
    delete process.env.SHIPROCKET_EMAIL
    await expect(createShiprocketShipment(VALID_INPUT)).rejects.toThrow('Shiprocket credentials are not configured')
  })

  it('throws when the pickup location is not configured', async () => {
    const { createShiprocketShipment } = await loadShiprocket()
    delete process.env.SHIPROCKET_PICKUP_LOCATION
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'sr_token_1' }) }))
    await expect(createShiprocketShipment(VALID_INPUT)).rejects.toThrow('SHIPROCKET_PICKUP_LOCATION is not configured')
  })
})

describe('verifyShiprocketWebhookToken', () => {
  it('accepts the configured token', async () => {
    const { verifyShiprocketWebhookToken } = await loadShiprocket()
    expect(verifyShiprocketWebhookToken('whtok_123')).toBe(true)
  })

  it('rejects a wrong token', async () => {
    const { verifyShiprocketWebhookToken } = await loadShiprocket()
    expect(verifyShiprocketWebhookToken('wrong')).toBe(false)
  })

  it('rejects a missing token', async () => {
    const { verifyShiprocketWebhookToken } = await loadShiprocket()
    expect(verifyShiprocketWebhookToken(null)).toBe(false)
  })

  it('rejects everything when no token is configured', async () => {
    const { verifyShiprocketWebhookToken } = await loadShiprocket()
    delete process.env.SHIPROCKET_WEBHOOK_TOKEN
    expect(verifyShiprocketWebhookToken('whtok_123')).toBe(false)
  })
})
