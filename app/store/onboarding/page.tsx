import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { requireAuth, requireTenant } from '@/lib/auth-guard'
import { withTenant } from '@/lib/prisma'
import { getCategories } from '@/lib/data/products'
import { OnboardingWizard } from './onboarding-wizard'

export default async function OnboardingPage() {
  const { tenantId } = await requireTenant()
  const user = await requireAuth()
  const storeBase = (await headers()).get('x-store-base') ?? ''

  const customer = await withTenant(tenantId, (db) =>
    db.customer.findUnique({
      where: { id: user.id },
      select: { onboardingComplete: true },
    })
  )

  if (customer?.onboardingComplete) redirect(storeBase || '/')

  const categories = await getCategories(tenantId)
  const categoryNames = categories.map((c) => c.name)

  // ponytail: derive available sizes from products rather than hardcoding
  const products = await withTenant(tenantId, (db) =>
    db.product.findMany({
      where: { tenantId, isActive: true },
      select: { sizes: true },
    })
  )
  const sizes = Array.from(new Set(products.flatMap((p) => p.sizes))).sort()

  return (
    <OnboardingWizard
      categories={categoryNames}
      sizes={sizes.length > 0 ? sizes : ['XS', 'S', 'M', 'L', 'XL', 'XXL']}
      storeBase={storeBase}
    />
  )
}
