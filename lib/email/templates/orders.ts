import { EMAIL_BRAND, escapeHtml, renderEmailBody, renderEmailShell } from '../shell'
import type { EmailTemplate } from '../types'

export type OrderEmailItem = { name: string; size?: string | null; quantity: number; unitPrice: number }

const inr = (value: number) => `₹${value.toLocaleString('en-IN')}`

/** Plain table — Gmail/Outlook strip most CSS, so line items stay as a bordered table with inline styles. */
function renderOrderItemsTable(items: OrderEmailItem[], total: number): string {
  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid ${EMAIL_BRAND.border}; font-family: 'DM Sans', system-ui, sans-serif; font-size: 14px; color: ${EMAIL_BRAND.mutedBody};">
          ${escapeHtml(item.name)}${item.size ? ` <span style="color: ${EMAIL_BRAND.muted};">(${escapeHtml(item.size)})</span>` : ''} &times; ${item.quantity}
        </td>
        <td align="right" style="padding: 8px 0; border-bottom: 1px solid ${EMAIL_BRAND.border}; font-family: 'DM Sans', system-ui, sans-serif; font-size: 14px; color: ${EMAIL_BRAND.ink};">
          ${inr(item.unitPrice * item.quantity)}
        </td>
      </tr>`
    )
    .join('')

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
      ${rows}
      <tr>
        <td style="padding: 12px 0; font-family: 'DM Sans', system-ui, sans-serif; font-size: 15px; font-weight: 700; color: ${EMAIL_BRAND.ink};">Total</td>
        <td align="right" style="padding: 12px 0; font-family: 'DM Sans', system-ui, sans-serif; font-size: 15px; font-weight: 700; color: ${EMAIL_BRAND.ink};">${inr(total)}</td>
      </tr>
    </table>`
}

export const orderPlacedTemplate: EmailTemplate<{
  storeName: string
  orderCode: string
  items: OrderEmailItem[]
  total: number
  addressLines: string[]
  trackUrl: string
  invoiceUrl: string
}> = (params) => ({
  subject: `Order ${params.orderCode} confirmed — ${params.storeName}`,
  html: renderEmailShell(
    renderEmailBody({
      heading: 'Order confirmed 🎉',
      paragraphs: [
        `Thanks for shopping with <strong>${escapeHtml(params.storeName)}</strong>. Your order <strong>${escapeHtml(params.orderCode)}</strong> is confirmed and being prepared.`,
      ],
      beforeCtasHtml: `${renderOrderItemsTable(params.items, params.total)}
        <p style="margin: 0 0 24px 0; font-family: 'DM Sans', system-ui, sans-serif; font-size: 14px; line-height: 22px; color: ${EMAIL_BRAND.muted};">
          <strong style="color: ${EMAIL_BRAND.ink};">Delivering to</strong><br/>${params.addressLines.map(escapeHtml).join('<br/>')}
        </p>`,
      ctas: [{ label: 'Track your order →', href: params.trackUrl }],
      extraHtml: `<p style="margin: 0; font-family: 'DM Sans', system-ui, sans-serif; font-size: 14px;">
          <a href="${params.invoiceUrl}" style="color: ${EMAIL_BRAND.primary}; text-decoration: none; font-weight: 600;">View invoice</a>
        </p>`,
      signature: `Questions? Just reply to this email.<br/>${escapeHtml(params.storeName)}`,
    })
  ),
})

export const newOrderTemplate: EmailTemplate<{
  storeName: string
  orderCode: string
  customerName: string
  items: OrderEmailItem[]
  total: number
  adminOrdersUrl: string
}> = (params) => ({
  subject: `New order ${params.orderCode} — ${inr(params.total)}`,
  html: renderEmailShell(
    renderEmailBody({
      heading: 'You have a new order',
      paragraphs: [
        `<strong>${escapeHtml(params.customerName)}</strong> just placed order <strong>${escapeHtml(params.orderCode)}</strong> on ${escapeHtml(params.storeName)}.`,
        'Confirm the payment and add a tracking ID from your orders page.',
      ],
      beforeCtasHtml: renderOrderItemsTable(params.items, params.total),
      ctas: [{ label: 'View order →', href: params.adminOrdersUrl }],
      signature: 'The Talam Team',
    })
  ),
})

