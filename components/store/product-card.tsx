import Image from 'next/image'
import { StoreLink } from '@/components/store/store-context'
import { WishlistHeart } from '@/components/store/wishlist-heart'
import type { Product, ProductCategory } from '@prisma/client'
import { formatCurrency } from '@/lib/utils'

type Props = {
  product: Product & {
    category?: Pick<ProductCategory, 'name'> | null
    reviewCount: number
    averageRating: number | null
    isNew: boolean
  }
  priority?: boolean
  /** Whether this product is already on the signed-in customer's wishlist. */
  saved?: boolean
}

export function ProductCard({ product, priority, saved = false }: Props) {
  const discount =
    product.comparePrice && Number(product.comparePrice) > Number(product.price)
      ? Math.round((1 - Number(product.price) / Number(product.comparePrice)) * 100)
      : null

  const imageUrl = product.images[0] ? `${product.images[0]}?f_auto,q_auto` : null
  const roundedRating = product.averageRating ? Math.round(product.averageRating) : 0
  const stars = '★'.repeat(roundedRating) + '☆'.repeat(5 - roundedRating)

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition hover:border-store-primary hover:shadow-md">
      <StoreLink href={`/product/${product.slug}`} className="absolute inset-0 z-[5]" aria-label={product.name} />

      <div className="relative aspect-[2/3] bg-bg sm:aspect-[3/4]">
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            priority={priority}
          />
        )}
        <div className="absolute inset-x-2 bottom-2 flex items-end justify-between sm:inset-x-3 sm:bottom-3">
          {discount ? (
            <span className="rounded-sm bg-danger px-2 py-[3px] font-body text-2xs leading-[14px] font-bold text-surface sm:py-1">
              {discount}% OFF
            </span>
          ) : product.isNew ? (
            <span className="rounded-sm bg-success px-2 py-[3px] font-body text-2xs leading-[14px] font-bold text-surface sm:py-1">
              NEW
            </span>
          ) : (
            <span />
          )}

          <WishlistHeart productId={product.id} initialSaved={saved} />
        </div>
      </div>

      <div className="p-3 sm:p-4">
        {product.category?.name && (
          <p className="mb-1 font-body text-sm text-muted-warm sm:mb-1.5 sm:text-xs sm:tracking-[0.05em] sm:uppercase">
            {product.category.name}
          </p>
        )}
        <p className="mb-1.5 line-clamp-2 font-body text-md leading-snug font-semibold text-fg sm:mb-2 sm:font-heading sm:text-base sm:leading-[130%] sm:font-bold">
          {product.name}
        </p>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="font-body text-md leading-snug font-bold text-fg sm:text-base sm:leading-5">
            {formatCurrency(Number(product.price))}
          </span>
          {discount !== null && (
            <span className="font-body text-2xs leading-tight text-muted-warm line-through sm:text-sm">
              {formatCurrency(Number(product.comparePrice))}
            </span>
          )}
        </div>
        {product.reviewCount > 0 && (
          <p className="mt-1 font-body text-2xs/[14px] text-[#16A550] sm:font-semibold sm:text-xs/tight">
            {stars} ({product.reviewCount})
          </p>
        )}
      </div>
    </div>
  )
}
