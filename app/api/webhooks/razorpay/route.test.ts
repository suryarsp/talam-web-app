import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockOrderFindFirst, mockOrderUpdate, mockOrderUpdateMany, mockVerify, mockSendPaymentFailedEmail } = vi.hoisted(() => ({
  mockOrderFindFirst: vi.fn(),
  mockOrderUpdate: vi.fn(),
  mockOrderUpdateMany: vi.fn(),
  mockVerify: vi.fn(),
  mockSendPaymentFailedEmail: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: { findFirst: mockOrderFindFirst, update: mockOrderUpdate, updateMany: mockOrderUpdateMany },
  },
}))
vi.mock('@/lib/payments/razorpay', () => ({ verifyRazorpayWebhook: mockVerify }))
vi.mock('@/lib/resend', () => ({ sendPaymentFailedEmail: mockSendPaymentFailedEmail }))

import { POST } from './route'

function makeRequest(body: unknown, signature: string | null = 'valid-sig') {
  const headers = new Headers()
  if (signature) headers.set('x-razorpay-signature', signature)
  return new NextRequest('http://localhost/api/webhooks/razorpay', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

const failedEvent = (orderId = 'rzp_order_1') => ({
  event: 'payment.failed',
  payload: { payment: { entity: { id: 'pay_1', order_id: orderId } } },
})

beforeEach(() => {
  vi.clearAllMocks()
  mockVerify.mockReturnValue(true)
  mockOrderUpdate.mockResolvedValue(undefined)
})

describe('POST /api/webhooks/razorpay — payment.failed', () => {
  it('rejects a request with an invalid signature before touching the database', async () => {
    mockVerify.mockReturnValue(false)

    const res = await POST(makeRequest(failedEvent()))

    expect(res.status).toBe(401)
    expect(mockOrderFindFirst).not.toHaveBeenCalled()
  })

  it('marks the pending order failed and emails the customer', async () => {
    mockOrderFindFirst.mockResolvedValue({
      id: 'order-1',
      tenantId: 'tenant-1',
      customer: { email: 'priya@example.com' },
      tenant: { name: 'Meena Silks', slug: 'meena-silks' },
    })

    const res = await POST(makeRequest(failedEvent()))

    expect(res.status).toBe(200)
    expect(mockOrderUpdate).toHaveBeenCalledWith({ where: { id: 'order-1' }, data: { paymentStatus: 'failed' } })
    expect(mockSendPaymentFailedEmail).toHaveBeenCalledWith('priya@example.com', {
      storeName: 'Meena Silks',
      orderCode: expect.any(String),
      retryUrl: expect.stringContaining('/orders/order-1'),
    })
  })

  it('is a no-op (200, no update, no email) when no pending order matches', async () => {
    mockOrderFindFirst.mockResolvedValue(null)

    const res = await POST(makeRequest(failedEvent('unknown')))

    expect(res.status).toBe(200)
    expect(mockOrderUpdate).not.toHaveBeenCalled()
    expect(mockSendPaymentFailedEmail).not.toHaveBeenCalled()
  })

  it('does not email when the order has no customer email on file', async () => {
    mockOrderFindFirst.mockResolvedValue({
      id: 'order-1',
      tenantId: 'tenant-1',
      customer: { email: null },
      tenant: { name: 'Meena Silks', slug: 'meena-silks' },
    })

    const res = await POST(makeRequest(failedEvent()))

    expect(res.status).toBe(200)
    expect(mockOrderUpdate).toHaveBeenCalled()
    expect(mockSendPaymentFailedEmail).not.toHaveBeenCalled()
  })

  it('answers 400 when the payment entity is missing an order id', async () => {
    const res = await POST(
      makeRequest({ event: 'payment.failed', payload: { payment: { entity: { id: 'pay_1' } } } })
    )

    expect(res.status).toBe(400)
    expect(mockOrderFindFirst).not.toHaveBeenCalled()
  })

  it('still ignores unrelated events', async () => {
    const res = await POST(makeRequest({ event: 'refund.processed' }))

    expect(res.status).toBe(200)
    expect(mockOrderFindFirst).not.toHaveBeenCalled()
    expect(mockOrderUpdateMany).not.toHaveBeenCalled()
  })
})
