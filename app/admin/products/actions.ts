'use server'

import { revalidatePath } from 'next/cache'
import { requireOwnerTenant } from '@/lib/admin-guard'
import { createProduct, updateProduct, setProductActive, type ProductInput } from '@/lib/data/products'

export async function createProductAction(input: ProductInput) {
  const { tenantId } = await requireOwnerTenant()
  await createProduct(tenantId, input)
  revalidatePath('/admin/products')
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
