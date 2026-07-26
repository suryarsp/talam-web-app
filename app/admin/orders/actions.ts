'use server'

import { revalidatePath } from 'next/cache'
import type { OrderStatus } from '@prisma/client'
import { requireOwnerTenant } from '@/lib/admin-guard'
import { listOrdersForAdmin, updateOrderStatus, type AdminOrder } from '@/lib/data/orders'

export async function getOrdersAction(): Promise<AdminOrder[]> {
  const { tenantId } = await requireOwnerTenant()
  return listOrdersForAdmin(tenantId)
}

export async function updateOrderStatusAction(orderId: string, status: OrderStatus, trackingId?: string): Promise<{ error?: string }> {
  const { tenantId } = await requireOwnerTenant()
  await updateOrderStatus(tenantId, orderId, status, trackingId)
  revalidatePath('/admin/orders')
  revalidatePath('/admin/dashboard')
  return {}
}
