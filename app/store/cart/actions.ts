'use server'

import { getRequestTenantId } from '@/lib/data/tenant'
import { withTenant } from '@/lib/prisma'
import { createServerClient } from '@/lib/supabase/server'

export type SuggestedProduct = {
  name: string
  slug: string
  price: number
  comparePrice: number | null
  image: string | null
}

export async function getEmptyCartSuggestions(): Promise<{ source: string; items: SuggestedProduct[] }> {
  const tenantId = await getRequestTenantId()
  if (!tenantId) return { source: 'trending', items: [] }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Try wishlist first
  if (user) {
    const wishlistItems = await withTenant(tenantId, (db) =>
      db.wishlist.findMany({
        where: { tenantId, customerId: user.id },
        take: 4,
        select: {
          product: { select: { name: true, slug: true, price: true, comparePrice: true, images: true } },
        },
      })
    )
    if (wishlistItems.length > 0) {
      return {
        source: 'saved',
        items: wishlistItems.map((w) => ({
          name: w.product.name,
          slug: w.product.slug,
          price: Number(w.product.price),
          comparePrice: w.product.comparePrice ? Number(w.product.comparePrice) : null,
          image: w.product.images[0] ?? null,
        })),
      }
    }
  }

  // Fallback: trending (most ordered recently)
  const trending = await withTenant(tenantId, (db) =>
    db.product.findMany({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: { name: true, slug: true, price: true, comparePrice: true, images: true },
    })
  )

  return {
    source: 'trending',
    items: trending.map((p) => ({
      name: p.name,
      slug: p.slug,
      price: Number(p.price),
      comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
      image: p.images[0] ?? null,
    })),
  }
}
