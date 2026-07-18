import type { Product, ProductCategory } from '@prisma/client'
import { ProductCard } from './product-card'
import { CarouselScroller } from './carousel-scroller'

type ProductWithCategory = Product & {
  category?: Pick<ProductCategory, 'name'> | null
  reviewCount: number
  averageRating: number | null
  isNew: boolean
}

type Props = {
  products: ProductWithCategory[]
}

export function ProductCarousel({ products }: Props) {
  if (products.length === 0) {
    return (
      <p className="py-16 text-center font-body text-muted-warm">
        No products yet. Check back soon.
      </p>
    )
  }

  return (
    <CarouselScroller>
      {products.map((product) => (
        <div key={product.id} className="w-[45vw] shrink-0 snap-start sm:w-[260px]">
          <ProductCard product={product} />
        </div>
      ))}
    </CarouselScroller>
  )
}
