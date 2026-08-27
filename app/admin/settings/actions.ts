'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { Prisma } from '@prisma/client'
import type { Tier, DiscountType } from '@prisma/client'
import { requireOwnerTenant } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'
import { createLinkedAccount, getLinkedAccount } from '@/lib/razorpay'
import type { SocialLink } from '@/lib/data/tenant'
import { uploadImage } from '@/lib/cloudinary'
import { createServerClient } from '@/lib/supabase/server'
import { DEPARTMENTS, type Department } from '@/lib/departments'
import { storefrontTag } from '@/lib/storefront-cache'
import { normalizePaymentConfig, type PaymentGatewayConfig, type RazorpayStatus } from '@/lib/payments/config'
import {
  connectShiprocketAccount,
  disconnectShiprocketAccount,
  getShippingConfig,
  getShippingWebhookToken,
  requestShiprocketAssist,
} from '@/lib/shipping/shiprocket-account'
import type { ShippingConfig } from '@/lib/shipping/shipping-config'
import { sendShippingAssistRequestEmail } from '@/lib/resend'
import { getSuperAdminEmails } from '@/lib/auth-guard'

export type { PaymentGatewayConfig } from '@/lib/payments/config'
export type { ShippingConfig } from '@/lib/shipping/shipping-config'

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
}

export async function getAboutAction(): Promise<{ description: string; socialLinks: SocialLink[] }> {
  const { tenantId } = await requireOwnerTenant()
  const about = await withTenant(tenantId, (db) =>
    db.storeAbout.findUnique({ where: { tenantId }, select: { description: true, socialLinks: true } })
  )
  return {
    description: about?.description ?? '',
    socialLinks: (about?.socialLinks as SocialLink[] | undefined) ?? [],
  }
}

export async function updateAboutAction(input: { description: string; socialLinks: SocialLink[] }) {
  const { tenantId } = await requireOwnerTenant()
  const socialLinks = input.socialLinks.filter((l) => l.platform.trim() && l.url.trim())

  await withTenant(tenantId, (db) =>
    db.storeAbout.upsert({
      where: { tenantId },
      create: { tenantId, description: input.description, socialLinks, status: 'draft' },
      update: { description: input.description, socialLinks, status: 'draft' },
    })
  )
  revalidatePath('/admin/settings')
  updateTag(storefrontTag(tenantId))
}

export type ContactSettings = {
  contactPhone: string
  contactEmail: string
  address: string
  city: string
  ownerName: string
  ownerTitle: string
  whatsappNumber: string
  showWhatsappButton: boolean
  hours: string
  galleryUrls: string[]
}

export async function getContactSettingsAction(): Promise<ContactSettings> {
  const { tenantId } = await requireOwnerTenant()
  const [tenant, branch, about] = await withTenant(tenantId, (db) =>
    Promise.all([
      db.tenant.findUnique({
        where: { id: tenantId },
        select: { contactPhone: true, contactEmail: true, name: true, whatsappNumber: true, showWhatsappButton: true },
      }),
      db.storeBranch.findFirst({ where: { tenantId }, orderBy: { sortOrder: 'asc' }, select: { address: true, city: true, hours: true } }),
      db.storeAbout.findUnique({ where: { tenantId }, select: { ownerName: true, ownerTitle: true, galleryUrls: true } }),
    ])
  )
  return {
    contactPhone: tenant?.contactPhone ?? '',
    contactEmail: tenant?.contactEmail ?? '',
    address: branch?.address ?? '',
    city: branch?.city ?? '',
    ownerName: about?.ownerName ?? '',
    ownerTitle: about?.ownerTitle ?? '',
    whatsappNumber: tenant?.whatsappNumber ?? '',
    showWhatsappButton: tenant?.showWhatsappButton ?? true,
    hours: branch?.hours ?? '',
    galleryUrls: about?.galleryUrls ?? [],
  }
}