export const pendingOrderReminderTemplate: EmailTemplate<{ storeName: string; orderCode: string; adminOrdersUrl: string }> = (
  params
) => ({
  subject: `Order ${params.orderCode} still needs confirmation`,
  html: renderEmailShell(
    renderEmailBody({
      heading: 'An order is waiting on you',
      paragraphs: [
        `Order <strong>${escapeHtml(params.orderCode)}</strong> on ${escapeHtml(params.storeName)} was placed over 6 hours ago and still hasn't been confirmed.`,
        'Confirm the payment and move it forward so the customer isn’t left waiting.',
      ],
      ctas: [{ label: 'View order →', href: params.adminOrdersUrl }],
      signature: 'The Talam Team',
    })
  ),
})

export const orderShippedTemplate: EmailTemplate<{ storeName: string; orderCode: string; trackingId: string; trackUrl: string }> = (
  params
) => ({
  subject: `Order ${params.orderCode} has shipped`,
  html: renderEmailShell(
    renderEmailBody({
      heading: "It's on the way 📦",
      paragraphs: [
        `Your order <strong>${escapeHtml(params.orderCode)}</strong> from ${escapeHtml(params.storeName)} has shipped.`,
        `Tracking number: <strong>${escapeHtml(params.trackingId)}</strong>`,
      ],
      ctas: [{ label: 'Track your order →', href: params.trackUrl }],
      signature: escapeHtml(params.storeName),
    })
  ),
})

export const orderDeliveredTemplate: EmailTemplate<{ storeName: string; orderCode: string; trackUrl: string }> = (params) => ({
  subject: `Order ${params.orderCode} delivered`,
  html: renderEmailShell(
    renderEmailBody({
      heading: 'Delivered! 🎉',
      paragraphs: [
        `Your order <strong>${escapeHtml(params.orderCode)}</strong> from ${escapeHtml(params.storeName)} has been delivered. We hope you love it.`,
      ],
      ctas: [{ label: 'View order →', href: params.trackUrl }],
      signature: `Thanks for shopping with us,<br/>${escapeHtml(params.storeName)}`,
    })
  ),
})

export const orderCancelledTemplate: EmailTemplate<{
  storeName: string
  orderCode: string
  cancelReason?: string | null
  storeUrl: string
}> = (params) => ({
  subject: `Order ${params.orderCode} was cancelled`,
  html: renderEmailShell(
    renderEmailBody({
      heading: 'Order cancelled',
      paragraphs: [
        `Your order <strong>${escapeHtml(params.orderCode)}</strong> from ${escapeHtml(params.storeName)} has been cancelled.`,
        `Reason: ${escapeHtml(params.cancelReason?.trim() || 'Not specified')}`,
        'If you were charged, any payment will be refunded to your original payment method.',
      ],
      ctas: [{ label: 'Continue shopping →', href: params.storeUrl }],
      signature: escapeHtml(params.storeName),
    })
  ),
})

export const orderReturnedTemplate: EmailTemplate<{ storeName: string; orderCode: string; storeUrl: string }> = (params) => ({
  subject: `Order ${params.orderCode} return received`,
  html: renderEmailShell(
    renderEmailBody({
      heading: 'Return received',
      paragraphs: [
        `We've received your return for order <strong>${escapeHtml(params.orderCode)}</strong> from ${escapeHtml(params.storeName)}. Your refund will be processed to your original payment method.`,
      ],
      ctas: [{ label: 'Continue shopping →', href: params.storeUrl }],
      signature: escapeHtml(params.storeName),
    })
  ),
})

export const paymentFailedTemplate: EmailTemplate<{ storeName: string; orderCode: string; retryUrl: string }> = (params) => ({
  subject: `Payment failed for order ${params.orderCode}`,
  html: renderEmailShell(
    renderEmailBody({
      heading: "Your payment didn't go through",
      paragraphs: [
        `We couldn't process payment for order <strong>${escapeHtml(params.orderCode)}</strong> from ${escapeHtml(params.storeName)}. No charge was made.`,
        'You can try again with the same or a different payment method.',
      ],
      ctas: [{ label: 'Retry payment →', href: params.retryUrl }],
      signature: escapeHtml(params.storeName),
    })
  ),
})
