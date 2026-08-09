import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequireOwnerTenant, mockListOrders, mockUpdateStatus, mockDb } = vi.hoisted(() => ({
  mockRequireOwnerTenant: vi.fn(async () => ({ userId: 'u1', tenantId: 't1' })),
  mockListOrders: vi.fn(),
  mockUpdateStatus: vi.fn(),
  mockDb: { order: { findFirst: vi.fn(), update: vi.fn() } },
}))

vi.mock('@/lib/admin-guard', () => ({ requireOwnerTenant: mockRequireOwnerTenant }))
vi.mock('@/lib/data/orders', () => ({ listOrdersForAdmin: mockListOrders, updateOrderStatus: mockUpdateStatus }))
vi.mock('@/lib/prisma', () => ({
  withTenant: (_tenantId: string, fn: (db: typeof mockDb) => unknown) => fn(mockDb),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { getOrdersAction, updateOrderStatusAction, markOrderPaidAction } from './actions'

beforeEach(() => vi.clearAllMocks())

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
