import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockRequireOwnerTenant,
  mockTenantFindUnique,
  mockTenantFindUniqueOrThrow,
  mockTenantUpdate,
  mockStoreAboutFindUnique,
  mockStoreAboutUpsert,
  mockStoreAboutUpdate,
  mockStoreBranchFindFirst,
  mockStoreBranchUpdate,
  mockStoreBranchCreate,
  mockProductCategoryFindMany,
  mockProductCategoryCount,
  mockProductCategoryCreate,
  mockProductCategoryUpdateMany,
  mockProductCategoryDeleteMany,
  mockProductCount,
  mockDiscountCodeFindMany,
  mockDiscountCodeCreate,
  mockDiscountCodeUpdateMany,
  mockDiscountCodeDeleteMany,
  mockOrderCount,
} = vi.hoisted(() => ({
  mockRequireOwnerTenant: vi.fn(async () => ({ userId: 'u1', tenantId: 't1' })),
  mockTenantFindUnique: vi.fn(),
  mockTenantFindUniqueOrThrow: vi.fn(),
  mockTenantUpdate: vi.fn(),
  mockStoreAboutFindUnique: vi.fn(),
  mockStoreAboutUpsert: vi.fn(),
  mockStoreAboutUpdate: vi.fn(),
  mockStoreBranchFindFirst: vi.fn(),
  mockStoreBranchUpdate: vi.fn(),
  mockStoreBranchCreate: vi.fn(),
  mockProductCategoryFindMany: vi.fn(),
  mockProductCategoryCount: vi.fn(),
  mockProductCategoryCreate: vi.fn(),
  mockProductCategoryUpdateMany: vi.fn(),
  mockProductCategoryDeleteMany: vi.fn(),
  mockProductCount: vi.fn(),
  mockDiscountCodeFindMany: vi.fn(),
  mockDiscountCodeCreate: vi.fn(),
  mockDiscountCodeUpdateMany: vi.fn(),
  mockDiscountCodeDeleteMany: vi.fn(),
  mockOrderCount: vi.fn(),
}))

vi.mock('@/lib/admin-guard', () => ({ requireOwnerTenant: mockRequireOwnerTenant }))

vi.mock('@/lib/prisma', () => ({
  withTenant: vi.fn(async (_id: string, fn: (db: unknown) => Promise<unknown>) =>
    fn({
      tenant: { findUnique: mockTenantFindUnique, findUniqueOrThrow: mockTenantFindUniqueOrThrow, update: mockTenantUpdate },
      storeAbout: { findUnique: mockStoreAboutFindUnique, upsert: mockStoreAboutUpsert, update: mockStoreAboutUpdate },
      storeBranch: { findFirst: mockStoreBranchFindFirst, update: mockStoreBranchUpdate, create: mockStoreBranchCreate },
      productCategory: { findMany: mockProductCategoryFindMany, count: mockProductCategoryCount, create: mockProductCategoryCreate, updateMany: mockProductCategoryUpdateMany, deleteMany: mockProductCategoryDeleteMany },
      product: { count: mockProductCount },
      discountCode: { findMany: mockDiscountCodeFindMany, create: mockDiscountCodeCreate, updateMany: mockDiscountCodeUpdateMany, deleteMany: mockDiscountCodeDeleteMany },
      order: { count: mockOrderCount },
    })
  ),
}))

vi.mock('@/lib/cloudinary', () => ({ uploadImage: vi.fn(async () => 'https://cdn/img.png') }))
vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn(async () => ({ auth: { signOut: vi.fn() } })) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }))

import {
  getAboutAction,
  updateAboutAction,
  updateStoreSettingsAction,
  addCategoryAction,
  deleteCategoryAction,
  createPromotionAction,
  updatePaymentsSettingsAction,
  deleteStoreAction,
  getAlertsAction,
  updateAlertsAction,
} from './actions'

beforeEach(() => vi.clearAllMocks())

describe('getAboutAction', () => {
  it('returns description and socialLinks', async () => {
    mockStoreAboutFindUnique.mockResolvedValue({ description: 'Hi', socialLinks: [{ platform: 'ig', url: 'u' }] })
    expect(await getAboutAction()).toEqual({ description: 'Hi', socialLinks: [{ platform: 'ig', url: 'u' }] })
  })

  it('returns defaults when no about exists', async () => {
    mockStoreAboutFindUnique.mockResolvedValue(null)
    expect(await getAboutAction()).toEqual({ description: '', socialLinks: [] })
  })
})

