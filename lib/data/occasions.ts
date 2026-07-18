import { withTenant } from '@/lib/prisma'

// Admin list — includes assigned product count, ordered for the settings page.
export async function listOccasions(tenantId: string) {
  return withTenant(tenantId, (db) =>
    db.productTag.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { products: true } } },
    })
  )
}

export async function getOccasionBySlug(tenantId: string, slug: string) {
  return withTenant(tenantId, (db) =>
    db.productTag.findFirst({ where: { tenantId, slug, status: 'published' } })
  )
}

export async function updateOccasionSettings(
  tenantId: string,
  occasionId: string,
  input: { name?: string; themeKey?: string; layout?: 'grid' | 'carousel' }
) {
  return withTenant(tenantId, (db) =>
    db.productTag.update({
      where: { id: occasionId, tenantId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.themeKey !== undefined ? { themeKey: input.themeKey } : {}),
        ...(input.layout !== undefined ? { layout: input.layout } : {}),
        status: 'draft',
      },
    })
  )
}

// Additive: adds the given products to this occasion without disturbing existing assignments
// or their order. Skips products already assigned. New assignments are appended after the
// occasion's current highest sortOrder, in the order productIds was given.
export async function assignProductsToOccasion(tenantId: string, occasionId: string, productIds: string[]) {
  if (productIds.length === 0) return

  const [existing, currentMax] = await withTenant(tenantId, (db) =>
    Promise.all([
      db.productTagAssignment.findMany({
        where: { tenantId, tagId: occasionId, productId: { in: productIds } },
        select: { productId: true },
      }),
      db.productTagAssignment.aggregate({
        where: { tenantId, tagId: occasionId },
        _max: { sortOrder: true },
      }),
    ])
  )

  const alreadyAssigned = new Set(existing.map((e) => e.productId))
  const toAdd = productIds.filter((id) => !alreadyAssigned.has(id))
  if (toAdd.length === 0) return

  const startOrder = (currentMax._max.sortOrder ?? -1) + 1
  await withTenant(tenantId, (db) =>
    db.productTagAssignment.createMany({
      data: toAdd.map((productId, index) => ({
        tenantId,
        tagId: occasionId,
        productId,
        sortOrder: startOrder + index,
      })),
    })
  )
}

// Per-product complement to assignProductsToOccasion: replaces which occasions a single
// product belongs to. Diffs against current assignments rather than delete-all-then-recreate,
// so it doesn't disturb other products' sortOrder within a shared occasion.
export async function updateProductOccasions(tenantId: string, productId: string, occasionIds: string[]): Promise<void> {
  const current = await withTenant(tenantId, (db) =>
    db.productTagAssignment.findMany({
      where: { tenantId, productId },
      select: { tagId: true },
    })
  )
  const currentIds = new Set(current.map((c) => c.tagId))
  const wantedIds = new Set(occasionIds)

  const toRemove = [...currentIds].filter((id) => !wantedIds.has(id))
  const toAdd = [...wantedIds].filter((id) => !currentIds.has(id))

  if (toRemove.length > 0) {
    await withTenant(tenantId, (db) =>
      db.productTagAssignment.deleteMany({ where: { tenantId, productId, tagId: { in: toRemove } } })
    )
  }

  for (const tagId of toAdd) {
    const max = await withTenant(tenantId, (db) =>
      db.productTagAssignment.aggregate({ where: { tenantId, tagId }, _max: { sortOrder: true } })
    )
    await withTenant(tenantId, (db) =>
      db.productTagAssignment.create({
        data: { tenantId, tagId, productId, sortOrder: (max._max.sortOrder ?? -1) + 1 },
      })
    )
  }
}
