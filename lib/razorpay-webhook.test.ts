import { beforeEach, describe, expect, it, vi } from 'vitest'
import crypto from 'node:crypto'

vi.mock('@/lib/prisma', () => ({
  prisma: { tenant: { updateMany: vi.fn() } },
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
  it('updates the matching tenant to activated on account.activated', async () => {
    await handleRazorpayAccountEvent({ event: 'account.activated', account_id: 'acc_1' })
    expect(prisma.tenant.updateMany).toHaveBeenCalledWith({
      where: { paymentConfig: { path: ['accountId'], equals: 'acc_1' } },
      data: { paymentConfig: expect.objectContaining({ status: 'activated', accountId: 'acc_1' }) },
    })
  })

  it('maps account.under_review to pending and account.rejected to rejected', async () => {
    await handleRazorpayAccountEvent({ event: 'account.under_review', account_id: 'acc_2' })
    expect(prisma.tenant.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ paymentConfig: expect.objectContaining({ status: 'pending' }) }) })
    )

    await handleRazorpayAccountEvent({ event: 'account.rejected', account_id: 'acc_3' })
    expect(prisma.tenant.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ paymentConfig: expect.objectContaining({ status: 'rejected' }) }) })
    )
  })

  it('ignores unrecognized events without touching the database', async () => {
    await handleRazorpayAccountEvent({ event: 'payment.captured', account_id: 'acc_1' })
    expect(prisma.tenant.updateMany).not.toHaveBeenCalled()
  })
})
