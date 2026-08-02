import { withTenant } from '@/lib/prisma'

export type NotificationItem = {
  id: string
  type: string
  title: string
  body: string
  link: string | null
  read: boolean
  createdAt: Date
}

const NOTIFICATION_LIMIT = 20

export async function createNotification(
  tenantId: string,
  input: { type: string; title: string; body: string; link?: string }
): Promise<void> {
  await withTenant(tenantId, (db) =>
    db.notification.create({
      data: { tenantId, type: input.type, title: input.title, body: input.body, link: input.link ?? null },
    })
  )
}

export async function getNotifications(tenantId: string): Promise<NotificationItem[]> {
  const rows = await withTenant(tenantId, (db) =>
    db.notification.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: NOTIFICATION_LIMIT,
    })
  )
  return rows.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    read: n.readAt !== null,
    createdAt: n.createdAt,
  }))
}

export async function getUnreadNotificationCount(tenantId: string): Promise<number> {
  return withTenant(tenantId, (db) => db.notification.count({ where: { tenantId, readAt: null } }))
}

export async function markAllNotificationsRead(tenantId: string): Promise<void> {
  await withTenant(tenantId, (db) =>
    db.notification.updateMany({ where: { tenantId, readAt: null }, data: { readAt: new Date() } })
  )
}
