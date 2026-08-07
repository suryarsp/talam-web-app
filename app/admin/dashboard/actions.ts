'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { OnboardingStage, OnboardingStageStatus } from '@prisma/client'
import { requireOwnerSession, requireOwnerTenant } from '@/lib/admin-guard'
import { prisma } from '@/lib/prisma'
import { getStoreUrl } from '@/lib/tenant-url'
import { getMissingStoreConfig, type MissingConfigItem } from '@/lib/data/tenant'
import { normalizePaymentConfig, type RazorpayStatus } from '@/lib/payments/config'
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

// ── Onboarding stepper ──
// The 4 tenant-facing onboarding stages, in order. `razorpay` is a special case: its status
// comes from paymentConfig.razorpay.status (set by the Razorpay onboarding flow), not from
// onboardingStageStatus, since that stage's progress lives entirely in Razorpay's own state.
const ONBOARDING_STAGES: OnboardingStage[] = ['business_setup', 'license', 'razorpay', 'store_live']

const STAGE_LABEL: Record<OnboardingStage, string> = {
  business_setup: 'Business Setup',
  license: 'License',
  razorpay: 'Razorpay',
  store_live: 'Store Live',
}

export type OnboardingStepInfo = { stage: OnboardingStage; label: string; status: OnboardingStageStatus }

function razorpayStepStatus(status: RazorpayStatus | undefined): OnboardingStageStatus {
  if (status === 'activated') return 'done'
  if (status === 'pending' || status === 'needs_clarification') return 'in_progress'
  if (status === 'rejected') return 'blocked'
  return 'not_started'
}

function otherStepStatus(stage: OnboardingStage, currentStage: OnboardingStage, currentStatus: OnboardingStageStatus): OnboardingStageStatus {
  const stageIdx = ONBOARDING_STAGES.indexOf(stage)
  const currentIdx = ONBOARDING_STAGES.indexOf(currentStage)
  if (stageIdx < currentIdx) return 'done'
  if (stageIdx === currentIdx) return currentStatus
  return 'not_started'
}

export async function getOnboardingStepperAction(): Promise<OnboardingStepInfo[]> {
  const { tenantId } = await requireOwnerTenant()
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { onboardingStage: true, onboardingStageStatus: true, paymentConfig: true },
  })

  const currentStage = tenant?.onboardingStage ?? 'business_setup'
  const currentStatus = tenant?.onboardingStageStatus ?? 'not_started'
  const razorpayStatus = normalizePaymentConfig(tenant?.paymentConfig).razorpay.status

  return ONBOARDING_STAGES.map((stage) => ({
    stage,
    label: STAGE_LABEL[stage],
    status: stage === 'razorpay' ? razorpayStepStatus(razorpayStatus) : otherStepStatus(stage, currentStage, currentStatus),
  }))
}
