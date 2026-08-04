'use server'

import { headers } from 'next/headers'
import { Prisma } from '@prisma/client'
import { requireOwnerSession } from '@/lib/admin-guard'
import { prisma } from '@/lib/prisma'
import { uploadImage } from '@/lib/cloudinary'
import { sendOnboardingCompleteEmail, sendOnboardingWelcomeEmail } from '@/lib/resend'
import { DEFAULT_OCCASIONS } from '@/lib/default-occasions'
import { getAdminUrl, getOnboardingUrl, getStoreUrl, isLocalDevHost } from '@/lib/tenant-url'
import { normalizePaymentConfig } from '@/lib/payments/config'
import type { PaymentId } from './onboarding-data'

type ActionResult = { error?: string }

function isSlugCollision(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') return false

  // With the query engine, the offending fields are at err.meta.target.
  if (Array.isArray(err.meta?.target) && (err.meta.target as string[]).includes('slug')) return true

  // With the @prisma/adapter-pg driver adapter, meta.target is absent — the fields
  // are nested under meta.driverAdapterError.cause.constraint.fields instead.
  const adapterFields = (
    err.meta?.driverAdapterError as { cause?: { constraint?: { fields?: unknown } } } | undefined
  )?.cause?.constraint?.fields
  return Array.isArray(adapterFields) && adapterFields.includes('slug')
}

async function seedDefaultCategories(tenantId: string): Promise<void> {
  const categoryCount = await prisma.productCategory.count({ where: { tenantId } })
  if (categoryCount > 0) return

  const defaultCats = [
    { name: 'Sarees', slug: 'sarees', sortOrder: 0, department: 'women', isDefault: true },
    { name: 'Kurtis', slug: 'kurtis', sortOrder: 1, department: 'women', isDefault: true },
    { name: 'Dupattas', slug: 'dupattas', sortOrder: 2, department: 'women', isDefault: true },
    { name: 'Sets & Suits', slug: 'sets-suits', sortOrder: 3, department: 'women', isDefault: true },
    { name: 'Lehengas', slug: 'lehengas', sortOrder: 4, department: 'women', isDefault: true },
    { name: 'Accessories', slug: 'accessories', sortOrder: 5, department: null, isDefault: true },
  ]
  await prisma.productCategory.createMany({
    data: defaultCats.map((c) => ({ ...c, tenantId })),
  })
}

export async function saveStoreStep(input: { storeName: string; slug: string; category: string }): Promise<ActionResult> {
  const { userId, email } = await requireOwnerSession()
  const isNewTenant = !(await prisma.tenant.findUnique({ where: { ownerId: userId }, select: { id: true } }))
  try {
    const tenant = await prisma.tenant.upsert({
      where: { ownerId: userId },
      create: {
        ownerId: userId,
        name: input.storeName,
        slug: input.slug,
        storeType: input.category,
        onboardingStep: 1,
        deliveryEstimateText: '5-7 business days',
        returnWindowDays: 7,
        trustBadgeText: 'Secure Payments · Easy Returns',
      },
      update: { name: input.storeName, slug: input.slug, storeType: input.category, onboardingStep: 1 },
      select: { id: true },
    })
    await seedDefaultCategories(tenant.id)
    if (isNewTenant && email) {
      await sendOnboardingWelcomeEmail(email, { onboardingUrl: getOnboardingUrl() })
    }
    return {}
  } catch (err) {
    if (isSlugCollision(err)) return { error: 'That store URL is taken — try another.' }
    throw err
  }
}

export async function checkSlugAvailability(slug: string): Promise<{ available: boolean }> {
  const { userId } = await requireOwnerSession()
  const existing = await prisma.tenant.findUnique({ where: { slug }, select: { ownerId: true } })
  return { available: !existing || existing.ownerId === userId }
}

export async function saveBrandStep(input: { brandColor: string; logo?: File }): Promise<ActionResult & { logoUrl?: string }> {
  const { userId } = await requireOwnerSession()
  let logoUrl: string | undefined
  if (input.logo && input.logo.size > 0) {
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { ownerId: userId }, select: { id: true } })
    try {
      logoUrl = await uploadImage(input.logo, `talam/${tenant.id}/brand`)
    } catch {
      return { error: 'Logo upload failed — try again.' }
    }
  }
  await prisma.tenant.update({
    where: { ownerId: userId },
    data: { brandColor: input.brandColor, onboardingStep: 2, ...(logoUrl ? { logoUrl } : {}) },
  })
  return { logoUrl }
}

