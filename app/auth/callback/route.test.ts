import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { exchangeCodeForSessionMock, syncOwnerUserMock, findUniqueMock } = vi.hoisted(() => ({
  exchangeCodeForSessionMock: vi.fn(),
  syncOwnerUserMock: vi.fn().mockResolvedValue({ id: 'user-1' }),
  findUniqueMock: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(async () => ({
    auth: { exchangeCodeForSession: exchangeCodeForSessionMock },
  })),
}))

vi.mock('@/lib/auth/sync-owner-user', () => ({
  syncOwnerUser: (...args: unknown[]) => syncOwnerUserMock(...args),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: { tenant: { findUnique: findUniqueMock } },
}))

import { GET } from './route'

function makeRequest(url: string) {
  return new NextRequest(url)
}

beforeEach(() => {
  vi.clearAllMocks()
  findUniqueMock.mockResolvedValue(null)
})

describe('GET /auth/callback', () => {
  it('redirects to /auth?error=oauth_cancelled when there is no code', async () => {
    const res = await GET(makeRequest('http://localhost/auth/callback'))
    expect(res.headers.get('location')).toContain('/auth?error=oauth_cancelled')
    expect(syncOwnerUserMock).not.toHaveBeenCalled()
  })

  it('redirects to /auth?error=oauth_failed when exchangeCodeForSession errors', async () => {
    exchangeCodeForSessionMock.mockResolvedValue({ data: {}, error: { message: 'bad code' } })

    const res = await GET(makeRequest('http://localhost/auth/callback?code=abc'))

    expect(res.headers.get('location')).toContain('/auth?error=oauth_failed')
    expect(syncOwnerUserMock).not.toHaveBeenCalled()
  })

  it('syncs the owner user via the shared helper on a successful exchange', async () => {
    const user = { id: 'user-1', email: 'owner@example.com', user_metadata: {} }
    exchangeCodeForSessionMock.mockResolvedValue({ data: { user }, error: null })

    await GET(makeRequest('http://localhost/auth/callback?code=abc&next=/admin/onboarding'))

    expect(syncOwnerUserMock).toHaveBeenCalledWith(user)
  })

  it('redirects to the explicit next param when provided', async () => {
    const user = { id: 'user-1', email: 'owner@example.com', user_metadata: {} }
    exchangeCodeForSessionMock.mockResolvedValue({ data: { user }, error: null })

    const res = await GET(makeRequest('http://localhost/auth/callback?code=abc&next=/admin/onboarding'))

    expect(res.headers.get('location')).toBe('http://localhost/admin/onboarding')
  })
})
