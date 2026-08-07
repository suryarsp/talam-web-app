'use server'

import { requireAuth, requireTenant } from '@/lib/auth-guard'
import { withTenant } from '@/lib/prisma'

export async function saveOnboardingAction(data: {
  preferredCategories: string[]
  preferredSize: string | null
}) {
  const { tenantId } = await requireTenant()
  const user = await requireAuth()

  await withTenant(tenantId, (db) =>
    db.customer.update({
      where: { id: user.id },
      data: {
        preferredCategories: data.preferredCategories,
        preferredSize: data.preferredSize,
        onboardingComplete: true,
      },
    })
  )

  return { ok: true }
}
