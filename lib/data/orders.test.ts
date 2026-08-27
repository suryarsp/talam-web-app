import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockOrderFindFirst,
  mockOrderUpdate,
  mockStatusEventCreate,
  mockHeaders,
  mockSendOrderShippedEmail,
  mockSendOrderDeliveredEmail,
  mockSendOrderCancelledEmail,
  mockSendOrderReturnedEmail,
} = vi.hoisted(() => ({
  mockOrderFindFirst: vi.fn(),
  mockOrderUpdate: vi.fn(),
  mockStatusEventCreate: vi.fn(),
  mockHeaders: vi.fn(),
  mockSendOrderShippedEmail: vi.fn(),
  mockSendOrderDeliveredEmail: vi.fn(),
  mockSendOrderCancelledEmail: vi.fn(),
  mockSendOrderReturnedEmail: vi.fn(),
}))

vi.mock('next/headers', () => ({ headers: mockHeaders }))
vi.mock('@/lib/resend', () => ({
  sendOrderShippedEmail: mockSendOrderShippedEmail,
  sendOrderDeliveredEmail: mockSendOrderDeliveredEmail,
  sendOrderCancelledEmail: mockSendOrderCancelledEmail,
  sendOrderReturnedEmail: mockSendOrderReturnedEmail,
}))

const db = {
  order: { findFirst: mockOrderFindFirst, update: mockOrderUpdate },
  orderStatusEvent: { create: mockStatusEventCreate },
}

vi.mock('@/lib/prisma', () => ({
  withTenant: vi.fn(async (_tenantId: string, fn: (db: unknown) => unknown) => fn(db)),
}))

import { updateOrderStatus } from './orders'

const TENANT_ID = 'tenant-1'
const ORDER_ID = 'order-1'

function orderWithCustomer(status: string, email: string | null = 'priya@example.com') {
  return {
    id: ORDER_ID,
    tenantId: TENANT_ID,
    status,
    customer: { email },
    tenant: { name: 'Meena Silks', slug: 'meena-silks' },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockHeaders.mockResolvedValue(new Headers({ host: 'talam4shop.com' }))
  mockOrderUpdate.mockResolvedValue(undefined)
  mockStatusEventCreate.mockResolvedValue(undefined)
})

describe('updateOrderStatus', () => {
  it('rejects an invalid transition without writing or emailing anything', async () => {
    mockOrderFindFirst.mockResolvedValueOnce({ status: 'delivered' })

    await expect(updateOrderStatus(TENANT_ID, ORDER_ID, 'shipped')).rejects.toThrow()
    expect(mockOrderUpdate).not.toHaveBeenCalled()
    expect(mockSendOrderShippedEmail).not.toHaveBeenCalled()
  })

  it('emails the customer when an order ships, with the tracking id', async () => {
    mockOrderFindFirst
      .mockResolvedValueOnce({ status: 'confirmed' }) // transition guard read
      .mockResolvedValueOnce(orderWithCustomer('shipped')) // post-write lookup for the email

    await updateOrderStatus(TENANT_ID, ORDER_ID, 'shipped', 'AWB123')

    expect(mockSendOrderShippedEmail).toHaveBeenCalledWith('priya@example.com', {
      storeName: 'Meena Silks',
      orderCode: expect.any(String),
      trackingId: 'AWB123',
      trackUrl: expect.stringContaining(`/orders/${ORDER_ID}`),
    })
  })

  it('does not email a shipped order with no tracking id (should not happen, but must not throw)', async () => {
    mockOrderFindFirst.mockResolvedValueOnce({ status: 'confirmed' }).mockResolvedValueOnce(orderWithCustomer('shipped'))

    await updateOrderStatus(TENANT_ID, ORDER_ID, 'shipped')

    expect(mockSendOrderShippedEmail).not.toHaveBeenCalled()
  })

  it('emails the customer when an order is delivered', async () => {
    mockOrderFindFirst.mockResolvedValueOnce({ status: 'shipped' }).mockResolvedValueOnce(orderWithCustomer('delivered'))

    await updateOrderStatus(TENANT_ID, ORDER_ID, 'delivered')

    expect(mockSendOrderDeliveredEmail).toHaveBeenCalledWith('priya@example.com', {
      storeName: 'Meena Silks',
      orderCode: expect.any(String),
      trackUrl: expect.stringContaining(`/orders/${ORDER_ID}`),
    })
  })

  it('emails the customer with the cancel reason when an order is cancelled', async () => {
    mockOrderFindFirst.mockResolvedValueOnce({ status: 'pending' }).mockResolvedValueOnce(orderWithCustomer('cancelled'))

    await updateOrderStatus(TENANT_ID, ORDER_ID, 'cancelled', undefined, 'Item out of stock')

    expect(mockSendOrderCancelledEmail).toHaveBeenCalledWith('priya@example.com', {
      storeName: 'Meena Silks',
      orderCode: expect.any(String),
      cancelReason: 'Item out of stock',
      storeUrl: expect.any(String),
    })
  })

  it('emails the customer when an order is marked returned', async () => {
    mockOrderFindFirst.mockResolvedValueOnce({ status: 'delivered' }).mockResolvedValueOnce(orderWithCustomer('returned'))

    await updateOrderStatus(TENANT_ID, ORDER_ID, 'returned')

    expect(mockSendOrderReturnedEmail).toHaveBeenCalledWith('priya@example.com', {
      storeName: 'Meena Silks',
      orderCode: expect.any(String),
      storeUrl: expect.any(String),
    })
  })

  it('does not email or throw when the order has no customer email on file', async () => {
    mockOrderFindFirst.mockResolvedValueOnce({ status: 'shipped' }).mockResolvedValueOnce(orderWithCustomer('delivered', null))

    await expect(updateOrderStatus(TENANT_ID, ORDER_ID, 'delivered')).resolves.toBeUndefined()
    expect(mockSendOrderDeliveredEmail).not.toHaveBeenCalled()
  })

  it('does not touch email sending for a transition nobody needs to hear about (confirmed)', async () => {
    mockOrderFindFirst.mockResolvedValueOnce({ status: 'pending' })

    await updateOrderStatus(TENANT_ID, ORDER_ID, 'confirmed')

    expect(mockSendOrderShippedEmail).not.toHaveBeenCalled()
    expect(mockSendOrderDeliveredEmail).not.toHaveBeenCalled()
    expect(mockSendOrderCancelledEmail).not.toHaveBeenCalled()
    expect(mockSendOrderReturnedEmail).not.toHaveBeenCalled()
    // Only the transition-guard read happens — no follow-up lookup for an email that never sends.
    expect(mockOrderFindFirst).toHaveBeenCalledTimes(1)
  })
})
