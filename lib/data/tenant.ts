import { headers } from 'next/headers'
import { prisma, withTenant } from '@/lib/prisma'
import { sendGoLiveReadyEmail } from '@/lib/resend'
import { getAdminUrl } from '@/lib/tenant-url'
import { createNotification } from '@/lib/data/notifications'

export type SocialLink = { platform: string; url: string }

export type RazorpayPaymentConfig = {
  provider: 'razorpay'
  accountId: string
  status: 'pending' | 'needs_clarification' | 'activated' | 'rejected'
  updatedAt: string
}

export type TenantStorefront = {
  id: string
  ownerId: string
  name: string
  tagline: string | null
  brandColor: string | null
  logoUrl: string | null
  whatsappNumber: string | null
  showWhatsappButton: boolean
  contactPhone: string | null
  contactEmail: string | null
  tier: string
  freeDeliveryAbove: number | null
  shippingFee: number
  deliveryEstimateText: string | null
  returnWindowDays: number | null
  trustBadgeText: string | null
  sizeGuideUrl: string | null
  about: {
    storyTitle: string | null
    description: string | null
    instagramUrl: string | null
    facebookUrl: string | null
    youtubeUrl: string | null
    socialLinks: SocialLink[]
  } | null
  branch: { address: string | null; city: string | null; hours: string | null } | null
}

const MIN_LIVE_PRODUCTS = 3

export type MissingConfigItem = {
  key: 'payments' | 'contact' | 'about' | 'address' | 'products'
  label: string
  description: string
  href: string
}

function getProductGapItem(productCount: number): MissingConfigItem | null {
  if (productCount >= MIN_LIVE_PRODUCTS) return null
  return {
    key: 'products',
    label: 'Products',
    description: `Add at least ${MIN_LIVE_PRODUCTS} products (${productCount}/${MIN_LIVE_PRODUCTS})`,
    href: '/admin/products',
  }
}

export async function getMissingStoreConfig(tenantId: string): Promise<MissingConfigItem[]> {
  const [tenant, productCount] = await withTenant(tenantId, (db) =>
    Promise.all([
      db.tenant.findUnique({
        where: { id: tenantId },
        select: {
          isOnboarded: true,
          paymentProvider: true,
          paymentConfig: true,
          contactPhone: true,
          contactEmail: true,
          about: { select: { description: true } },
          branches: { orderBy: { sortOrder: 'asc' }, take: 1, select: { address: true, city: true } },
        },
      }),
      db.product.count({ where: { tenantId, status: 'published', deletedAt: null } }),
    ])
  )
  if (!tenant) return []

  const missing: MissingConfigItem[] = []
  // ponytail: no persisted "payment configured" flag exists yet for upi_manual/instamojo
  // (paymentProvider always has a default, and nothing writes paymentConfig for them) — the
  // onboarding wizard forces a payment choice, so isOnboarded is the best available signal.
  // Razorpay is the exception: paymentConfig.status is real, KYC-verified truth.
  const razorpayConfig = tenant.paymentConfig as RazorpayPaymentConfig | null
  const paymentsOk = tenant.paymentProvider === 'razorpay' ? razorpayConfig?.status === 'activated' : tenant.isOnboarded
  if (!paymentsOk)
    missing.push({
      key: 'payments',
      label: 'Payments',
      description:
        tenant.paymentProvider === 'razorpay' ? 'Finish Razorpay verification (KYC pending)' : 'Choose and enable a payment method',
      href: '/admin/settings?tab=Payments',
    })
  if (!tenant.contactPhone?.trim() || !tenant.contactEmail?.trim())
    missing.push({
      key: 'contact',
      label: 'Contact Info',
      description: 'Add a contact phone and email',
      href: '/admin/settings?tab=Contact Info',
    })
  if (!tenant.about?.description?.trim())
    missing.push({
      key: 'about',
      label: 'Store Details',
      description: "Add your store's About description",
      href: '/admin/settings?tab=About',
    })
  const branch = tenant.branches[0]
  if (!branch?.address?.trim() || !branch?.city?.trim())
    missing.push({
      key: 'address',
      label: 'Store Address',
      description: 'Add your store address',
      href: '/admin/settings?tab=Contact Info',
    })
  const productGap = getProductGapItem(productCount)
  if (productGap) missing.push(productGap)
  return missing
}

