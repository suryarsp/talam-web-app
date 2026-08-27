import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyRazorpayWebhook } from '@/lib/payments/razorpay'
import { sendPaymentFailedEmail } from '@/lib/resend'
import { orderCode } from '@/lib/data/storefront-orders'
import { getStoreUrl } from '@/lib/tenant-url'

/**
 * The client-side handler in checkout already verifies and marks orders paid. This
 * exists for the case it can't cover: the customer closing the tab after paying but
 * before the callback fires. Razorpay retries this endpoint, so it must be idempotent.
 *
 * Not tenant-scoped via withTenant — Razorpay has no idea what a tenant is, and the
 * order id in the receipt is globally unique.
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-razorpay-signature')
  // Signature is over the exact bytes sent, so read the raw body — never re-serialise.
  const rawBody = await request.text()

  if (!signature || !verifyRazorpayWebhook(rawBody, signature)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(rawBody) as {
    event?: string
    payload?: { payment?: { entity?: { id?: string; order_id?: string; notes?: Record<string, string> } } }
  }

  if (event.event === 'payment.failed') {
    const payment = event.payload?.payment?.entity
    if (!payment?.order_id) {
      return NextResponse.json({ error: 'missing payment entity' }, { status: 400 })
    }

    // Read before the update — updateMany doesn't return rows, and the email needs the
    // customer/tenant it would otherwise have no way to reach.
    const order = await prisma.order.findFirst({
      where: { paymentId: payment.order_id, paymentStatus: 'pending' },
      include: { customer: { select: { email: true } }, tenant: { select: { name: true, slug: true } } },
    })
    if (!order) {
      console.info('[razorpay webhook] no pending order for', payment.order_id)
      return NextResponse.json({ ok: true })
    }

    await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: 'failed' } })

    if (order.customer.email) {
      const storeUrl = getStoreUrl(order.tenant.slug, false)
      await sendPaymentFailedEmail(order.customer.email, {
        storeName: order.tenant.name,
        orderCode: orderCode(order.id),
        retryUrl: `${storeUrl}/orders/${order.id}`,
      })
    }

    return NextResponse.json({ ok: true })
  }

  if (event.event !== 'payment.captured') {
    return NextResponse.json({ ok: true, ignored: event.event })
  }

  const payment = event.payload?.payment?.entity
  if (!payment?.order_id || !payment.id) {
    return NextResponse.json({ error: 'missing payment entity' }, { status: 400 })
  }

  // createRazorpayOrderAction stores the Razorpay order id on paymentId, and passes our
  // own order id as the receipt — either identifies the row.
  const result = await prisma.order.updateMany({
    where: { paymentId: payment.order_id, paymentStatus: 'pending' },
    data: { paymentStatus: 'paid', paymentId: payment.id, status: 'confirmed' },
  })

  if (result.count === 0) {
    // Already handled by the client callback, or an order we don't know about. Either
    // way a 200 stops Razorpay retrying forever.
    console.info('[razorpay webhook] no pending order for', payment.order_id)
  }

  return NextResponse.json({ ok: true })
}
