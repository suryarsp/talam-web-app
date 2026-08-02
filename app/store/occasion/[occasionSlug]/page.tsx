import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getRequestTenantId } from '@/lib/data/tenant'
import { getOccasionBySlug } from '@/lib/data/occasions'
import { getProducts, getCategories } from '@/lib/data/products'
import { getOccasionTheme } from '@/lib/occasion-themes'
import { cacheForTenant } from '@/lib/storefront-cache'
import { parseListingParams } from '@/lib/parse-listing-params'
import { ProductGrid } from '@/components/store/product-grid'
import { ProductCarousel } from '@/components/store/product-carousel'
import { OccasionHeroCarousel } from '@/components/store/occasion-hero-carousel'
import { FilterBar } from '@/components/store/filter-bar'

type Props = {
  params: Promise<{ occasionSlug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { occasionSlug } = await params
  const tenantId = await getRequestTenantId()
  const occasion = tenantId ? await getOccasionBySlug(tenantId, occasionSlug) : null
  return occasion ? { title: `${occasion.name} — Shop the Occasion` } : {}
}

export default async function OccasionPage({ params, searchParams }: Props) {
  const { occasionSlug } = await params
  const tenantId = await getRequestTenantId()
  const occasion = tenantId ? await getOccasionBySlug(tenantId, occasionSlug) : null
  if (!occasion || !tenantId) notFound()

  const categories = await getCategories(tenantId)
  const sp = await searchParams
  const filters = parseListingParams(sp, categories)
  const products = await cacheForTenant(
    () => getProducts(tenantId, { ...filters, tagId: occasion.id }),
    ['occasion-products', tenantId, occasionSlug, JSON.stringify(filters)],
    tenantId,
    1800
  )
  const theme = getOccasionTheme(occasion.themeKey)

  return (
    <main>
      <OccasionHeroCarousel
        name={occasion.name}
        emoji={occasion.emoji}
        theme={theme}
        featuredProducts={products}
      />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-16 sm:py-10">
        <p className="mb-4 font-body text-sm text-muted-warm">
          {products.length} {products.length === 1 ? 'item' : 'items'}
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
          <FilterBar
            basePath={`/occasion/${occasionSlug}`}
            categories={categories}
            activeCategory={typeof sp.category === 'string' ? sp.category : undefined}
            activeSize={typeof sp.size === 'string' ? sp.size : undefined}
            minPrice={typeof sp.minPrice === 'string' ? sp.minPrice : undefined}
            maxPrice={typeof sp.maxPrice === 'string' ? sp.maxPrice : undefined}
            activeSort={typeof sp.sort === 'string' ? sp.sort : undefined}
          />
          <div className="flex-1">
            {occasion.layout === 'carousel' ? (
              <ProductCarousel products={products} />
            ) : (
              <ProductGrid products={products} />
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
