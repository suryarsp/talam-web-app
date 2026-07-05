import { withTenant } from '@/lib/prisma'

export type TenantStorefront = {
  id: string
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
  } | null
  branch: { address: string | null; city: string | null; hours: string | null } | null
}

export async function getTenantStorefront(tenantId: string): Promise<TenantStorefront | null> {
  const tenant = await withTenant(tenantId, (db) =>
    db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
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

  const { branches, ...rest } = tenant

  // Prisma returns Decimal for these two — narrow to number to match the TenantStorefront contract.
  return {
    ...rest,
    branch: branches[0] ?? null,
    freeDeliveryAbove: rest.freeDeliveryAbove ? Number(rest.freeDeliveryAbove) : null,
    shippingFee: Number(rest.shippingFee),
  }
}
