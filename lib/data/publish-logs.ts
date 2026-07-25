import { withTenant } from '@/lib/prisma'

export async function listPublishLogs(tenantId: string) {
  return withTenant(tenantId, (db) =>
    db.publishLog.findMany({
      where: { tenantId },
      orderBy: { publishedAt: 'desc' },
      select: { id: true, publishedAt: true, summary: true, itemCount: true },
    })
  )
}
