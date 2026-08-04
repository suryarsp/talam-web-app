import { beforeEach, describe, expect, it, vi } from 'vitest'
import crypto from 'node:crypto'

vi.mock('@/lib/prisma', () => ({
  prisma: { tenant: { findMany: vi.fn().mockResolvedValue([]), update: vi.fn() } },
}))

import { prisma } from '@/lib/prisma'
import { verifyRazorpaySignature, handleRazorpayAccountEvent } from './razorpay-webhook'

beforeEach(() => vi.clearAllMocks())

describe('verifyRazorpaySignature', () => {
  it('accepts a signature computed with the correct secret', () => {
    const body = '{"event":"account.activated"}'
    const secret = 'whsec_test'
    const signature = crypto.createHmac('sha256', secret).update(body).digest('hex')
    expect(verifyRazorpaySignature(body, signature, secret)).toBe(true)
  })

  it('rejects a wrong signature', () => {
    expect(verifyRazorpaySignature('{"event":"x"}', 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef', 'whsec_test')).toBe(false)
  })
})

describe('handleRazorpayAccountEvent', () => {
  it('merges the new status into the matching tenant without touching other gateways', async () => {
    vi.mocked(prisma.tenant.findMany).mockImplementation(((args: unknown) => {
      // Only the nested-path query (current shape) matches in this test.
      const path = (args as { where: { paymentConfig: { path: string[] } } }).where.paymentConfig.path
      if (path[0] === 'razorpay') {
        return Promise.resolve([
          {
            id: 'tenant-1',
            paymentConfig: {
              upi: { enabled: true, upiId: 'store@bank' },
              instamojo: { enabled: false },
              razorpay: { enabled: true, accountId: 'acc_1', status: 'pending' },
            },
          },
        ])
      }
      return Promise.resolve([])
    }) as never)

    await handleRazorpayAccountEvent({ event: 'account.activated', account_id: 'acc_1' })

    expect(prisma.tenant.update).toHaveBeenCalledWith({
      where: { id: 'tenant-1' },
      data: {
        paymentConfig: expect.objectContaining({
          upi: { enabled: true, upiId: 'store@bank' },
          razorpay: expect.objectContaining({ status: 'activated', accountId: 'acc_1' }),
        }),
      },
    })
  })

  it('maps account.under_review to pending and account.rejected to rejected', async () => {
    vi.mocked(prisma.tenant.findMany).mockResolvedValue([
      {
        id: 'tenant-2',
        paymentConfig: { upi: { enabled: false, upiId: '' }, instamojo: { enabled: false }, razorpay: { enabled: true, accountId: 'acc_2' } },
      },
    ] as never)

    await handleRazorpayAccountEvent({ event: 'account.under_review', account_id: 'acc_2' })
    expect(prisma.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paymentConfig: expect.objectContaining({ razorpay: expect.objectContaining({ status: 'pending' }) }) }),
      })
    )

    vi.mocked(prisma.tenant.update).mockClear()
    await handleRazorpayAccountEvent({ event: 'account.rejected', account_id: 'acc_2' })
    expect(prisma.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paymentConfig: expect.objectContaining({ razorpay: expect.objectContaining({ status: 'rejected' }) }) }),
      })
    )
  })

  it('ignores unrecognized events without touching the database', async () => {
    await handleRazorpayAccountEvent({ event: 'payment.captured', account_id: 'acc_1' })
    expect(prisma.tenant.findMany).not.toHaveBeenCalled()
    expect(prisma.tenant.update).not.toHaveBeenCalled()
  })
})
