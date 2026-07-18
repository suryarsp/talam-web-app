import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequireOwnerTenant, mockFindMany, mockTransaction, mockCreate, mockCount } = vi.hoisted(() => ({
  mockRequireOwnerTenant: vi.fn(async () => ({ userId: 'u1', tenantId: 'tenant-1' })),
  mockFindMany: vi.fn(),
  mockTransaction: vi.fn(),
  mockCreate: vi.fn(),
  mockCount: vi.fn(),
}))

vi.mock('@/lib/admin-guard', () => ({ requireOwnerTenant: mockRequireOwnerTenant }))

vi.mock('@/lib/prisma', () => ({
  withTenant: vi.fn(async (_tenantId: string, fn: (client: unknown) => Promise<unknown>) =>
    fn({
      product: { findMany: mockFindMany, count: mockCount, updateMany: vi.fn() },
      storeAbout: { count: mockCount, updateMany: vi.fn() },
      productTag: { count: mockCount, updateMany: vi.fn() },
      publishLog: { create: mockCreate, findMany: vi.fn() },
      $transaction: mockTransaction,
    })
  ),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { publishChangesAction } from './actions'

describe('publishChangesAction', () => {
  beforeEach(() => {
    mockFindMany.mockReset()
    mockTransaction.mockReset()
    mockCreate.mockReset()
    mockCount.mockReset()
  })

  it('returns conflicts without publishing when a draft product has open orders', async () => {
    mockFindMany.mockResolvedValueOnce([
      { name: 'Silk Saree', _count: { orderItems: 2 } },
    ])

    const result = await publishChangesAction()

    expect(result.conflicts).toEqual([{ productName: 'Silk Saree', openOrderCount: 2 }])
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('publishes directly when there are no conflicts', async () => {
    mockFindMany.mockResolvedValueOnce([])
    mockTransaction.mockResolvedValueOnce([{ count: 3 }, { count: 0 }, { count: 1 }])

    const result = await publishChangesAction()

    expect(result.conflicts).toBeUndefined()
    expect(mockTransaction).toHaveBeenCalledTimes(1)
    expect(mockCreate).toHaveBeenCalledWith({
      data: { tenantId: 'tenant-1', itemCount: 4, summary: '3 products, 1 occasion' },
    })
  })

  it('force publishes even when conflicts exist, skipping the pre-check', async () => {
    mockTransaction.mockResolvedValueOnce([{ count: 1 }, { count: 0 }, { count: 0 }])

    const result = await publishChangesAction({ force: true })

    expect(mockFindMany).not.toHaveBeenCalled()
    expect(result.conflicts).toBeUndefined()
    expect(mockTransaction).toHaveBeenCalledTimes(1)
  })
})
