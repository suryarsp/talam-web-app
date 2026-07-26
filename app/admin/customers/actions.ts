'use server'

import { requireOwnerTenant } from '@/lib/admin-guard'
import { listCustomersForAdmin, type AdminCustomer } from '@/lib/data/customers'

export async function getCustomersAction(): Promise<AdminCustomer[]> {
  const { tenantId } = await requireOwnerTenant()
  return listCustomersForAdmin(tenantId)
}
