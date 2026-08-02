import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequireOwnerTenant, mockListOrders, mockUpdateStatus } = vi.hoisted(() => ({
  mockRequireOwnerTenant: vi.fn(async () => ({ userId: 'u1', tenantId: 't1' })),
  mockListOrders: vi.fn(),
  mockUpdateStatus: vi.fn(),
}))

vi.mock('@/lib/admin-guard', () => ({ requireOwnerTenant: mockRequireOwnerTenant }))
vi.mock('@/lib/data/orders', () => ({ listOrdersForAdmin: mockListOrders, updateOrderStatus: mockUpdateStatus }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { getOrdersAction, updateOrderStatusAction } from './actions'

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
    expect(mockUpdateStatus).toHaveBeenCalledWith('t1', 'o1', 'shipped', 'TRACK123')
  })
})
