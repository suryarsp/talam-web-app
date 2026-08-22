import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  withTenant: vi.fn(async (_tenantId: string, fn: (client: unknown) => unknown) =>
    fn({
      tenant: { findUnique: vi.fn(async () => ({ isLive: false })) },
      product: { create: vi.fn(async (args: unknown) => args), update: vi.fn(async (args: unknown) => args) },
    })
  ),
}))

import { createProduct, updateProduct, type ProductInput } from './products'

function baseInput(overrides: Partial<ProductInput> = {}): ProductInput {
  return {
    name: 'Silk Saree',
    description: null,
    price: 2999,
    comparePrice: null,
    categoryId: 'cat-1',
    sizes: ['S'],
    unit: 'piece',
    images: ['https://example.com/img.jpg'],
    stockBySize: { S: 5 },
    specifications: [],
    ...overrides,
  }
}

describe('createProduct validation', () => {
  it('rejects zero or negative quantity', async () => {
    await expect(createProduct('tenant-1', baseInput({ stockBySize: { S: 0 } }))).rejects.toThrow('Quantity must be at least 1.')
  })

  it('rejects an original price that is not greater than the selling price', async () => {
    await expect(createProduct('tenant-1', baseInput({ price: 1000, comparePrice: 1000 }))).rejects.toThrow(
      'Original price must be greater than the selling price.'
    )
  })

  it('accepts a valid product', async () => {
    await expect(createProduct('tenant-1', baseInput())).resolves.toBeDefined()
  })

  it('accepts a valid discounted product', async () => {
    await expect(createProduct('tenant-1', baseInput({ price: 999, comparePrice: 1299 }))).resolves.toBeDefined()
  })
})

describe('updateProduct validation', () => {
  it('rejects zero quantity on update too', async () => {
    await expect(updateProduct('tenant-1', 'p1', baseInput({ stockBySize: { S: 0 } }))).rejects.toThrow('Quantity must be at least 1.')
  })
})
