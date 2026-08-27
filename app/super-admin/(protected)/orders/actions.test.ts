import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdminStaffRole } from '@prisma/client'

const {
  mockRequireSuperAdminSection,
  mockCancelOrder,
  mockSubmitRefundProof,
  mockConfirmRefundVerification,
  mockUploadImage,
  mockRevalidatePath,
} = vi.hoisted(() => ({
  mockRequireSuperAdminSection: vi.fn(),
  mockCancelOrder: vi.fn(),
  mockSubmitRefundProof: vi.fn(),
  mockConfirmRefundVerification: vi.fn(),
  mockUploadImage: vi.fn(),
  mockRevalidatePath: vi.fn(),
}))

vi.mock('@/lib/auth-guard', () => ({ requireSuperAdminSection: mockRequireSuperAdminSection }))
vi.mock('@/lib/orders/cancellation', () => ({
  cancelOrder: mockCancelOrder,
  submitRefundProof: mockSubmitRefundProof,
  confirmRefundVerification: mockConfirmRefundVerification,
}))
vi.mock('@/lib/cloudinary', () => ({ uploadImage: mockUploadImage }))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))

import { cancelOrderAction, uploadRefundProofAction, confirmRefundVerificationAction } from './actions'

function signedInAs(role: AdminStaffRole, email = 'ops@talam.com') {
  mockRequireSuperAdminSection.mockResolvedValue({ user: { email }, role })
}

const PROOF = new File(['x'], 'upi.png', { type: 'image/png' })

beforeEach(() => {
  vi.clearAllMocks()
  signedInAs('owner')
  mockCancelOrder.mockResolvedValue({})
  mockSubmitRefundProof.mockResolvedValue({})
  mockConfirmRefundVerification.mockResolvedValue({})
  mockUploadImage.mockResolvedValue('https://cdn/refund-proofs/upi.png')
})

describe('cancelOrderAction', () => {
  it('gates on the orders section before touching the order', async () => {
    await cancelOrderAction('t1', 'o1', 'Out of stock')
    expect(mockRequireSuperAdminSection).toHaveBeenCalledWith('orders')
  })

  it('cancels the order and refreshes the queue', async () => {
    expect(await cancelOrderAction('t1', 'o1', 'Out of stock')).toEqual({})
    expect(mockCancelOrder).toHaveBeenCalledWith('t1', 'o1', 'Out of stock')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/super-admin/orders')
  })

  it('surfaces the refusal and leaves the page alone when cancellation is rejected', async () => {
    mockCancelOrder.mockResolvedValue({ error: 'This order has no Razorpay payment to refund.' })

    expect(await cancelOrderAction('t1', 'o1', 'Out of stock')).toEqual({
      error: 'This order has no Razorpay payment to refund.',
    })
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it('reports an unexpected failure as an error rather than throwing at the client', async () => {
    mockCancelOrder.mockRejectedValue(new Error('connection reset'))

    expect(await cancelOrderAction('t1', 'o1', 'Out of stock')).toEqual({ error: expect.any(String) })
  })
})

describe('uploadRefundProofAction', () => {
  it('files the screenshot under the tenant before recording it against the order', async () => {
    expect(await uploadRefundProofAction('t1', 'o1', 'Customer changed mind', PROOF)).toEqual({})
    expect(mockUploadImage).toHaveBeenCalledWith(PROOF, 'talam/t1/refund-proofs')
    expect(mockSubmitRefundProof).toHaveBeenCalledWith(
      't1',
      'o1',
      'Customer changed mind',
      'https://cdn/refund-proofs/upi.png'
    )
    expect(mockRevalidatePath).toHaveBeenCalledWith('/super-admin/orders')
  })

  it('does not record a proof whose upload failed', async () => {
    mockUploadImage.mockRejectedValue(new Error('cloudinary down'))

    expect(await uploadRefundProofAction('t1', 'o1', 'Customer changed mind', PROOF)).toEqual({
      error: expect.any(String),
    })
    expect(mockSubmitRefundProof).not.toHaveBeenCalled()
  })

  it('surfaces a rejection from the order itself', async () => {
    mockSubmitRefundProof.mockResolvedValue({ error: 'This order does not need a manual refund.' })

    expect(await uploadRefundProofAction('t1', 'o1', 'Customer changed mind', PROOF)).toEqual({
      error: 'This order does not need a manual refund.',
    })
  })
})

describe('confirmRefundVerificationAction', () => {
  it('forwards the signed-in verifier so the audit trail records who signed off', async () => {
    signedInAs('support_agent', 'asha@talam.com')

    expect(await confirmRefundVerificationAction('t1', 'o1')).toEqual({})
    expect(mockConfirmRefundVerification).toHaveBeenCalledWith('t1', 'o1', {
      email: 'asha@talam.com',
      role: 'support_agent',
    })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/super-admin/orders')
  })

  // The role check lives in lib/orders/cancellation.ts (canVerifyRefund) — what matters here
  // is that the real role travels with the call and its refusal reaches the caller.
  it('passes a reader-only role through and surfaces the refusal', async () => {
    signedInAs('growth_analyst', 'dev@talam.com')
    mockConfirmRefundVerification.mockResolvedValue({
      error: 'Only an owner or support agent can confirm a manual refund.',
    })

    expect(await confirmRefundVerificationAction('t1', 'o1')).toEqual({
      error: 'Only an owner or support agent can confirm a manual refund.',
    })
    expect(mockConfirmRefundVerification).toHaveBeenCalledWith('t1', 'o1', {
      email: 'dev@talam.com',
      role: 'growth_analyst',
    })
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it('reports an unexpected failure as an error rather than throwing at the client', async () => {
    mockConfirmRefundVerification.mockRejectedValue(new Error('connection reset'))

    expect(await confirmRefundVerificationAction('t1', 'o1')).toEqual({ error: expect.any(String) })
  })
})
