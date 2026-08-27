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

const { mockCreateLinkedAccount, mockGetLinkedAccount } = vi.hoisted(() => ({
  mockCreateLinkedAccount: vi.fn(),
  mockGetLinkedAccount: vi.fn(),
}))
vi.mock('@/lib/razorpay', () => ({
  createLinkedAccount: mockCreateLinkedAccount,
  getLinkedAccount: mockGetLinkedAccount,
}))

import {
  getAboutAction,
  updateAboutAction,
  getStoreSettingsAction,
  updateStoreSettingsAction,
  addCategoryAction,
  deleteCategoryAction,
  createPromotionAction,
  updatePaymentsSettingsAction,
  deleteStoreAction,
  getAlertsAction,
  updateAlertsAction,
  startRazorpayOnboardingAction,
  refreshRazorpayStatusAction,
  getShippingSettingsAction,
  connectShippingAction,
  disconnectShippingAction,
  requestShippingAssistAction,
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

  it('rejects a default shipping weight of zero', async () => {
    // This weight is sent to Shiprocket on every rate lookup for a product with no weight of
    // its own, and a 0kg parcel makes every courier quote meaningless.
    expect(await updateStoreSettingsAction({ defaultShippingWeight: 0 })).toEqual({
      error: 'Default shipping weight must be greater than 0.',
    })
  })

})

describe('getStoreSettingsAction', () => {
  it('returns the default shipping weight as a number the form can edit', async () => {
    // Prisma hands Decimal columns back as strings, which a number input would reject.
    mockTenantFindUniqueOrThrow.mockResolvedValue({
      name: 'Talam', tagline: null, slug: 'talam', logoUrl: null, brandColor: null,
      whatsappNumber: null, showWhatsappButton: false, freeDeliveryAbove: null,
      shippingFee: '0', deliveryEstimateText: null, defaultShippingWeight: '0.500',
      returnWindowDays: null, trustBadgeText: null,
    })

    expect((await getStoreSettingsAction()).defaultShippingWeight).toBe(0.5)
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
    const config = { upi: { enabled: true, upiId: '' }, instamojo: { enabled: false }, razorpay: { enabled: false }, cod: { enabled: false } }
    expect(await updatePaymentsSettingsAction(config)).toEqual({ error: 'UPI ID is required when UPI is enabled.' })
  })

  it('blocks when pending orders exist', async () => {
    mockOrderCount.mockResolvedValue(2)
    const config = { upi: { enabled: true, upiId: 'me@bank' }, instamojo: { enabled: false }, razorpay: { enabled: false }, cod: { enabled: false } }
    expect(await updatePaymentsSettingsAction(config)).toEqual({ error: 'Finish or cancel pending orders before changing payment settings.' })
  })

  it('saves when no pending orders', async () => {
    mockOrderCount.mockResolvedValue(0)
    mockTenantUpdate.mockResolvedValue({})
    const config = { upi: { enabled: true, upiId: 'me@bank' }, instamojo: { enabled: false }, razorpay: { enabled: false }, cod: { enabled: false } }
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

describe('startRazorpayOnboardingAction', () => {
  it('creates a linked account, stores pending status, and returns the onboarding URL', async () => {
    mockTenantFindUnique.mockResolvedValue({
      name: 'Priya Boutique',
      contactEmail: 'a@b.com',
      contactPhone: '9999999999',
      paymentConfig: { upi: { enabled: true, upiId: 'priya@bank' }, instamojo: { enabled: false }, razorpay: { enabled: false } },
    })
    mockCreateLinkedAccount.mockResolvedValue({ id: 'acc_1', status: 'created' })
    mockTenantUpdate.mockResolvedValue({})

    const result = await startRazorpayOnboardingAction()

    expect(result).toEqual({ onboardingUrl: 'https://dashboard.razorpay.com/onboarding/acc_1' })
    expect(mockTenantUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 't1' },
        data: expect.objectContaining({
          // The bug: connecting Razorpay used to overwrite the whole column and wipe this.
          paymentConfig: expect.objectContaining({
            upi: { enabled: true, upiId: 'priya@bank' },
            razorpay: expect.objectContaining({ enabled: true, accountId: 'acc_1', status: 'pending' }),
          }),
        }),
      })
    )
  })

  it('returns an error when the tenant has no contact email/phone yet', async () => {
    mockTenantFindUnique.mockResolvedValue({ name: 'Priya', contactEmail: null, contactPhone: null, paymentConfig: null })

    const result = await startRazorpayOnboardingAction()
    expect(result).toEqual({ error: 'Add a contact phone and email before connecting Razorpay.' })
    expect(mockCreateLinkedAccount).not.toHaveBeenCalled()
  })
})

describe('refreshRazorpayStatusAction', () => {
  it('fetches the linked account from Razorpay, persists the latest status, and keeps UPI intact', async () => {
    mockTenantFindUnique.mockResolvedValue({
      paymentConfig: {
        upi: { enabled: true, upiId: 'priya@bank' },
        instamojo: { enabled: false },
        razorpay: { enabled: true, accountId: 'acc_1', status: 'pending', updatedAt: '2026-07-21T00:00:00.000Z' },
      },
    })
    mockGetLinkedAccount.mockResolvedValue({ id: 'acc_1', status: 'activated' })
    mockTenantUpdate.mockResolvedValue({})

    const result = await refreshRazorpayStatusAction()

    expect(result).toEqual({ status: 'activated' })
    expect(mockTenantUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentConfig: expect.objectContaining({
            upi: { enabled: true, upiId: 'priya@bank' },
            razorpay: expect.objectContaining({ status: 'activated' }),
          }),
        }),
      })
    )
  })

  it('returns an error when the tenant has no Razorpay account yet', async () => {
    mockTenantFindUnique.mockResolvedValue({ paymentConfig: null })

    const result = await refreshRazorpayStatusAction()
    expect(result).toEqual({ error: 'No Razorpay account connected yet.' })
    expect(mockGetLinkedAccount).not.toHaveBeenCalled()
  })
})

