import type { User } from '@supabase/supabase-js'
import { withTenant } from '@/lib/prisma'

export async function syncStoreCustomer(tenantId: string, user: User) {
  return withTenant(tenantId, (db) =>
    db.customer.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        tenantId,
        name: user.user_metadata?.full_name ?? null,
        email: user.email ?? null,
        phone: user.phone ?? null,
      },
      update: {
        name: user.user_metadata?.full_name ?? null,
        email: user.email ?? null,
        phone: user.phone ?? null,
      },
      select: { onboardingComplete: true },
    })
  )
}
