import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  withTenant: vi.fn((_tenantId: string, fn: (db: unknown) => unknown) =>
    fn({
      tenant: { findUnique: vi.fn() },
      product: { count: vi.fn() },
    })
  ),
}))

import { withTenant } from '@/lib/prisma'
import { getMissingStoreConfig } from './tenant'

function mockTenant(overrides: Record<string, unknown>) {
  const db = {
    tenant: {
      findUnique: vi.fn().mockResolvedValue({
        isOnboarded: true,
        paymentProvider: 'upi_manual',
        paymentConfig: null,
        contactPhone: '9999999999',
        contactEmail: 'a@b.com',
        about: { description: 'We make things' },
        branches: [{ address: '123 Road', city: 'Bengaluru' }],
        ...overrides,
      }),
    },
    product: { count: vi.fn().mockResolvedValue(3) },
  }
  vi.mocked(withTenant).mockImplementation((_tenantId, fn) => Promise.resolve(fn(db)))
  return db
}

beforeEach(() => vi.clearAllMocks())

describe('getMissingStoreConfig — payments check', () => {
  it('passes non-razorpay providers based on isOnboarded (unchanged behavior)', async () => {
    mockTenant({ paymentProvider: 'upi_manual', isOnboarded: true })
    const missing = await getMissingStoreConfig('tenant-1')
    expect(missing.find((m) => m.key === 'payments')).toBeUndefined()
  })

  it('flags razorpay as missing when paymentConfig is null', async () => {
    mockTenant({ paymentProvider: 'razorpay', paymentConfig: null })
    const missing = await getMissingStoreConfig('tenant-1')
    expect(missing.find((m) => m.key === 'payments')).toMatchObject({ key: 'payments' })
  })

  it('flags razorpay as missing when status is pending', async () => {
    mockTenant({
      paymentProvider: 'razorpay',
      paymentConfig: { provider: 'razorpay', accountId: 'acc_1', status: 'pending', updatedAt: '2026-07-21T00:00:00.000Z' },
    })
    const missing = await getMissingStoreConfig('tenant-1')
    expect(missing.find((m) => m.key === 'payments')).toMatchObject({ key: 'payments' })
  })

  it('clears razorpay once status is activated', async () => {
    mockTenant({
      paymentProvider: 'razorpay',
      paymentConfig: { provider: 'razorpay', accountId: 'acc_1', status: 'activated', updatedAt: '2026-07-21T00:00:00.000Z' },
    })
    const missing = await getMissingStoreConfig('tenant-1')
    expect(missing.find((m) => m.key === 'payments')).toBeUndefined()
  })
})
