import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getRequestTenantId } from '@/lib/data/tenant'
import { getCategories, getProducts } from '@/lib/data/products'
import { cacheForTenant } from '@/lib/storefront-cache'
import { parseListingParams } from '@/lib/parse-listing-params'
import { ProductGrid } from '@/components/store/product-grid'
import { FilterBar } from '@/components/store/filter-bar'

type Props = {
  params: Promise<{ categorySlug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categorySlug } = await params
  const tenantId = await getRequestTenantId()
  const category = tenantId ? (await getCategories(tenantId)).find(c => c.slug === categorySlug) : null
  return category ? { title: category.name } : {}
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { categorySlug } = await params
  const tenantId = await getRequestTenantId()
  const categories = tenantId ? await getCategories(tenantId) : []
  const category = categories.find(c => c.slug === categorySlug)
  if (!category || !tenantId) notFound()

  const sp = await searchParams
  const filters = parseListingParams(sp, categories)
  const products = await cacheForTenant(
    () => getProducts(tenantId, { ...filters, categoryId: category.id }),
    ['category-products', tenantId, categorySlug, JSON.stringify(filters)],
    tenantId,
    1800
  )

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-16 sm:py-10">
      <h1 className="mb-2 font-heading text-xl font-bold text-fg sm:text-2xl">{category.name}</h1>
      <p className="mb-4 font-body text-sm text-muted-warm">
        {products.length} {products.length === 1 ? 'item' : 'items'}
      </p>
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
        <FilterBar
          basePath={`/category/${categorySlug}`}
          categories={categories}
          activeCategory={categorySlug}
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
