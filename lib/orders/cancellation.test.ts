import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { OrderStatus, PaymentStatus } from '@prisma/client'

const { mockWithTenant, mockFindFirst, mockUpdateMany, mockUpdate, mockEventCreate, mockRefund, mockSendCancelled } =
  vi.hoisted(() => ({
    mockWithTenant: vi.fn(),
    mockFindFirst: vi.fn(),
    mockUpdateMany: vi.fn(),
    mockUpdate: vi.fn(),
    mockEventCreate: vi.fn(),
    mockRefund: vi.fn(),
    mockSendCancelled: vi.fn(),
  }))

vi.mock('@/lib/prisma', () => ({ withTenant: mockWithTenant }))
vi.mock('@/lib/payments/razorpay', () => ({ refundRazorpayPayment: mockRefund }))
vi.mock('@/lib/resend', () => ({ sendOrderCancelledWithRefundEmail: mockSendCancelled }))

import { cancelOrder, confirmRefundVerification, isCancellable, refundRouteFor, submitRefundProof } from './cancellation'

const ORDER = {
  id: 'o1',
  status: 'confirmed' as OrderStatus,
  // Widened deliberately: givenOrder() overrides are typed off this object, and a `as const`
  // here would narrow the field to 'pending' and reject every paid-order case below.
  paymentStatus: 'pending' as PaymentStatus,
  paymentProvider: 'cod',
  paymentId: null as string | null,
  total: 2699,
  cancelReason: null as string | null,
  refundProofUrl: null as string | null,
  refundVerifiedAt: null as Date | null,
  customer: { email: 'priya@example.com' },
  tenant: { name: 'Meena Silks' },
}

function givenOrder(overrides: Partial<typeof ORDER> = {}) {
  mockFindFirst.mockResolvedValue({ ...ORDER, ...overrides })
}

/** True when nothing at all was written — the "refund failed, leave the order alone" check. */
function nothingWasWritten() {
  return (
    mockUpdateMany.mock.calls.length === 0 &&
    mockUpdate.mock.calls.length === 0 &&
    mockEventCreate.mock.calls.length === 0
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockWithTenant.mockImplementation((_tenantId: string, fn: (db: unknown) => unknown) =>
    fn({
      order: { findFirst: mockFindFirst, updateMany: mockUpdateMany, update: mockUpdate },
      orderStatusEvent: { create: mockEventCreate },
    })
  )
  mockUpdateMany.mockResolvedValue({ count: 1 })
  mockUpdate.mockResolvedValue({})
  mockEventCreate.mockResolvedValue({})
  mockRefund.mockResolvedValue({ id: 'rfnd_1', amount: 269900, status: 'processed' })
  givenOrder()
})

describe('isCancellable', () => {
  it('allows cancellation only before the order has shipped', () => {
    expect(isCancellable('pending')).toBe(true)
    expect(isCancellable('confirmed')).toBe(true)
  })

  it.each(['shipped', 'delivered', 'cancelled', 'returned'] as OrderStatus[])(
    'refuses a %s order — the parcel is already with the courier or the order is closed',
    (status) => {
      expect(isCancellable(status)).toBe(false)
    }
  )
})

describe('refundRouteFor', () => {
  it('needs no refund when the order was never paid', () => {
    expect(refundRouteFor({ paymentStatus: 'pending', paymentProvider: 'razorpay' })).toBe('none')
  })

  it('routes a paid Razorpay order to an automatic refund', () => {
    expect(refundRouteFor({ paymentStatus: 'paid', paymentProvider: 'razorpay' })).toBe('razorpay')
  })

  it.each(['cod', 'upi_manual', null])('routes a paid %s order to the manual refund flow', (provider) => {
    expect(refundRouteFor({ paymentStatus: 'paid', paymentProvider: provider })).toBe('manual')
  })
})

