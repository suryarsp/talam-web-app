import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getUserMock, syncOwnerUserMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  syncOwnerUserMock: vi.fn().mockResolvedValue({ id: 'user-1' }),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(async () => ({
    auth: { getUser: getUserMock },
  })),
}))

vi.mock('@/lib/auth/sync-owner-user', () => ({
  syncOwnerUser: (...args: unknown[]) => syncOwnerUserMock(...args),
}))

import { POST } from './route'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/auth/sync', () => {
  it('401s when there is no authenticated user', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } })

    const res = await POST()

    expect(res.status).toBe(401)
    expect(syncOwnerUserMock).not.toHaveBeenCalled()
  })

  it('syncs the Prisma user and returns ok when a session exists', async () => {
    const user = { id: 'user-1', email: 'owner@example.com' }
    getUserMock.mockResolvedValue({ data: { user } })

    const res = await POST()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ ok: true })
    expect(syncOwnerUserMock).toHaveBeenCalledWith(user)
  })
})
