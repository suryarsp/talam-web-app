import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  withTenant: vi.fn(async (tenantId: string, fn: (client: unknown) => Promise<unknown>) => {
    const mockProduct = {
      id: 'p1', name: 'Silk Saree', slug: 'silk-saree', price: '4500',
      images: ['url1'], categoryId: 'cat-1',
      category: { id: 'cat-1', name: 'Sarees', slug: 'sarees', sortOrder: 0 },
      reviews: [{ rating: 4 }, { rating: 5 }],
      sizes: ['S', 'M', 'L'], isActive: true, createdAt: new Date(),
    }
    const mockClient = {
      product: {
        findMany: vi.fn().mockResolvedValue([mockProduct]),
        findFirst: vi.fn().mockResolvedValue(mockProduct),
      },
      productCategory: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'cat-1', name: 'Sarees', slug: 'sarees', sortOrder: 0 },
        ]),
      },
    }
    return fn(mockClient)
  }),
}))

import { getProducts, getProductBySlug, getCategories } from './products'

describe('getProducts', () => {
  it('returns active products for a tenant', async () => {
    const products = await getProducts('tenant-1')
    expect(products).toHaveLength(1)
    expect(products[0].name).toBe('Silk Saree')
    expect(products[0]).toMatchObject({ reviewCount: 2, averageRating: 4.5, isNew: true })
  })
})

describe('getProductBySlug', () => {
  it('returns a product matching the slug', async () => {
    const product = await getProductBySlug('tenant-1', 'silk-saree')
    expect(product?.slug).toBe('silk-saree')
  })
})

describe('getCategories', () => {
  it('returns categories as objects with id and name', async () => {
    const cats = await getCategories('tenant-1')
    expect(cats).toHaveLength(1)
    expect(cats[0]).toMatchObject({ id: 'cat-1', name: 'Sarees', slug: 'sarees' })
  })
})
