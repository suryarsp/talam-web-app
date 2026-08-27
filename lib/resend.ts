import { Resend } from 'resend'
import {
  goLiveReadyTemplate,
  onboardingCompleteTemplate,
  onboardingReminderTemplate,
  onboardingWelcomeTemplate,
  storeLiveTemplate,
} from './email/templates/onboarding'
import {
  newOrderTemplate,
  orderCancelledTemplate,
  orderCancelledWithRefundTemplate,
  orderDeliveredTemplate,
  orderPlacedTemplate,
  orderReturnedTemplate,
  orderShippedTemplate,
  paymentFailedTemplate,
  pendingOrderReminderTemplate,
  type OrderEmailItem,
  type RefundStatus,
} from './email/templates/orders'
import { staffInviteTemplate } from './email/templates/staff'
import { shippingAssistRequestTemplate } from './email/templates/support'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'hello@mailer.talam4shop.com'

export type { OrderEmailItem, RefundStatus }

export async function sendOnboardingWelcomeEmail(to: string, params: { onboardingUrl: string }): Promise<void> {
  try {
    const { subject, html } = onboardingWelcomeTemplate(params)
    await resend.emails.send({ from: FROM, to, subject, html })
  } catch (err) {
    console.error('[Resend] sendOnboardingWelcomeEmail failed:', err)
  }
}

export async function sendOnboardingReminderEmail(
  to: string,
  params: { onboardingUrl: string; reminderNumber: 1 | 2 | 3 }
): Promise<void> {
  try {
    const { subject, html } = onboardingReminderTemplate(params)
    await resend.emails.send({ from: FROM, to, subject, html })
  } catch (err) {
    console.error('[Resend] sendOnboardingReminderEmail failed:', err)
  }
}

export async function sendStoreLiveEmail(to: string, params: { storeName: string; storeUrl: string }): Promise<void> {
  try {
    const { subject, html } = storeLiveTemplate(params)
    await resend.emails.send({ from: FROM, to, subject, html })
  } catch (err) {
    console.error('[Resend] sendStoreLiveEmail failed:', err)
  }
}

export async function sendGoLiveReadyEmail(to: string, params: { storeName: string; adminUrl: string }): Promise<void> {
  try {
    const { subject, html } = goLiveReadyTemplate(params)
    await resend.emails.send({ from: FROM, to, subject, html })
  } catch (err) {
    console.error('[Resend] sendGoLiveReadyEmail failed:', err)
  }
}

export async function sendOrderPlacedEmail(
  to: string,
  params: {
    storeName: string
    orderCode: string
    items: OrderEmailItem[]
    total: number
    addressLines: string[]
    trackUrl: string
    invoiceUrl: string
    /** Already-formatted date, e.g. "Fri, 4 Sept". Absent when no courier ETA was available
     *  at order time — the line is then dropped rather than guessed at. */
    estimatedDeliveryText?: string
  }
): Promise<void> {
  try {
    const { subject, html } = orderPlacedTemplate(params)
    await resend.emails.send({ from: FROM, to, subject, html })
  } catch (err) {
    console.error('[Resend] sendOrderPlacedEmail failed:', err)
  }
}

/** The super-admin refund-aware cancellation flow's email — see orderCancelledWithRefundTemplate. */
export async function sendOrderCancelledWithRefundEmail(
  to: string,
  params: { storeName: string; orderCode: string; reason: string; refundStatus: RefundStatus }
): Promise<void> {
  try {
    const { subject, html } = orderCancelledWithRefundTemplate(params)
    await resend.emails.send({ from: FROM, to, subject, html })
  } catch (err) {
    console.error('[Resend] sendOrderCancelledWithRefundEmail failed:', err)
  }
}

export async function sendNewOrderEmail(
  to: string,
  params: {
    storeName: string
    orderCode: string
    customerName: string
    items: OrderEmailItem[]
    total: number
    adminOrdersUrl: string
  }
): Promise<void> {
  try {
    const { subject, html } = newOrderTemplate(params)
    await resend.emails.send({ from: FROM, to, subject, html })
  } catch (err) {
    console.error('[Resend] sendNewOrderEmail failed:', err)
  }
}

