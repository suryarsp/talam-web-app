'use server'

import { requireOwnerTenant } from '@/lib/admin-guard'
import { getNotifications, getUnreadNotificationCount, markAllNotificationsRead } from '@/lib/data/notifications'
import type { NotificationItem } from '@/lib/data/notifications'

export type { NotificationItem }

export async function getNotificationsAction(): Promise<{ items: NotificationItem[]; unreadCount: number }> {
  const { tenantId } = await requireOwnerTenant()
  const [items, unreadCount] = await Promise.all([getNotifications(tenantId), getUnreadNotificationCount(tenantId)])
  return { items, unreadCount }
}

export async function getUnreadNotificationCountAction(): Promise<number> {
  const { tenantId } = await requireOwnerTenant()
  return getUnreadNotificationCount(tenantId)
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const { tenantId } = await requireOwnerTenant()
  await markAllNotificationsRead(tenantId)
}