describe('updateAboutAction', () => {
  it('filters empty social links and upserts', async () => {
    mockStoreAboutUpsert.mockResolvedValue({})
    await updateAboutAction({ description: 'New', socialLinks: [{ platform: 'ig', url: 'u' }, { platform: '', url: '' }] })
    expect(mockStoreAboutUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: expect.objectContaining({ socialLinks: [{ platform: 'ig', url: 'u' }] }) })
    )
  })
})

describe('updateStoreSettingsAction', () => {
  it('rejects empty store name', async () => {
    expect(await updateStoreSettingsAction({ name: '  ' })).toEqual({ error: 'Store name cannot be empty.' })
  })

  it('rejects negative shipping fee', async () => {
    expect(await updateStoreSettingsAction({ shippingFee: -1 })).toEqual({ error: 'Shipping fee cannot be negative.' })
  })
})

describe('addCategoryAction', () => {
  it('creates a category', async () => {
    mockProductCategoryCount.mockResolvedValue(2)
    mockProductCategoryCreate.mockResolvedValue({ id: 'c1', name: 'Sarees', department: 'women' })
    const result = await addCategoryAction('Sarees', 'women')
    expect(result.category).toEqual({ id: 'c1', name: 'Sarees', department: 'women' })
  })

  it('rejects empty name', async () => {
    expect(await addCategoryAction('', 'women')).toEqual({ error: 'Category name is required.' })
  })
})

describe('deleteCategoryAction', () => {
  it('blocks deletion when products exist', async () => {
    mockProductCount.mockResolvedValue(3)
    expect(await deleteCategoryAction('c1')).toEqual({ error: 'Move or delete the products in this category first.' })
  })

  it('deletes when no products', async () => {
    mockProductCount.mockResolvedValue(0)
    mockProductCategoryDeleteMany.mockResolvedValue({})
    expect(await deleteCategoryAction('c1')).toEqual({})
  })
})

describe('createPromotionAction', () => {
  it('rejects empty code', async () => {
    expect(await createPromotionAction({ code: '', type: 'percent', value: 10 })).toEqual({ error: 'Code is required.' })
  })

  it('rejects percent > 100', async () => {
    expect(await createPromotionAction({ code: 'X', type: 'percent', value: 150 })).toEqual({ error: 'Percentage discount cannot exceed 100.' })
  })

  it('creates a valid promotion', async () => {
    mockDiscountCodeCreate.mockResolvedValue({})
    expect(await createPromotionAction({ code: 'save10', type: 'fixed', value: 100 })).toEqual({})
    expect(mockDiscountCodeCreate).toHaveBeenCalled()
  })
})

describe('updatePaymentsSettingsAction', () => {
  it('requires UPI ID when UPI is enabled', async () => {
    const config = { upi: { enabled: true, upiId: '' }, instamojo: { enabled: false }, razorpay: { enabled: false } }
    expect(await updatePaymentsSettingsAction(config)).toEqual({ error: 'UPI ID is required when UPI is enabled.' })
  })

  it('blocks when pending orders exist', async () => {
    mockOrderCount.mockResolvedValue(2)
    const config = { upi: { enabled: true, upiId: 'me@bank' }, instamojo: { enabled: false }, razorpay: { enabled: false } }
    expect(await updatePaymentsSettingsAction(config)).toEqual({ error: 'Finish or cancel pending orders before changing payment settings.' })
  })

  it('saves when no pending orders', async () => {
    mockOrderCount.mockResolvedValue(0)
    mockTenantUpdate.mockResolvedValue({})
    const config = { upi: { enabled: true, upiId: 'me@bank' }, instamojo: { enabled: false }, razorpay: { enabled: false } }
    expect(await updatePaymentsSettingsAction(config)).toEqual({})
  })
})

describe('deleteStoreAction', () => {
  it('rejects mismatched name', async () => {
    mockTenantFindUniqueOrThrow.mockResolvedValue({ name: 'My Store' })
    expect(await deleteStoreAction('wrong')).toEqual({ error: 'Store name does not match.' })
  })
})

describe('getAlertsAction', () => {
  it('merges stored preferences with defaults', async () => {
    mockTenantFindUnique.mockResolvedValue({ notificationPreferences: { newOrder: false } })
    const result = await getAlertsAction()
    expect(result.newOrder).toBe(false)
    expect(result.lowStock).toBe(true)
  })
})

describe('updateAlertsAction', () => {
  it('merges patch with existing preferences', async () => {
    mockTenantFindUnique.mockResolvedValue({ notificationPreferences: { newOrder: true } })
    mockTenantUpdate.mockResolvedValue({})
    await updateAlertsAction({ lowStock: false })
    expect(mockTenantUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ notificationPreferences: expect.objectContaining({ lowStock: false, newOrder: true }) }) })
    )
  })
})
