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
}))

import { requireOwnerTenant } from '@/lib/admin-guard'
import { uploadImage } from '@/lib/cloudinary'
import { uploadProductImageAction } from './actions'

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