export async function updateContactSettingsAction(input: Omit<ContactSettings, 'galleryUrls'>): Promise<void> {
  const { tenantId } = await requireOwnerTenant()
  // Client-side gating on the number is a UX nicety only — enforce it here too, or a
  // cleared number leaves the floating button enabled with nothing to link to.
  const showWhatsappButton = input.showWhatsappButton && Boolean(input.whatsappNumber?.trim())

  await withTenant(tenantId, async (db) => {
    const tenant = await db.tenant.update({
      where: { id: tenantId },
      data: {
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        whatsappNumber: input.whatsappNumber,
        showWhatsappButton,
      },
      select: { name: true },
    })

    const existingBranch = await db.storeBranch.findFirst({ where: { tenantId }, orderBy: { sortOrder: 'asc' }, select: { id: true } })
    if (existingBranch) {
      await db.storeBranch.update({ where: { id: existingBranch.id }, data: { address: input.address, city: input.city, hours: input.hours } })
    } else {
      await db.storeBranch.create({ data: { tenantId, name: tenant.name, address: input.address, city: input.city, hours: input.hours } })
    }

    await db.storeAbout.upsert({
      where: { tenantId },
      create: { tenantId, ownerName: input.ownerName, ownerTitle: input.ownerTitle },
      update: { ownerName: input.ownerName, ownerTitle: input.ownerTitle },
    })
  })

  revalidatePath('/admin/settings')
  revalidatePath('/admin/dashboard')
  updateTag(storefrontTag(tenantId))
}

const MAX_GALLERY_PHOTOS = 8

export async function addGalleryPhotoAction(file: File): Promise<{ error?: string; url?: string }> {
  const { tenantId } = await requireOwnerTenant()
  const about = await withTenant(tenantId, (db) => db.storeAbout.findUnique({ where: { tenantId }, select: { galleryUrls: true } }))
  if ((about?.galleryUrls.length ?? 0) >= MAX_GALLERY_PHOTOS) return { error: `Max ${MAX_GALLERY_PHOTOS} photos.` }

  let url: string
  try {
    url = await uploadImage(file, `talam/${tenantId}/gallery`)
  } catch {
    return { error: 'Photo upload failed — try again.' }
  }

  await withTenant(tenantId, (db) =>
    db.storeAbout.upsert({
      where: { tenantId },
      create: { tenantId, galleryUrls: [url] },
      update: { galleryUrls: { push: url } },
    })
  )
  revalidatePath('/admin/settings')
  updateTag(storefrontTag(tenantId))
  return { url }
}

export async function removeGalleryPhotoAction(url: string): Promise<void> {
  const { tenantId } = await requireOwnerTenant()
  await withTenant(tenantId, async (db) => {
    const about = await db.storeAbout.findUnique({ where: { tenantId }, select: { galleryUrls: true } })
    if (!about) return
    await db.storeAbout.update({ where: { tenantId }, data: { galleryUrls: about.galleryUrls.filter((u) => u !== url) } })
  })
  revalidatePath('/admin/settings')
  updateTag(storefrontTag(tenantId))
}

// ── Store Tab ──
export type StoreSettings = {
  name: string
  tagline: string
  slug: string
  logoUrl: string | null
  brandColor: string | null
  whatsappNumber: string
  showWhatsappButton: boolean
  freeDeliveryAbove: number | null
  shippingFee: number
  deliveryEstimateText: string
  /** Fallback parcel weight in kg for products with no weight of their own. */
  defaultShippingWeight: number
  returnWindowDays: number | null
  trustBadgeText: string
}

export async function getStoreSettingsAction(): Promise<StoreSettings> {
  const { tenantId } = await requireOwnerTenant()
  const t = await withTenant(tenantId, (db) =>
    db.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: {
        name: true,
        tagline: true,
        slug: true,
        logoUrl: true,
        brandColor: true,
        whatsappNumber: true,
        showWhatsappButton: true,
        freeDeliveryAbove: true,
        shippingFee: true,
        deliveryEstimateText: true,
        defaultShippingWeight: true,
        returnWindowDays: true,
        trustBadgeText: true,
      },
    })
  )
  return {
    name: t.name,
    tagline: t.tagline ?? '',
    slug: t.slug,
    logoUrl: t.logoUrl,
    brandColor: t.brandColor,
    whatsappNumber: t.whatsappNumber ?? '',
    showWhatsappButton: t.showWhatsappButton,
    freeDeliveryAbove: t.freeDeliveryAbove ? Number(t.freeDeliveryAbove) : null,
    shippingFee: Number(t.shippingFee),
    deliveryEstimateText: t.deliveryEstimateText ?? '',
    defaultShippingWeight: Number(t.defaultShippingWeight),
    returnWindowDays: t.returnWindowDays,
    trustBadgeText: t.trustBadgeText ?? '',
  }
}

