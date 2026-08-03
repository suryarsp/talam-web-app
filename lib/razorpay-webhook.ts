import crypto from 'node:crypto'
import { prisma } from '@/lib/prisma'
import type { RazorpayPaymentConfig } from '@/lib/data/tenant'

export function verifyRazorpaySignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const expectedBuf = Buffer.from(expected)
  const signatureBuf = Buffer.from(signature)
  if (expectedBuf.length !== signatureBuf.length) return false
  return crypto.timingSafeEqual(expectedBuf, signatureBuf)
}

const EVENT_TO_STATUS: Record<string, RazorpayPaymentConfig['status']> = {
  'account.activated': 'activated',
  'account.under_review': 'pending',
  'account.needs_clarification': 'needs_clarification',
  'account.rejected': 'rejected',
}

export async function handleRazorpayAccountEvent(payload: { event: string; account_id: string }): Promise<void> {
  const status = EVENT_TO_STATUS[payload.event]
  if (!status) return

  const paymentConfig: RazorpayPaymentConfig = {
    provider: 'razorpay',
    accountId: payload.account_id,
    status,
    updatedAt: new Date().toISOString(),
  }
  await prisma.tenant.updateMany({
    where: { paymentConfig: { path: ['accountId'], equals: payload.account_id } },
    data: { paymentConfig },
  })
}