describe('cancelOrder', () => {
  it.each(['shipped', 'delivered', 'cancelled', 'returned'] as OrderStatus[])(
    'refuses to cancel a %s order and changes nothing',
    async (status) => {
      givenOrder({ status })

      const result = await cancelOrder('t1', 'o1', 'Customer requested cancellation')

      expect(result.error).toEqual(expect.any(String))
      expect(nothingWasWritten()).toBe(true)
      expect(mockSendCancelled).not.toHaveBeenCalled()
    }
  )

  it('re-reads the order status at the moment of cancelling rather than trusting the caller', async () => {
    // The admin's page could have been loaded before the order shipped.
    givenOrder({ status: 'confirmed' })
    mockUpdateMany.mockResolvedValue({ count: 0 })

    const result = await cancelOrder('t1', 'o1', 'Customer requested cancellation')

    expect(result.error).toEqual(expect.any(String))
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: { in: ['pending', 'confirmed'] } }) })
    )
    expect(mockSendCancelled).not.toHaveBeenCalled()
  })

  it('cancels an unpaid order in one step without touching Razorpay', async () => {
    givenOrder({ paymentStatus: 'pending', paymentProvider: 'cod' })

    const result = await cancelOrder('t1', 'o1', 'Item out of stock')

    expect(result.error).toBeUndefined()
    expect(mockRefund).not.toHaveBeenCalled()
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'cancelled', cancelReason: 'Item out of stock' } })
    )
  })

  it('emails the customer that an unpaid order has no refund to expect', async () => {
    givenOrder({ paymentStatus: 'pending', paymentProvider: 'cod' })

    await cancelOrder('t1', 'o1', 'Item out of stock')

    expect(mockSendCancelled).toHaveBeenCalledTimes(1)
    expect(mockSendCancelled).toHaveBeenCalledWith(
      'priya@example.com',
      expect.objectContaining({ reason: 'Item out of stock', refundStatus: 'not_applicable', storeName: 'Meena Silks' })
    )
  })

  it('refunds the full amount in paise for a paid Razorpay order', async () => {
    givenOrder({ paymentStatus: 'paid', paymentProvider: 'razorpay', paymentId: 'pay_456', total: 2699 })

    await cancelOrder('t1', 'o1', 'Customer requested cancellation')

    expect(mockRefund).toHaveBeenCalledWith('pay_456', 269900)
  })

  it('marks a refunded Razorpay order refunded and cancelled together', async () => {
    givenOrder({ paymentStatus: 'paid', paymentProvider: 'razorpay', paymentId: 'pay_456' })

    const result = await cancelOrder('t1', 'o1', 'Customer requested cancellation')

    expect(result.error).toBeUndefined()
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'cancelled', cancelReason: 'Customer requested cancellation', paymentStatus: 'refunded' },
      })
    )
    expect(mockSendCancelled).toHaveBeenCalledWith('priya@example.com', expect.objectContaining({ refundStatus: 'refunded' }))
  })

  it('leaves the order completely unchanged when Razorpay rejects the refund', async () => {
    givenOrder({ paymentStatus: 'paid', paymentProvider: 'razorpay', paymentId: 'pay_456' })
    mockRefund.mockRejectedValue(new Error('Razorpay refund failed (400): insufficient balance'))

    const result = await cancelOrder('t1', 'o1', 'Customer requested cancellation')

    expect(result.error).toContain('insufficient balance')
    expect(nothingWasWritten()).toBe(true)
    expect(mockSendCancelled).not.toHaveBeenCalled()
  })

  it('refuses a paid COD order, which has to go through the manual refund flow instead', async () => {
    givenOrder({ paymentStatus: 'paid', paymentProvider: 'cod' })

    const result = await cancelOrder('t1', 'o1', 'Customer requested cancellation')

    expect(result.error).toEqual(expect.any(String))
    expect(nothingWasWritten()).toBe(true)
    expect(mockSendCancelled).not.toHaveBeenCalled()
  })
})