export type StoreSettingsInput = Partial<{
  name: string
  tagline: string
  brandColor: string
  whatsappNumber: string
  showWhatsappButton: boolean
  freeDeliveryAbove: number | null
  shippingFee: number
  deliveryEstimateText: string
  defaultShippingWeight: number
  returnWindowDays: number | null
  trustBadgeText: string
  logo: File
}>

export async function updateStoreSettingsAction(input: StoreSettingsInput): Promise<{ error?: string; logoUrl?: string }> {
  const { tenantId } = await requireOwnerTenant()
  const { logo, ...rest } = input

  if (rest.name !== undefined && !rest.name.trim()) return { error: 'Store name cannot be empty.' }
  if (rest.shippingFee !== undefined && rest.shippingFee < 0) return { error: 'Shipping fee cannot be negative.' }
  if (rest.freeDeliveryAbove != null && rest.freeDeliveryAbove < 0) return { error: 'Free delivery threshold cannot be negative.' }
  if (rest.returnWindowDays != null && rest.returnWindowDays < 0) return { error: 'Return window cannot be negative.' }
  // Unlike the fields above, zero is invalid too: this weight is sent to Shiprocket on every
  // rate lookup for a product with no weight of its own, and a 0kg parcel quotes nothing useful.
  if (rest.defaultShippingWeight !== undefined && rest.defaultShippingWeight <= 0) {
    return { error: 'Default shipping weight must be greater than 0.' }
  }

  let logoUrl: string | undefined
  if (logo && logo.size > 0) {
    try {
      logoUrl = await uploadImage(logo, `talam/${tenantId}/brand`)
    } catch {
      return { error: 'Logo upload failed — try again.' }
    }
  }

  // This tab autosaves one field at a time, so `rest.whatsappNumber` is only present when the
  // number itself is the field being saved — otherwise fall back to what's already stored, since
  // enabling the button can't be judged against a number this patch never touched.
  if (rest.showWhatsappButton) {
    const effectiveNumber =
      rest.whatsappNumber !== undefined
        ? rest.whatsappNumber
        : (await withTenant(tenantId, (db) => db.tenant.findUnique({ where: { id: tenantId }, select: { whatsappNumber: true } })))
            ?.whatsappNumber
    if (!effectiveNumber?.trim()) rest.showWhatsappButton = false
  }

  await withTenant(tenantId, (db) =>
    db.tenant.update({ where: { id: tenantId }, data: { ...rest, ...(logoUrl ? { logoUrl } : {}) } })
  )

  revalidatePath('/admin/settings')
  revalidatePath('/admin/dashboard')
  revalidatePath('/store')
  updateTag(storefrontTag(tenantId))
  return { logoUrl }
}

// ── Categories ──
export type CategoryItem = { id: string; name: string; department: string | null }

function slugifyCategory(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'category'
}

export async function getCategoriesAction(): Promise<CategoryItem[]> {
  const { tenantId } = await requireOwnerTenant()
  return withTenant(tenantId, (db) =>
    db.productCategory.findMany({ where: { tenantId }, orderBy: { sortOrder: 'asc' }, select: { id: true, name: true, department: true } })
  )
}

export async function addCategoryAction(name: string, department: Department): Promise<{ error?: string; category?: CategoryItem }> {
  const { tenantId } = await requireOwnerTenant()
  const trimmed = name.trim()
  if (!trimmed) return { error: 'Category name is required.' }
  if (!DEPARTMENTS.some((d) => d.value === department)) return { error: 'Choose a department for this category.' }

  try {
    const category = await withTenant(tenantId, async (db) => {
      const count = await db.productCategory.count({ where: { tenantId } })
      return db.productCategory.create({
        data: { tenantId, name: trimmed, slug: slugifyCategory(trimmed), department, sortOrder: count },
        select: { id: true, name: true, department: true },
      })
    })
    revalidatePath('/admin/settings')
    updateTag(storefrontTag(tenantId))
    return { category }
  } catch (err) {
    if (isUniqueConstraintError(err)) return { error: 'A category with that name already exists.' }
    throw err
  }
}

