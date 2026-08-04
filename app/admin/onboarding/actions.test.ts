import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/admin-guard', () => ({
  requireOwnerSession: vi.fn().mockResolvedValue({ userId: 'user-1', email: 'owner@example.com' }),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    tenant: { upsert: vi.fn(), update: vi.fn(), findUnique: vi.fn(), findUniqueOrThrow: vi.fn() },
    storeBranch: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    storeAbout: { upsert: vi.fn() },
    product: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    productCategory: { count: vi.fn(), createMany: vi.fn(), findMany: vi.fn() },
    storeBanner: { count: vi.fn(), create: vi.fn() },
    storePromotion: { count: vi.fn(), create: vi.fn() },
    productTag: { upsert: vi.fn() },
  },
}))

vi.mock('@/lib/cloudinary', () => ({
  uploadImage: vi.fn().mockResolvedValue('https://res.cloudinary.com/test/logo.png'),
}))

vi.mock('@/lib/resend', () => ({
  sendOnboardingWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  sendOnboardingCompleteEmail: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Map([['host', 'localhost:3000']])),
}))

import { prisma } from '@/lib/prisma'
import { uploadImage } from '@/lib/cloudinary'
import { sendOnboardingCompleteEmail, sendOnboardingWelcomeEmail } from '@/lib/resend'
import { requireOwnerSession } from '@/lib/admin-guard'
import {
  completeOnboarding,
  saveBrandStep,
  saveContactStep,
  savePaymentStep,
  saveStoreStep,
  saveStoryStep,
  saveSubscriptionStep,
} from './actions'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('saveStoreStep', () => {
  it('upserts the tenant by ownerId and sends the welcome email for a new tenant', async () => {
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.tenant.upsert).mockResolvedValue({ id: 'tenant-1' } as never)
    vi.mocked(prisma.productCategory.count).mockResolvedValue(0)
    const result = await saveStoreStep({ storeName: 'Priya Boutique', slug: 'priya-boutique', category: 'Clothing' })
    expect(result).toEqual({})
    expect(prisma.tenant.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { ownerId: 'user-1' } }))
    expect(sendOnboardingWelcomeEmail).toHaveBeenCalledWith('owner@example.com', { onboardingUrl: expect.stringContaining('/admin/onboarding') })
  })

  it('does not send the welcome email when the tenant already exists (resume)', async () => {
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({ id: 'tenant-1' } as never)
    vi.mocked(prisma.tenant.upsert).mockResolvedValue({ id: 'tenant-1' } as never)
    vi.mocked(prisma.productCategory.count).mockResolvedValue(1)
    await saveStoreStep({ storeName: 'Priya Boutique', slug: 'priya-boutique', category: 'Clothing' })
    expect(sendOnboardingWelcomeEmail).not.toHaveBeenCalled()
  })

  it('does not send the welcome email when the session has no email (phone OTP)', async () => {
    vi.mocked(requireOwnerSession).mockResolvedValueOnce({ userId: 'user-1', email: null, authProvider: null })
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.tenant.upsert).mockResolvedValue({ id: 'tenant-1' } as never)
    vi.mocked(prisma.productCategory.count).mockResolvedValue(0)
    const result = await saveStoreStep({ storeName: 'Priya Boutique', slug: 'priya-boutique', category: 'Clothing' })
    expect(result).toEqual({})
    expect(sendOnboardingWelcomeEmail).not.toHaveBeenCalled()
  })

  it('returns a friendly error on slug collision', async () => {
    const { Prisma } = await import('@prisma/client')
    const error = Object.create(Prisma.PrismaClientKnownRequestError.prototype)
    error.code = 'P2002'
    error.meta = { target: ['slug'] }
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.tenant.upsert).mockRejectedValue(error)
    const result = await saveStoreStep({ storeName: 'Priya', slug: 'priya', category: 'Clothing' })
    expect(result).toEqual({ error: 'That store URL is taken — try another.' })
  })
})

describe('saveBrandStep', () => {
  it('updates brandColor', async () => {
    vi.mocked(prisma.tenant.update).mockResolvedValue({} as never)
    const result = await saveBrandStep({ brandColor: '#4F3FF0' })
    expect(result).toEqual({})
    expect(prisma.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerId: 'user-1' }, data: expect.objectContaining({ brandColor: '#4F3FF0' }) })
    )
  })

  it('uploads a logo and saves logoUrl when a file is provided', async () => {
    vi.mocked(prisma.tenant.findUniqueOrThrow).mockResolvedValue({ id: 'tenant-1' } as never)
    vi.mocked(prisma.tenant.update).mockResolvedValue({} as never)
    const logo = new File(['x'], 'logo.png', { type: 'image/png' })
    const result = await saveBrandStep({ brandColor: '#4F3FF0', logo })
    expect(result).toEqual({ logoUrl: 'https://res.cloudinary.com/test/logo.png' })
    expect(uploadImage).toHaveBeenCalledWith(logo, 'talam/tenant-1/brand')
    expect(prisma.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ logoUrl: 'https://res.cloudinary.com/test/logo.png' }) })
    )
  })

  it('returns a friendly error when the upload fails', async () => {
    vi.mocked(prisma.tenant.findUniqueOrThrow).mockResolvedValue({ id: 'tenant-1' } as never)
    vi.mocked(uploadImage).mockRejectedValueOnce(new Error('boom'))
    const logo = new File(['x'], 'logo.png', { type: 'image/png' })
    const result = await saveBrandStep({ brandColor: '#4F3FF0', logo })
    expect(result).toEqual({ error: 'Logo upload failed — try again.' })
  })
})

