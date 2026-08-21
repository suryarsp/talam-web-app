import type { OnboardingStage, OnboardingStageStatus } from '@prisma/client'
import { withSuperAdmin } from '@/lib/prisma'
import { normalizePaymentConfig, type RazorpayStatus } from '@/lib/payments/config'
import { normalizeShippingConfig, type ShippingMode } from '@/lib/shipping/shipping-config'

const tenantSelect = {
  id: true,
  name: true,
  slug: true,
  onboardingStage: true,
  onboardingStageStatus: true,
  paymentConfig: true,
  shippingConfig: true,
  suspendedAt: true,
} as const

type TenantRow = {
  id: string
  name: string
  slug: string
  onboardingStage: OnboardingStage | null
  onboardingStageStatus: OnboardingStageStatus | null
  paymentConfig: unknown
  shippingConfig: unknown
  suspendedAt: Date | null
}

export type SuperAdminTenant = {
  id: string
  name: string
  slug: string
  onboardingStage: OnboardingStage | null
  onboardingStageStatus: OnboardingStageStatus | null
  razorpayStatus: RazorpayStatus | undefined
  shippingMode: ShippingMode
  // Unlike razorpayStatus, these carry timestamps: "how long has this shop been waiting
  // for us" is the thing staff actually need off the assist queue.
  shippingRequestedAt: string | null
  shippingConnectedAt: string | null
  suspendedAt: Date | null
}

function toSuperAdminTenant(t: TenantRow): SuperAdminTenant {
  const shipping = normalizeShippingConfig(t.shippingConfig)
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    onboardingStage: t.onboardingStage,
    onboardingStageStatus: t.onboardingStageStatus,
    razorpayStatus: normalizePaymentConfig(t.paymentConfig).razorpay.status,
    // Only the derived fields cross into the client component — the raw config stays here,
    // same as paymentConfig above.
    shippingMode: shipping.mode,
    shippingRequestedAt: shipping.requestedAt,
    shippingConnectedAt: shipping.connectedAt,
    suspendedAt: t.suspendedAt,
  }
}

export async function getAllTenants(): Promise<SuperAdminTenant[]> {
  const rows = await withSuperAdmin((db) =>
    db.tenant.findMany({ select: tenantSelect, orderBy: { createdAt: 'desc' } })
  )
  return rows.map(toSuperAdminTenant)
}

export async function getTenantDetail(tenantId: string): Promise<SuperAdminTenant | null> {
  const row = await withSuperAdmin((db) => db.tenant.findUnique({ where: { id: tenantId }, select: tenantSelect }))
  return row ? toSuperAdminTenant(row) : null
}

export type FlaggedOrder = {
  id: string
  tenantName: string
  total: number
  paymentProvider: string | null
  utr: string | null
  daysPending: number
}

// ponytail: days-pending measured from disputeFlaggedAt (when ops picked it up for the queue),
// not order creation — that's what tells ops how stale their own follow-up is.
export async function getFlaggedOrders(): Promise<FlaggedOrder[]> {
  const rows = await withSuperAdmin((db) =>
    db.order.findMany({
      where: { disputeFlaggedAt: { not: null } },
      select: {
        id: true,
        total: true,
        paymentProvider: true,
        paymentId: true,
        disputeFlaggedAt: true,
        tenant: { select: { name: true } },
      },
      orderBy: { disputeFlaggedAt: 'asc' },
    })
  )
  const now = Date.now()
  return rows.map((o) => ({
    id: o.id,
    tenantName: o.tenant.name,
    total: Number(o.total),
    paymentProvider: o.paymentProvider,
    utr: o.paymentId,
    daysPending: Math.floor((now - o.disputeFlaggedAt!.getTime()) / (24 * 60 * 60 * 1000)),
  }))
}
