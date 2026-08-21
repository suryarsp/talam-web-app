import { describe, it, expect, vi } from 'vitest'
import type { User } from '@supabase/supabase-js'

const { upsertMock } = vi.hoisted(() => ({
  upsertMock: vi.fn().mockResolvedValue({ onboardingComplete: true }),
}))

vi.mock('@/lib/prisma', () => ({
  withTenant: vi.fn((_tenantId: string, fn: (db: unknown) => unknown) =>
    fn({ customer: { upsert: upsertMock } })
  ),
}))

import { syncStoreCustomer } from './sync-store-customer'

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'customer-1',
    email: 'shopper@example.com',
    phone: null,
    user_metadata: {},
    ...overrides,
  } as User
}

describe('syncStoreCustomer', () => {
  it('upserts the tenant-scoped customer keyed by id', async () => {
    const user = makeUser({ user_metadata: { full_name: 'Asha Rao' } })

    const result = await syncStoreCustomer('tenant-1', user)

    expect(upsertMock).toHaveBeenCalledWith({
      where: { id: 'customer-1' },
      create: {
        id: 'customer-1',
        tenantId: 'tenant-1',
        name: 'Asha Rao',
        email: 'shopper@example.com',
        phone: null,
      },
      update: {
        name: 'Asha Rao',
        email: 'shopper@example.com',
        phone: null,
      },
      select: { onboardingComplete: true },
    })
    expect(result).toEqual({ onboardingComplete: true })
  })

  it('falls back to null name/email/phone when absent', async () => {
    const user = makeUser({ email: undefined, user_metadata: undefined })

    await syncStoreCustomer('tenant-1', user)

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ name: null, email: null, phone: null }),
      })
    )
  })
})
