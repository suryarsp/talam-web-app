import type { Product, ProductCategory } from '@prisma/client'
import { ProductCard } from './product-card'

type ProductWithCategory = Product & {
  category?: Pick<ProductCategory, 'name'> | null
  reviewCount: number
  averageRating: number | null
  isNew: boolean
}

type Props = {
  products: ProductWithCategory[]
}

export function ProductGrid({ products }: Props) {
  if (products.length === 0) {
    return (
      <p className="py-16 text-center font-body text-muted-warm">
        No products yet. Check back soon.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
