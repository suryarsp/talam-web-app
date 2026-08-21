import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateOrderStatus } from '@/lib/data/orders'
import { timingSafeEqualStr } from '@/lib/crypto'

/**
 * Shiprocket delivery webhook.
 *
 * Not tenant-scoped via withTenant — the AWB lookup is inherently cross-tenant, same
 * reasoning as app/api/webhooks/razorpay/route.ts. The AWB is assigned by the courier
 * (Delhivery, Bluedart, …) and is unique within that courier's numbering regardless of
 * which Shiprocket account requested it, so it alone identifies the order.
 *
 * Authentication is per-tenant, which is why the order lookup has to come first: under
 * Model A every shop configures this webhook in *their own* Shiprocket dashboard, so a
 * single shared secret would be handed to every shop — and since orders are found by AWB
 * alone, any shop holding it could mark a competitor's order delivered. We resolve the
 * order, read its tenant, then check the token belonging to that tenant.
 *
 * Accepted trade-off: an unknown AWB returns 200 while a known AWB with a bad token returns
 * 401, which reveals whether an AWB exists in our system. Low value to an attacker (they
 * would need the AWB already), and answering 401 to unknown AWBs would make Shiprocket
 * retry no-op deliveries indefinitely.
 *
 * Shiprocket retries failed deliveries, so this must stay idempotent.
 */
export async function POST(request: NextRequest) {
  const received = request.headers.get('x-shiprocket-token')
  if (!received) {
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

  const credential = await prisma.shippingCredential.findUnique({
    where: { tenantId: order.tenantId },
    select: { webhookToken: true },
  })
  if (!credential || !timingSafeEqualStr(credential.webhookToken, received)) {
    return NextResponse.json({ error: 'invalid token' }, { status: 401 })
  }

  if (order.status === 'shipped') {
    await updateOrderStatus(order.tenantId, order.id, 'delivered')
  }

  return NextResponse.json({ ok: true })
}
