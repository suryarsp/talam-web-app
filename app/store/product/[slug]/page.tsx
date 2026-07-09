import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getProductBySlug, getProductReviews } from '@/lib/data/products'
import { getTenantStorefront } from '@/lib/data/tenant'
import { AddToCartButton } from '@/components/store/add-to-cart-button'
import { ReviewsSection } from '@/components/store/reviews-section'

export const revalidate = false // on-demand only, once admin edit revalidation exists

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  const { slug } = await params
  if (!tenantId) return {}

  const product = await getProductBySlug(tenantId, slug)
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
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  const { slug } = await params
  if (!tenantId) notFound()

  const product = await getProductBySlug(tenantId, slug)
  if (!product) notFound()

  const [tenant, reviews] = await Promise.all([
    getTenantStorefront(tenantId),
    getProductReviews(tenantId, product.id),
  ])

  const stockBySize = (product.stockBySize ?? {}) as Record<string, number>
  const hasDiscount = product.comparePrice && Number(product.comparePrice) > Number(product.price)
  const discountPct = hasDiscount
    ? Math.round((1 - Number(product.price) / Number(product.comparePrice)) * 100)
    : null
  const savedAmount = hasDiscount ? Number(product.comparePrice) - Number(product.price) : null

  const freeDeliveryText =
    tenant?.freeDeliveryAbove && Number(product.price) >= tenant.freeDeliveryAbove
      ? 'Free delivery on this order'
      : tenant?.deliveryEstimateText

  async function submitReviewStub(_rating: number, _comment: string) {
    'use server'
    // ponytail: real submission needs a signed-in customer session; wire up once storefront auth exists
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-12 sm:py-10">
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-12">
        <div className="space-y-2">
          {product.images.length > 0 ? (
            <>
              <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-bg">
                <Image
                  src={`${product.images[0]}?f_auto,q_auto,w_600`}
                  alt={product.name}
                  fill
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="object-cover"
                  priority
                />
              </div>
              {product.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {product.images.slice(1).map((img, i) => (
                    <div key={img} className="relative aspect-square overflow-hidden rounded-lg bg-bg">
                      <Image
                        src={`${img}?f_auto,q_auto,w_150`}
                        alt={`${product.name} ${i + 2}`}
                        fill
                        sizes="25vw"
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex aspect-[3/4] items-center justify-center rounded-xl bg-bg font-body text-sm text-muted-warm">
              No image
            </div>
          )}
        </div>

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
              ₹{Number(product.price).toLocaleString('en-IN')}
            </span>
            {hasDiscount && (
              <>
                <span className="font-body text-base text-muted-warm line-through">
                  ₹{Number(product.comparePrice).toLocaleString('en-IN')}
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
                {tenant?.returnWindowDays ? ` · ${tenant.returnWindowDays}-day returns guaranteed` : ''}
              </p>
            </div>
          )}

          {product.sizes.length > 0 && tenant?.sizeGuideUrl && (
            <div className="flex items-center justify-between">
              <p className="font-body text-sm font-semibold text-fg uppercase">Choose Your Size</p>
              <Link href={tenant.sizeGuideUrl} className="font-body text-sm text-store-primary">
                View Size Guide →
              </Link>
            </div>
          )}

          <AddToCartButton
            product={{
              id: product.id,
              tenantId: product.tenantId,
              name: product.name,
              price: Number(product.price),
              sizes: product.sizes,
              images: product.images,
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