export async function saveContactStep(input: {
  contactPhone: string
  contactEmail: string
  branchName: string
  branchAddress: string
  branchState: string
  branchCity: string
}): Promise<ActionResult> {
  const { userId } = await requireOwnerSession()
  const tenant = await prisma.tenant.update({
    where: { ownerId: userId },
    data: { contactPhone: input.contactPhone, contactEmail: input.contactEmail, onboardingStep: 3 },
    select: { id: true },
  })

  const existingBranch = await prisma.storeBranch.findFirst({ where: { tenantId: tenant.id }, select: { id: true } })
  const branchData = { name: input.branchName, address: input.branchAddress, state: input.branchState, city: input.branchCity }

  if (existingBranch) {
    await prisma.storeBranch.update({ where: { id: existingBranch.id }, data: branchData })
  } else {
    await prisma.storeBranch.create({ data: { ...branchData, tenantId: tenant.id } })
  }

  return {}
}

export async function saveStoryStep(input: { tagline: string; aboutDescription: string }): Promise<ActionResult> {
  const { userId } = await requireOwnerSession()
  const tenant = await prisma.tenant.update({
    where: { ownerId: userId },
    data: { tagline: input.tagline, onboardingStep: 4 },
    select: { id: true },
  })

  await prisma.storeAbout.upsert({
    where: { tenantId: tenant.id },
    create: { tenantId: tenant.id, description: input.aboutDescription },
    update: { description: input.aboutDescription },
  })

  return {}
}

export async function saveSubscriptionStep(input: { subscriptionTier: 'starter' | 'pro' }): Promise<ActionResult> {
  const { userId } = await requireOwnerSession()
  await prisma.tenant.update({
    where: { ownerId: userId },
    data: { tier: input.subscriptionTier, onboardingStep: 5 },
  })
  return {}
}

const PAYMENT_PROVIDER_MAP: Record<PaymentId, 'upi_manual' | 'razorpay' | 'instamojo'> = {
  upi: 'upi_manual',
  razorpay: 'razorpay',
  instamojo: 'instamojo',
}

export async function savePaymentStep(input: { paymentIds: PaymentId[]; upiAddress: string }): Promise<ActionResult> {
  const { userId } = await requireOwnerSession()
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { ownerId: userId }, select: { paymentConfig: true } })
  const config = normalizePaymentConfig(tenant.paymentConfig)
  const upiId = input.upiAddress.trim()

  await prisma.tenant.update({
    where: { ownerId: userId },
    data: {
      // paymentProvider is legacy display-only now — paymentConfig below is the real source of truth.
      paymentProvider: PAYMENT_PROVIDER_MAP[input.paymentIds[0] ?? 'upi'],
      paymentConfig: {
        ...config,
        upi: { enabled: input.paymentIds.includes('upi') || input.paymentIds.includes('razorpay'), upiId: upiId || config.upi.upiId },
        instamojo: { enabled: input.paymentIds.includes('instamojo') },
        razorpay: { ...config.razorpay, enabled: input.paymentIds.includes('razorpay') },
      },
      onboardingStep: 6,
    },
  })
  return {}
}

async function seedStarterContent(tenantId: string): Promise<void> {
  const [bannerCount, promotionCount] = await Promise.all([
    prisma.storeBanner.count({ where: { tenantId } }),
    prisma.storePromotion.count({ where: { tenantId } }),
  ])

  await seedDefaultCategories(tenantId)

  // Upsert (not gated on empty) so re-running this backfills any default occasions a tenant is missing.
  for (const occasion of DEFAULT_OCCASIONS) {
    await prisma.productTag.upsert({
      where: { tenantId_slug: { tenantId, slug: occasion.slug } },
      create: { tenantId, name: occasion.name, slug: occasion.slug, emoji: occasion.emoji, isDefault: true, themeKey: occasion.themeKey, sortOrder: occasion.sortOrder },
      update: {},
    })
  }

  if (bannerCount === 0) {
    const firstProduct = await prisma.product.findFirst({ where: { tenantId }, orderBy: { createdAt: 'asc' }, select: { id: true } })
    if (firstProduct) {
      await prisma.storeBanner.create({
        data: { tenantId, productId: firstProduct.id, headline: 'Sample Hero Banner — edit in Settings', sortOrder: 0 },
      })
    }
  }

  if (promotionCount === 0) {
    await prisma.storePromotion.create({
      data: { tenantId, offerText: 'Sample Offer — edit in Settings', subtitle: null, sortOrder: 0 },
    })
  }
}

export async function completeOnboarding(): Promise<ActionResult & { adminUrl?: string }> {
  const { userId } = await requireOwnerSession()
  const tenant = await prisma.tenant.update({
    where: { ownerId: userId },
    data: { isOnboarded: true, onboardingStep: 7 },
    select: { id: true, slug: true, name: true, contactEmail: true },
  })

  await seedStarterContent(tenant.id)

  const host = (await headers()).get('host')
  const isLocalDev = isLocalDevHost(host)
  const adminUrl = getAdminUrl(tenant.slug, isLocalDev)
  const storeUrl = getStoreUrl(tenant.slug, isLocalDev)

  if (tenant.contactEmail) {
    await sendOnboardingCompleteEmail(tenant.contactEmail, { storeName: tenant.name, storeUrl, adminUrl })
  }

  return { adminUrl }
}
