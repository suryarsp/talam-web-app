import { isValidVpa } from './upi'

/**
 * Single source of truth for `Tenant.paymentConfig` — the multi-gateway shape.
 *
 * Razorpay onboarding data (accountId/status) lives *nested inside* `razorpay`, not as a
 * top-level shape of its own. A previous version of this code had two incompatible shapes:
 * the multi-gateway one written by the Payments tab, and a single-provider one
 * (`{ provider, accountId, status }`) written by Razorpay onboarding that overwrote the whole
 * column — silently wiping UPI settings the moment a merchant clicked "Connect Razorpay".
 * `normalizePaymentConfig` below reads both; everything that writes must use the shape here.
 */

export type RazorpayStatus = 'pending' | 'needs_clarification' | 'activated' | 'rejected'

export type PaymentGatewayConfig = {
  upi: { enabled: boolean; upiId: string }
  instamojo: { enabled: boolean }
  razorpay: { enabled: boolean; accountId?: string; status?: RazorpayStatus; updatedAt?: string }
}

export const DEFAULT_PAYMENT_CONFIG: PaymentGatewayConfig = {
  upi: { enabled: true, upiId: '' },
  instamojo: { enabled: false },
  razorpay: { enabled: false },
}

/**
 * Normalizes a raw `Tenant.paymentConfig` JSON value into the current multi-gateway shape,
 * transparently upgrading rows still holding the legacy single-provider shape
 * (`{ provider: 'razorpay', accountId, status, updatedAt }` at the top level, no `razorpay` key).
 */
export function normalizePaymentConfig(raw: unknown): PaymentGatewayConfig {
  const stored = (raw ?? {}) as Record<string, unknown>

  if (typeof stored.provider === 'string' && typeof stored.accountId === 'string' && !stored.razorpay) {
    return {
      ...DEFAULT_PAYMENT_CONFIG,
      razorpay: {
        enabled: true,
        accountId: stored.accountId as string,
        status: stored.status as RazorpayStatus | undefined,
        updatedAt: stored.updatedAt as string | undefined,
      },
    }
  }

  const s = stored as Partial<PaymentGatewayConfig>
  return {
    upi: { ...DEFAULT_PAYMENT_CONFIG.upi, ...s.upi },
    instamojo: { ...DEFAULT_PAYMENT_CONFIG.instamojo, ...s.instamojo },
    razorpay: { ...DEFAULT_PAYMENT_CONFIG.razorpay, ...s.razorpay },
  }
}

/** Store is payment-ready if *any* configured gateway is actually usable. A disabled or
 *  not-yet-activated Razorpay must never block go-live when another gateway works. */
export function isPaymentReady(config: PaymentGatewayConfig): boolean {
  const upiOk = config.upi.enabled && isValidVpa(config.upi.upiId)
  const instamojoOk = config.instamojo.enabled
  const razorpayOk = config.razorpay.enabled && config.razorpay.status === 'activated'
  return upiOk || instamojoOk || razorpayOk
}
