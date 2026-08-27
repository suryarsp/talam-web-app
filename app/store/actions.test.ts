import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetRequestTenantId, mockDb, mockGetDeliveryEstimate } = vi.hoisted(() => ({
  mockGetRequestTenantId: vi.fn(async () => 't1' as string | null),
  mockDb: {
    tenant: { findUnique: vi.fn() },
    product: { findFirst: vi.fn() },
  },
  mockGetDeliveryEstimate: vi.fn(),
}))

vi.mock('@/lib/data/tenant', () => ({ getRequestTenantId: mockGetRequestTenantId }))
vi.mock('@/lib/data/search', () => ({ searchProducts: vi.fn() }))
vi.mock('@/lib/prisma', () => ({
  prisma: mockDb,
  withTenant: (_tenantId: string, fn: (db: typeof mockDb) => unknown) => fn(mockDb),
}))
vi.mock('@/lib/shipping/shiprocket', () => ({ getDeliveryEstimate: mockGetDeliveryEstimate }))

import { checkProductDeliveryAction } from './actions'
import { formatDeliveryDate } from '@/lib/shipping/delivery-estimate'

beforeEach(() => {
  vi.clearAllMocks()
  mockGetRequestTenantId.mockResolvedValue('t1')
  mockDb.tenant.findUnique.mockResolvedValue({ defaultShippingWeight: 0.5 })
  mockDb.product.findFirst.mockResolvedValue({ weight: 0.8 })
  mockGetDeliveryEstimate.mockResolvedValue({ serviceable: true, etaDays: 4, rate: 79 })
})

describe('checkProductDeliveryAction', () => {
  it('returns the delivery date for a serviceable pincode', async () => {
    const result = await checkProductDeliveryAction('p1', '560001')

    expect(result).toEqual({ serviceable: true, deliveryBy: formatDeliveryDate(new Date(), 4) })
  })

  it('reports serviceable without a date when the courier gives no ETA', async () => {
    mockGetDeliveryEstimate.mockResolvedValue({ serviceable: true, rate: 79 })

    expect(await checkProductDeliveryAction('p1', '560001')).toEqual({ serviceable: true, deliveryBy: null })
  })

  it('never leaks the courier rate to the caller', async () => {
    const result = await checkProductDeliveryAction('p1', '560001')

    expect(result).not.toHaveProperty('rate')
  })

  it("quotes the product's own weight when it has one", async () => {
    await checkProductDeliveryAction('p1', '560001')

    expect(mockGetDeliveryEstimate).toHaveBeenCalledWith('t1', { pincode: '560001', weightKg: 0.8 })
  })

  it("falls back to the store's default weight for a product with none", async () => {
    mockDb.product.findFirst.mockResolvedValue({ weight: null })

    await checkProductDeliveryAction('p1', '560001')

    expect(mockGetDeliveryEstimate).toHaveBeenCalledWith('t1', { pincode: '560001', weightKg: 0.5 })
  })

  it('reports an unserviceable pincode', async () => {
    mockGetDeliveryEstimate.mockResolvedValue({ serviceable: false })

    expect(await checkProductDeliveryAction('p1', '190001')).toEqual({ serviceable: false })
  })

  it('reports an error when the courier cannot be reached', async () => {
    mockGetDeliveryEstimate.mockResolvedValue({ error: 'Shiprocket is not connected.' })

    expect(await checkProductDeliveryAction('p1', '560001')).toEqual({ error: 'Shiprocket is not connected.' })
  })

  it('rejects a malformed pincode without calling the courier', async () => {
    expect(await checkProductDeliveryAction('p1', '5600')).toEqual({ error: 'Enter a 6-digit pincode.' })
    expect(mockGetDeliveryEstimate).not.toHaveBeenCalled()
  })

  it('errors when the product is not on sale in this store', async () => {
    mockDb.product.findFirst.mockResolvedValue(null)

    expect(await checkProductDeliveryAction('gone', '560001')).toEqual({ error: 'Product not found.' })
    expect(mockGetDeliveryEstimate).not.toHaveBeenCalled()
  })

  it('errors when the request has no store', async () => {
    mockGetRequestTenantId.mockResolvedValue(null)

    expect(await checkProductDeliveryAction('p1', '560001')).toEqual({ error: 'Store not found.' })
    expect(mockGetDeliveryEstimate).not.toHaveBeenCalled()
  })
})
