import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AdminStaffRole } from '@prisma/client'

const { mockGetUser, mockIsAdminStaffEmail, mockGetAdminStaffRole, mockTouchAdminStaffLastActive, mockRedirect } =
  vi.hoisted(() => ({
    mockGetUser: vi.fn(async () => ({ data: { user: { id: 'user-1', email: 'test@example.com' } }, error: null })),
    mockIsAdminStaffEmail: vi.fn(async () => false),
    mockGetAdminStaffRole: vi.fn(async (): Promise<AdminStaffRole | null> => null),
    mockTouchAdminStaffLastActive: vi.fn(),
    mockRedirect: vi.fn(),
  }))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
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

vi.mock('next/navigation', () => ({ redirect: mockRedirect }))

vi.mock('@/lib/prisma', () => ({
  withTenant: vi.fn((_tenantId: string, fn: (db: unknown) => unknown) =>
    fn({ customer: { upsert: vi.fn() } })
  ),
}))

// canAccessSection is a pure lookup — kept real via importActual so
// requireSuperAdminSection tests exercise the actual permission map.
vi.mock('@/lib/data/admin-staff', async () => {
  const actual = await vi.importActual<typeof import('@/lib/data/admin-staff')>('@/lib/data/admin-staff')
  return {
    ...actual,
    isAdminStaffEmail: mockIsAdminStaffEmail,
    getAdminStaffRole: mockGetAdminStaffRole,
    touchAdminStaffLastActive: mockTouchAdminStaffLastActive,
  }
})

import { requireTenant, requireAuth, getSuperAdminRole, requireSuperAdminSection } from './auth-guard'

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'test@example.com' } }, error: null })
  delete process.env.SUPER_ADMIN_EMAILS
})

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

describe('getSuperAdminRole', () => {
  it('resolves an env-listed email to owner, bypassing the AdminStaff table', async () => {
    process.env.SUPER_ADMIN_EMAILS = 'test@example.com'

    const role = await getSuperAdminRole('test@example.com')

    expect(role).toBe('owner')
    expect(mockGetAdminStaffRole).not.toHaveBeenCalled()
  })

  it('falls back to the AdminStaff row role for a non-env email', async () => {
    mockGetAdminStaffRole.mockResolvedValue('billing_manager')

    const role = await getSuperAdminRole('staffer@example.com')

    expect(role).toBe('billing_manager')
  })
})

describe('requireSuperAdminSection', () => {
  it('allows a role into a section it has access to', async () => {
    process.env.SUPER_ADMIN_EMAILS = 'test@example.com'
    mockIsAdminStaffEmail.mockResolvedValue(false)

    const result = await requireSuperAdminSection('overview')

    expect(result.role).toBe('owner')
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('redirects when the role cannot access the section', async () => {
    // Not env-listed, so requireSuperAdmin()'s own gate relies on the AdminStaff row —
    // mockIsAdminStaffEmail(true) lets that pass so this test isolates the section check.
    mockIsAdminStaffEmail.mockResolvedValue(true)
    mockGetAdminStaffRole.mockResolvedValue('billing_manager')

    await requireSuperAdminSection('staff')

    expect(mockRedirect).toHaveBeenCalledWith('/not-found')
  })
})
