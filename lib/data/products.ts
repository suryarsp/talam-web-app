import { withTenant } from '@/lib/prisma'
import type { ProductUnit } from '@prisma/client'

export type { ProductUnit }

export type ProductSort = 'newest' | 'price-asc' | 'price-desc' | 'popular' | 'discount-desc'

export type ProductFilters = {
  categoryId?: string
  department?: string
  offersOnly?: boolean
  size?: string
  minPrice?: number
  maxPrice?: number
  sort?: ProductSort
  tagId?: string
}

export type CategoryMeta = { id: string; name: string; slug: string; department: string | null }

export type ProductSpec = { label: string; value: string }

export type AdminProduct = {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  comparePrice: number | null
  categoryId: string | null
  categoryName: string | null
  sizes: string[]
  unit: ProductUnit
  images: string[]
  stockBySize: Record<string, number>
  specifications: ProductSpec[]
  /** Shipping weight in kg. Null means "use the tenant's default shipping weight". */
  weight: number | null
  isActive: boolean
  occasionIds: string[]
}

export type ProductInput = {
  name: string
  description: string | null
  price: number
  comparePrice: number | null
  categoryId: string | null
  sizes: string[]
  unit: ProductUnit
  images: string[]
  stockBySize: Record<string, number>
  specifications: ProductSpec[]
  weight: number | null
}

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

// Root-caused here rather than only in the form: both createProduct and updateProduct route
// through this, so a raw call (bypassing the client form) can't slip an invalid product through.
function validateProductInput(input: ProductInput) {
  if (input.price <= 0) throw new Error('Price must be greater than ₹0.')
  if (input.comparePrice !== null && input.comparePrice <= input.price) {
    throw new Error('Original price must be greater than the selling price.')
  }
  if (Object.values(input.stockBySize).some((qty) => qty <= 0)) {
    throw new Error('Quantity must be at least 1.')
  }
}

export async function listProductsForAdmin(tenantId: string): Promise<AdminProduct[]> {
  const products = await withTenant(tenantId, (db) =>
    db.product.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { name: true } },
        tagAssignments: { select: { tagId: true } },
      },
    })
  )

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: Number(p.price),
    comparePrice: p.comparePrice !== null ? Number(p.comparePrice) : null,
    categoryId: p.categoryId,
    categoryName: p.category?.name ?? null,
    sizes: p.sizes,
    unit: p.unit,
    images: p.images,
    stockBySize: p.stockBySize as Record<string, number>,
    specifications: p.specifications as ProductSpec[],
    weight: p.weight !== null ? Number(p.weight) : null,
    isActive: p.isActive,
    occasionIds: p.tagAssignments.map((a) => a.tagId),
  }))
}

export async function createProduct(tenantId: string, input: ProductInput) {
  validateProductInput(input)
  // ponytail: slug is name-derived + a time suffix for uniqueness, no collision-retry needed at this scale
  const slug = `${slugify(input.name)}-${Date.now().toString(36).slice(-4)}`
  return withTenant(tenantId, async (db) => {
    // Before go-live there's no live storefront to protect, so new products publish immediately —
    // otherwise they'd sit as 'draft' forever, since the draft→publish flow only runs post go-live
    // (PublishButton only renders once isLive is true), leaving the "3 products" go-live
    // requirement impossible to satisfy.
    const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { isLive: true } })
    return db.product.create({
      data: {
        tenantId,
        slug,
        name: input.name,
        description: input.description,
        price: input.price,
        comparePrice: input.comparePrice,
        categoryId: input.categoryId,
        sizes: input.sizes,
        unit: input.unit,
        images: input.images,
        stockBySize: input.stockBySize,
        specifications: input.specifications,
        weight: input.weight,
        status: tenant?.isLive ? 'draft' : 'published',
      },
    })
  })
}