describe('submitRefundProof', () => {
  const PROOF = 'https://res.cloudinary.com/talam/refund-proofs/x.png'

  it('records the screenshot and reason without cancelling the order yet', async () => {
    givenOrder({ paymentStatus: 'paid', paymentProvider: 'cod' })

    const result = await submitRefundProof('t1', 'o1', 'Customer requested cancellation', PROOF)

    expect(result.error).toBeUndefined()
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { refundProofUrl: PROOF, cancelReason: 'Customer requested cancellation' } })
    )
  })

  it('sends no cancellation email — the refund is not verified yet', async () => {
    givenOrder({ paymentStatus: 'paid', paymentProvider: 'cod' })

    await submitRefundProof('t1', 'o1', 'Customer requested cancellation', PROOF)

    expect(mockSendCancelled).not.toHaveBeenCalled()
  })

  it('refuses an order that has already shipped', async () => {
    givenOrder({ status: 'shipped', paymentStatus: 'paid', paymentProvider: 'cod' })

    const result = await submitRefundProof('t1', 'o1', 'Customer requested cancellation', PROOF)

    expect(result.error).toEqual(expect.any(String))
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('refuses an order that Razorpay can refund automatically', async () => {
    givenOrder({ paymentStatus: 'paid', paymentProvider: 'razorpay', paymentId: 'pay_456' })

    const result = await submitRefundProof('t1', 'o1', 'Customer requested cancellation', PROOF)

    expect(result.error).toEqual(expect.any(String))
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})

describe('confirmRefundVerification', () => {
  const VERIFIER = { email: 'support@talam.com', role: 'support_agent' as const }
  const AWAITING = {
    status: 'confirmed' as OrderStatus,
    paymentStatus: 'paid' as const,
    paymentProvider: 'cod',
    refundProofUrl: 'https://res.cloudinary.com/talam/refund-proofs/x.png',
    cancelReason: 'Customer requested cancellation',
  }

  it.each(['billing_manager', 'growth_analyst'] as const)('rejects a %s verifier and changes nothing', async (role) => {
    givenOrder(AWAITING)

    const result = await confirmRefundVerification('t1', 'o1', { email: 'x@talam.com', role })

    expect(result.error).toEqual(expect.any(String))
    expect(nothingWasWritten()).toBe(true)
    expect(mockSendCancelled).not.toHaveBeenCalled()
  })

  it('rejects confirmation when no refund screenshot has been uploaded', async () => {
    givenOrder({ ...AWAITING, refundProofUrl: null })

    const result = await confirmRefundVerification('t1', 'o1', VERIFIER)

    expect(result.error).toEqual(expect.any(String))
    expect(nothingWasWritten()).toBe(true)
    expect(mockSendCancelled).not.toHaveBeenCalled()
  })

  it('finalises the cancellation and refund in a single write', async () => {
    givenOrder(AWAITING)

    const result = await confirmRefundVerification('t1', 'o1', VERIFIER)

    expect(result.error).toBeUndefined()
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'cancelled',
          paymentStatus: 'refunded',
          cancelReason: 'Customer requested cancellation',
        }),
      })
    )
  })

  it('records who signed off and when, as the audit trail for the screenshot', async () => {
    givenOrder(AWAITING)

    await confirmRefundVerification('t1', 'o1', VERIFIER)

    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ refundVerifiedBy: 'support@talam.com', refundVerifiedAt: expect.any(Date) }),
      })
    )
  })

  it('sends the cancellation email exactly once, on this final step', async () => {
    givenOrder(AWAITING)

    await confirmRefundVerification('t1', 'o1', VERIFIER)

    expect(mockSendCancelled).toHaveBeenCalledTimes(1)
    expect(mockSendCancelled).toHaveBeenCalledWith('priya@example.com', expect.objectContaining({ refundStatus: 'refunded' }))
  })

  it('refuses to verify the same refund twice', async () => {
    givenOrder({ ...AWAITING, refundVerifiedAt: new Date('2026-08-23T10:00:00Z') })

    const result = await confirmRefundVerification('t1', 'o1', VERIFIER)

    expect(result.error).toEqual(expect.any(String))
    expect(nothingWasWritten()).toBe(true)
  })
})
