import crypto from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { normalizePaymentConfig, type PaymentGatewayConfig, type RazorpayStatus } from '@/lib/payments/config'

export function verifyRazorpaySignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const expectedBuf = Buffer.from(expected)
  const signatureBuf = Buffer.from(signature)
  if (expectedBuf.length !== signatureBuf.length) return false
  return crypto.timingSafeEqual(expectedBuf, signatureBuf)
}

const EVENT_TO_STATUS: Record<string, RazorpayStatus> = {
  'account.activated': 'activated',
  'account.under_review': 'pending',
  'account.needs_clarification': 'needs_clarification',
  'account.rejected': 'rejected',
}

/**
 * `accountId` lives nested under `paymentConfig.razorpay.accountId` in the current shape (see
 * lib/payments/config.ts), but a legacy row may still have it at the top level — the JSON path
 * query below has to check the same place `normalizePaymentConfig` reads from. Old top-level
 * rows are matched by the same accountId regardless of which shape produced them; each match is
 * fetched and merged individually rather than blindly overwritten with `updateMany`, since a
 * blanket write is exactly the bug that used to wipe a merchant's saved UPI settings.
 */
export async function handleRazorpayAccountEvent(payload: { event: string; account_id: string }): Promise<void> {
  const status = EVENT_TO_STATUS[payload.event]
  if (!status) return

  const [nested, legacy] = await Promise.all([
    prisma.tenant.findMany({
      where: { paymentConfig: { path: ['razorpay', 'accountId'], equals: payload.account_id } },
      select: { id: true, paymentConfig: true },
    }),
    prisma.tenant.findMany({
      where: { paymentConfig: { path: ['accountId'], equals: payload.account_id } },
      select: { id: true, paymentConfig: true },
    }),
  ])

  const byId = new Map([...nested, ...legacy].map((t) => [t.id, t]))

  await Promise.all(
    Array.from(byId.values()).map((tenant) => {
      const current = normalizePaymentConfig(tenant.paymentConfig)
      const config: PaymentGatewayConfig = {
        ...current,
        razorpay: { ...current.razorpay, accountId: payload.account_id, status, updatedAt: new Date().toISOString() },
      }
      return prisma.tenant.update({ where: { id: tenant.id }, data: { paymentConfig: config } })
    })
  )
}
