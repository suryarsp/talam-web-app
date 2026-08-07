'use server'

import { revalidatePath } from 'next/cache'
import type { OnboardingStage, OnboardingStageStatus } from '@prisma/client'
import { requireSuperAdmin } from '@/lib/auth-guard'
import { withSuperAdmin } from '@/lib/prisma'

type ActionResult = { success: true } | { error: string }

function revalidateTenant(tenantId: string) {
  revalidatePath(`/super-admin/tenants/${tenantId}`)
  revalidatePath('/super-admin')
}

// razorpay stage is driven only by the Razorpay webhook (app/api/webhooks/razorpay/route.ts) —
// allowing manual edits here would let the UI and webhook disagree about state.
export async function updateOnboardingStageAction(
  tenantId: string,
  stage: OnboardingStage,
  status: OnboardingStageStatus
): Promise<ActionResult> {
  await requireSuperAdmin()

  if (stage === 'razorpay') {
    return { error: 'Razorpay stage is read-only — it is driven by the payment webhook.' }
  }

  await withSuperAdmin((db) =>
    db.tenant.update({ where: { id: tenantId }, data: { onboardingStage: stage, onboardingStageStatus: status } })
  )
  revalidateTenant(tenantId)
  return { success: true }
}

export async function suspendTenantAction(tenantId: string): Promise<ActionResult> {
  await requireSuperAdmin()
  await withSuperAdmin((db) => db.tenant.update({ where: { id: tenantId }, data: { suspendedAt: new Date() } }))
  revalidateTenant(tenantId)
  return { success: true }
}

export async function unsuspendTenantAction(tenantId: string): Promise<ActionResult> {
  await requireSuperAdmin()
  await withSuperAdmin((db) => db.tenant.update({ where: { id: tenantId }, data: { suspendedAt: null } }))
  revalidateTenant(tenantId)
  return { success: true }
}