export async function reorderCategoriesAction(orderedIds: string[]): Promise<{ error?: string }> {
  const { tenantId } = await requireOwnerTenant()
  await withTenant(tenantId, (db) =>
    Promise.all(orderedIds.map((id, sortOrder) => db.productCategory.updateMany({ where: { id, tenantId }, data: { sortOrder } })))
  )
  revalidatePath('/admin/settings')
  updateTag(storefrontTag(tenantId))
  return {}
}

export async function deleteCategoryAction(id: string): Promise<{ error?: string }> {
  const { tenantId } = await requireOwnerTenant()
  const productCount = await withTenant(tenantId, (db) => db.product.count({ where: { tenantId, categoryId: id, deletedAt: null } }))
  if (productCount > 0) return { error: 'Move or delete the products in this category first.' }

  await withTenant(tenantId, (db) => db.productCategory.deleteMany({ where: { id, tenantId } }))
  revalidatePath('/admin/settings')
  updateTag(storefrontTag(tenantId))
  return {}
}

// ── Alerts Tab ──
export type NotificationPreferences = {
  newOrder: boolean
  orderStatusUpdated: boolean
  orderCancelled: boolean
  lowStock: boolean
  paymentReceived: boolean
  paymentFailed: boolean
  refundInitiated: boolean
  newCustomer: boolean
  wishlistAbandoned: boolean
  newReview: boolean
  reviewReported: boolean
  trialExpiry: boolean
  monthlySummary: boolean
}

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  newOrder: true,
  orderStatusUpdated: true,
  orderCancelled: true,
  lowStock: true,
  paymentReceived: true,
  paymentFailed: true,
  refundInitiated: true,
  newCustomer: false,
  wishlistAbandoned: false,
  newReview: false,
  reviewReported: true,
  trialExpiry: true,
  monthlySummary: false,
}

export async function getAlertsAction(): Promise<NotificationPreferences> {
  const { tenantId } = await requireOwnerTenant()
  const tenant = await withTenant(tenantId, (db) =>
    db.tenant.findUnique({ where: { id: tenantId }, select: { notificationPreferences: true } })
  )
  return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...((tenant?.notificationPreferences as Partial<NotificationPreferences> | null) ?? {}) }
}

export async function updateAlertsAction(patch: Partial<NotificationPreferences>): Promise<void> {
  const { tenantId } = await requireOwnerTenant()
  await withTenant(tenantId, async (db) => {
    const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { notificationPreferences: true } })
    const current = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...((tenant?.notificationPreferences as Partial<NotificationPreferences> | null) ?? {}) }
    await db.tenant.update({ where: { id: tenantId }, data: { notificationPreferences: { ...current, ...patch } } })
  })
  revalidatePath('/admin/settings')
}

// ── Promotions Tab ──
export type PromotionItem = {
  id: string
  code: string
  type: DiscountType
  value: number
  minOrder: number | null
  usesLimit: number | null
  usesCount: number
  expiresAt: string | null
  isActive: boolean
}

export async function getPromotionsAction(): Promise<PromotionItem[]> {
  const { tenantId } = await requireOwnerTenant()
  const codes = await withTenant(tenantId, (db) => db.discountCode.findMany({ where: { tenantId }, orderBy: { code: 'asc' } }))
  return codes.map((c) => ({
    id: c.id,
    code: c.code,
    type: c.type,
    value: Number(c.value),
    minOrder: c.minOrder ? Number(c.minOrder) : null,
    usesLimit: c.usesLimit,
    usesCount: c.usesCount,
    expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
    isActive: c.isActive,
  }))
}

export type CreatePromotionInput = {
  code: string
  type: DiscountType
  value: number
  minOrder?: number
  usesLimit?: number
  expiresAt?: string
}

