import { requireOwnerTenant } from '@/lib/admin-guard'
import { listProductsForAdmin, getCategories } from '@/lib/data/products'
import { listOccasions } from '@/lib/data/occasions'
import { AdminProductsClient } from './products-client'

export const dynamic = 'force-dynamic'

export default async function AdminProductsPage() {
  const { tenantId } = await requireOwnerTenant()
  const [products, categories, occasions] = await Promise.all([
    listProductsForAdmin(tenantId),
    getCategories(tenantId),
    listOccasions(tenantId),
  ])

  return <AdminProductsClient products={products} categories={categories} occasions={occasions} />
}