// ── Shipping Tab ──
const {
  mockConnectShiprocket,
  mockDisconnectShiprocket,
  mockGetShippingConfig,
  mockGetWebhookToken,
  mockRequestAssist,
  mockSendAssistEmail,
  mockGetSuperAdminEmails,
} = vi.hoisted(() => ({
  mockConnectShiprocket: vi.fn(),
  mockDisconnectShiprocket: vi.fn(),
  mockGetShippingConfig: vi.fn(),
  mockGetWebhookToken: vi.fn(),
  mockRequestAssist: vi.fn(),
  mockSendAssistEmail: vi.fn(),
  mockGetSuperAdminEmails: vi.fn(),
}))

vi.mock('@/lib/shipping/shiprocket-account', () => ({
  connectShiprocketAccount: mockConnectShiprocket,
  disconnectShiprocketAccount: mockDisconnectShiprocket,
  getShippingConfig: mockGetShippingConfig,
  getShippingWebhookToken: mockGetWebhookToken,
  requestShiprocketAssist: mockRequestAssist,
}))
vi.mock('@/lib/resend', () => ({ sendShippingAssistRequestEmail: mockSendAssistEmail }))
vi.mock('@/lib/auth-guard', () => ({ getSuperAdminEmails: mockGetSuperAdminEmails }))

describe('shipping settings actions', () => {
  beforeEach(() => {
    mockConnectShiprocket.mockResolvedValue({})
    mockRequestAssist.mockResolvedValue({})
    mockGetShippingConfig.mockResolvedValue({ mode: 'platform' })
    mockGetWebhookToken.mockResolvedValue(null)
    mockGetSuperAdminEmails.mockReturnValue(['ops@talam4shop.com'])
    mockTenantFindUnique.mockResolvedValue({
      name: "D'Mystique Boutique",
      slug: 'dmystique',
      contactEmail: 'hello@dmystique.com',
      contactPhone: '+91 98765 43210',
    })
  })

  describe('getShippingSettingsAction', () => {
    it('returns the config alongside the tenant-visible webhook token', async () => {
      mockGetShippingConfig.mockResolvedValue({ mode: 'connected' })
      mockGetWebhookToken.mockResolvedValue('whtok_abc')

      expect(await getShippingSettingsAction()).toEqual({
        config: { mode: 'connected' },
        webhookToken: 'whtok_abc',
      })
      expect(mockGetWebhookToken).toHaveBeenCalledWith('t1')
    })
  })

  describe('connectShippingAction', () => {
    it("connects the caller's own store, recording them as the actor", async () => {
      expect(await connectShippingAction('shop@example.com', 'pw', 'Chennai Store')).toEqual({})
      expect(mockConnectShiprocket).toHaveBeenCalledWith({
        tenantId: 't1',
        email: 'shop@example.com',
        password: 'pw',
        pickupLocation: 'Chennai Store',
        actor: 'self',
      })
    })

    it('surfaces a verification failure', async () => {
      mockConnectShiprocket.mockResolvedValue({ error: 'Could not verify that Shiprocket login' })
      const result = await connectShippingAction('shop@example.com', 'wrong', 'Chennai Store')
      expect(result.error).toBe('Could not verify that Shiprocket login')
    })
  })

  describe('disconnectShippingAction', () => {
    it('disconnects the calling tenant', async () => {
      expect(await disconnectShippingAction()).toEqual({})
      expect(mockDisconnectShiprocket).toHaveBeenCalledWith('t1')
    })
  })

  describe('requestShippingAssistAction', () => {
    it('records the request and emails the ops allow-list with the shop’s contact details', async () => {
      expect(await requestShippingAssistAction()).toEqual({})

      expect(mockRequestAssist).toHaveBeenCalledWith('t1')
      expect(mockSendAssistEmail).toHaveBeenCalledWith(
        ['ops@talam4shop.com'],
        expect.objectContaining({
          tenantName: "D'Mystique Boutique",
          tenantSlug: 'dmystique',
          contactPhone: '+91 98765 43210',
        })
      )
    })

    it('does not email anyone when the request was refused', async () => {
      mockRequestAssist.mockResolvedValue({ error: 'A Shiprocket account is already connected.' })

      const result = await requestShippingAssistAction()

      expect(result.error).toBeTruthy()
      expect(mockSendAssistEmail).not.toHaveBeenCalled()
    })

    it('is a no-op email-wise on a repeat request, since requestShiprocketAssist is idempotent', async () => {
      // Repeat clicks return {} without re-flagging; the email still fires at most per click,
      // which is why the idempotency guard lives in the account module, not here.
      await requestShippingAssistAction()
      expect(mockRequestAssist).toHaveBeenCalledTimes(1)
    })
  })
})
