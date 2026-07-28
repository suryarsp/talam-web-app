import { requireAuth, requireTenant } from '@/lib/auth-guard'
import { listWishlist } from '@/lib/data/wishlist'
import { WishlistView } from './wishlist-view'

export const dynamic = 'force-dynamic'

export default async function WishlistPage() {
  const user = await requireAuth('/wishlist')
  const { tenantId } = await requireTenant()
  const items = await listWishlist(tenantId, user.id)

  return <WishlistView initialItems={items} />
}
