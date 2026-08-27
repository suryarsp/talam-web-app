import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  withTenant: vi.fn(async (tenantId: string, fn: (client: unknown) => Promise<unknown>) => {
    const mockProduct = {
      id: 'p1', name: 'Silk Saree', slug: 'silk-saree', price: '4500',
      images: ['url1'], categoryId: 'cat-1',
      category: { id: 'cat-1', name: 'Sarees', slug: 'sarees', sortOrder: 0 },
      reviews: [{ rating: 4 }, { rating: 5 }],
      sizes: ['S', 'M', 'L'], isActive: true, status: 'published', createdAt: new Date(),
    }
    const mockClient = {
      product: {
        findMany: vi.fn((args: { where?: { status?: string } }) =>
          Promise.resolve(args?.where?.status === 'published' ? [mockProduct] : [mockProduct])
        ),
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

import {
  getProducts,
  getProductBySlug,
  getCategories,
  getCategoriesWithImage,
  getActiveDepartments,
  listProductsForAdmin,
} from './products'

describe('getProducts', () => {
  it('returns active products for a tenant', async () => {
    const products = await getProducts('tenant-1')
    expect(products).toHaveLength(1)
    expect(products[0].name).toBe('Silk Saree')
    expect(products[0]).toMatchObject({ reviewCount: 2, averageRating: 4.5, isNew: true })
  })

  it('filters to published status', async () => {
    const { withTenant } = await import('@/lib/prisma')
    await getProducts('tenant-1')
    const mockCall = vi.mocked(withTenant).mock.calls[0][1]
    let capturedWhere: { status?: string } | undefined
    await mockCall({
      product: {
        findMany: vi.fn((args: { where?: { status?: string } }) => {
          capturedWhere = args?.where
          return Promise.resolve([])
        }),
      },
      productCategory: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as Parameters<typeof mockCall>[0])
    expect(capturedWhere?.status).toBe('published')
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

describe('getCategoriesWithImage', () => {
  it('includes a category with a published product image', async () => {
    const { withTenant } = await import('@/lib/prisma')
    vi.mocked(withTenant).mockImplementationOnce(async (_tenantId, fn) =>
      fn({
        productCategory: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: 'cat-1',
              name: 'Sarees',
              slug: 'sarees',
              department: null,
              products: [{ images: ['saree-1.jpg'] }],
            },
          ]),
        },
      } as never)
    )
    const cats = await getCategoriesWithImage('tenant-1')
    expect(cats).toHaveLength(1)
    expect(cats[0]).toMatchObject({ id: 'cat-1', name: 'Sarees', slug: 'sarees', image: 'saree-1.jpg' })
  })

  it('excludes a category with no qualifying product image', async () => {
    const { withTenant } = await import('@/lib/prisma')
    vi.mocked(withTenant).mockImplementationOnce(async (_tenantId, fn) =>
      fn({
        productCategory: {
          findMany: vi.fn().mockResolvedValue([
            { id: 'cat-2', name: 'Lehengas', slug: 'lehengas', department: null, products: [] },
          ]),
        },
      } as never)
    )
    const cats = await getCategoriesWithImage('tenant-1')
    expect(cats).toHaveLength(0)
  })
})

describe('listProductsForAdmin', () => {
  async function listWith(weight: unknown) {
    const { withTenant } = await import('@/lib/prisma')
    vi.mocked(withTenant).mockImplementationOnce(async (_tenantId, fn) =>
      fn({
        product: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: 'p1', name: 'Silk Saree', slug: 'silk-saree', description: null,
              price: '4500', comparePrice: null, categoryId: 'cat-1', category: { name: 'Sarees' },
              sizes: ['M'], unit: 'piece', images: [], stockBySize: { M: 5 },
              specifications: [], weight, isActive: true, tagAssignments: [],
            },
          ]),
        },
      } as never)
    )
    return listProductsForAdmin('tenant-1')
  }

  it('exposes the shipping weight as a number the form can edit', async () => {
    // Prisma hands back Decimal columns as strings, which a number input would reject.
    expect((await listWith('0.750'))[0].weight).toBe(0.75)
  })

  it('leaves an unweighed product null rather than defaulting it to zero', async () => {
    expect((await listWith(null))[0].weight).toBeNull()
  })
})

describe('getActiveDepartments', () => {
  it('returns the distinct departments of published products', async () => {
    const { withTenant } = await import('@/lib/prisma')
    vi.mocked(withTenant).mockImplementationOnce(async (_tenantId, fn) =>
      fn({
        product: {
          findMany: vi.fn().mockResolvedValue([
            { category: { department: 'women' } },
            { category: { department: 'men' } },
          ]),
        },
      } as never)
    )
    const departments = await getActiveDepartments('tenant-1')
    expect(departments).toEqual(['women', 'men'])
  })

  it('dedupes departments', async () => {
    const { withTenant } = await import('@/lib/prisma')
    vi.mocked(withTenant).mockImplementationOnce(async (_tenantId, fn) =>
      fn({
        product: {
          findMany: vi.fn().mockResolvedValue([
            { category: { department: 'women' } },
            { category: { department: 'women' } },
          ]),
        },
      } as never)
    )
    const departments = await getActiveDepartments('tenant-1')
    expect(departments).toEqual(['women'])
  })
})
