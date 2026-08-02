import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getTenantStorefront, getRequestTenantId, getMissingStoreConfig } from '@/lib/data/tenant'
import { getCategories, getActiveDepartments } from '@/lib/data/products'
import { DEPARTMENTS } from '@/lib/departments'
import { StoreBaseProvider } from '@/components/store/store-context'
import { StoreHeader } from '@/components/store/store-header'
import { StoreFooter } from '@/components/store/store-footer'
import { MobileTabBar } from '@/components/store/mobile-tab-bar'
import { CartToast } from '@/components/store/cart-toast'
import { TapFeedback } from '@/components/store/tap-feedback'

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const tenantId = await getRequestTenantId()

  if (!tenantId) notFound()

  const [tenant, categories, hdrs, missingConfig, activeDepartments] = await Promise.all([
    getTenantStorefront(tenantId),
    getCategories(tenantId),
    headers(),
    getMissingStoreConfig(tenantId),
    getActiveDepartments(tenantId),
  ])

  if (!tenant) notFound()

  const departments = DEPARTMENTS.filter((d) => activeDepartments.includes(d.value))

  // if (missingConfig.length > 0) {
  //   return (
  //     <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-2 bg-bg px-6 text-center">
  //       <h1 className="font-heading text-2xl font-bold text-fg">Coming soon</h1>
  //       <p className="max-w-sm font-body text-sm text-muted-warm">
  //         {tenant.name} is still setting up their store. Check back shortly.
  //       </p>
  //     </div>
  //   )
  // }

  const storeBase = hdrs.get('x-store-base') ?? ''

  return (
    <StoreBaseProvider base={storeBase}>
      <div style={tenant.brandColor ? ({ '--color-store-primary': tenant.brandColor } as React.CSSProperties) : undefined}>
        <StoreHeader tenant={tenant} departments={departments} />
        <div className="pb-20 sm:pb-0">
          {children}
          <StoreFooter tenant={tenant} categories={categories} />
        </div>
        <MobileTabBar />
        <CartToast />
        <TapFeedback />
      </div>
    </StoreBaseProvider>
  )
}
