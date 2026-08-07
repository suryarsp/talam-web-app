'use server'

import { revalidatePath } from 'next/cache'
import { requireOwnerTenant } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'
import type { PublishLogItem } from '@/lib/data/publish-logs'

const OPEN_ORDER_STATUSES = ['pending', 'confirmed', 'shipped'] as const

export type PublishConflict = { productName: string; openOrderCount: number }
export type PublishResult = { conflicts?: PublishConflict[] }

export async function getPendingChangeCountAction(): Promise<number> {
  const { tenantId } = await requireOwnerTenant()
  const [products, about, occasions] = await withTenant(tenantId, (db) =>
    Promise.all([
      db.product.count({ where: { tenantId, status: 'draft' } }),
      db.storeAbout.count({ where: { tenantId, status: 'draft' } }),
      db.productTag.count({ where: { tenantId, status: 'draft' } }),
    ])
  )
  return products + about + occasions
}

export async function publishChangesAction(input?: { force?: boolean }): Promise<PublishResult> {
  const { tenantId } = await requireOwnerTenant()

  if (!input?.force) {
    const conflictingProducts = await withTenant(tenantId, (db) =>
      db.product.findMany({
        where: {
          tenantId,
          status: 'draft',
          orderItems: { some: { order: { status: { in: [...OPEN_ORDER_STATUSES] } } } },
        },
        select: {
          name: true,
          _count: { select: { orderItems: { where: { order: { status: { in: [...OPEN_ORDER_STATUSES] } } } } } },
        },
      })
    )

    if (conflictingProducts.length > 0) {
      return {
        conflicts: conflictingProducts.map((p) => ({
          productName: p.name,
          openOrderCount: p._count.orderItems,
        })),
      }
    }
  }

  const [draftProducts, draftAbout, draftOccasions] = await withTenant(tenantId, (db) =>
    Promise.all([
      db.product.findMany({ where: { tenantId, status: 'draft' }, select: { name: true } }),
      db.storeAbout.findFirst({ where: { tenantId, status: 'draft' } }),
      db.productTag.findMany({ where: { tenantId, status: 'draft' }, select: { name: true } }),
    ])
  )

  const items: PublishLogItem[] = [
    ...draftProducts.map((p) => ({ type: 'product' as const, name: p.name })),
    ...(draftAbout ? [{ type: 'store_info' as const, name: 'Store info' }] : []),
    ...draftOccasions.map((o) => ({ type: 'occasion' as const, name: o.name })),
  ]

  // ponytail: withTenant already runs its callback inside an interactive transaction (needed for
  // RLS scoping); a nested array-form db.$transaction([...]) here throws at runtime, so these run
  // sequentially on the same already-transactional client instead.
  const [products, about, occasions] = await withTenant(tenantId, async (db) => {
    const products = await db.product.updateMany({ where: { tenantId, status: 'draft' }, data: { status: 'published' } })
    const about = await db.storeAbout.updateMany({ where: { tenantId, status: 'draft' }, data: { status: 'published' } })
    const occasions = await db.productTag.updateMany({ where: { tenantId, status: 'draft' }, data: { status: 'published' } })
    return [products, about, occasions] as const
  })

  const itemCount = products.count + about.count + occasions.count
  if (itemCount > 0) {
    const parts: string[] = []
    if (products.count) parts.push(`${products.count} product${products.count === 1 ? '' : 's'}`)
    if (about.count) parts.push('store info')
    if (occasions.count) parts.push(`${occasions.count} occasion${occasions.count === 1 ? '' : 's'}`)

    await withTenant(tenantId, (db) =>
      db.publishLog.create({ data: { tenantId, itemCount, summary: parts.join(', '), items } })
    )
  }

  revalidatePath('/admin/products')
  revalidatePath('/admin/settings')
  revalidatePath('/admin/versions')
  revalidatePath('/store')

  return {}
}
