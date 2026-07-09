import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getCategories, getProducts } from '@/lib/data/products'
import { ProductGrid } from '@/components/store/product-grid'

type Props = { params: Promise<{ categorySlug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  const { categorySlug } = await params
  if (!tenantId) return {}

  const categories = await getCategories(tenantId)
  const category = categories.find((c) => c.slug === categorySlug)
  return category ? { title: category.name } : {}
}

export default async function CategoryPage({ params }: Props) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  const { categorySlug } = await params
  if (!tenantId) notFound()

  const categories = await getCategories(tenantId)
  const category = categories.find((c) => c.slug === categorySlug)
  if (!category) notFound()

  const products = await getProducts(tenantId, { categoryId: category.id })

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-16 sm:py-10">
      <h1 className="mb-2 font-heading text-xl font-bold text-fg sm:text-2xl">{category.name}</h1>
      <p className="mb-4 font-body text-sm text-muted-warm">
        {products.length} {products.length === 1 ? 'item' : 'items'}
      </p>
      <ProductGrid products={products} />
    </main>
  )
}
