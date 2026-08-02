'use server'

import { headers } from 'next/headers'
import { revalidatePath, updateTag } from 'next/cache'
import { requireOwnerTenant } from '@/lib/admin-guard'
import { storefrontTag } from '@/lib/storefront-cache'
import { uploadImage } from '@/lib/cloudinary'
import { prisma } from '@/lib/prisma'
import {
  createProduct,
  updateProduct,
  setProductActive,
  softDeleteProducts,
  bulkSetProductsCategory,
  bulkSetProductsActive,
  resetProductsToDefault,
  type ProductInput,
} from '@/lib/data/products'
import { notifyIfReadyToGoLive } from '@/lib/data/tenant'

const MIN_LIVE_PRODUCTS = 3
import { updateProductOccasions } from '@/lib/data/occasions'
import { assignProductsToOccasionAction } from '@/app/admin/occasions/actions'

export async function uploadProductImageAction(file: File): Promise<string> {
  const { tenantId } = await requireOwnerTenant()
  return uploadImage(file, `talam/${tenantId}/products`)
}

export async function createProductAction(input: ProductInput): Promise<{ id: string; readyToGoLive: boolean }> {
  const { tenantId } = await requireOwnerTenant()
  const created = await createProduct(tenantId, input)
  revalidatePath('/admin/products')
  updateTag(storefrontTag(tenantId))

  const isLocalDev = (await headers()).get('host')?.includes('localhost') ?? false
  await notifyIfReadyToGoLive(tenantId, isLocalDev)

  const [publishedCount, tenant] = await Promise.all([
    prisma.product.count({ where: { tenantId, status: 'published', deletedAt: null } }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { isLive: true } }),
  ])
  const readyToGoLive = publishedCount >= MIN_LIVE_PRODUCTS && !tenant?.isLive

  return { id: created.id, readyToGoLive }
}

export async function updateProductAction(id: string, input: ProductInput) {
  const { tenantId } = await requireOwnerTenant()
  await updateProduct(tenantId, id, input)
  revalidatePath('/admin/products')
  updateTag(storefrontTag(tenantId))
}

export async function setProductActiveAction(id: string, isActive: boolean) {
  const { tenantId } = await requireOwnerTenant()
  await setProductActive(tenantId, id, isActive)
  revalidatePath('/admin/products')
  updateTag(storefrontTag(tenantId))
}

export async function updateProductOccasionsAction(productId: string, occasionIds: string[]) {
  const { tenantId } = await requireOwnerTenant()
  await updateProductOccasions(tenantId, productId, occasionIds)
  revalidatePath('/admin/products')
  updateTag(storefrontTag(tenantId))
}

export async function bulkAssignToOccasionAction(occasionId: string, productIds: string[]): Promise<{ error?: string }> {
  const result = await assignProductsToOccasionAction(occasionId, productIds)
  if (result.error) return result
  revalidatePath('/admin/products')
  return {}
}

export async function bulkSetCategoryAction(productIds: string[], categoryId: string | null) {
  const { tenantId } = await requireOwnerTenant()
  await bulkSetProductsCategory(tenantId, productIds, categoryId)
  revalidatePath('/admin/products')
  updateTag(storefrontTag(tenantId))
}

export async function bulkSetActiveAction(productIds: string[], isActive: boolean) {
  const { tenantId } = await requireOwnerTenant()
  await bulkSetProductsActive(tenantId, productIds, isActive)
  revalidatePath('/admin/products')
  updateTag(storefrontTag(tenantId))
}

export async function bulkDeleteAction(productIds: string[]) {
  const { tenantId } = await requireOwnerTenant()
  await softDeleteProducts(tenantId, productIds)
  revalidatePath('/admin/products')
  updateTag(storefrontTag(tenantId))
}

export async function bulkResetToDefaultAction(productIds: string[]) {
  const { tenantId } = await requireOwnerTenant()
  await resetProductsToDefault(tenantId, productIds)
  revalidatePath('/admin/products')
  updateTag(storefrontTag(tenantId))
}
