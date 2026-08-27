import { Fragment } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { StoreLink } from '@/components/store/store-context'
import { getRequestTenantId, getTenantStorefront } from '@/lib/data/tenant'
import { getProductBySlug, getProductReviews } from '@/lib/data/products'
import { cacheForTenant } from '@/lib/storefront-cache'
import { AddToCartButton } from '@/components/store/add-to-cart-button'
import { ReviewsSection } from '@/components/store/reviews-section'
import { ProductImageCarousel } from '@/components/store/product-image-carousel'
import { PincodeDeliveryCheck } from '@/components/store/pincode-delivery-check'
import { checkProductDeliveryAction } from '@/app/store/actions'
import { formatCurrency } from '@/lib/utils'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const tenantId = await getRequestTenantId()
  const product = tenantId ? await getProductBySlug(tenantId, slug) : null
  if (!product) return {}

  return {
    title: product.name,
    description: product.description ?? undefined,
    openGraph: {
      title: product.name,
      images: product.images[0] ? [product.images[0]] : [],
    },
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const tenantId = await getRequestTenantId()
  if (!tenantId) notFound()

  const [product, tenant, reviews] = await cacheForTenant(
    async () => {
      const p = await getProductBySlug(tenantId, slug)
      if (!p) return [null, null, []] as const
      const [t, r] = await Promise.all([getTenantStorefront(tenantId), getProductReviews(tenantId, p.id)])
      return [p, t, r] as const
    },
    ['product-detail', tenantId, slug],
    tenantId,
    3600
  )
  if (!product || !tenant) notFound()

  // Revive createdAt — Next's data cache turns Date fields into strings on a cache hit,
  // and ReviewsSection's relativeTime() needs a real Date either way.
  const reviewsWithDates = reviews.map((r) => ({ ...r, createdAt: new Date(r.createdAt) }))

  const price = Number(product.price)
  const comparePrice = product.comparePrice !== null ? Number(product.comparePrice) : null
  const stockBySize = product.stockBySize as Record<string, number>
  const hasDiscount = comparePrice && comparePrice > price
  const savedAmount = hasDiscount ? comparePrice! - price : null
  const discountPct = hasDiscount ? Math.round((1 - price / comparePrice!) * 100) : null

  // ponytail: fetch category max price for anchoring context on non-discounted items
  const categoryMaxPrice = !hasDiscount && product.category
    ? await cacheForTenant(
        async () => {
          const { _max } = await (await import('@/lib/prisma')).withTenant(tenantId, (db) =>
            db.product.aggregate({ where: { tenantId, categoryId: product.category!.id, isActive: true }, _max: { price: true } })
          )
          return _max.price ? Number(_max.price) : null
        },
        ['cat-max-price', tenantId, product.category.id],
        tenantId,
        3600
      )
    : null

  const freeDeliveryText =
    tenant.freeDeliveryAbove && price >= tenant.freeDeliveryAbove
      ? 'Free delivery on this order'
      : tenant.deliveryEstimateText

  const productId = product.id

  async function submitReviewStub(_rating: number, _comment: string) {
    'use server'
    // ponytail: real submission needs a signed-in customer session; wire up once storefront auth exists
  }

  async function checkDelivery(pincode: string) {
    'use server'
    return checkProductDeliveryAction(productId, pincode)
  }

  return (
    <main className="mx-auto max-w-6xl pb-24 sm:pb-0 sm:px-12 sm:py-10">
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-12">
        <div className="-mx-0 sm:mx-0">
          <ProductImageCarousel images={product.images} name={product.name} />
        </div>

        <div className="space-y-5 px-4 sm:px-0 pt-4 sm:pt-0">
          <div>
            {product.category && (
              <StoreLink
                href={`/?category=${product.category.id}`}
                className="mb-2 inline-flex items-center rounded-full bg-bg px-2.5 py-0.5 font-body text-[11px] font-semibold tracking-wide text-muted-warm uppercase"
              >
                {product.category.name}
              </StoreLink>
            )}
            <h1 className="font-heading text-2xl leading-tight font-bold text-fg sm:text-[32px]">{product.name}</h1>
          </div>

          {product.reviewCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 font-body text-sm font-semibold text-success">
                {product.averageRating?.toFixed(1)} ★
              </span>
              <span className="font-body text-sm text-muted-warm">{product.reviewCount} reviews</span>
            </div>
          )}

          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="font-body text-3xl font-bold text-fg">
              {formatCurrency(price)}
            </span>
            {hasDiscount && (
              <>
                <span className="font-body text-base text-muted-warm line-through">
                  {formatCurrency(comparePrice!)}
                </span>
                <span className="rounded-full bg-danger px-2.5 py-1 font-body text-xs font-bold text-surface">
                  {discountPct}% OFF
                </span>
                <span className="rounded-full bg-success/10 px-2.5 py-1 font-body text-xs font-semibold text-success">
                  Save {formatCurrency(savedAmount!)}
                </span>
              </>
            )}
            {!hasDiscount && categoryMaxPrice && categoryMaxPrice > price && (
              <span className="font-body text-sm text-muted-warm">
                Others in this category up to {formatCurrency(categoryMaxPrice)}
              </span>
            )}
          </div>

          {freeDeliveryText && (
            <div className="flex items-center gap-2 rounded-lg bg-bg px-4 py-3">
              <span className="text-success">✓</span>
              <p className="font-body text-sm font-medium text-fg">
                {freeDeliveryText}
                {tenant.returnWindowDays ? ` · ${tenant.returnWindowDays}-day returns guaranteed` : ''}
              </p>
            </div>
          )}

          <PincodeDeliveryCheck onCheck={checkDelivery} />

          {product.sizes.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="font-body text-sm font-semibold text-fg uppercase tracking-wide">Select Size</p>
              {tenant.sizeGuideUrl && (
                <StoreLink href={tenant.sizeGuideUrl} className="font-body text-sm text-store-primary">
                  View Size Guide →
                </StoreLink>
              )}
            </div>
          )}

          <AddToCartButton
            product={{
              id: product.id,
              tenantId: tenant.id,
              name: product.name,
              slug: product.slug,
              price,
              comparePrice,
              sizes: product.sizes,
              images: product.images,
              description: product.description,
            }}
            stockBySize={stockBySize}
          />

          {product.description && (
            <div className="space-y-1.5 border-t border-border pt-5">
              <p className="font-body text-sm font-semibold text-fg">Description</p>
              <p className="font-body text-[15px] leading-[1.7] text-muted-warm whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}

          <div className="space-y-3 border-t border-border pt-5">
            <p className="font-body text-sm font-semibold text-fg">Product Specifications</p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-0 font-body text-sm">
              {(product.specifications as { label: string; value: string }[]).map((spec, i) => (
                <Fragment key={i}>
                  <dt className="text-muted-warm py-2 even:bg-bg px-2 -mx-2">{spec.label}</dt>
                  <dd className="text-fg py-2 even:bg-bg px-2 -mx-2">{spec.value}</dd>
                </Fragment>
              ))}
              {product.category && (
                <>
                  <dt className="text-muted-warm py-2 even:bg-bg px-2 -mx-2">Category</dt>
                  <dd className="text-fg py-2 even:bg-bg px-2 -mx-2">{product.category.name}</dd>
                </>
              )}
              {product.sizes.length > 0 && (
                <>
                  <dt className="text-muted-warm py-2 even:bg-bg px-2 -mx-2">Available Sizes</dt>
                  <dd className="text-fg py-2 even:bg-bg px-2 -mx-2">{product.sizes.join(', ')}</dd>
                </>
              )}
              <dt className="text-muted-warm py-2 even:bg-bg px-2 -mx-2">SKU</dt>
              <dd className="text-fg font-mono text-xs py-2 even:bg-bg px-2 -mx-2">{product.slug.toUpperCase()}</dd>
              {product.reviewCount > 0 && (
                <>
                  <dt className="text-muted-warm py-2 even:bg-bg px-2 -mx-2">Rating</dt>
                  <dd className="text-fg py-2 even:bg-bg px-2 -mx-2">{product.averageRating?.toFixed(1)} / 5 ({product.reviewCount} reviews)</dd>
                </>
              )}
              <dt className="text-muted-warm py-2 even:bg-bg px-2 -mx-2">Availability</dt>
              <dd className="text-success font-medium py-2 even:bg-bg px-2 -mx-2">In Stock</dd>
            </dl>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-0">
        <ReviewsSection
          reviews={reviewsWithDates}
          averageRating={product.averageRating}
          count={product.reviewCount}
          onSubmitReview={submitReviewStub}
        />
      </div>

    </main>
  )
}
