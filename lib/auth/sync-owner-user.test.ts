import { describe, it, expect, vi } from 'vitest'
import type { User } from '@supabase/supabase-js'

const { upsertMock } = vi.hoisted(() => ({
  upsertMock: vi.fn().mockResolvedValue({ id: 'user-1' }),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: { user: { upsert: upsertMock } },
}))

import { syncOwnerUser } from './sync-owner-user'

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'owner@example.com',
    user_metadata: {},
    ...overrides,
  } as User
}

describe('syncOwnerUser', () => {
  it('upserts the Prisma user keyed by id with email/name/avatar', async () => {
    const user = makeUser({
      user_metadata: { full_name: 'Priya Sharma', avatar_url: 'https://cdn.example.com/a.png' },
    })

    await syncOwnerUser(user)

    expect(upsertMock).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      create: {
        id: 'user-1',
        email: 'owner@example.com',
        name: 'Priya Sharma',
        avatarUrl: 'https://cdn.example.com/a.png',
      },
      update: {
        email: 'owner@example.com',
        name: 'Priya Sharma',
        avatarUrl: 'https://cdn.example.com/a.png',
      },
    })
  })

  it('falls back to null name/avatar when user_metadata is empty', async () => {
    const user = makeUser({ user_metadata: {} })

    await syncOwnerUser(user)

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ name: null, avatarUrl: null }),
      })
    )
  })
})
