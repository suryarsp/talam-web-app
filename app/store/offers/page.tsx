import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getRequestTenantId } from '@/lib/data/tenant'
import { getProducts, getCategories } from '@/lib/data/products'
import { parseListingParams } from '@/lib/parse-listing-params'
import { ProductGrid } from '@/components/store/product-grid'
import { FilterBar } from '@/components/store/filter-bar'

export const metadata: Metadata = { title: 'Offers — Shop the Sale' }

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function OffersPage({ searchParams }: Props) {
  const tenantId = await getRequestTenantId()
  if (!tenantId) return notFound()

  const categories = await getCategories(tenantId)
  const sp = await searchParams
  const filters = parseListingParams(sp, categories)
  const products = await getProducts(tenantId, { ...filters, offersOnly: true })

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-16 sm:py-10">
      <h1 className="mb-2 font-heading text-xl font-bold text-fg sm:text-2xl">Offers</h1>
      <p className="mb-4 font-body text-sm text-muted-warm">
        {products.length} {products.length === 1 ? 'item' : 'items'} on sale
      </p>
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
        <FilterBar
          basePath="/offers"
          categories={categories}
          activeCategory={typeof sp.category === 'string' ? sp.category : undefined}
          activeSize={typeof sp.size === 'string' ? sp.size : undefined}
          minPrice={typeof sp.minPrice === 'string' ? sp.minPrice : undefined}
          maxPrice={typeof sp.maxPrice === 'string' ? sp.maxPrice : undefined}
          activeSort={typeof sp.sort === 'string' ? sp.sort : undefined}
        />
        <div className="flex-1">
          <ProductGrid products={products} />
        </div>
      </div>
    </main>
  )
}
