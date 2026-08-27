'use server'

import { revalidatePath } from 'next/cache'
import type { OnboardingStage, OnboardingStageStatus, Tier, AdminStaffRole } from '@prisma/client'
import { requireSuperAdmin, getSuperAdminRole } from '@/lib/auth-guard'
import { withSuperAdmin } from '@/lib/prisma'
import { connectShiprocketAccount, getShippingConfig } from '@/lib/shipping/shiprocket-account'
import { addAdminStaff, removeAdminStaff, getAdminStaff } from '@/lib/data/admin-staff'
import { canAccessSection, SECTION_LABEL, ROLE_LABEL, type AdminSection } from '@/lib/data/admin-permissions'
import { sendStaffInviteEmail } from '@/lib/resend'

type ActionResult = { success: true } | { error: string }

function revalidateTenant(tenantId: string) {
  revalidatePath(`/super-admin/tenants/${tenantId}`)
  revalidatePath('/super-admin/tenants')
  revalidatePath('/super-admin')
}

/**
 * Shared section gate for server actions — the same access check the pages use
 * (requireSuperAdminSection), but returning an ActionResult error instead of redirecting,
 * since an action's caller expects a result back, not a navigation.
 */
async function requireAdminSection(section: AdminSection): Promise<{ email: string } | { error: string }> {
  const user = await requireSuperAdmin()
  const role = await getSuperAdminRole(user.email!)
  if (!canAccessSection(role, section)) {
    return { error: `You don't have access to ${SECTION_LABEL[section]}.` }
  }
  return { email: user.email!.toLowerCase() }
}

// razorpay stage is driven only by the Razorpay webhook (app/api/webhooks/razorpay/route.ts) —
// allowing manual edits here would let the UI and webhook disagree about state.
export async function updateOnboardingStageAction(
  tenantId: string,
  stage: OnboardingStage,
  status: OnboardingStageStatus
): Promise<ActionResult> {
  const gate = await requireAdminSection('tenants')
  if ('error' in gate) return gate

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
  const gate = await requireAdminSection('tenants')
  if ('error' in gate) return gate

  await withSuperAdmin((db) => db.tenant.update({ where: { id: tenantId }, data: { suspendedAt: new Date() } }))
  revalidateTenant(tenantId)
  return { success: true }
}

export async function unsuspendTenantAction(tenantId: string): Promise<ActionResult> {
  const gate = await requireAdminSection('tenants')
  if ('error' in gate) return gate

  await withSuperAdmin((db) => db.tenant.update({ where: { id: tenantId }, data: { suspendedAt: null } }))
  revalidateTenant(tenantId)
  return { success: true }
}

// ── Shipping (Model A) ──
// Staff-assisted onboarding: support walks a shop through Shiprocket signup by phone, then
// enters the resulting credentials here on their behalf. Deliberately the *same*
// connectShiprocketAccount the tenant's own Settings tab calls — only the guard and the
// recorded actor differ, so there is one verification and storage path, not two.

export async function staffConnectShippingAction(
  tenantId: string,
  email: string,
  password: string,
  pickupLocation: string
): Promise<ActionResult> {
  const gate = await requireAdminSection('tenants')
  if ('error' in gate) return gate

  const result = await connectShiprocketAccount({
    tenantId,
    email,
    password,
    pickupLocation,
    actor: 'staff',
  })
  if (result.error) return { error: result.error }

  revalidateTenant(tenantId)
  return { success: true }
}

/** Lets a staff member claim an assist request so it stops reading as untouched in the list. */
export async function markShippingAssistInProgressAction(tenantId: string): Promise<ActionResult> {
  const gate = await requireAdminSection('tenants')
  if ('error' in gate) return gate

  const current = await getShippingConfig(tenantId)
  if (current.mode !== 'assist_requested') {
    return { error: 'This store has no open Shiprocket setup request.' }
  }

  await withSuperAdmin((db) =>
    db.tenant.update({
      where: { id: tenantId },
      data: { shippingConfig: { ...current, mode: 'assist_in_progress' } },
    })
  )
  revalidateTenant(tenantId)
  return { success: true }
}

// ── Tier override ──
// Manually setting `tier` bypasses whatever billing/payment flow would normally move a
// tenant between plans — used for comps, downgrades during a dispute, or fixing a stuck
// upgrade. Deliberately a single direct write: there is no approval step, same as suspend.
export async function overrideTenantTierAction(tenantId: string, tier: Tier): Promise<ActionResult> {
  const gate = await requireAdminSection('tenants')
  if ('error' in gate) return gate

  await withSuperAdmin((db) => db.tenant.update({ where: { id: tenantId }, data: { tier } }))
  revalidateTenant(tenantId)
  return { success: true }
}

// ── Staff ──
// Only 'staff' section access — i.e. role 'owner', or an env-listed SUPER_ADMIN_EMAILS
// address (see getSuperAdminRole) — can invite or remove staff.

export async function inviteStaffAction(email: string, name: string, role: AdminStaffRole): Promise<ActionResult> {
  const gate = await requireAdminSection('staff')
  if ('error' in gate) return gate

  if (!email.includes('@')) return { error: 'Enter a valid email address.' }
  if (!name.trim()) return { error: 'Enter a name.' }

  try {
    await addAdminStaff(email, name, role)
  } catch {
    return { error: 'That email is already on staff.' }
  }

  const loginUrl = `${process.env.NEXT_PUBLIC_ROOT_DOMAIN ? `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}` : ''}/super-admin/login`
  await sendStaffInviteEmail(email, { name, role: ROLE_LABEL[role], loginUrl })

  revalidatePath('/super-admin/staff')
  return { success: true }
}

export async function removeStaffAction(id: string): Promise<ActionResult> {
  const gate = await requireAdminSection('staff')
  if ('error' in gate) return gate

  const target = (await getAdminStaff()).find((s) => s.id === id)
  if (target?.email === gate.email) {
    return { error: "You can't remove your own staff access." }
  }

  await removeAdminStaff(id)
  revalidatePath('/super-admin/staff')
  return { success: true }
}
