import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockLogin, mockCreateOrder, mockAssignAwb, mockGetCredential, mockGetConfig, mockMarkStale } =
  vi.hoisted(() => ({
    mockLogin: vi.fn(),
    mockCreateOrder: vi.fn(),
    mockAssignAwb: vi.fn(),
    mockGetCredential: vi.fn(),
    mockGetConfig: vi.fn(),
    mockMarkStale: vi.fn(),
  }))

vi.mock('./shiprocket-client', () => ({
  shiprocketLogin: mockLogin,
  createShiprocketOrder: mockCreateOrder,
  assignShiprocketAwb: mockAssignAwb,
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

  it('marks the credential stale and returns a reconnect message when the login fails', async () => {
    mockLogin.mockRejectedValue(new Error('Shiprocket login failed (403): invalid'))

    await expect(createShiprocketShipment('t1', VALID_INPUT)).rejects.toThrow(
      'Your Shiprocket account could not be authenticated — reconnect it in Settings → Shipping.'
    )
    expect(mockMarkStale).toHaveBeenCalledWith('t1', 'Shiprocket login failed (403): invalid')
    expect(mockCreateOrder).not.toHaveBeenCalled()
  })

  it('does not leak raw Shiprocket text on a login failure', async () => {
    // shipViaShiprocketAction returns err.message verbatim to the tenant's screen.
    mockLogin.mockRejectedValue(new Error('Shiprocket login failed (403): invalid'))

    await expect(createShiprocketShipment('t1', VALID_INPUT)).rejects.not.toThrow(/403/)
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
