'use server'

import { revalidatePath } from 'next/cache'
import { requireOwnerTenant } from '@/lib/admin-guard'
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
import { updateProductOccasions } from '@/lib/data/occasions'
import { assignProductsToOccasionAction } from '@/app/admin/occasions/actions'

export async function createProductAction(input: ProductInput): Promise<string> {
  const { tenantId } = await requireOwnerTenant()
  const created = await createProduct(tenantId, input)
  revalidatePath('/admin/products')
  return created.id
}

export async function updateProductAction(id: string, input: ProductInput) {
  const { tenantId } = await requireOwnerTenant()
  await updateProduct(tenantId, id, input)
  revalidatePath('/admin/products')
}

export async function setProductActiveAction(id: string, isActive: boolean) {
  const { tenantId } = await requireOwnerTenant()
  await setProductActive(tenantId, id, isActive)
  revalidatePath('/admin/products')
}

export async function updateProductOccasionsAction(productId: string, occasionIds: string[]) {
  const { tenantId } = await requireOwnerTenant()
  await updateProductOccasions(tenantId, productId, occasionIds)
  revalidatePath('/admin/products')
}

export async function bulkAssignToOccasionAction(occasionId: string, productIds: string[]) {
  await assignProductsToOccasionAction(occasionId, productIds)
  revalidatePath('/admin/products')
}

export async function bulkSetCategoryAction(productIds: string[], categoryId: string | null) {
  const { tenantId } = await requireOwnerTenant()
  await bulkSetProductsCategory(tenantId, productIds, categoryId)
  revalidatePath('/admin/products')
}

export async function bulkSetActiveAction(productIds: string[], isActive: boolean) {
  const { tenantId } = await requireOwnerTenant()
  await bulkSetProductsActive(tenantId, productIds, isActive)
  revalidatePath('/admin/products')
}

export async function bulkDeleteAction(productIds: string[]) {
  const { tenantId } = await requireOwnerTenant()
  await softDeleteProducts(tenantId, productIds)
  revalidatePath('/admin/products')
}

export async function bulkResetToDefaultAction(productIds: string[]) {
  const { tenantId } = await requireOwnerTenant()
  await resetProductsToDefault(tenantId, productIds)
  revalidatePath('/admin/products')
}
