import { notFound } from 'next/navigation'
import { getRequestTenantId, getTenantStorefront } from '@/lib/data/tenant'
import { getStoreBanners, getStorePromotions, getProductTags } from '@/lib/data/storefront'
import { getCategoriesWithImage, getProducts, getOfferProducts } from '@/lib/data/products'
import { cacheForTenant } from '@/lib/storefront-cache'
import { StorePageClient } from './store-page-client'

export default async function StorePage() {
  const tenantId = await getRequestTenantId()
  if (!tenantId) return notFound()

  const [tenant, banners, promotions, tags, categories, products, offerProducts] = await cacheForTenant(
    () =>
      Promise.all([
        getTenantStorefront(tenantId),
        getStoreBanners(tenantId),
        getStorePromotions(tenantId),
        getProductTags(tenantId),
        getCategoriesWithImage(tenantId),
        getProducts(tenantId),
        getOfferProducts(tenantId),
      ]),
    ['store-home', tenantId],
    tenantId,
    1800
  )

  if (!tenant) return notFound()

  // Next's data cache round-trips through JSON on a cache hit, turning Date fields into
  // strings — revive endsAt so the comparisons/formatting below work the same on a hit or a miss.
  const promotionsWithDates = promotions.map((p) => ({ ...p, endsAt: p.endsAt ? new Date(p.endsAt) : null }))

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
        images: p.images,
        reviewCount: reviews.length,
        averageRating: avgRating,
      }
    })

  const promotionData = promotionsWithDates.map((p) => ({
    offerText: p.offerText,
    subtitle: p.subtitle,
    endsAt: p.endsAt ? p.endsAt.toISOString() : null,
  }))

  const soonestEnd =
    promotionsWithDates
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

  // No banners configured (e.g. a tenant onboarded with zero products never got a seeded one) —
  // fall back to featuring active products instead of an empty hero.
  const heroBanners =
    bannersWithReviews.length > 0
      ? bannersWithReviews
      : productData
          .filter((p) => p.images.length > 0)
          .slice(0, 3)
          .map((p) => ({
            headline: p.name,
            subtitle: p.category,
            slug: p.slug,
            price: p.price,
            comparePrice: p.comparePrice,
            sizes: p.sizes,
            images: p.images,
            reviewCount: p.reviewCount,
            averageRating: p.averageRating,
          }))

  const categoryData = categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, image: c.image }))

  const offerData = offerProducts
    .map((p) => {
      const price = Number(p.price)
      const comparePrice = p.comparePrice ? Number(p.comparePrice) : null
      return {
        name: p.name,
        slug: p.slug,
        price,
        comparePrice,
        category: p.category?.name ?? '',
        sizes: p.sizes,
        images: p.images,
        reviewCount: p.reviewCount,
        averageRating: p.averageRating ?? 0,
        isNew: p.isNew,
        discountPct: comparePrice && comparePrice > price ? Math.round((1 - price / comparePrice) * 100) : 0,
      }
    })
    .sort((a, b) => b.discountPct - a.discountPct)

  const policy = {
    freeDeliveryAbove: tenant.freeDeliveryAbove,
    returnWindowDays: tenant.returnWindowDays,
    trustBadgeText: tenant.trustBadgeText,
    deliveryEstimateText: tenant.deliveryEstimateText,
  }

  const story = tenant.about?.description
    ? { title: tenant.about.storyTitle ?? 'Our story', description: tenant.about.description }
    : null

  return (
    <StorePageClient
      banners={heroBanners}
      promotions={promotionData}
      countdownTarget={soonestEnd}
      tags={tagData}
      categories={categoryData}
      products={productData}
      offers={offerData}
      policy={policy}
      story={story}
    />
  )
}
