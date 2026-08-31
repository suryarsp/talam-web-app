import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockLogin,
  mockCreateOrder,
  mockAssignAwb,
  mockGetPickupLocations,
  mockCheckServiceability,
  mockGetCredential,
  mockGetConfig,
  mockMarkStale,
  mockSavePickupPincode,
  MockShiprocketLoginError,
} = vi.hoisted(() => {
  class MockShiprocketLoginError extends Error {
    status: number
    constructor(status: number, body: string) {
      super(`Shiprocket login failed (${status}): ${body}`)
      this.status = status
    }
  }
  return {
    mockLogin: vi.fn(),
    mockCreateOrder: vi.fn(),
    mockAssignAwb: vi.fn(),
    mockGetPickupLocations: vi.fn(),
    mockCheckServiceability: vi.fn(),
    mockGetCredential: vi.fn(),
    mockGetConfig: vi.fn(),
    mockMarkStale: vi.fn(),
    mockSavePickupPincode: vi.fn(),
    MockShiprocketLoginError,
  }
})

vi.mock('./shiprocket-client', () => ({
  shiprocketLogin: mockLogin,
  createShiprocketOrder: mockCreateOrder,
  assignShiprocketAwb: mockAssignAwb,
  getPickupLocations: mockGetPickupLocations,
  checkServiceability: mockCheckServiceability,
  ShiprocketLoginError: MockShiprocketLoginError,
}))
vi.mock('./shiprocket-account', () => ({
  getDecryptedShiprocketCredential: mockGetCredential,
  getShippingConfig: mockGetConfig,
  markShiprocketCredentialStale: mockMarkStale,
  saveResolvedPickupPincode: mockSavePickupPincode,
}))

import { createShiprocketShipment } from './shiprocket'

