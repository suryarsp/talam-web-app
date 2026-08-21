import type { User } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'

export async function syncOwnerUser(user: User) {
  return prisma.user.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email,
      name: user.user_metadata.full_name ?? null,
      avatarUrl: user.user_metadata.avatar_url ?? null,
    },
    update: {
      email: user.email,
      name: user.user_metadata.full_name ?? null,
      avatarUrl: user.user_metadata.avatar_url ?? null,
    },
  })
}
