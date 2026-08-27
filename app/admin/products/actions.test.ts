import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/admin-guard', () => ({
  requireOwnerTenant: vi.fn().mockResolvedValue({ tenantId: 'tenant-1' }),
}))

vi.mock('@/lib/cloudinary', () => ({
  uploadImage: vi.fn().mockResolvedValue('https://res.cloudinary.com/test/product.png'),
}))

vi.mock('@/lib/data/products', () => ({
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  setProductActive: vi.fn(),
  softDeleteProducts: vi.fn(),
  bulkSetProductsCategory: vi.fn(),
  bulkSetProductsActive: vi.fn(),
  resetProductsToDefault: vi.fn(),
}))

vi.mock('@/lib/data/occasions', () => ({
  updateProductOccasions: vi.fn(),
}))

vi.mock('@/app/admin/occasions/actions', () => ({
  assignProductsToOccasionAction: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}))

vi.mock('@/lib/data/tenant', () => ({
  notifyIfReadyToGoLive: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    product: { count: vi.fn() },
    tenant: { findUnique: vi.fn() },
  },
}))

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Map([['host', 'localhost:3000']])),
}))

import { requireOwnerTenant } from '@/lib/admin-guard'
import { uploadImage } from '@/lib/cloudinary'
import { prisma } from '@/lib/prisma'
import { createProduct } from '@/lib/data/products'
import { uploadProductImageAction, createProductAction } from './actions'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('uploadProductImageAction', () => {
  it('uploads to the tenant-scoped products folder and returns the URL', async () => {
    const file = new File(['x'], 'product.png', { type: 'image/png' })
    const url = await uploadProductImageAction(file)
    expect(requireOwnerTenant).toHaveBeenCalled()
    expect(uploadImage).toHaveBeenCalledWith(file, 'talam/tenant-1/products')
    expect(url).toBe('https://res.cloudinary.com/test/product.png')
  })
})

describe('createProductAction', () => {
  const input = { name: 'Cotton Saree', description: null, price: 999, comparePrice: null, categoryId: null, sizes: [], unit: 'piece' as const, images: [], stockBySize: {}, specifications: [], weight: null }

  it('flags readyToGoLive once 3+ products are published and the store is not yet live', async () => {
    vi.mocked(createProduct).mockResolvedValue({ id: 'product-1' } as never)
    vi.mocked(prisma.product.count).mockResolvedValue(3)
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({ isLive: false } as never)

    const result = await createProductAction(input)
    expect(result).toEqual({ id: 'product-1', readyToGoLive: true })
  })

  it('does not flag readyToGoLive under 3 products', async () => {
    vi.mocked(createProduct).mockResolvedValue({ id: 'product-1' } as never)
    vi.mocked(prisma.product.count).mockResolvedValue(2)
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({ isLive: false } as never)

    const result = await createProductAction(input)
    expect(result).toEqual({ id: 'product-1', readyToGoLive: false })
  })

  it('does not flag readyToGoLive when the store is already live', async () => {
    vi.mocked(createProduct).mockResolvedValue({ id: 'product-1' } as never)
    vi.mocked(prisma.product.count).mockResolvedValue(5)
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({ isLive: true } as never)

    const result = await createProductAction(input)
    expect(result).toEqual({ id: 'product-1', readyToGoLive: false })
  })
})