export async function createPromotionAction(input: CreatePromotionInput): Promise<{ error?: string }> {
  const { tenantId } = await requireOwnerTenant()
  const code = input.code.trim().toUpperCase()
  if (!code) return { error: 'Code is required.' }
  if (!Number.isFinite(input.value) || input.value <= 0) return { error: 'Discount value must be greater than 0.' }
  if (input.type === 'percent' && input.value > 100) return { error: 'Percentage discount cannot exceed 100.' }
  if (input.minOrder != null && input.minOrder < 0) return { error: 'Minimum order cannot be negative.' }
  if (input.usesLimit != null && input.usesLimit <= 0) return { error: 'Uses limit must be greater than 0.' }

  try {
    await withTenant(tenantId, (db) =>
      db.discountCode.create({
        data: {
          tenantId,
          code,
          type: input.type,
          value: input.value,
          minOrder: input.minOrder ?? null,
          usesLimit: input.usesLimit ?? null,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        },
      })
    )
  } catch (err) {
    if (isUniqueConstraintError(err)) return { error: 'A promotion with that code already exists.' }
    throw err
  }
  revalidatePath('/admin/settings')
  updateTag(storefrontTag(tenantId))
  return {}
}

export async function togglePromotionAction(id: string, isActive: boolean): Promise<void> {
  const { tenantId } = await requireOwnerTenant()
  await withTenant(tenantId, (db) => db.discountCode.updateMany({ where: { id, tenantId }, data: { isActive } }))
  revalidatePath('/admin/settings')
  updateTag(storefrontTag(tenantId))
}

export async function deletePromotionAction(id: string): Promise<void> {
  const { tenantId } = await requireOwnerTenant()
  await withTenant(tenantId, (db) => db.discountCode.deleteMany({ where: { id, tenantId } }))
  revalidatePath('/admin/settings')
  updateTag(storefrontTag(tenantId))
}

// ── Carousel Tab (homepage hero banners) ──
export type BannerItem = {
  id: string
  productId: string
  productName: string
  headline: string | null
  subtitle: string | null
  sortOrder: number
  isActive: boolean
}

export async function getBannersAction(): Promise<BannerItem[]> {
  const { tenantId } = await requireOwnerTenant()
  const banners = await withTenant(tenantId, (db) =>
    db.storeBanner.findMany({ where: { tenantId }, orderBy: { sortOrder: 'asc' }, include: { product: { select: { name: true } } } })
  )
  return banners
    .filter((b) => b.productId && b.product)
    .map((b) => ({
      id: b.id,
      productId: b.productId!,
      productName: b.product!.name,
      headline: b.headline,
      subtitle: b.subtitle,
      sortOrder: b.sortOrder,
      isActive: b.isActive,
    }))
}

