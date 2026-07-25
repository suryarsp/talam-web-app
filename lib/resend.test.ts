import { beforeEach, describe, expect, it, vi } from 'vitest'

const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn().mockResolvedValue({ data: { id: 'email-1' }, error: null }),
}))

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(function Resend() {
    return { emails: { send: sendMock } }
  }),
}))

import { escapeHtml } from './email-templates'
import { sendOnboardingCompleteEmail, sendOnboardingReminderEmail, sendOnboardingWelcomeEmail } from './resend'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('sendOnboardingWelcomeEmail', () => {
  it('sends with the right recipient and subject', async () => {
    await sendOnboardingWelcomeEmail('owner@example.com', { onboardingUrl: 'https://talam4shop.com/admin/onboarding' })
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'owner@example.com', from: 'hello@mailer.talam4shop.com', subject: expect.any(String) })
    )
  })

  it('does not throw when Resend fails', async () => {
    sendMock.mockRejectedValueOnce(new Error('Resend down'))
    await expect(sendOnboardingWelcomeEmail('owner@example.com', { onboardingUrl: 'https://x/admin/onboarding' })).resolves.not.toThrow()
  })

  it('includes the onboardingUrl in the email HTML', async () => {
    await sendOnboardingWelcomeEmail('owner@example.com', { onboardingUrl: 'https://talam4shop.com/admin/onboarding' })
    const html = sendMock.mock.calls[0][0].html
    expect(html).toContain('https://talam4shop.com/admin/onboarding')
    expect(html).toContain("You're in! 3 minutes to a live store")
  })
})

describe('sendOnboardingReminderEmail', () => {
  it('uses a distinct subject per reminderNumber', async () => {
    await sendOnboardingReminderEmail('owner@example.com', { onboardingUrl: 'https://x', reminderNumber: 1 })
    const subject1 = sendMock.mock.calls[0][0].subject
    await sendOnboardingReminderEmail('owner@example.com', { onboardingUrl: 'https://x', reminderNumber: 2 })
    const subject2 = sendMock.mock.calls[1][0].subject
    await sendOnboardingReminderEmail('owner@example.com', { onboardingUrl: 'https://x', reminderNumber: 3 })
    const subject3 = sendMock.mock.calls[2][0].subject

    expect(new Set([subject1, subject2, subject3]).size).toBe(3)
  })

  it('does not throw when Resend fails', async () => {
    sendMock.mockRejectedValueOnce(new Error('Resend down'))
    await expect(
      sendOnboardingReminderEmail('owner@example.com', { onboardingUrl: 'https://x', reminderNumber: 1 })
    ).resolves.not.toThrow()
  })

  it('includes the onboardingUrl and matching copy for each reminderNumber', async () => {
    await sendOnboardingReminderEmail('owner@example.com', { onboardingUrl: 'https://x/admin/onboarding', reminderNumber: 2 })
    const html = sendMock.mock.calls[0][0].html
    expect(html).toContain('https://x/admin/onboarding')
    expect(html).toContain('Your store is almost ready to go live')
  })
})

describe('sendOnboardingCompleteEmail', () => {
  it('sends with the right recipient and subject', async () => {
    await sendOnboardingCompleteEmail('owner@example.com', {
      storeName: 'Priya Boutique',
      storeUrl: 'https://priya-boutique.talam4shop.com',
      adminUrl: 'https://priya-boutique.talam4shop.com/admin/dashboard',
    })
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ to: 'owner@example.com', subject: expect.any(String) }))
  })

  it('does not throw when Resend fails', async () => {
    sendMock.mockRejectedValueOnce(new Error('Resend down'))
    await expect(
      sendOnboardingCompleteEmail('owner@example.com', { storeName: 'X', storeUrl: 'https://x', adminUrl: 'https://x/admin/dashboard' })
    ).resolves.not.toThrow()
  })

  it('includes storeName (escaped), storeUrl, and adminUrl in the email HTML', async () => {
    await sendOnboardingCompleteEmail('owner@example.com', {
      storeName: 'Priya\'s <Boutique>',
      storeUrl: 'https://priya-boutique.talam4shop.com',
      adminUrl: 'https://priya-boutique.talam4shop.com/admin/dashboard',
    })
    const html = sendMock.mock.calls[0][0].html
    expect(html).toContain(escapeHtml("Priya's <Boutique>"))
    expect(html).not.toContain("Priya's <Boutique>") // raw, unescaped value must not appear
    expect(html).toContain('https://priya-boutique.talam4shop.com')
    expect(html).toContain('https://priya-boutique.talam4shop.com/admin/dashboard')
  })
})
