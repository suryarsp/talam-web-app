import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getUserMock, syncStoreCustomerMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  syncStoreCustomerMock: vi.fn().mockResolvedValue({ onboardingComplete: true }),
}))
let headerMap: Record<string, string> = {}

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(async () => ({
    auth: { getUser: getUserMock },
  })),
}))

vi.mock('@/lib/auth/sync-store-customer', () => ({
  syncStoreCustomer: (...args: unknown[]) => syncStoreCustomerMock(...args),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({
    get: (key: string) => headerMap[key] ?? null,
  })),
}))

import { POST } from './route'

beforeEach(() => {
  vi.clearAllMocks()
  headerMap = { 'x-tenant-id': 'tenant-1' }
})

describe('POST /store/api/auth/sync', () => {
  it('400s when there is no tenant header', async () => {
    headerMap = {}

    const res = await POST()

    expect(res.status).toBe(400)
    expect(syncStoreCustomerMock).not.toHaveBeenCalled()
  })

  it('401s when there is no authenticated user', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } })

    const res = await POST()

    expect(res.status).toBe(401)
    expect(syncStoreCustomerMock).not.toHaveBeenCalled()
  })

  it('syncs the tenant-scoped customer and returns ok when a session exists', async () => {
    const user = { id: 'customer-1', email: 'shopper@example.com' }
    getUserMock.mockResolvedValue({ data: { user } })

    const res = await POST()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ ok: true })
    expect(syncStoreCustomerMock).toHaveBeenCalledWith('tenant-1', user)
  })
})
