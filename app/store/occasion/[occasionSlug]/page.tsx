import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getRequestTenantId } from '@/lib/data/tenant'
import { getOccasionBySlug } from '@/lib/data/occasions'
import { getProducts } from '@/lib/data/products'
import { getOccasionTheme } from '@/lib/occasion-themes'
import { ProductGrid } from '@/components/store/product-grid'
import { ProductCarousel } from '@/components/store/product-carousel'

type Props = { params: Promise<{ occasionSlug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { occasionSlug } = await params
  const tenantId = await getRequestTenantId()
  const occasion = tenantId ? await getOccasionBySlug(tenantId, occasionSlug) : null
  return occasion ? { title: `${occasion.name} — Shop the Occasion` } : {}
}

export default async function OccasionPage({ params }: Props) {
  const { occasionSlug } = await params
  const tenantId = await getRequestTenantId()
  const occasion = tenantId ? await getOccasionBySlug(tenantId, occasionSlug) : null
  if (!occasion || !tenantId) notFound()

  const products = await getProducts(tenantId, { tagId: occasion.id })
  const theme = getOccasionTheme(occasion.themeKey)

  return (
    <main>
      <div
        className="flex flex-col items-center justify-center gap-2 px-4 py-14 text-center sm:py-20"
        style={{ backgroundImage: theme.gradient }}
      >
        <span className="text-5xl leading-none">{occasion.emoji || '🎉'}</span>
        <h1 className="font-heading text-2xl font-bold text-white sm:text-3xl">{occasion.name}</h1>
        <p className="font-body text-sm text-white/80 sm:text-base">{theme.headline}</p>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-16 sm:py-10">
        <p className="mb-4 font-body text-sm text-muted-warm">
          {products.length} {products.length === 1 ? 'item' : 'items'}
        </p>
        {occasion.layout === 'carousel' ? (
          <ProductCarousel products={products as any} />
        ) : (
          <ProductGrid products={products as any} />
        )}
      </div>
    </main>
  )
}
