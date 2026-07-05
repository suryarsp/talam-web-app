import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getTenantStorefront } from '@/lib/data/tenant'
import { getCategories } from '@/lib/data/products'
import { StoreHeader } from '@/components/store/store-header'
import { StoreFooter } from '@/components/store/store-footer'
import { MobileTabBar } from '@/components/store/mobile-tab-bar'

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) notFound()

  const [tenant, categories] = await Promise.all([
    getTenantStorefront(tenantId),
    getCategories(tenantId),
  ])

  if (!tenant) notFound()

  return (
    <>
      <StoreHeader tenant={tenant} />
      <div className="pb-20 sm:pb-0">
        {children}
        <StoreFooter tenant={tenant} categories={categories} />
      </div>
      <MobileTabBar />
    </>
  )
}
