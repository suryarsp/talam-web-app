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
 * Always answers 200, even on a missing/wrong token or unparseable body: Shiprocket's own
 * webhook-URL validation requires "open access" and rejects any URL that answers a save-time
 * probe with a non-2xx. A bad or absent token still means the status update is silently
 * skipped internally — this only changes what's returned over HTTP, not who can flip an
 * order to delivered. That's also a smaller information leak than the previous 401, which
 * told a caller whether a given AWB existed in our system.
 *
 * Shiprocket retries failed deliveries, so this must stay idempotent.
 */
export async function POST(request: NextRequest) {
  const received = request.headers.get('x-shiprocket-token')
  if (!received) {
    // A request with no token can never authenticate a status update either way, so this
    // doubles as the "open access" probe Shiprocket's webhook-URL validation sends — no
    // custom header, expects 2xx — without a DB round-trip.
    return NextResponse.json({ ok: true })
  }

  let payload: { awb?: string; current_status?: string }
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

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
    console.info('[shiprocket webhook] token mismatch for tenant', order.tenantId)
    return NextResponse.json({ ok: true })
  }

  if (order.status === 'shipped') {
    await updateOrderStatus(order.tenantId, order.id, 'delivered')
  }

  return NextResponse.json({ ok: true })
}
