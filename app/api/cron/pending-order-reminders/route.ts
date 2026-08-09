import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPendingOrderReminderEmail } from '@/lib/resend'
import { createNotification } from '@/lib/data/notifications'
import { getAdminUrl } from '@/lib/tenant-url'

const SIX_HOURS_MS = 6 * 60 * 60 * 1000

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const overdue = await prisma.order.findMany({
    where: {
      status: 'pending',
      reminderSentAt: null,
      createdAt: { lt: new Date(Date.now() - SIX_HOURS_MS) },
    },
    select: {
      id: true,
      tenantId: true,
      tenant: { select: { slug: true, name: true, contactEmail: true, notifyEmailOnOrder: true } },
    },
  })

  let sent = 0
  for (const order of overdue) {
    const code = `#${order.id.slice(0, 8).toUpperCase()}`
    const adminOrdersUrl = getAdminUrl(order.tenant.slug, process.env.NODE_ENV !== 'production').replace(/\/admin\/dashboard$/, '/admin/orders')

    await createNotification(order.tenantId, {
      type: 'order_overdue',
      title: `Order ${code} still needs confirmation`,
      body: `Placed over 6 hours ago and still awaiting confirmation.`,
      link: '/admin/orders',
    })
    if (order.tenant.notifyEmailOnOrder && order.tenant.contactEmail) {
      await sendPendingOrderReminderEmail(order.tenant.contactEmail, { storeName: order.tenant.name, orderCode: code, adminOrdersUrl })
    }
    await prisma.order.update({ where: { id: order.id }, data: { reminderSentAt: new Date() } })
    sent++
  }

  return NextResponse.json({ checked: overdue.length, sent })
}