export async function updateProduct(tenantId: string, id: string, input: ProductInput) {
  validateProductInput(input)
  return withTenant(tenantId, async (db) => {
    // Same reasoning as createProduct: pre-launch there's no live storefront to protect,
    // so edits shouldn't demote a product to 'draft' — that silently drops it from the
    // "published" count getMissingStoreConfig uses to gate Go Live, making the 3-product
    // requirement look unmet even after the merchant has added and edited their products.
    const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { isLive: true } })
    return db.product.update({
      where: { id, tenantId },
      data: {
        name: input.name,
        description: input.description,
        price: input.price,
        comparePrice: input.comparePrice,
        categoryId: input.categoryId,
        sizes: input.sizes,
        unit: input.unit,
        images: input.images,
        stockBySize: input.stockBySize,
        specifications: input.specifications,
        weight: input.weight,
        status: tenant?.isLive ? 'draft' : 'published',
      },
    })
  })
}

export async function setProductActive(tenantId: string, id: string, isActive: boolean) {
  return withTenant(tenantId, (db) => db.product.update({ where: { id, tenantId }, data: { isActive } }))
}

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
        status: 'published',
        deletedAt: null,
        ...(filters?.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters?.department
          ? { category: { OR: [{ department: filters.department }, { department: null }] } }
          : {}),
        ...(filters?.offersOnly
          ? {
              OR: [
                { comparePrice: { not: null } },
                { promotionAssignments: { some: { promotion: { isActive: true, OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] } } } },
              ],
            }
          : {}),
        ...(filters?.size ? { sizes: { has: filters.size } } : {}),
        ...(filters?.minPrice || filters?.maxPrice
          ? {
              price: {
                ...(filters.minPrice ? { gte: filters.minPrice } : {}),
                ...(filters.maxPrice ? { lte: filters.maxPrice } : {}),
              },
            }
          : {}),
        ...(filters?.tagId
          ? { tagAssignments: { some: { tagId: filters.tagId } } }
          : {}),
      },
      orderBy,
      include: {
        category: { select: { name: true } },
        reviews: { where: { isDeleted: false }, select: { rating: true } },
        ...(filters?.tagId
          ? { tagAssignments: { where: { tagId: filters.tagId }, select: { sortOrder: true } } }
          : {}),
      },
    })
  )

  const mapped = products.map(({ reviews, tagAssignments, ...product }) => ({
    ...product,
    reviewCount: reviews.length,
    averageRating: reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null,
    isNew: Date.now() - product.createdAt.getTime() < NEW_PRODUCT_WINDOW_MS,
    _occasionSortOrder: tagAssignments?.[0]?.sortOrder ?? 0,
  }))

  if (filters?.sort === 'popular') {
    mapped.sort((a, b) => b.reviewCount - a.reviewCount)
  } else if (filters?.sort === 'discount-desc') {
    const discountPct = (p: (typeof mapped)[number]) =>
      p.comparePrice && Number(p.comparePrice) > Number(p.price)
        ? 1 - Number(p.price) / Number(p.comparePrice)
        : 0
    mapped.sort((a, b) => discountPct(b) - discountPct(a))
  } else if (filters?.tagId && !filters.sort) {
    // Occasion pages default to the owner's manually curated order, not createdAt.
    mapped.sort((a, b) => a._occasionSortOrder - b._occasionSortOrder)
  }

  return mapped.map(({ _occasionSortOrder, ...product }) => product)
}

