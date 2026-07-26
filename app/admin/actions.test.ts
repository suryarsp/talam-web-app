import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequireOwnerTenant, mockProductFindMany, mockStoreAboutFindFirst, mockProductTagFindMany, mockTransaction, mockCreate } =
  vi.hoisted(() => ({
    mockRequireOwnerTenant: vi.fn(async () => ({ userId: 'u1', tenantId: 'tenant-1' })),
    mockProductFindMany: vi.fn(),
    mockStoreAboutFindFirst: vi.fn(),
    mockProductTagFindMany: vi.fn(),
    mockTransaction: vi.fn(),
    mockCreate: vi.fn(),
  }))

vi.mock('@/lib/admin-guard', () => ({ requireOwnerTenant: mockRequireOwnerTenant }))

vi.mock('@/lib/prisma', () => ({
  withTenant: vi.fn(async (_tenantId: string, fn: (client: unknown) => Promise<unknown>) =>
    fn({
      product: { findMany: mockProductFindMany, updateMany: vi.fn() },
      storeAbout: { findFirst: mockStoreAboutFindFirst, updateMany: vi.fn() },
      productTag: { findMany: mockProductTagFindMany, updateMany: vi.fn() },
      publishLog: { create: mockCreate },
      $transaction: mockTransaction,
    })
  ),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { publishChangesAction } from './actions'

describe('publishChangesAction', () => {
  beforeEach(() => {
    mockProductFindMany.mockReset()
    mockStoreAboutFindFirst.mockReset()
    mockProductTagFindMany.mockReset()
    mockTransaction.mockReset()
    mockCreate.mockReset()
  })

  it('returns conflicts without publishing when a draft product has open orders', async () => {
    mockProductFindMany.mockResolvedValueOnce([
      { name: 'Silk Saree', _count: { orderItems: 2 } },
    ])

    const result = await publishChangesAction()

    expect(result.conflicts).toEqual([{ productName: 'Silk Saree', openOrderCount: 2 }])
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('publishes directly and captures item names when there are no conflicts', async () => {
    mockProductFindMany
      .mockResolvedValueOnce([]) // conflict check: no open-order conflicts
      .mockResolvedValueOnce([
        { name: 'Cotton Kurta Set' },
        { name: 'Silk Banarasi Saree' },
        { name: 'Anarkali Suit' },
      ]) // draft name capture
    mockStoreAboutFindFirst.mockResolvedValueOnce(null)
    mockProductTagFindMany.mockResolvedValueOnce([{ name: 'Diwali Sale' }])
    mockTransaction.mockResolvedValueOnce([{ count: 3 }, { count: 0 }, { count: 1 }])

    const result = await publishChangesAction()

    expect(result.conflicts).toBeUndefined()
    expect(mockTransaction).toHaveBeenCalledTimes(1)
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        itemCount: 4,
        summary: '3 products, 1 occasion',
        items: [
          { type: 'product', name: 'Cotton Kurta Set' },
          { type: 'product', name: 'Silk Banarasi Saree' },
          { type: 'product', name: 'Anarkali Suit' },
          { type: 'occasion', name: 'Diwali Sale' },
        ],
      },
    })
  })

  it('includes store info in captured items when StoreAbout has a draft', async () => {
    mockProductFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([])
    mockStoreAboutFindFirst.mockResolvedValueOnce({ id: 'about-1' })
    mockProductTagFindMany.mockResolvedValueOnce([])
    mockTransaction.mockResolvedValueOnce([{ count: 0 }, { count: 1 }, { count: 0 }])

    await publishChangesAction()

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        itemCount: 1,
        summary: 'store info',
        items: [{ type: 'store_info', name: 'Store info' }],
      },
    })
  })

  it('force publishes even when conflicts exist, skipping only the pre-check', async () => {
    mockProductFindMany.mockResolvedValueOnce([]) // draft name capture only — no conflict-check call
    mockStoreAboutFindFirst.mockResolvedValueOnce(null)
    mockProductTagFindMany.mockResolvedValueOnce([])
    mockTransaction.mockResolvedValueOnce([{ count: 1 }, { count: 0 }, { count: 0 }])

    const result = await publishChangesAction({ force: true })

    expect(result.conflicts).toBeUndefined()
    expect(mockTransaction).toHaveBeenCalledTimes(1)
    expect(mockProductFindMany).toHaveBeenCalledTimes(1)
    expect(mockProductFindMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', status: 'draft' },
      select: { name: true },
    })
  })
})
