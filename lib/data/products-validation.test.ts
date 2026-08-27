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
    weight: null,
    ...overrides,
  }
}

/**
 * What db.product.create / db.product.update were called with — the mock above echoes its
 * arguments back, so a resolved value is really the Prisma write payload.
 */
type WriteArgs = { data: Record<string, unknown> }
const written = (result: unknown) => result as WriteArgs

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

describe('shipping weight', () => {
  it('stores the weight given on create', async () => {
    const created = written(await createProduct('tenant-1', baseInput({ weight: 0.75 })))
    expect(created.data.weight).toBe(0.75)
  })

  it('stores a null weight when the merchant left it blank', async () => {
    // Null is meaningful, not missing: it routes the product to the tenant's default weight.
    const created = written(await createProduct('tenant-1', baseInput({ weight: null })))
    expect(created.data.weight).toBeNull()
  })

  it('stores the weight given on update', async () => {
    const updated = written(await updateProduct('tenant-1', 'p1', baseInput({ weight: 1.2 })))
    expect(updated.data.weight).toBe(1.2)
  })
})
