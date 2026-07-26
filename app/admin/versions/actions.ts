'use server'

import { requireOwnerTenant } from '@/lib/admin-guard'
import { listPublishLogs, type PublishLogEntry } from '@/lib/data/publish-logs'

export async function getPublishLogsAction(): Promise<PublishLogEntry[]> {
  const { tenantId } = await requireOwnerTenant()
  return listPublishLogs(tenantId)
}