// "Shop by Offers" — products on sale (comparePrice set) OR tagged to a currently-active promotion.
export async function getOfferProducts(tenantId: string) {
  const products = await withTenant(tenantId, (db) =>
    db.product.findMany({
      where: {
        tenantId,
        isActive: true,
        status: 'published',
        deletedAt: null,
        OR: [
          { comparePrice: { not: null } },
          {
            promotionAssignments: {
              some: {
                promotion: {
                  isActive: true,
                  OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
                },
              },
            },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { name: true } },
        reviews: { where: { isDeleted: false }, select: { rating: true } },
      },
    })
  )

  return products.map(({ reviews, ...product }) => ({
    ...product,
    reviewCount: reviews.length,
    averageRating: reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null,
    isNew: Date.now() - product.createdAt.getTime() < NEW_PRODUCT_WINDOW_MS,
  }))
}

export async function getProductBySlug(tenantId: string, slug: string) {
  const product = await withTenant(tenantId, (db) =>
    db.product.findFirst({
      where: { tenantId, slug, isActive: true, status: 'published', deletedAt: null },
      include: {
        category: { select: { id: true, name: true } },
        reviews: { where: { isDeleted: false }, select: { rating: true } },
      },
    })
  )
  if (!product) return null

  const { reviews, ...rest } = product
  return {
    ...rest,
    reviewCount: reviews.length,
    averageRating: reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null,
  }
}

export async function getProductReviews(tenantId: string, productId: string) {
  return withTenant(tenantId, (db) =>
    db.productReview.findMany({
      where: { tenantId, productId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        rating: true,
        comment: true,
        isVerifiedPurchase: true,
        createdAt: true,
        customer: { select: { name: true } },
      },
    })
  )
}

export async function getCategories(tenantId: string, department?: string): Promise<CategoryMeta[]> {
  return withTenant(tenantId, (db) =>
    db.productCategory.findMany({
      where: {
        tenantId,
        ...(department ? { OR: [{ department }, { department: null }] } : {}),
      },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, slug: true, department: true },
    })
  )
}

/** Categories with a representative product image, for homepage tile backgrounds — categories with no qualifying product are omitted. */
export async function getCategoriesWithImage(tenantId: string): Promise<(CategoryMeta & { image: string })[]> {
  const rows = await withTenant(tenantId, (db) =>
    db.productCategory.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        department: true,
        products: {
          where: { status: 'published', deletedAt: null, isActive: true, images: { isEmpty: false } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { images: true },
        },
      },
    })
  )
  return rows
    .filter((c) => c.products[0]?.images[0])
    .map(({ products, ...c }) => ({ ...c, image: products[0].images[0] }))
}

/** Departments that have at least one published product — drives which nav links the storefront header shows. */
export async function getActiveDepartments(tenantId: string): Promise<string[]> {
  const rows = await withTenant(tenantId, (db) =>
    db.product.findMany({
      where: { tenantId, status: 'published', deletedAt: null, category: { department: { not: null } } },
      select: { category: { select: { department: true } } },
      distinct: ['categoryId'],
    })
  )
  const departments = rows.map((r) => r.category?.department).filter((d): d is string => Boolean(d))
  return Array.from(new Set(departments))
}

export async function softDeleteProducts(tenantId: string, productIds: string[]): Promise<void> {
  // ponytail: withTenant already runs its callback inside an interactive transaction (needed for
  // RLS scoping); a nested array-form db.$transaction([...]) here throws at runtime, so these run
  // sequentially on the same already-transactional client instead.
  await withTenant(tenantId, async (db) => {
    await db.product.updateMany({
      where: { tenantId, id: { in: productIds } },
      data: { deletedAt: new Date() },
    })
    await db.productTagAssignment.deleteMany({ where: { tenantId, productId: { in: productIds } } })
    await db.storePromotionProduct.deleteMany({ where: { tenantId, productId: { in: productIds } } })
  })
}

export async function bulkSetProductsCategory(tenantId: string, productIds: string[], categoryId: string | null): Promise<void> {
  await withTenant(tenantId, (db) =>
    db.product.updateMany({
      where: { tenantId, id: { in: productIds } },
      data: { categoryId },
    })
  )
}

export async function bulkSetProductsActive(tenantId: string, productIds: string[], isActive: boolean): Promise<void> {
  await withTenant(tenantId, (db) =>
    db.product.updateMany({
      where: { tenantId, id: { in: productIds } },
      data: { isActive },
    })
  )
}

// Clears a product's occasion and offer associations only — name, price, images, category,
// and active/deleted state are untouched.
export async function resetProductsToDefault(tenantId: string, productIds: string[]): Promise<void> {
  await withTenant(tenantId, async (db) => {
    await db.productTagAssignment.deleteMany({ where: { tenantId, productId: { in: productIds } } })
    await db.storePromotionProduct.deleteMany({ where: { tenantId, productId: { in: productIds } } })
  })
}