/** Fires once, the moment a tenant's last go-live requirement is satisfied (e.g. adding their 3rd product) — not on every recheck. */
export async function notifyIfReadyToGoLive(tenantId: string, isLocalDev: boolean): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, slug: true, contactEmail: true, isLive: true, readyToGoLiveNotifiedAt: true },
  })
  if (!tenant || tenant.isLive || tenant.readyToGoLiveNotifiedAt || !tenant.contactEmail) return

  const missing = await getMissingStoreConfig(tenantId)
  if (missing.length > 0) return

  await prisma.tenant.update({ where: { id: tenantId }, data: { readyToGoLiveNotifiedAt: new Date() } })
  await createNotification(tenantId, {
    type: 'go_live_ready',
    title: "You're ready to go live",
    body: 'All setup steps are complete — head to your dashboard to launch your store.',
    link: '/admin/dashboard',
  })
  await sendGoLiveReadyEmail(tenant.contactEmail, { storeName: tenant.name, adminUrl: getAdminUrl(tenant.slug, isLocalDev) })
}

export async function getBranches(tenantId: string) {
  return withTenant(tenantId, (db) =>
    db.storeBranch.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, address: true, city: true, phone: true, mapsUrl: true },
    })
  )
}

export async function getTenantStorefront(tenantId: string): Promise<TenantStorefront | null> {
  const tenant = await withTenant(tenantId, (db) =>
    db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        ownerId: true,
        name: true,
        tagline: true,
        brandColor: true,
        logoUrl: true,
        whatsappNumber: true,
        showWhatsappButton: true,
        contactPhone: true,
        contactEmail: true,
        tier: true,
        freeDeliveryAbove: true,
        shippingFee: true,
        deliveryEstimateText: true,
        returnWindowDays: true,
        trustBadgeText: true,
        sizeGuideUrl: true,
        about: {
          select: {
            storyTitle: true,
            description: true,
            instagramUrl: true,
            facebookUrl: true,
            youtubeUrl: true,
            socialLinks: true,
            status: true,
          },
        },
        branches: {
          orderBy: { sortOrder: 'asc' },
          take: 1,
          select: { address: true, city: true, hours: true },
        },
      },
    })
  )

  if (!tenant) return null

  const { branches, about, ...rest } = tenant

  // Prisma returns Decimal for these two — narrow to number to match the TenantStorefront contract.
  return {
    ...rest,
    about: about && about.status === 'published'
      ? {
          storyTitle: about.storyTitle,
          description: about.description,
          instagramUrl: about.instagramUrl,
          facebookUrl: about.facebookUrl,
          youtubeUrl: about.youtubeUrl,
          socialLinks: (about.socialLinks as SocialLink[]) ?? [],
        }
      : null,
    branch: branches[0] ?? null,
    freeDeliveryAbove: rest.freeDeliveryAbove ? Number(rest.freeDeliveryAbove) : null,
    shippingFee: Number(rest.shippingFee),
  }
}

// ponytail: no subdomain-resolution middleware exists yet (design doc §3.1
// wildcard routing is unimplemented), so x-tenant-id is never set on
// localhost. Dev-only fallback resolves a seeded tenant by slug so /store
// renders without simulating a subdomain. Real middleware, when built,
// makes this dead in production (NODE_ENV check) and unnecessary in dev.
// Reads the tenant resolved by proxy.ts (x-tenant-id header) for real subdomains,
// falling back to the dev-only seeded tenant on localhost.
export async function getRequestTenantId(): Promise<string | null> {
  const headersList = await headers()
  return headersList.get('x-tenant-id') ?? (await getDevTenantId())
}

export async function getDevTenantId(): Promise<string | null> {
  if (process.env.NODE_ENV !== 'development') return null
  const slug = process.env.TALAM_DEV_TENANT_SLUG ?? 'dmystique'
  const tenant = await prisma.tenant.findUnique({ where: { slug }, select: { id: true } })
  return tenant?.id ?? null
}
