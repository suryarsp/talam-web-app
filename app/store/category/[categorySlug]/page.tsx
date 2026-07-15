import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getDevTenantId } from '@/lib/data/tenant'
import { getCategories, getProducts } from '@/lib/data/products'
import { ProductGrid } from '@/components/store/product-grid'

type Props = { params: Promise<{ categorySlug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categorySlug } = await params
  const tenantId = await getDevTenantId()
  const category = tenantId ? (await getCategories(tenantId)).find(c => c.slug === categorySlug) : null
  return category ? { title: category.name } : {}
}

export default async function CategoryPage({ params }: Props) {
  const { categorySlug } = await params
  const tenantId = await getDevTenantId()
  const category = tenantId ? (await getCategories(tenantId)).find(c => c.slug === categorySlug) : null
  if (!category || !tenantId) notFound()

  const products = await getProducts(tenantId, { categoryId: category.id })

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-16 sm:py-10">
      <h1 className="mb-2 font-heading text-xl font-bold text-fg sm:text-2xl">{category.name}</h1>
      <p className="mb-4 font-body text-sm text-muted-warm">
        {products.length} {products.length === 1 ? 'item' : 'items'}
      </p>
      <ProductGrid products={products as any} />
    </main>
  )
}
