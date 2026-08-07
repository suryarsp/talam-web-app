import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockUpdateMany, mockTagDeleteMany, mockPromoDeleteMany } = vi.hoisted(() => ({
  mockUpdateMany: vi.fn(),
  mockTagDeleteMany: vi.fn(),
  mockPromoDeleteMany: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  withTenant: vi.fn(async (_tenantId: string, fn: (client: unknown) => unknown) =>
    fn({
      product: { updateMany: mockUpdateMany },
      productTagAssignment: { deleteMany: mockTagDeleteMany },
      storePromotionProduct: { deleteMany: mockPromoDeleteMany },
    })
  ),
}))

import { softDeleteProducts, bulkSetProductsCategory, bulkSetProductsActive, resetProductsToDefault } from './products'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('softDeleteProducts', () => {
  it('sets deletedAt and clears tag/promotion assignments', async () => {
    await softDeleteProducts('tenant-1', ['p1', 'p2'])
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', id: { in: ['p1', 'p2'] } },
      data: { deletedAt: expect.any(Date) },
    })
    expect(mockTagDeleteMany).toHaveBeenCalledWith({ where: { tenantId: 'tenant-1', productId: { in: ['p1', 'p2'] } } })
    expect(mockPromoDeleteMany).toHaveBeenCalledWith({ where: { tenantId: 'tenant-1', productId: { in: ['p1', 'p2'] } } })
  })
})

describe('bulkSetProductsCategory', () => {
  it('updates categoryId for the given products', async () => {
    await bulkSetProductsCategory('tenant-1', ['p1'], 'cat-1')
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', id: { in: ['p1'] } },
      data: { categoryId: 'cat-1' },
    })
  })
})

describe('bulkSetProductsActive', () => {
  it('updates isActive for the given products', async () => {
    await bulkSetProductsActive('tenant-1', ['p1'], false)
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', id: { in: ['p1'] } },
      data: { isActive: false },
    })
  })
})

describe('resetProductsToDefault', () => {
  it('clears tag and promotion assignments', async () => {
    await resetProductsToDefault('tenant-1', ['p1', 'p2'])
    expect(mockTagDeleteMany).toHaveBeenCalledWith({ where: { tenantId: 'tenant-1', productId: { in: ['p1', 'p2'] } } })
    expect(mockPromoDeleteMany).toHaveBeenCalledWith({ where: { tenantId: 'tenant-1', productId: { in: ['p1', 'p2'] } } })
  })
})
