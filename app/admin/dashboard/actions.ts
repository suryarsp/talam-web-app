'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { requireOwnerSession, requireOwnerTenant } from '@/lib/admin-guard'
import { prisma } from '@/lib/prisma'
import { getStoreUrl } from '@/lib/tenant-url'
import { getMissingStoreConfig, type MissingConfigItem } from '@/lib/data/tenant'
import { sendStoreLiveEmail } from '@/lib/resend'
import { getDashboardData, type DashboardData } from '@/lib/data/dashboard'

export async function getDashboardDataAction(): Promise<DashboardData> {
  const { tenantId } = await requireOwnerTenant()
  return getDashboardData(tenantId)
}

export async function getLiveStoreUrl(): Promise<string | null> {
  const { userId } = await requireOwnerSession()
  const tenant = await prisma.tenant.findUnique({ where: { ownerId: userId }, select: { slug: true } })
  if (!tenant) return null

  const host = (await headers()).get('host')
  const isLocalDev = host?.includes('localhost') ?? false
  return getStoreUrl(tenant.slug, isLocalDev)
}

export async function getTenantLiveStateAction(): Promise<{ isLive: boolean; missing: MissingConfigItem[] }> {
  const { tenantId } = await requireOwnerTenant()
  const [tenant, missing] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { isLive: true } }),
    getMissingStoreConfig(tenantId),
  ])
  return { isLive: tenant?.isLive ?? false, missing }
}

export async function goLiveAction(): Promise<{ error?: string }> {
  const { tenantId } = await requireOwnerTenant()
  const missing = await getMissingStoreConfig(tenantId)
  if (missing.length > 0) return { error: 'Finish the remaining setup steps before going live.' }

  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: { isLive: true },
    select: { name: true, slug: true, contactEmail: true },
  })
  revalidatePath('/admin/dashboard')
  revalidatePath('/store')

  if (tenant.contactEmail) {
    const isLocalDev = (await headers()).get('host')?.includes('localhost') ?? false
    await sendStoreLiveEmail(tenant.contactEmail, { storeName: tenant.name, storeUrl: getStoreUrl(tenant.slug, isLocalDev) })
  }

  return {}
}

export async function markSetupTourSeenAction(): Promise<void> {
  const { tenantId } = await requireOwnerTenant()
  await prisma.tenant.update({ where: { id: tenantId }, data: { hasSeenSetupTour: true } })
}