describe('saveContactStep', () => {
  it('creates a branch when none exists yet', async () => {
    vi.mocked(prisma.tenant.update).mockResolvedValue({ id: 'tenant-1' } as never)
    vi.mocked(prisma.storeBranch.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.storeBranch.create).mockResolvedValue({} as never)
    const result = await saveContactStep({
      contactPhone: '9999999999',
      contactEmail: 'owner@store.com',
      branchName: 'Main store',
      branchAddress: '123 MG Road',
      branchState: 'Karnataka',
      branchCity: 'Bengaluru',
    })
    expect(result).toEqual({})
    expect(prisma.storeBranch.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tenantId: 'tenant-1', name: 'Main store' }) })
    )
  })

  it('updates the existing branch instead of creating a second one', async () => {
    vi.mocked(prisma.tenant.update).mockResolvedValue({ id: 'tenant-1' } as never)
    vi.mocked(prisma.storeBranch.findFirst).mockResolvedValue({ id: 'branch-1' } as never)
    vi.mocked(prisma.storeBranch.update).mockResolvedValue({} as never)
    await saveContactStep({
      contactPhone: '9999999999',
      contactEmail: 'owner@store.com',
      branchName: 'Main store',
      branchAddress: '123 MG Road',
      branchState: 'Karnataka',
      branchCity: 'Bengaluru',
    })
    expect(prisma.storeBranch.create).not.toHaveBeenCalled()
    expect(prisma.storeBranch.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'branch-1' } }))
  })
})

describe('saveStoryStep', () => {
  it('updates tagline and upserts the about description', async () => {
    vi.mocked(prisma.tenant.update).mockResolvedValue({ id: 'tenant-1' } as never)
    vi.mocked(prisma.storeAbout.upsert).mockResolvedValue({} as never)
    const result = await saveStoryStep({ tagline: 'Handmade with love', aboutDescription: 'We started in 2020...' })
    expect(result).toEqual({})
    expect(prisma.storeAbout.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: 'tenant-1' } }))
  })
})

describe('saveSubscriptionStep', () => {
  it('persists the chosen tier', async () => {
    vi.mocked(prisma.tenant.update).mockResolvedValue({} as never)
    const result = await saveSubscriptionStep({ subscriptionTier: 'pro' })
    expect(result).toEqual({})
    expect(prisma.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tier: 'pro' }) })
    )
  })
})

describe('savePaymentStep', () => {
  it('enables razorpay and upi together, since razorpay implies upi', async () => {
    vi.mocked(prisma.tenant.findUniqueOrThrow).mockResolvedValue({ paymentConfig: null } as never)
    vi.mocked(prisma.tenant.update).mockResolvedValue({} as never)
    const result = await savePaymentStep({ paymentIds: ['razorpay', 'upi'], upiAddress: 'owner@upi' })
    expect(result).toEqual({})
    expect(prisma.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentProvider: 'razorpay',
          paymentConfig: expect.objectContaining({
            upi: { enabled: true, upiId: 'owner@upi' },
            razorpay: expect.objectContaining({ enabled: true }),
          }),
        }),
      })
    )
  })
})

describe('completeOnboarding', () => {
  beforeEach(() => {
    vi.mocked(prisma.storeBanner.count).mockResolvedValue(0)
    vi.mocked(prisma.storePromotion.count).mockResolvedValue(0)
    vi.mocked(prisma.productCategory.count).mockResolvedValue(1)
    vi.mocked(prisma.productTag.upsert).mockResolvedValue({} as never)
    vi.mocked(prisma.product.findFirst).mockResolvedValue(null)
  })

  it('marks the tenant onboarded and returns the dev admin URL', async () => {
    vi.mocked(prisma.tenant.update).mockResolvedValue({
      id: 'tenant-1',
      slug: 'priya-boutique',
      name: 'Priya Boutique',
      contactEmail: 'owner@store.com',
    } as never)
    const result = await completeOnboarding()
    expect(result).toEqual({ adminUrl: '/dev/store/priya-boutique/admin/dashboard' })
    expect(sendOnboardingCompleteEmail).toHaveBeenCalledWith('owner@store.com', {
      storeName: 'Priya Boutique',
      storeUrl: '/dev/store/priya-boutique',
      adminUrl: '/dev/store/priya-boutique/admin/dashboard',
    })
  })

  it('does not send the completion email when contactEmail is null', async () => {
    vi.mocked(prisma.tenant.update).mockResolvedValue({
      id: 'tenant-1',
      slug: 'priya-boutique',
      name: 'Priya Boutique',
      contactEmail: null,
    } as never)
    const result = await completeOnboarding()
    expect(result).toEqual({ adminUrl: '/dev/store/priya-boutique/admin/dashboard' })
    expect(sendOnboardingCompleteEmail).not.toHaveBeenCalled()
  })
})
