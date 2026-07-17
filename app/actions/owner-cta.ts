'use server'

import { createServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export type OwnerCtaState = 'signed-out' | 'in-progress' | 'onboarded'

export async function getOwnerCtaState(): Promise<OwnerCtaState> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return 'signed-out'

  const tenant = await prisma.tenant.findUnique({
    where: { ownerId: user.id },
    select: { isOnboarded: true },
  })

  return tenant?.isOnboarded ? 'onboarded' : 'in-progress'
}
