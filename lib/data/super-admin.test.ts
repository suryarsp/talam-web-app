import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockWithSuperAdmin, mockFindMany } = vi.hoisted(() => ({
  mockWithSuperAdmin: vi.fn(),
  mockFindMany: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ withSuperAdmin: mockWithSuperAdmin }))

import { getFlaggedOrders, getPendingRefundVerifications } from './super-admin'

beforeEach(() => {
  vi.clearAllMocks()
  mockWithSuperAdmin.mockImplementation((fn: (db: unknown) => unknown) => fn({ order: { findMany: mockFindMany } }))
})

describe('getFlaggedOrders', () => {
  it('carries the fields the cancellation flow needs — tenantId to address the order, status and paymentStatus to decide what can be done to it', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'o1',
        tenantId: 't1',
        status: 'confirmed',
        paymentStatus: 'paid',
        total: 2699,
        paymentProvider: 'razorpay',
        paymentId: 'pay_1',
        disputeFlaggedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        tenant: { name: 'Meena Silks' },
      },
    ])

    const [order] = await getFlaggedOrders()

    expect(order).toMatchObject({
      id: 'o1',
      tenantId: 't1',
      status: 'confirmed',
      paymentStatus: 'paid',
      tenantName: 'Meena Silks',
      total: 2699,
      utr: 'pay_1',
      daysPending: 2,
    })
  })
})

describe('getPendingRefundVerifications', () => {
  it('queues only orders whose refund screenshot is filed but not yet signed off', async () => {
    mockFindMany.mockResolvedValue([])

    await getPendingRefundVerifications()

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { refundProofUrl: { not: null }, refundVerifiedAt: null } })
    )
  })

  it('returns the row a verifier needs to judge the proof', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'o2',
        tenantId: 't2',
        total: 1499,
        cancelReason: 'Out of stock',
        refundProofUrl: 'https://cdn/proof.png',
        tenant: { name: 'Anjali Weaves' },
        customer: { email: 'priya@example.com' },
      },
    ])

    expect(await getPendingRefundVerifications()).toEqual([
      {
        id: 'o2',
        tenantId: 't2',
        tenantName: 'Anjali Weaves',
        total: 1499,
        cancelReason: 'Out of stock',
        refundProofUrl: 'https://cdn/proof.png',
        customerEmail: 'priya@example.com',
      },
    ])
  })
})
