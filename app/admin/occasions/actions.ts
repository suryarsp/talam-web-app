'use server'

import { Prisma } from '@prisma/client'
import { updateTag } from 'next/cache'
import { requireOwnerTenant } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'
import { listOccasions, updateOccasionSettings, assignProductsToOccasion } from '@/lib/data/occasions'
import { storefrontTag } from '@/lib/storefront-cache'

type ActionResult = { error?: string }

function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'occasion'
  )
}

function isSlugCollision(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2002' &&
    Array.isArray(err.meta?.target) &&
    (err.meta.target as string[]).includes('slug')
  )
}

export async function getOccasions() {
  const { tenantId } = await requireOwnerTenant()
  return listOccasions(tenantId)
}

// Creates an occasion with its theme and layout. Products are assigned separately, from the
// Products page's batch "Assign to Occasion" action or the per-product editor — not here.
export async function createOccasionAction(input: {
  name: string
  emoji?: string
  themeKey: string
  layout: 'grid' | 'carousel'
}): Promise<ActionResult> {
  const { tenantId } = await requireOwnerTenant()
  try {
    await withTenant(tenantId, (db) =>
      db.productTag.create({
        data: {
          tenantId,
          name: input.name,
          slug: slugify(input.name),
          emoji: input.emoji || null,
          themeKey: input.themeKey,
          layout: input.layout,
          status: 'draft',
        },
      })
    )
    updateTag(storefrontTag(tenantId))
    return {}
  } catch (err) {
    if (isSlugCollision(err)) return { error: 'An occasion with that name already exists.' }
    throw err
  }
}

export async function deleteOccasion(occasionId: string): Promise<ActionResult> {
  const { tenantId } = await requireOwnerTenant()
  const occasion = await withTenant(tenantId, (db) =>
    db.productTag.findFirst({ where: { tenantId, id: occasionId }, select: { isDefault: true } })
  )
  if (!occasion) return { error: 'Occasion not found.' }
  if (occasion.isDefault) return { error: 'Default occasions cannot be deleted.' }

  await withTenant(tenantId, (db) =>
    db.$transaction([
      db.productTagAssignment.deleteMany({ where: { tenantId, tagId: occasionId } }),
      db.productTag.delete({ where: { id: occasionId } }),
    ])
  )
  updateTag(storefrontTag(tenantId))
  return {}
}

export async function setOccasionSettings(
  occasionId: string,
  input: { name?: string; themeKey?: string; layout?: 'grid' | 'carousel' }
): Promise<ActionResult> {
  const { tenantId } = await requireOwnerTenant()
  const occasion = await withTenant(tenantId, (db) =>
    db.productTag.findFirst({ where: { tenantId, id: occasionId }, select: { id: true } })
  )
  if (!occasion) return { error: 'Occasion not found.' }

  await updateOccasionSettings(tenantId, occasionId, input)
  updateTag(storefrontTag(tenantId))
  return {}
}

// On/off toggle — sets published/draft directly for this one occasion, independent of the
// tenant-wide "Publish changes" batch used elsewhere for pending content edits. An occasion
// can go live with zero products — the owner assigns products afterward from Products.
export async function setOccasionStatusAction(occasionId: string, enabled: boolean): Promise<ActionResult> {
  const { tenantId } = await requireOwnerTenant()
  const occasion = await withTenant(tenantId, (db) =>
    db.productTag.findFirst({ where: { tenantId, id: occasionId }, select: { id: true } })
  )
  if (!occasion) return { error: 'Occasion not found.' }

  await withTenant(tenantId, (db) =>
    db.productTag.update({ where: { id: occasionId, tenantId }, data: { status: enabled ? 'published' : 'draft' } })
  )
  updateTag(storefrontTag(tenantId))
  return {}
}

// Used by the Products page's batch "Assign to Occasion" action (see app/admin/products/batch-actions.ts).
export async function assignProductsToOccasionAction(occasionId: string, productIds: string[]): Promise<ActionResult> {
  const { tenantId } = await requireOwnerTenant()
  const occasion = await withTenant(tenantId, (db) =>
    db.productTag.findFirst({ where: { tenantId, id: occasionId }, select: { id: true } })
  )
  if (!occasion) return { error: 'Occasion not found.' }

  await assignProductsToOccasion(tenantId, occasionId, productIds)
  updateTag(storefrontTag(tenantId))
  return {}
}
