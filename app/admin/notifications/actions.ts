'use server'

import { requireOwnerTenant } from '@/lib/admin-guard'
import { getNotifications, getUnreadNotificationCount, markAllNotificationsRead } from '@/lib/data/notifications'
import type { NotificationItem } from '@/lib/data/notifications'

// Deliberately not re-exported: a 'use server' module may only export async functions,
// and the bundler turns `export type { … }` into a runtime re-export that throws
// ReferenceError at module load, taking every admin server action down with it.
// Consumers import the type straight from @/lib/data/notifications.

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