export async function getActiveProductsForBannerAction(): Promise<{ id: string; name: string }[]> {
  const { tenantId } = await requireOwnerTenant()
  return withTenant(tenantId, (db) =>
    db.product.findMany({
      where: { tenantId, isActive: true, status: 'published', deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
  )
}

export type CreateBannerInput = { productId: string; headline?: string; subtitle?: string }

export async function createBannerAction(input: CreateBannerInput): Promise<{ error?: string }> {
  const { tenantId } = await requireOwnerTenant()
  if (!input.productId) return { error: 'Choose a product to feature.' }

  const count = await withTenant(tenantId, (db) => db.storeBanner.count({ where: { tenantId } }))
  await withTenant(tenantId, (db) =>
    db.storeBanner.create({
      data: {
        tenantId,
        productId: input.productId,
        headline: input.headline?.trim() || null,
        subtitle: input.subtitle?.trim() || null,
        sortOrder: count,
      },
    })
  )
  revalidatePath('/admin/settings')
  updateTag(storefrontTag(tenantId))
  return {}
}

export async function toggleBannerAction(id: string, isActive: boolean): Promise<void> {
  const { tenantId } = await requireOwnerTenant()
  await withTenant(tenantId, (db) => db.storeBanner.updateMany({ where: { id, tenantId }, data: { isActive } }))
  revalidatePath('/admin/settings')
  updateTag(storefrontTag(tenantId))
}

export async function deleteBannerAction(id: string): Promise<void> {
  const { tenantId } = await requireOwnerTenant()
  await withTenant(tenantId, (db) => db.storeBanner.deleteMany({ where: { id, tenantId } }))
  revalidatePath('/admin/settings')
  updateTag(storefrontTag(tenantId))
}

/** Swaps sortOrder with the adjacent banner — the simplest reorder UI that doesn't need drag-and-drop. */
export async function moveBannerAction(id: string, direction: 'up' | 'down'): Promise<void> {
  const { tenantId } = await requireOwnerTenant()
  const banners = await withTenant(tenantId, (db) => db.storeBanner.findMany({ where: { tenantId }, orderBy: { sortOrder: 'asc' } }))
  const index = banners.findIndex((b) => b.id === id)
  const swapWith = direction === 'up' ? index - 1 : index + 1
  if (index === -1 || swapWith < 0 || swapWith >= banners.length) return

  const a = banners[index]
  const b = banners[swapWith]
  await withTenant(tenantId, (db) =>
    Promise.all([
      db.storeBanner.update({ where: { id: a.id }, data: { sortOrder: b.sortOrder } }),
      db.storeBanner.update({ where: { id: b.id }, data: { sortOrder: a.sortOrder } }),
    ])
  )
  revalidatePath('/admin/settings')
  updateTag(storefrontTag(tenantId))
}

// ── Subscription Tab (read-only — no billing provider wired up yet) ──
export type SubscriptionInfo = { tier: Tier; trialEndsAt: string | null }

export async function getSubscriptionAction(): Promise<SubscriptionInfo> {
  const { tenantId } = await requireOwnerTenant()
  const tenant = await withTenant(tenantId, (db) =>
    db.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { tier: true, trialEndsAt: true } })
  )
  return { tier: tenant.tier, trialEndsAt: tenant.trialEndsAt ? tenant.trialEndsAt.toISOString() : null }
}

// ── Payments Tab ──
// Orders not yet in a terminal state block payment-config changes (mirrors the "3 pending orders" mock copy).
const NON_TERMINAL_ORDER_STATUSES = ['pending', 'confirmed', 'shipped'] as const

export async function getPaymentsSettingsAction(): Promise<{ config: PaymentGatewayConfig; locked: boolean; lockedCount: number }> {
  const { tenantId } = await requireOwnerTenant()
  const [tenant, lockedCount] = await withTenant(tenantId, (db) =>
    Promise.all([
      db.tenant.findUnique({ where: { id: tenantId }, select: { paymentConfig: true } }),
      db.order.count({ where: { tenantId, status: { in: [...NON_TERMINAL_ORDER_STATUSES] } } }),
    ])
  )
  return {
    config: normalizePaymentConfig(tenant?.paymentConfig),
    locked: lockedCount > 0,
    lockedCount,
  }
}

export async function updatePaymentsSettingsAction(config: PaymentGatewayConfig): Promise<{ error?: string }> {
  const { tenantId } = await requireOwnerTenant()
  const upiId = config.upi.upiId.trim()
  if (config.upi.enabled && !upiId) return { error: 'UPI ID is required when UPI is enabled.' }
  if (upiId && !/^[\w.-]+@[\w.-]+$/.test(upiId)) return { error: 'Enter a valid UPI ID (e.g. name@bank).' }

  const lockedCount = await withTenant(tenantId, (db) =>
    db.order.count({ where: { tenantId, status: { in: [...NON_TERMINAL_ORDER_STATUSES] } } })
  )
  if (lockedCount > 0) return { error: 'Finish or cancel pending orders before changing payment settings.' }

  await withTenant(tenantId, (db) =>
    db.tenant.update({ where: { id: tenantId }, data: { paymentConfig: { ...config, upi: { ...config.upi, upiId } } } })
  )
  revalidatePath('/admin/settings')
  return {}
}

// ── Delete Store Tab ──
export async function deleteStoreAction(confirmName: string): Promise<{ error?: string }> {
  const { tenantId } = await requireOwnerTenant()
  const tenant = await withTenant(tenantId, (db) => db.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { name: true } }))
  if (confirmName.trim().toLowerCase() !== tenant.name.trim().toLowerCase()) {
    return { error: 'Store name does not match.' }
  }

  await withTenant(tenantId, (db) => db.tenant.update({ where: { id: tenantId }, data: { deletedAt: new Date(), isLive: false } }))
  updateTag(storefrontTag(tenantId))

  const supabase = await createServerClient()
  await supabase.auth.signOut()
  return {}
}

