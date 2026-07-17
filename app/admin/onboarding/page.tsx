import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { requireOwnerSession } from '@/lib/admin-guard'
import { prisma } from '@/lib/prisma'
import { getStoreUrl } from '@/lib/tenant-url'
import { OnboardingWizard } from './onboarding-wizard'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const { userId } = await requireOwnerSession()

  const tenant = await prisma.tenant.findUnique({
    where: { ownerId: userId },
    include: {
      about: { select: { description: true } },
      branches: { orderBy: { sortOrder: 'asc' }, take: 1 },
      products: { orderBy: { createdAt: 'asc' }, take: 1 },
    },
  })

  if (tenant?.isOnboarded) {
    const host = (await headers()).get('host')
    const isLocalDev = host?.includes('localhost') ?? false
    redirect(getStoreUrl(tenant.slug, isLocalDev))
  }

  return (
    <OnboardingWizard
      initialTenant={tenant}
      initialBranch={tenant?.branches[0] ?? null}
      initialProduct={tenant?.products[0] ?? null}
    />
  )
}
