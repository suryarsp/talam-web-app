import { withTenant } from '@/lib/prisma'

export type WishlistProduct = {
  id: string
  tenantId: string
  name: string
  slug: string
  price: number
  comparePrice: number | null
  sizes: string[]
  images: string[]
  isNew: boolean
  averageRating: number | null
  reviewCount: number
  totalStock: number
  category: { name: string } | null
}

const NEW_PRODUCT_DAYS = 14

export async function listWishlist(tenantId: string, customerId: string): Promise<WishlistProduct[]> {
  const rows = await withTenant(tenantId, (db) =>
    db.wishlist.findMany({
      where: { tenantId, customerId, product: { deletedAt: null, isActive: true, status: 'published' } },
      orderBy: { id: 'desc' },
      select: {
        product: {
          select: {
            id: true,
            tenantId: true,
            name: true,
            slug: true,
            price: true,
            comparePrice: true,
            sizes: true,
            images: true,
            stockBySize: true,
            createdAt: true,
            category: { select: { name: true } },
            reviews: { where: { isDeleted: false }, select: { rating: true } },
          },
        },
      },
    })
  )

  const newCutoff = Date.now() - NEW_PRODUCT_DAYS * 86400_000

  return rows.map(({ product: p }) => {
    const ratings = p.reviews.map((r) => r.rating)
    return {
      id: p.id,
      tenantId: p.tenantId,
      name: p.name,
      slug: p.slug,
      price: Number(p.price),
      comparePrice: p.comparePrice === null ? null : Number(p.comparePrice),
      sizes: p.sizes,
      images: p.images,
      isNew: p.createdAt.getTime() > newCutoff,
      averageRating: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
      reviewCount: ratings.length,
      totalStock: Object.values((p.stockBySize ?? {}) as Record<string, number>).reduce(
        (sum, qty) => sum + (typeof qty === 'number' ? qty : 0),
        0
      ),
      category: p.category,
    }
  })
}

/** Returns the resulting state so a caller can flip its own icon without a refetch. */
export async function toggleWishlist(tenantId: string, customerId: string, productId: string): Promise<boolean> {
  return withTenant(tenantId, async (db) => {
    const existing = await db.wishlist.findUnique({
      where: { tenantId_customerId_productId: { tenantId, customerId, productId } },
      select: { id: true },
    })
    if (existing) {
      await db.wishlist.delete({ where: { id: existing.id } })
      return false
    }
    await db.wishlist.create({ data: { tenantId, customerId, productId } })
    return true
  })
}

export async function listWishlistProductIds(tenantId: string, customerId: string): Promise<string[]> {
  const rows = await withTenant(tenantId, (db) =>
    db.wishlist.findMany({ where: { tenantId, customerId }, select: { productId: true } })
  )
  return rows.map((r) => r.productId)
}
