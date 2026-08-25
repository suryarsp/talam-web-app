import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFindMany, mockCreateUser, mockSyncStoreCustomer } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockCreateUser: vi.fn(),
  mockSyncStoreCustomer: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  withTenant: (_tenantId: string, fn: (db: unknown) => unknown) => fn({ customer: { findMany: mockFindMany } }),
}))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ auth: { admin: { createUser: mockCreateUser } } })),
}))
vi.mock('./sync-store-customer', () => ({ syncStoreCustomer: mockSyncStoreCustomer }))

import { resolveOrCreateGuestCustomer } from './resolve-guest-customer'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('resolveOrCreateGuestCustomer', () => {
  it('reuses an existing customer matched by email on this tenant', async () => {
    mockFindMany.mockResolvedValue([{ id: 'cust-1', email: 'guest@example.com' }])

    const result = await resolveOrCreateGuestCustomer('t1', { email: 'guest@example.com', phone: '9876543210' })

    expect(result).toEqual({ customerId: 'cust-1' })
    expect(mockCreateUser).not.toHaveBeenCalled()
  })

  it('reuses an existing customer matched by phone only, when email differs', async () => {
    mockFindMany.mockResolvedValue([{ id: 'cust-1', email: 'someone-else@example.com' }])

    const result = await resolveOrCreateGuestCustomer('t1', { email: 'guest@example.com', phone: '9876543210' })

    expect(result).toEqual({ customerId: 'cust-1' })
  })

  it('creates a new Supabase account and Customer row when no local match exists', async () => {
    mockFindMany.mockResolvedValue([])
    const newUser = { id: 'new-cust', email: 'guest@example.com', phone: '+919876543210' }
    mockCreateUser.mockResolvedValue({ data: { user: newUser }, error: null })

    const result = await resolveOrCreateGuestCustomer('t1', { email: 'guest@example.com', phone: '9876543210' })

    expect(result).toEqual({ customerId: 'new-cust' })
    expect(mockCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'guest@example.com', phone: '+919876543210' })
    )
    expect(mockSyncStoreCustomer).toHaveBeenCalledWith('t1', newUser)
  })

  it('returns a typed conflict instead of crashing when the account already exists elsewhere', async () => {
    mockFindMany.mockResolvedValue([])
    mockCreateUser.mockResolvedValue({ data: null, error: { code: 'email_exists', message: 'already registered' } })

    const result = await resolveOrCreateGuestCustomer('t1', { email: 'guest@example.com', phone: '9876543210' })

    expect(result).toEqual({ error: 'guest_account_exists' })
    expect(mockSyncStoreCustomer).not.toHaveBeenCalled()
  })

  it('rethrows an unrelated admin API error rather than swallowing it into a conflict', async () => {
    mockFindMany.mockResolvedValue([])
    mockCreateUser.mockResolvedValue({ data: null, error: { code: 'unexpected_failure', message: 'boom' } })

    await expect(resolveOrCreateGuestCustomer('t1', { email: 'guest@example.com', phone: '9876543210' })).rejects.toEqual({
      code: 'unexpected_failure',
      message: 'boom',
    })
  })
})
