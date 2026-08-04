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
        paymentConfig: { upi: { enabled: true, upiId: 'store@bank' }, instamojo: { enabled: false }, razorpay: { enabled: false } },
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
  it('passes when UPI alone is enabled with a valid VPA', async () => {
    mockTenant({ paymentConfig: { upi: { enabled: true, upiId: 'store@bank' }, instamojo: { enabled: false }, razorpay: { enabled: false } } })
    const missing = await getMissingStoreConfig('tenant-1')
    expect(missing.find((m) => m.key === 'payments')).toBeUndefined()
  })

  it('flags payments as missing when no paymentConfig has been saved yet', async () => {
    mockTenant({ paymentConfig: null })
    const missing = await getMissingStoreConfig('tenant-1')
    expect(missing.find((m) => m.key === 'payments')).toMatchObject({ key: 'payments' })
  })

  it('does not require a valid VPA when UPI is off but Razorpay is activated', async () => {
    mockTenant({
      paymentConfig: {
        upi: { enabled: false, upiId: '' },
        instamojo: { enabled: false },
        razorpay: { enabled: true, accountId: 'acc_1', status: 'activated' },
      },
    })
    const missing = await getMissingStoreConfig('tenant-1')
    expect(missing.find((m) => m.key === 'payments')).toBeUndefined()
  })

  it('a disabled/pending Razorpay never blocks go-live when UPI is already valid', async () => {
    mockTenant({
      paymentConfig: {
        upi: { enabled: true, upiId: 'store@bank' },
        instamojo: { enabled: false },
        razorpay: { enabled: true, accountId: 'acc_1', status: 'pending' },
      },
    })
    const missing = await getMissingStoreConfig('tenant-1')
    expect(missing.find((m) => m.key === 'payments')).toBeUndefined()
  })

  it('flags payments as missing when Razorpay is the only gateway and still pending', async () => {
    mockTenant({
      paymentConfig: {
        upi: { enabled: false, upiId: '' },
        instamojo: { enabled: false },
        razorpay: { enabled: true, accountId: 'acc_1', status: 'pending' },
      },
    })
    const missing = await getMissingStoreConfig('tenant-1')
    expect(missing.find((m) => m.key === 'payments')).toMatchObject({ key: 'payments', description: 'Finish Razorpay verification (KYC pending)' })
  })

  it('normalizes a legacy single-provider paymentConfig row', async () => {
    mockTenant({
      paymentConfig: { provider: 'razorpay', accountId: 'acc_1', status: 'activated', updatedAt: '2026-07-21T00:00:00.000Z' },
    })
    const missing = await getMissingStoreConfig('tenant-1')
    expect(missing.find((m) => m.key === 'payments')).toBeUndefined()
  })
})
