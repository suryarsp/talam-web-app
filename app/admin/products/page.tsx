import { requireOwnerTenant } from '@/lib/admin-guard'
import { listProductsForAdmin, getCategories } from '@/lib/data/products'
import { AdminProductsClient } from './products-client'

export const dynamic = 'force-dynamic'

export default async function AdminProductsPage() {
  const { tenantId } = await requireOwnerTenant()
  const [products, categories] = await Promise.all([
    listProductsForAdmin(tenantId),
    getCategories(tenantId),
  ])

  return <AdminProductsClient products={products} categories={categories} />
}
