import { escapeHtml, renderEmailBody, renderEmailShell } from '../shell'
import type { EmailTemplate } from '../types'

export const onboardingWelcomeTemplate: EmailTemplate<{ onboardingUrl: string }> = (params) => ({
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

export const onboardingReminderTemplate: EmailTemplate<{ onboardingUrl: string; reminderNumber: 1 | 2 | 3 }> = (
  params
) => {
  const copy = REMINDER_COPY[params.reminderNumber]
  return {
    subject: copy.subject,
    html: renderEmailShell(
      renderEmailBody({
        paragraphs: [copy.body],
        ctas: [{ label: 'Resume setup →', href: params.onboardingUrl }],
      })
    ),
  }
}

export const storeLiveTemplate: EmailTemplate<{ storeName: string; storeUrl: string }> = (params) => ({
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

export const goLiveReadyTemplate: EmailTemplate<{ storeName: string; adminUrl: string }> = (params) => ({
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

export const onboardingCompleteTemplate: EmailTemplate<{ storeName: string; storeUrl: string; adminUrl: string }> = (
  params
) => ({
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
