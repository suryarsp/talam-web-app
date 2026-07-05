import { withTenant } from '@/lib/prisma'

export type ProductSort = 'newest' | 'price-asc' | 'price-desc' | 'popular'

export type ProductFilters = {
  categoryId?: string // UUID — not a name string
  size?: string
  minPrice?: number
  maxPrice?: number
  sort?: ProductSort
}

export type CategoryMeta = { id: string; name: string; slug: string }

const NEW_PRODUCT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000

export async function getProducts(tenantId: string, filters?: ProductFilters) {
  const orderBy =
    filters?.sort === 'price-asc'
      ? ({ price: 'asc' } as const)
      : filters?.sort === 'price-desc'
        ? ({ price: 'desc' } as const)
        : ({ createdAt: 'desc' } as const) // 'popular' is sorted after review counts are computed below

  const products = await withTenant(tenantId, (db) =>
    db.product.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(filters?.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters?.size ? { sizes: { has: filters.size } } : {}),
        ...(filters?.minPrice || filters?.maxPrice
          ? {
              price: {
                ...(filters.minPrice ? { gte: filters.minPrice } : {}),
                ...(filters.maxPrice ? { lte: filters.maxPrice } : {}),
              },
            }
          : {}),
      },
      orderBy,
      include: {
        category: { select: { name: true } },
        reviews: { where: { isDeleted: false }, select: { rating: true } },
      },
    })
  )

  const mapped = products.map(({ reviews, ...product }) => ({
    ...product,
    reviewCount: reviews.length,
    averageRating: reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null,
    isNew: Date.now() - product.createdAt.getTime() < NEW_PRODUCT_WINDOW_MS,
  }))

  if (filters?.sort === 'popular') {
    mapped.sort((a, b) => b.reviewCount - a.reviewCount)
  }

  return mapped
}

export async function getProductBySlug(tenantId: string, slug: string) {
  return withTenant(tenantId, (db) =>
    db.product.findFirst({
      where: { tenantId, slug, isActive: true },
      include: { category: { select: { id: true, name: true } } },
    })
  )
}

export async function getCategories(tenantId: string): Promise<CategoryMeta[]> {
  return withTenant(tenantId, (db) =>
    db.productCategory.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, slug: true },
    })
  )
}
