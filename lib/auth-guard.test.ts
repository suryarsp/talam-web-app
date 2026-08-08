import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null,
      }),
    },
  })),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({
    get: (key: string) => {
      const map: Record<string, string> = {
        'x-tenant-id': 'tenant-1',
        'x-subdomain': 'silk',
        'x-tenant-tier': 'starter',
      }
      return map[key] ?? null
    },
  })),
}))

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  withTenant: vi.fn((_tenantId: string, fn: (db: unknown) => unknown) =>
    fn({ customer: { upsert: vi.fn() } })
  ),
}))

import { requireTenant, requireAuth } from './auth-guard'

describe('requireTenant', () => {
  it('returns tenantId, subdomain, and tier from headers', async () => {
    const result = await requireTenant()
    expect(result.tenantId).toBe('tenant-1')
    expect(result.subdomain).toBe('silk')
    expect(result.tier).toBe('starter')
  })
})

describe('requireAuth', () => {
  it('returns the Supabase user when a session exists', async () => {
    const user = await requireAuth()
    expect(user.id).toBe('user-1')
  })
})
