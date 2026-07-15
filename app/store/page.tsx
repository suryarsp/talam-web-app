import { notFound } from 'next/navigation'
import { getDevTenantId, getTenantStorefront } from '@/lib/data/tenant'
import { getStoreBanners, getStorePromotions, getProductTags } from '@/lib/data/storefront'
import { getCategories, getProducts } from '@/lib/data/products'
import { StorePageClient } from './store-page-client'

export default async function StorePage() {
  const tenantId = await getDevTenantId()
  if (!tenantId) return notFound()

  const [tenant, banners, promotions, tags, categories, products] = await Promise.all([
    getTenantStorefront(tenantId),
    getStoreBanners(tenantId),
    getStorePromotions(tenantId),
    getProductTags(tenantId),
    getCategories(tenantId),
    getProducts(tenantId),
  ])

  if (!tenant) return notFound()

  const bannersWithReviews = banners
    .filter((b) => b.product)
    .map((b) => {
      const p = b.product!
      const reviews = p.reviews || []
      const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0
      return {
        headline: b.headline || p.name,
        subtitle: b.subtitle || p.category?.name || '',
        slug: p.slug,
        price: Number(p.price),
        comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
        sizes: p.sizes,
        reviewCount: reviews.length,
        averageRating: avgRating,
      }
    })

  const promotionData = promotions.map((p) => ({
    offerText: p.offerText,
    subtitle: p.subtitle,
    endsAt: p.endsAt ? p.endsAt.toISOString() : null,
  }))

  const soonestEnd =
    promotions
      .filter((p) => p.endsAt && p.endsAt > new Date())
      .sort((a, b) => a.endsAt!.getTime() - b.endsAt!.getTime())[0]?.endsAt?.toISOString() ?? null

  const tagData = tags.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    emoji: t.emoji,
    productCount: t._count.products,
  }))

  const productData = products.map((p) => ({
    name: p.name,
    slug: p.slug,
    price: Number(p.price),
    comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
    category: p.category?.name ?? '',
    sizes: p.sizes,
    images: p.images,
    reviewCount: p.reviewCount,
    averageRating: p.averageRating ?? 0,
    isNew: p.isNew,
  }))

  const categoryData = categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))

  return (
    <StorePageClient
      banners={bannersWithReviews}
      promotions={promotionData}
      countdownTarget={soonestEnd}
      tags={tagData}
      categories={categoryData}
      products={productData}
    />
  )
}