const VALID_INPUT = {
  orderId: 'order-abc',
  orderDate: new Date('2026-08-19T10:30:00Z'),
  paymentMethod: 'Prepaid' as const,
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

beforeEach(() => {
  vi.clearAllMocks()
  mockGetCredential.mockResolvedValue({ email: 'shop@example.com', password: 'pw' })
  mockGetConfig.mockResolvedValue({ mode: 'connected', pickupLocation: 'Chennai Store' })
  mockLogin.mockResolvedValue('sr_token')
  mockCreateOrder.mockResolvedValue({ shiprocketOrderId: 555, shipmentId: 999 })
  mockAssignAwb.mockResolvedValue({ awbCode: 'AWB123', courierName: 'Delhivery' })
})

describe('createShiprocketShipment', () => {
  it("logs in with the tenant's own credentials and returns the shipment", async () => {
    const result = await createShiprocketShipment('t1', VALID_INPUT)

    expect(result).toEqual({ awbCode: 'AWB123', courierName: 'Delhivery', shipmentId: 999, shiprocketOrderId: 555 })
    expect(mockGetCredential).toHaveBeenCalledWith('t1')
    expect(mockLogin).toHaveBeenCalledWith('shop@example.com', 'pw')
  })

  it("ships from the tenant's own pickup location", async () => {
    await createShiprocketShipment('t1', VALID_INPUT)

    expect(mockCreateOrder).toHaveBeenCalledWith('sr_token', 'Chennai Store', VALID_INPUT)
    expect(mockAssignAwb).toHaveBeenCalledWith('sr_token', 999)
  })

  it('logs in on every call rather than caching a token across shipments', async () => {
    // The old platform-level singleton cached at module scope, which was unreliable across
    // serverless instances and would leak one tenant's token to another here.
    await createShiprocketShipment('t1', VALID_INPUT)
    await createShiprocketShipment('t1', VALID_INPUT)

    expect(mockLogin).toHaveBeenCalledTimes(2)
  })

  it('refuses when the store has no connected Shiprocket account', async () => {
    mockGetCredential.mockResolvedValue(null)

    await expect(createShiprocketShipment('t1', VALID_INPUT)).rejects.toThrow(
      'No Shiprocket account is connected for this store.'
    )
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('refuses when no pickup location is configured', async () => {
    mockGetConfig.mockResolvedValue({ mode: 'connected', pickupLocation: null })

    await expect(createShiprocketShipment('t1', VALID_INPUT)).rejects.toThrow(
      'No Shiprocket pickup location is configured for this store.'
    )
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('marks the credential stale and returns a reconnect message on an actual 401/403', async () => {
    mockLogin.mockRejectedValue(new MockShiprocketLoginError(403, 'invalid'))

    await expect(createShiprocketShipment('t1', VALID_INPUT)).rejects.toThrow(
      'Your Shiprocket account could not be authenticated — reconnect it in Settings → Shipping.'
    )
    expect(mockMarkStale).toHaveBeenCalledWith('t1', 'Shiprocket login failed (403): invalid')
    expect(mockCreateOrder).not.toHaveBeenCalled()
  })

  it('does not leak raw Shiprocket text on a login failure', async () => {
    // shipViaShiprocketAction returns err.message verbatim to the tenant's screen.
    mockLogin.mockRejectedValue(new MockShiprocketLoginError(403, 'invalid'))

    await expect(createShiprocketShipment('t1', VALID_INPUT)).rejects.not.toThrow(/403/)
  })

  it('does not mark the credential stale on a transient failure (5xx/rate limit/network)', async () => {
    // A working credential must not be flipped to "needs reconnect" by an upstream hiccup —
    // that's the same class of bug as the misleading "wrong password" message on connect.
    mockLogin.mockRejectedValue(new MockShiprocketLoginError(429, 'rate limited'))

    await expect(createShiprocketShipment('t1', VALID_INPUT)).rejects.toThrow(
      'Shiprocket could not be reached right now — try shipping this order again shortly.'
    )
    expect(mockMarkStale).not.toHaveBeenCalled()
    expect(mockCreateOrder).not.toHaveBeenCalled()
  })

  it('still surfaces order-creation failures verbatim', async () => {
    mockCreateOrder.mockRejectedValue(
      new Error('Shiprocket order creation failed (422): bad pincode')
    )

    await expect(createShiprocketShipment('t1', VALID_INPUT)).rejects.toThrow(
      'Shiprocket order creation failed (422): bad pincode'
    )
    expect(mockMarkStale).not.toHaveBeenCalled()
  })
})

describe('getDeliveryEstimate', () => {
  /**
   * getDeliveryEstimate keeps module-level token and serviceability caches, so each test
   * needs a fresh module instance — otherwise one test's cached token silently satisfies the
   * next test's "did it log in?" assertion.
   */
  async function freshModule() {
    vi.resetModules()
    return import('./shiprocket')
  }

  beforeEach(() => {
    mockGetConfig.mockResolvedValue({
      mode: 'connected',
      pickupLocation: 'Chennai Store',
      pickupPincode: '600001',
      pickupPincodeCheckedAt: '2026-08-22T11:00:00.000Z',
    })
    mockCheckServiceability.mockResolvedValue({
      serviceable: true,
      etaDays: 4,
      rate: 72.5,
      codAvailable: true,
    })
    mockGetPickupLocations.mockResolvedValue([
      { id: 7, nickname: 'Chennai Store', pincode: '600001' },
    ])
  })

  it("quotes the shopper's pincode from the tenant's cached pickup pincode", async () => {
    const { getDeliveryEstimate } = await freshModule()

    expect(await getDeliveryEstimate('t1', { pincode: '560001', weightKg: 1.5 })).toEqual({
      serviceable: true,
      etaDays: 4,
      rate: 72.5,
      codAvailable: true,
    })
    expect(mockCheckServiceability).toHaveBeenCalledWith('sr_token', {
      pickupPincode: '600001',
      deliveryPincode: '560001',
      weightKg: 1.5,
      codEnabled: false,
    })
  })

  it('requests the COD-inclusive rate only when the caller asks for it', async () => {
    // Shiprocket loads its own COD collection charge into `rate` when cod=1 is requested —
    // that must never leak into a quote nobody asked to pay COD for.
    const { getDeliveryEstimate } = await freshModule()

    await getDeliveryEstimate('t1', { pincode: '560001', weightKg: 1.5, cod: true })

    expect(mockCheckServiceability).toHaveBeenCalledWith(
      'sr_token',
      expect.objectContaining({ codEnabled: true })
    )
  })

  it('caches the prepaid and COD quotes separately for the same pincode and weight', async () => {
    const { getDeliveryEstimate } = await freshModule()

    await getDeliveryEstimate('t1', { pincode: '560001', weightKg: 1.5, cod: false })
    await getDeliveryEstimate('t1', { pincode: '560001', weightKg: 1.5, cod: true })

    expect(mockCheckServiceability).toHaveBeenCalledTimes(2)
  })

  it('reuses a cached token instead of logging in again on the next pincode', async () => {
    // This runs on every pincode a shopper types, so a fresh login per keystroke would both
    // be slow and get the tenant's account rate-limited by Shiprocket.
    const { getDeliveryEstimate } = await freshModule()

    await getDeliveryEstimate('t1', { pincode: '560001', weightKg: 1.5 })
    await getDeliveryEstimate('t1', { pincode: '110001', weightKg: 1.5 })

    expect(mockLogin).toHaveBeenCalledTimes(1)
  })

  it('logs in separately for each tenant rather than sharing one token', async () => {
    const { getDeliveryEstimate } = await freshModule()

    await getDeliveryEstimate('t1', { pincode: '560001', weightKg: 1.5 })
    await getDeliveryEstimate('t2', { pincode: '560001', weightKg: 1.5 })

    expect(mockLogin).toHaveBeenCalledTimes(2)
  })

  it('does not re-check serviceability for the same tenant, pincode and weight', async () => {
    const { getDeliveryEstimate } = await freshModule()

    await getDeliveryEstimate('t1', { pincode: '560001', weightKg: 1.5 })
    await getDeliveryEstimate('t1', { pincode: '560001', weightKg: 1.5 })

    expect(mockCheckServiceability).toHaveBeenCalledTimes(1)
  })

  it('shares one cache entry across near-identical cart weights', async () => {
    // Weight is a sum of per-product decimals, so two carts differing by grams would
    // otherwise each cost a Shiprocket round-trip for the same answer.
    const { getDeliveryEstimate } = await freshModule()

    await getDeliveryEstimate('t1', { pincode: '560001', weightKg: 1.52 })
    await getDeliveryEstimate('t1', { pincode: '560001', weightKg: 1.54 })

    expect(mockCheckServiceability).toHaveBeenCalledTimes(1)
  })

  it('checks again for a different delivery pincode', async () => {
    const { getDeliveryEstimate } = await freshModule()

    await getDeliveryEstimate('t1', { pincode: '560001', weightKg: 1.5 })
    await getDeliveryEstimate('t1', { pincode: '110001', weightKg: 1.5 })

    expect(mockCheckServiceability).toHaveBeenCalledTimes(2)
  })

  it('checks again for a materially different weight', async () => {
    const { getDeliveryEstimate } = await freshModule()

    await getDeliveryEstimate('t1', { pincode: '560001', weightKg: 1.5 })
    await getDeliveryEstimate('t1', { pincode: '560001', weightKg: 4 })

    expect(mockCheckServiceability).toHaveBeenCalledTimes(2)
  })

  it('resolves the pickup pincode from the nickname when none is cached yet', async () => {
    mockGetConfig.mockResolvedValue({
      mode: 'connected',
      pickupLocation: 'Chennai Store',
      pickupPincode: null,
      pickupPincodeCheckedAt: null,
    })
    const { getDeliveryEstimate } = await freshModule()

    await getDeliveryEstimate('t1', { pincode: '560001', weightKg: 1.5 })

    expect(mockGetPickupLocations).toHaveBeenCalledWith('sr_token')
    expect(mockCheckServiceability).toHaveBeenCalledWith(
      'sr_token',
      expect.objectContaining({ pickupPincode: '600001' })
    )
  })

  it('persists a freshly resolved pickup pincode so the next shopper skips the lookup', async () => {
    mockGetConfig.mockResolvedValue({
      mode: 'connected',
      pickupLocation: 'Chennai Store',
      pickupPincode: null,
    })
    const { getDeliveryEstimate } = await freshModule()

    await getDeliveryEstimate('t1', { pincode: '560001', weightKg: 1.5 })

    expect(mockSavePickupPincode).toHaveBeenCalledWith('t1', '600001')
  })

  it('matches the pickup nickname ignoring case and surrounding whitespace', async () => {
    // The nickname is typed by hand in Settings and again in Shiprocket's dashboard, so an
    // exact match would strand tenants whose two spellings differ only in case.
    mockGetConfig.mockResolvedValue({ pickupLocation: '  chennai store ', pickupPincode: null })
    const { getDeliveryEstimate } = await freshModule()

    await getDeliveryEstimate('t1', { pincode: '560001', weightKg: 1.5 })

    expect(mockSavePickupPincode).toHaveBeenCalledWith('t1', '600001')
  })

  it('does not look up pickup locations when one is already cached', async () => {
    const { getDeliveryEstimate } = await freshModule()

    await getDeliveryEstimate('t1', { pincode: '560001', weightKg: 1.5 })

    expect(mockGetPickupLocations).not.toHaveBeenCalled()
    expect(mockSavePickupPincode).not.toHaveBeenCalled()
  })

  it('reports an unserviceable pincode as an answer, not an error', async () => {
    mockCheckServiceability.mockResolvedValue({ serviceable: false })
    const { getDeliveryEstimate } = await freshModule()

    expect(await getDeliveryEstimate('t1', { pincode: '999999', weightKg: 1.5 })).toEqual({
      serviceable: false,
    })
  })

  it('returns an error when the store has no Shiprocket account connected', async () => {
    mockGetCredential.mockResolvedValue(null)
    const { getDeliveryEstimate } = await freshModule()

    const result = await getDeliveryEstimate('t1', { pincode: '560001', weightKg: 1.5 })

    expect(result).toEqual({ error: expect.any(String) })
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('returns an error when the store has no pickup location configured', async () => {
    mockGetConfig.mockResolvedValue({ pickupLocation: null, pickupPincode: null })
    const { getDeliveryEstimate } = await freshModule()

    expect(await getDeliveryEstimate('t1', { pincode: '560001', weightKg: 1.5 })).toEqual({
      error: expect.any(String),
    })
  })

  it('returns an error when Shiprocket has no pickup location under that nickname', async () => {
    mockGetConfig.mockResolvedValue({ pickupLocation: 'Typo Store', pickupPincode: null })
    const { getDeliveryEstimate } = await freshModule()

    const result = await getDeliveryEstimate('t1', { pincode: '560001', weightKg: 1.5 })

    expect(result).toEqual({ error: expect.any(String) })
    expect(mockSavePickupPincode).not.toHaveBeenCalled()
  })

  it('returns an error rather than throwing when Shiprocket is unreachable', async () => {
    // A2 falls back to the flat shipping fee on an error — a throw here would take the whole
    // checkout page down instead.
    mockCheckServiceability.mockRejectedValue(new Error('fetch failed'))
    const { getDeliveryEstimate } = await freshModule()

    expect(await getDeliveryEstimate('t1', { pincode: '560001', weightKg: 1.5 })).toEqual({
      error: expect.any(String),
    })
  })

  it('returns an error rather than throwing when the login fails', async () => {
    mockLogin.mockRejectedValue(new MockShiprocketLoginError(403, 'invalid'))
    const { getDeliveryEstimate } = await freshModule()

    expect(await getDeliveryEstimate('t1', { pincode: '560001', weightKg: 1.5 })).toEqual({
      error: expect.any(String),
    })
  })

  it('does not leak raw Shiprocket text into the message a shopper would see', async () => {
    mockCheckServiceability.mockRejectedValue(
      new Error('Shiprocket serviceability check failed (500): upstream error')
    )
    const { getDeliveryEstimate } = await freshModule()

    const result = await getDeliveryEstimate('t1', { pincode: '560001', weightKg: 1.5 })

    expect('error' in result && result.error).not.toMatch(/500/)
  })

  it('does not cache a failed check, so a retry can still succeed', async () => {
    mockCheckServiceability.mockRejectedValueOnce(new Error('fetch failed'))
    const { getDeliveryEstimate } = await freshModule()

    await getDeliveryEstimate('t1', { pincode: '560001', weightKg: 1.5 })
    const retry = await getDeliveryEstimate('t1', { pincode: '560001', weightKg: 1.5 })

    expect(retry).toMatchObject({ serviceable: true })
  })
})
