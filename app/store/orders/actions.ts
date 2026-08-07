'use server'

import { requireAuth, requireTenant } from '@/lib/auth-guard'
import { withTenant } from '@/lib/prisma'

/**
 * Flags an order for ops review — no messaging system behind this, it just sets
 * disputeFlaggedAt/disputeReason for the super-admin "Flagged Orders" queue to pick up.
 * Idempotent: re-reporting an already-flagged order just updates the reason.
 */
export async function reportOrderProblemAction(orderId: string, reason: string): Promise<{ error?: string }> {
  const user = await requireAuth('/orders')
  const { tenantId } = await requireTenant()

  const trimmed = reason.trim()
  if (!trimmed) return { error: 'Please describe the problem.' }

  const order = await withTenant(tenantId, (db) =>
    db.order.findFirst({ where: { id: orderId, tenantId, customerId: user.id }, select: { id: true } })
  )
  if (!order) return { error: 'Order not found.' }

  await withTenant(tenantId, (db) =>
    db.order.update({
      where: { id: orderId },
      data: { disputeFlaggedAt: new Date(), disputeReason: trimmed },
    })
  )

  return {}
}