export async function sendPendingOrderReminderEmail(
  to: string,
  params: { storeName: string; orderCode: string; adminOrdersUrl: string }
): Promise<void> {
  try {
    const { subject, html } = pendingOrderReminderTemplate(params)
    await resend.emails.send({ from: FROM, to, subject, html })
  } catch (err) {
    console.error('[Resend] sendPendingOrderReminderEmail failed:', err)
  }
}

export async function sendOnboardingCompleteEmail(
  to: string,
  params: { storeName: string; storeUrl: string; adminUrl: string }
): Promise<void> {
  try {
    const { subject, html } = onboardingCompleteTemplate(params)
    await resend.emails.send({ from: FROM, to, subject, html })
  } catch (err) {
    console.error('[Resend] sendOnboardingCompleteEmail failed:', err)
  }
}

export async function sendOrderShippedEmail(
  to: string,
  params: { storeName: string; orderCode: string; trackingId: string; trackUrl: string }
): Promise<void> {
  try {
    const { subject, html } = orderShippedTemplate(params)
    await resend.emails.send({ from: FROM, to, subject, html })
  } catch (err) {
    console.error('[Resend] sendOrderShippedEmail failed:', err)
  }
}

export async function sendOrderDeliveredEmail(
  to: string,
  params: { storeName: string; orderCode: string; trackUrl: string }
): Promise<void> {
  try {
    const { subject, html } = orderDeliveredTemplate(params)
    await resend.emails.send({ from: FROM, to, subject, html })
  } catch (err) {
    console.error('[Resend] sendOrderDeliveredEmail failed:', err)
  }
}

export async function sendOrderCancelledEmail(
  to: string,
  params: { storeName: string; orderCode: string; cancelReason?: string | null; storeUrl: string }
): Promise<void> {
  try {
    const { subject, html } = orderCancelledTemplate(params)
    await resend.emails.send({ from: FROM, to, subject, html })
  } catch (err) {
    console.error('[Resend] sendOrderCancelledEmail failed:', err)
  }
}

export async function sendOrderReturnedEmail(
  to: string,
  params: { storeName: string; orderCode: string; storeUrl: string }
): Promise<void> {
  try {
    const { subject, html } = orderReturnedTemplate(params)
    await resend.emails.send({ from: FROM, to, subject, html })
  } catch (err) {
    console.error('[Resend] sendOrderReturnedEmail failed:', err)
  }
}

export async function sendPaymentFailedEmail(
  to: string,
  params: { storeName: string; orderCode: string; retryUrl: string }
): Promise<void> {
  try {
    const { subject, html } = paymentFailedTemplate(params)
    await resend.emails.send({ from: FROM, to, subject, html })
  } catch (err) {
    console.error('[Resend] sendPaymentFailedEmail failed:', err)
  }
}

export async function sendStaffInviteEmail(
  to: string,
  params: { name: string; role: string; loginUrl: string }
): Promise<void> {
  try {
    const { subject, html } = staffInviteTemplate(params)
    await resend.emails.send({ from: FROM, to, subject, html })
  } catch (err) {
    console.error('[Resend] sendStaffInviteEmail failed:', err)
  }
}

/**
 * Tells Talam staff that a shop wants help setting up Shiprocket — the only push signal for
 * the assisted-onboarding path (the super-admin badge is the backstop). Carries the shop's
 * phone and email so whoever picks it up can call without opening the app.
 *
 * Recipients come from SUPER_ADMIN_EMAILS. Unlike every other function here, `to` is a list
 * of Talam staff rather than a tenant or customer.
 */
export async function sendShippingAssistRequestEmail(
  to: string[],
  params: {
    tenantName: string
    tenantSlug: string
    contactEmail: string | null
    contactPhone: string | null
    tenantAdminUrl: string
  }
): Promise<void> {
  if (to.length === 0) {
    console.error('[Resend] sendShippingAssistRequestEmail: no SUPER_ADMIN_EMAILS configured')
    return
  }

  try {
    const { subject, html } = shippingAssistRequestTemplate(params)
    await resend.emails.send({ from: FROM, to, subject, html })
  } catch (err) {
    console.error('[Resend] sendShippingAssistRequestEmail failed:', err)
  }
}
