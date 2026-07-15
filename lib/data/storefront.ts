import { withTenant } from '@/lib/prisma'

// Returns hero carousel slides with their linked product data
export async function getStoreBanners(tenantId: string) {
  return withTenant(tenantId, (db) =>
    db.storeBanner.findMany({
      where: { tenantId, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        product: {
          select: {
            name: true,
            slug: true,
            price: true,
            comparePrice: true,
            sizes: true,
            images: true,
            category: { select: { name: true } },
            reviews: { where: { isDeleted: false }, select: { rating: true } },
          },
        },
      },
    })
  )
}

// Returns active, non-expired promotions sorted by sortOrder
export async function getStorePromotions(tenantId: string) {
  return withTenant(tenantId, (db) =>
    db.storePromotion.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
      },
      orderBy: { sortOrder: 'asc' },
    })
  )
}

// Returns all tags with product count per tag
export async function getProductTags(tenantId: string) {
  return withTenant(tenantId, (db) =>
    db.productTag.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { products: true } } },
    })
  )
}
