import { withTenant } from '@/lib/prisma'

export type PublishLogItem = { type: 'product' | 'store_info' | 'occasion'; name: string }

export type PublishLogEntry = {
  id: string
  publishedAt: Date
  summary: string
  itemCount: number
  items: PublishLogItem[]
}

export async function listPublishLogs(tenantId: string): Promise<PublishLogEntry[]> {
  const logs = await withTenant(tenantId, (db) =>
    db.publishLog.findMany({
      where: { tenantId },
      orderBy: { publishedAt: 'desc' },
      select: { id: true, publishedAt: true, summary: true, itemCount: true, items: true },
    })
  )

  return logs.map((log) => ({
    ...log,
    items: Array.isArray(log.items) ? (log.items as unknown as PublishLogItem[]) : [],
  }))
}