export async function startRazorpayOnboardingAction(): Promise<{ onboardingUrl: string } | { error: string }> {
  const { tenantId } = await requireOwnerTenant()

  const tenant = await withTenant(tenantId, (db) =>
    db.tenant.findUnique({ where: { id: tenantId }, select: { name: true, contactEmail: true, contactPhone: true, paymentConfig: true } })
  )
  if (!tenant?.contactEmail?.trim() || !tenant?.contactPhone?.trim()) {
    return { error: 'Add a contact phone and email before connecting Razorpay.' }
  }

  const account = await createLinkedAccount({ email: tenant.contactEmail, phone: tenant.contactPhone, businessName: tenant.name })

  // Merge into the existing multi-gateway config — never overwrite the whole column, or a
  // merchant's saved UPI ID silently disappears the moment they connect Razorpay.
  const current = normalizePaymentConfig(tenant.paymentConfig)
  const config: PaymentGatewayConfig = {
    ...current,
    razorpay: { enabled: true, accountId: account.id, status: 'pending', updatedAt: new Date().toISOString() },
  }
  await withTenant(tenantId, (db) => db.tenant.update({ where: { id: tenantId }, data: { paymentConfig: config } }))

  revalidatePath('/admin/settings')
  return { onboardingUrl: `https://dashboard.razorpay.com/onboarding/${account.id}` }
}

export async function refreshRazorpayStatusAction(): Promise<{ status: RazorpayStatus } | { error: string }> {
  const { tenantId } = await requireOwnerTenant()

  const tenant = await withTenant(tenantId, (db) => db.tenant.findUnique({ where: { id: tenantId }, select: { paymentConfig: true } }))
  const current = normalizePaymentConfig(tenant?.paymentConfig)
  if (!current.razorpay.accountId) return { error: 'No Razorpay account connected yet.' }

  const account = await getLinkedAccount(current.razorpay.accountId)
  const status = account.status as RazorpayStatus
  const config: PaymentGatewayConfig = {
    ...current,
    razorpay: { ...current.razorpay, status, updatedAt: new Date().toISOString() },
  }
  await withTenant(tenantId, (db) => db.tenant.update({ where: { id: tenantId }, data: { paymentConfig: config } }))

  revalidatePath('/admin/settings')
  return { status }
}

// ── Shipping Tab ──
// Model A: each shop connects its own Shiprocket account, so shipments go out under the
// shop's own KYC, bank and COD remittance. All the real work lives in
// lib/shipping/shiprocket-account.ts, shared with the staff-assisted path in super-admin.

export async function getShippingSettingsAction(): Promise<{
  config: ShippingConfig
  webhookToken: string | null
}> {
  const { tenantId } = await requireOwnerTenant()
  const [config, webhookToken] = await Promise.all([
    getShippingConfig(tenantId),
    getShippingWebhookToken(tenantId),
  ])
  return { config, webhookToken }
}

export async function connectShippingAction(
  email: string,
  password: string,
  pickupLocation: string
): Promise<{ error?: string }> {
  const { tenantId } = await requireOwnerTenant()

  const result = await connectShiprocketAccount({
    tenantId,
    email,
    password,
    pickupLocation,
    actor: 'self',
  })
  if (result.error) return result

  revalidatePath('/admin/settings')
  return {}
}

export async function disconnectShippingAction(): Promise<{ error?: string }> {
  const { tenantId } = await requireOwnerTenant()
  await disconnectShiprocketAccount(tenantId)
  revalidatePath('/admin/settings')
  return {}
}

/**
 * Flags the shop for Talam support and emails the ops allow-list. The email is
 * fire-and-forget: sendShippingAssistRequestEmail swallows its own failures, and a Resend
 * outage must not stop the request being recorded — the super-admin badge still shows it.
 */
export async function requestShippingAssistAction(): Promise<{ error?: string }> {
  const { tenantId } = await requireOwnerTenant()

  const tenant = await withTenant(tenantId, (db) =>
    db.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, slug: true, contactEmail: true, contactPhone: true },
    })
  )
  if (!tenant) return { error: 'Store not found.' }

  const result = await requestShiprocketAssist(tenantId)
  if (result.error) return result

  await sendShippingAssistRequestEmail(getSuperAdminEmails(), {
    tenantName: tenant.name,
    tenantSlug: tenant.slug,
    contactEmail: tenant.contactEmail,
    contactPhone: tenant.contactPhone,
    tenantAdminUrl: `${process.env.NEXT_PUBLIC_ROOT_DOMAIN ? `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}` : ''}/super-admin`,
  })

  revalidatePath('/admin/settings')
  return {}
}
