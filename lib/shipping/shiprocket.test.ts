import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockLogin, mockCreateOrder, mockAssignAwb, mockGetCredential, mockGetConfig, mockMarkStale, MockShiprocketLoginError } =
  vi.hoisted(() => {
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
      mockGetCredential: vi.fn(),
      mockGetConfig: vi.fn(),
      mockMarkStale: vi.fn(),
      MockShiprocketLoginError,
    }
  })

vi.mock('./shiprocket-client', () => ({
  shiprocketLogin: mockLogin,
  createShiprocketOrder: mockCreateOrder,
  assignShiprocketAwb: mockAssignAwb,
  ShiprocketLoginError: MockShiprocketLoginError,
}))
vi.mock('./shiprocket-account', () => ({
  getDecryptedShiprocketCredential: mockGetCredential,
  getShippingConfig: mockGetConfig,
  markShiprocketCredentialStale: mockMarkStale,
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
  mockCreateOrder.mockResolvedValue({ shipmentId: 999 })
  mockAssignAwb.mockResolvedValue({ awbCode: 'AWB123', courierName: 'Delhivery' })
})

describe('createShiprocketShipment', () => {
  it("logs in with the tenant's own credentials and returns the shipment", async () => {
    const result = await createShiprocketShipment('t1', VALID_INPUT)

    expect(result).toEqual({ awbCode: 'AWB123', courierName: 'Delhivery', shipmentId: 999 })
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
