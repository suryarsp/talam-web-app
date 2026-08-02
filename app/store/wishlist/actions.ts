'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth, requireTenant } from '@/lib/auth-guard'
import { toggleWishlist } from '@/lib/data/wishlist'

export async function toggleWishlistAction(productId: string): Promise<{ saved: boolean }> {
  const user = await requireAuth('/wishlist')
  const { tenantId } = await requireTenant()
  const saved = await toggleWishlist(tenantId, user.id, productId)
  revalidatePath('/store/wishlist')
  return { saved }
}
