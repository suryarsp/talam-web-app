import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTenantStorefront } from '@/lib/data/tenant'
import { getProducts, getCategories } from '@/lib/data/products'
import { HeroBanner } from '@/components/store/hero-banner'
import { CategoryPills } from '@/components/store/category-pills'
import { ProductGrid } from '@/components/store/product-grid'
import { FestivalEdit } from '@/components/store/festival-edit'
import { OurStory } from '@/components/store/our-story'

export const revalidate = 3600 // 1 hour ISR

export default async function StorePage() {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) notFound()

  const [tenant, products, categories] = await Promise.all([
    getTenantStorefront(tenantId),
    getProducts(tenantId),
    getCategories(tenantId),
  ])

  if (!tenant) notFound()

  return (
    <main>
      <HeroBanner tenant={tenant} />
      <CategoryPills categories={categories} />

      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-12 sm:py-15">
        <div className="mb-4 flex items-baseline justify-between sm:mb-8">
          <div className="flex flex-col gap-1 sm:gap-2">
            <h2 className="font-heading text-xl leading-relaxed font-bold text-fg sm:text-[36px] sm:leading-[44px]">
              <span className="sm:hidden">New Arrivals</span>
              <span className="hidden sm:inline">New Collections</span>
            </h2>
            <p className="hidden font-body text-[15px] leading-snug text-muted-warm sm:block">
              Handpicked ethnic wear and artisan crafts
            </p>
          </div>
          <Link
            href="/shop"
            className="font-body text-sm leading-tight font-medium text-store-primary sm:text-md sm:font-semibold sm:leading-snug"
          >
            View All →
          </Link>
        </div>
        <ProductGrid products={products} />
      </section>

      <FestivalEdit />
      <OurStory tenant={tenant} />
    </main>
  )
}
