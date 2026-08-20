import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateOrderStatus } from '@/lib/data/orders'
import { verifyShiprocketWebhookToken } from '@/lib/shipping/shiprocket'

/**
 * Shiprocket has no concept of tenants, so this is not tenant-scoped via withTenant —
 * same reasoning as app/api/webhooks/razorpay/route.ts. The AWB (trackingId) is globally
 * unique, so it alone identifies the order. Shiprocket retries failed deliveries, so this
 * must be idempotent.
 */
export async function POST(request: NextRequest) {
  const token = request.headers.get('x-shiprocket-token')
  if (!verifyShiprocketWebhookToken(token)) {
    return NextResponse.json({ error: 'invalid token' }, { status: 401 })
  }

  const payload = (await request.json()) as { awb?: string; current_status?: string }

  // Our OrderStatus enum has no "out for delivery"/RTO states, and shipped -> delivered is
  // the only transition currently reachable from "shipped" — every other status is a no-op.
  if (payload.current_status !== 'Delivered' || !payload.awb) {
    return NextResponse.json({ ok: true, ignored: payload.current_status })
  }

  const order = await prisma.order.findFirst({
    where: { trackingId: payload.awb },
    select: { id: true, tenantId: true, status: true },
  })
  if (!order) {
    console.info('[shiprocket webhook] no order for awb', payload.awb)
    return NextResponse.json({ ok: true })
  }

  if (order.status === 'shipped') {
    await updateOrderStatus(order.tenantId, order.id, 'delivered')
  }

  return NextResponse.json({ ok: true })
}
