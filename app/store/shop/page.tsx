import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getProducts, getCategories, type ProductSort } from '@/lib/data/products'
import { ProductGrid } from '@/components/store/product-grid'
import { FilterBar } from '@/components/store/filter-bar'

export const revalidate = 1800 // 30 min ISR

const VALID_SORTS: ProductSort[] = ['newest', 'price-asc', 'price-desc', 'popular']

type PageProps = {
  searchParams: Promise<{
    category?: string
    size?: string
    minPrice?: string
    maxPrice?: string
    sort?: string
  }>
}

export default async function ShopPage({ searchParams }: PageProps) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  if (!tenantId) notFound()

  const { category, size, minPrice, maxPrice, sort } = await searchParams
  const categories = await getCategories(tenantId)
  const activeCategory = categories.find((c) => c.slug === category)
  const activeSort = VALID_SORTS.includes(sort as ProductSort) ? (sort as ProductSort) : undefined

  const products = await getProducts(tenantId, {
    categoryId: activeCategory?.id,
    size,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    sort: activeSort,
  })

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-12 sm:py-10">
      <h1 className="mb-4 font-heading text-xl leading-relaxed font-bold text-fg sm:mb-6 sm:text-2xl">Shop All</h1>
      <div className="flex flex-col gap-6 sm:flex-row">
        <Suspense>
          <FilterBar
            categories={categories}
            activeCategory={category}
            activeSize={size}
            minPrice={minPrice}
            maxPrice={maxPrice}
            activeSort={sort}
          />
        </Suspense>
        <div className="min-w-0 flex-1">
          <p className="mb-4 font-body text-sm text-muted-warm">
            {products.length} {products.length === 1 ? 'item' : 'items'}
          </p>
          <ProductGrid products={products} />
        </div>
      </div>
    </main>
  )
}
