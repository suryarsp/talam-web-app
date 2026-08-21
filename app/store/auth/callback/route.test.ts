import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { exchangeCodeForSessionMock, syncStoreCustomerMock } = vi.hoisted(() => ({
  exchangeCodeForSessionMock: vi.fn(),
  syncStoreCustomerMock: vi.fn().mockResolvedValue({ onboardingComplete: false }),
}))
let headerMap: Record<string, string> = {}

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(async () => ({
    auth: { exchangeCodeForSession: exchangeCodeForSessionMock },
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

import { GET } from './route'

function makeRequest(url: string) {
  return new NextRequest(url)
}

beforeEach(() => {
  vi.clearAllMocks()
  headerMap = { 'x-tenant-id': 'tenant-1', 'x-store-base': '' }
})

describe('GET /store/auth/callback', () => {
  it('redirects to auth?error=oauth_failed when there is no tenant header', async () => {
    headerMap = { 'x-store-base': '' }

    const res = await GET(makeRequest('http://localhost/auth/callback?code=abc'))

    expect(res.headers.get('location')).toContain('/auth?error=oauth_failed')
    expect(syncStoreCustomerMock).not.toHaveBeenCalled()
  })

  it('syncs the tenant-scoped customer via the shared helper on a successful exchange', async () => {
    const user = { id: 'customer-1', email: 'shopper@example.com', user_metadata: {} }
    exchangeCodeForSessionMock.mockResolvedValue({ data: { user }, error: null })

    await GET(makeRequest('http://localhost/auth/callback?code=abc'))

    expect(syncStoreCustomerMock).toHaveBeenCalledWith('tenant-1', user)
  })

  it('redirects new customers to onboarding and returning ones to their profile', async () => {
    const user = { id: 'customer-1', email: 'shopper@example.com', user_metadata: {} }
    exchangeCodeForSessionMock.mockResolvedValue({ data: { user }, error: null })
    syncStoreCustomerMock.mockResolvedValue({ onboardingComplete: false })

    const res = await GET(makeRequest('http://localhost/auth/callback?code=abc'))

    expect(res.headers.get('location')).toBe('http://localhost/onboarding')
  })
})
