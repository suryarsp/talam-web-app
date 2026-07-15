import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getDevTenantId, getTenantStorefront } from '@/lib/data/tenant'
import { getProductBySlug, getProductReviews } from '@/lib/data/products'
import { AddToCartButton } from '@/components/store/add-to-cart-button'
import { ReviewsSection } from '@/components/store/reviews-section'
import { ProductImageCarousel } from '@/components/store/product-image-carousel'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const tenantId = await getDevTenantId()
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
  const tenantId = await getDevTenantId()
  const product = tenantId ? await getProductBySlug(tenantId, slug) : null
  if (!product || !tenantId) notFound()

  const tenant = await getTenantStorefront(tenantId)
  if (!tenant) notFound()
  const reviews = await getProductReviews(tenantId, product.id)

  const price = Number(product.price)
  const comparePrice = product.comparePrice !== null ? Number(product.comparePrice) : null
  const stockBySize = product.stockBySize as Record<string, number>
  const hasDiscount = comparePrice && comparePrice > price
  const savedAmount = hasDiscount ? comparePrice! - price : null

  const freeDeliveryText =
    tenant.freeDeliveryAbove && price >= tenant.freeDeliveryAbove
      ? 'Free delivery on this order'
      : tenant.deliveryEstimateText

  async function submitReviewStub(_rating: number, _comment: string) {
    'use server'
    // ponytail: real submission needs a signed-in customer session; wire up once storefront auth exists
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-12 sm:py-10">
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-12">
        <ProductImageCarousel images={product.images} name={product.name} />

        <div className="space-y-5">
          <div>
            {product.category && (
              <Link
                href={`/?category=${product.category.id}`}
                className="mb-1 block font-body text-xs font-semibold tracking-wide text-muted-warm uppercase"
              >
                {product.category.name}
              </Link>
            )}
            <h1 className="font-heading text-2xl leading-tight font-bold text-fg sm:text-[32px]">{product.name}</h1>
          </div>

          {product.reviewCount > 0 && (
            <p className="font-body text-sm text-success">
              {'★'.repeat(Math.round(product.averageRating ?? 0))} {product.reviewCount} reviews ·{' '}
              {product.averageRating?.toFixed(1)} rating
            </p>
          )}

          <div className="flex items-baseline gap-3">
            <span className="font-body text-2xl font-bold text-fg">
              ₹{price.toLocaleString('en-IN')}
            </span>
            {hasDiscount && (
              <>
                <span className="font-body text-base text-muted-warm line-through">
                  ₹{comparePrice!.toLocaleString('en-IN')}
                </span>
                <span className="rounded-full bg-danger px-2.5 py-1 font-body text-xs font-bold text-surface">
                  Save ₹{savedAmount!.toLocaleString('en-IN')}
                </span>
              </>
            )}
          </div>

          {freeDeliveryText && (
            <div className="rounded-lg border border-success-border bg-success-bg px-4 py-3">
              <p className="font-body text-sm font-medium text-success">
                ✓ {freeDeliveryText}
                {tenant.returnWindowDays ? ` · ${tenant.returnWindowDays}-day returns guaranteed` : ''}
              </p>
            </div>
          )}

          {product.sizes.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="font-body text-sm font-semibold text-fg uppercase">Choose Your Size</p>
              {tenant.sizeGuideUrl && (
                <Link href={tenant.sizeGuideUrl} className="font-body text-sm text-store-primary">
                  View Size Guide →
                </Link>
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
            <div className="space-y-1 border-t border-border pt-5">
              <p className="font-body text-sm font-semibold text-fg">Description</p>
              <p className="font-body text-sm leading-relaxed text-muted-warm whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}

          <div className="space-y-3 border-t border-border pt-5">
            <p className="font-body text-sm font-semibold text-fg">Product Specifications</p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 font-body text-sm">
              {product.category && (
                <>
                  <dt className="text-muted-warm">Category</dt>
                  <dd className="text-fg">{product.category.name}</dd>
                </>
              )}
              {product.sizes.length > 0 && (
                <>
                  <dt className="text-muted-warm">Available Sizes</dt>
                  <dd className="text-fg">{product.sizes.join(', ')}</dd>
                </>
              )}
              <dt className="text-muted-warm">SKU</dt>
              <dd className="text-fg font-mono text-xs">{product.slug.toUpperCase()}</dd>
              {product.reviewCount > 0 && (
                <>
                  <dt className="text-muted-warm">Rating</dt>
                  <dd className="text-fg">{product.averageRating?.toFixed(1)} / 5 ({product.reviewCount} reviews)</dd>
                </>
              )}
              <dt className="text-muted-warm">Availability</dt>
              <dd className="text-success font-medium">In Stock</dd>
            </dl>
          </div>
        </div>
      </div>

      <ReviewsSection
        reviews={reviews}
        averageRating={product.averageRating}
        count={product.reviewCount}
        onSubmitReview={submitReviewStub}
      />
    </main>
  )
}
