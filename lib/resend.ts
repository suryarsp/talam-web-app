import { Resend } from 'resend'
import { EMAIL_BRAND, escapeHtml, renderEmailBody, renderEmailShell } from './email-templates'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'hello@mailer.talam4shop.com'

export async function sendOnboardingWelcomeEmail(to: string, params: { onboardingUrl: string }): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: "You're in! 3 minutes to a live store",
      html: renderEmailShell(
        renderEmailBody({
          greeting: 'Hi there,',
          heading: "You're in! 3 minutes to a live store",
          paragraphs: [
            "Thanks for signing up for Talam. You're just a few steps away from a store customers can actually buy from — logo, first product, and how you want to get paid.",
          ],
          ctas: [{ label: 'Finish setup →', href: params.onboardingUrl }],
          signature: 'See you on the other side,<br/>The Talam Team',
        })
      ),
    })
  } catch (err) {
    console.error('[Resend] sendOnboardingWelcomeEmail failed:', err)
  }
}

const REMINDER_COPY: Record<1 | 2 | 3, { subject: string; body: string }> = {
  1: {
    subject: 'Finish setting up your store',
    body: 'You started setting up your Talam store but haven\'t finished yet. It only takes a few more minutes.',
  },
  2: {
    subject: 'Your store is one step away',
    body: "Your store is almost ready to go live — just a couple of steps left. Don't let it sit unfinished.",
  },
  3: {
    subject: 'Last reminder — your store setup is waiting',
    body: 'This is your final reminder. Your Talam store setup is still incomplete. Pick up right where you left off — it won\'t take long.',
  },
}

export async function sendOnboardingReminderEmail(
  to: string,
  params: { onboardingUrl: string; reminderNumber: 1 | 2 | 3 }
): Promise<void> {
  const copy = REMINDER_COPY[params.reminderNumber]
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: copy.subject,
      html: renderEmailShell(
        renderEmailBody({
          paragraphs: [copy.body],
          ctas: [{ label: 'Resume setup →', href: params.onboardingUrl }],
        })
      ),
    })
  } catch (err) {
    console.error('[Resend] sendOnboardingReminderEmail failed:', err)
  }
}

export async function sendStoreLiveEmail(to: string, params: { storeName: string; storeUrl: string }): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `${params.storeName} is live!`,
      html: renderEmailShell(
        renderEmailBody({
          heading: "You're live! 🎉",
          paragraphs: [`<strong>${escapeHtml(params.storeName)}</strong> is now live on Talam — customers can browse and place orders right now.`],
          ctas: [{ label: 'View your store', href: params.storeUrl }],
          signature: 'Go get your first sale,<br/>The Talam Team',
        })
      ),
    })
  } catch (err) {
    console.error('[Resend] sendStoreLiveEmail failed:', err)
  }
}

export async function sendGoLiveReadyEmail(to: string, params: { storeName: string; adminUrl: string }): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: "You're ready to go live!",
      html: renderEmailShell(
        renderEmailBody({
          heading: 'All set — go live whenever you want',
          paragraphs: [`<strong>${escapeHtml(params.storeName)}</strong> has everything it needs: payments, contact info, store details and products. Hit Go Live to open it up to customers.`],
          ctas: [{ label: 'Go live →', href: params.adminUrl }],
          signature: 'The Talam Team',
        })
      ),
    })
  } catch (err) {
    console.error('[Resend] sendGoLiveReadyEmail failed:', err)
  }
}

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
  }
): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM,
      to,
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
  } catch (err) {
    console.error('[Resend] sendOrderPlacedEmail failed:', err)
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
    await resend.emails.send({
      from: FROM,
      to,
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
  } catch (err) {
    console.error('[Resend] sendNewOrderEmail failed:', err)
  }
}

export async function sendPendingOrderReminderEmail(
  to: string,
  params: { storeName: string; orderCode: string; adminOrdersUrl: string }
): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM,
      to,
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
  } catch (err) {
    console.error('[Resend] sendPendingOrderReminderEmail failed:', err)
  }
}

export async function sendOnboardingCompleteEmail(
  to: string,
  params: { storeName: string; storeUrl: string; adminUrl: string }
): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: "Your store is ready — here's what's next",
      html: renderEmailShell(
        renderEmailBody({
          paragraphs: [`Congrats — <strong>${escapeHtml(params.storeName)}</strong> is live on Talam!`, "Here's what to do next:"],
          list: ['Share your store link with customers', 'Add a few more products to fill out your catalog', 'Check Settings to make sure your payment details are correct'],
          ctas: [
            { label: 'View your store', href: params.storeUrl },
            { label: 'Go to admin', href: params.adminUrl },
          ],
        })
      ),
    })
  } catch (err) {
    console.error('[Resend] sendOnboardingCompleteEmail failed:', err)
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
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Shiprocket setup requested — ${params.tenantName}`,
      html: renderEmailShell(
        renderEmailBody({
          heading: 'A shop needs help connecting Shiprocket',
          paragraphs: [
            `<strong>${escapeHtml(params.tenantName)}</strong> (${escapeHtml(params.tenantSlug)}) asked Talam to set up their Shiprocket account for them.`,
            'Walk them through signup, KYC and adding a pickup location, then enter their credentials from the super-admin tenant page.',
          ],
          list: [
            `Phone: ${escapeHtml(params.contactPhone ?? 'not provided')}`,
            `Email: ${escapeHtml(params.contactEmail ?? 'not provided')}`,
          ],
          ctas: [{ label: 'Open tenant →', href: params.tenantAdminUrl }],
          signature: 'Talam',
        })
      ),
    })
  } catch (err) {
    console.error('[Resend] sendShippingAssistRequestEmail failed:', err)
  }
}
