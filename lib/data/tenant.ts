import { headers } from 'next/headers'
import { prisma, withTenant } from '@/lib/prisma'

export type SocialLink = { platform: string; url: string }

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
  // ponytail: no persisted "payment configured" flag exists yet (paymentProvider always has
  // a default, and nothing writes paymentConfig) — the onboarding wizard forces a payment
  // choice, so isOnboarded is the best available signal. Revisit once Payments settings are
  // actually saveable after onboarding.
  if (!tenant.isOnboarded)
    missing.push({
      key: 'payments',
      label: 'Payments',
      description: 'Choose and enable a payment method',
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
