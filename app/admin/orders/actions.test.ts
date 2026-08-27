import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequireOwnerTenant, mockListOrders, mockUpdateStatus, mockDb, mockCreateShipment, mockGetShippingConfig } = vi.hoisted(() => ({
  mockRequireOwnerTenant: vi.fn(async () => ({ userId: 'u1', tenantId: 't1' })),
  mockListOrders: vi.fn(),
  mockUpdateStatus: vi.fn(),
  mockDb: { order: { findFirst: vi.fn(), update: vi.fn() } },
  mockCreateShipment: vi.fn(),
  mockGetShippingConfig: vi.fn(),
}))

vi.mock('@/lib/admin-guard', () => ({ requireOwnerTenant: mockRequireOwnerTenant }))
vi.mock('@/lib/data/orders', () => ({ listOrdersForAdmin: mockListOrders, updateOrderStatus: mockUpdateStatus }))
vi.mock('@/lib/prisma', () => ({
  withTenant: (_tenantId: string, fn: (db: typeof mockDb) => unknown) => fn(mockDb),
}))
vi.mock('@/lib/shipping/shiprocket', () => ({ createShiprocketShipment: mockCreateShipment }))
vi.mock('@/lib/shipping/shiprocket-account', () => ({ getShippingConfig: mockGetShippingConfig }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { getOrdersAction, updateOrderStatusAction, markOrderPaidAction, shipViaShiprocketAction } from './actions'

beforeEach(() => {
  vi.clearAllMocks()
  // Most tests exercise a store that has already connected its own Shiprocket account.
  mockGetShippingConfig.mockResolvedValue({ mode: 'connected', pickupLocation: 'Chennai Store' })
})

describe('getOrdersAction', () => {
  it('delegates to listOrdersForAdmin', async () => {
    mockListOrders.mockResolvedValue([{ id: 'o1' }])
    expect(await getOrdersAction()).toEqual([{ id: 'o1' }])
    expect(mockListOrders).toHaveBeenCalledWith('t1')
  })
})

describe('updateOrderStatusAction', () => {
  it('calls updateOrderStatus and returns empty on success', async () => {
    mockUpdateStatus.mockResolvedValue(undefined)
    const result = await updateOrderStatusAction('o1', 'shipped', 'TRACK123')
    expect(result).toEqual({})
    expect(mockUpdateStatus).toHaveBeenCalledWith('t1', 'o1', 'shipped', 'TRACK123', undefined)
  })
})

describe('markOrderPaidAction', () => {
  it('marks a pending upi_manual order as paid', async () => {
    mockDb.order.findFirst.mockResolvedValue({ paymentProvider: 'upi_manual', paymentStatus: 'pending' })
    const result = await markOrderPaidAction('o1')
    expect(result).toEqual({})
    expect(mockDb.order.update).toHaveBeenCalledWith({ where: { id: 'o1' }, data: { paymentStatus: 'paid' } })
  })

  it('marks a pending cod order as paid', async () => {
    mockDb.order.findFirst.mockResolvedValue({ paymentProvider: 'cod', paymentStatus: 'pending' })
    const result = await markOrderPaidAction('o1')
    expect(result).toEqual({})
    expect(mockDb.order.update).toHaveBeenCalled()
  })

  it('refuses a razorpay order — that is confirmed by webhook only', async () => {
    mockDb.order.findFirst.mockResolvedValue({ paymentProvider: 'razorpay', paymentStatus: 'pending' })
    const result = await markOrderPaidAction('o1')
    expect(result.error).toBeTruthy()
    expect(mockDb.order.update).not.toHaveBeenCalled()
  })

  it('refuses an order that is not pending payment', async () => {
    mockDb.order.findFirst.mockResolvedValue({ paymentProvider: 'upi_manual', paymentStatus: 'paid' })
    const result = await markOrderPaidAction('o1')
    expect(result.error).toBeTruthy()
    expect(mockDb.order.update).not.toHaveBeenCalled()
  })

  it('returns an error when the order does not exist', async () => {
    mockDb.order.findFirst.mockResolvedValue(null)
    const result = await markOrderPaidAction('missing')
    expect(result.error).toBeTruthy()
    expect(mockDb.order.update).not.toHaveBeenCalled()
  })
})

describe('shipViaShiprocketAction', () => {
  const baseOrder = {
    id: 'o1',
    status: 'confirmed',
    createdAt: new Date('2026-08-19T10:00:00Z'),
    total: '1200.00',
    paymentProvider: 'upi_manual',
    shippingAddress: { name: 'Asha Rao', line1: '12 MG Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560001', phone: '9876543210' },
    customer: { email: 'asha@example.com' },
    items: [{ productId: 'p1', productName: 'Silk Saree', quantity: 1, unitPrice: '1200.00' }],
  }

  it('creates a shipment and moves the order to shipped with the real AWB', async () => {
    mockDb.order.findFirst.mockResolvedValue(baseOrder)
    mockCreateShipment.mockResolvedValue({ awbCode: 'AWB123', courierName: 'Delhivery', shipmentId: 999, shiprocketOrderId: 555 })

    const result = await shipViaShiprocketAction('o1')

    expect(result).toEqual({ trackingId: 'AWB123' })
    expect(mockCreateShipment).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({
        orderId: 'o1',
        paymentMethod: 'Prepaid',
        subTotal: 1200,
        billing: expect.objectContaining({ name: 'Asha Rao', pincode: '560001', email: 'asha@example.com' }),
        items: [{ name: 'Silk Saree', sku: 'p1', units: 1, sellingPrice: 1200 }],
      })
    )
    expect(mockUpdateStatus).toHaveBeenCalledWith('t1', 'o1', 'shipped', 'AWB123', undefined, {
      shiprocketOrderId: '555',
      shipmentId: '999',
      courierName: 'Delhivery',
    })
  })

  it('uses COD as the payment method for cash-on-delivery orders', async () => {
    mockDb.order.findFirst.mockResolvedValue({ ...baseOrder, paymentProvider: 'cod' })
    mockCreateShipment.mockResolvedValue({ awbCode: 'AWB1', courierName: 'X', shipmentId: 1 })
    await shipViaShiprocketAction('o1')
    expect(mockCreateShipment).toHaveBeenCalledWith('t1', expect.objectContaining({ paymentMethod: 'COD' }))
  })

  it('refuses to ship when the store has not connected its own Shiprocket account', async () => {
    mockGetShippingConfig.mockResolvedValue({ mode: 'platform', pickupLocation: null })

    const result = await shipViaShiprocketAction('o1')

    expect(result.error).toBe('Connect your own Shiprocket account in Settings → Shipping before shipping orders.')
    expect(mockCreateShipment).not.toHaveBeenCalled()
    // Checked before the order is loaded, so the tenant gets the actionable error first.
    expect(mockDb.order.findFirst).not.toHaveBeenCalled()
  })

  it('refuses to ship while a Talam-assisted setup is still pending', async () => {
    mockGetShippingConfig.mockResolvedValue({ mode: 'assist_requested', pickupLocation: null })

    const result = await shipViaShiprocketAction('o1')

    expect(result.error).toBeTruthy()
    expect(mockCreateShipment).not.toHaveBeenCalled()
  })

  it('refuses an order that is not confirmed', async () => {
    mockDb.order.findFirst.mockResolvedValue({ ...baseOrder, status: 'pending' })
    const result = await shipViaShiprocketAction('o1')
    expect(result.error).toBeTruthy()
    expect(mockCreateShipment).not.toHaveBeenCalled()
  })

  it('refuses an order with an incomplete shipping address', async () => {
    mockDb.order.findFirst.mockResolvedValue({ ...baseOrder, shippingAddress: { name: 'Asha Rao' } })
    const result = await shipViaShiprocketAction('o1')
    expect(result.error).toBeTruthy()
    expect(mockCreateShipment).not.toHaveBeenCalled()
  })

  it('returns an error when the order does not exist', async () => {
    mockDb.order.findFirst.mockResolvedValue(null)
    const result = await shipViaShiprocketAction('missing')
    expect(result.error).toBeTruthy()
  })

  it('surfaces the Shiprocket error message without updating order status', async () => {
    mockDb.order.findFirst.mockResolvedValue(baseOrder)
    mockCreateShipment.mockRejectedValue(new Error('Shiprocket order creation failed (422): bad pincode'))
    const result = await shipViaShiprocketAction('o1')
    expect(result.error).toBe('Shiprocket order creation failed (422): bad pincode')
    expect(mockUpdateStatus).not.toHaveBeenCalled()
  })
})
