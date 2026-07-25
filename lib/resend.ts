import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = `hello@mail.${process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'mytalam.com'}`

export async function sendOnboardingWelcomeEmail(to: string, params: { onboardingUrl: string }): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: "You're in! 3 minutes to a live store",
      html: `
        <p>Hi there,</p>
        <p>Thanks for signing up for Talam. You're just a few steps away from a store customers can actually buy from — logo, first product, and how you want to get paid.</p>
        <p><a href="${params.onboardingUrl}">Finish setup</a></p>
        <p>See you on the other side,<br/>The Talam Team</p>
      `,
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
      html: `
        <p>${copy.body}</p>
        <p><a href="${params.onboardingUrl}">Resume setup</a></p>
      `,
    })
  } catch (err) {
    console.error('[Resend] sendOnboardingReminderEmail failed:', err)
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
      html: `
        <p>Congrats — <strong>${params.storeName}</strong> is live on Talam!</p>
        <p>Here's what to do next:</p>
        <ol>
          <li>Share your store link with customers</li>
          <li>Add a few more products to fill out your catalog</li>
          <li>Check Settings to make sure your payment details are correct</li>
        </ol>
        <p><a href="${params.storeUrl}">View your store</a></p>
        <p><a href="${params.adminUrl}">Go to admin</a></p>
      `,
    })
  } catch (err) {
    console.error('[Resend] sendOnboardingCompleteEmail failed:', err)
  }
}
