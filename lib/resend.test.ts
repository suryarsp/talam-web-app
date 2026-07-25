import { beforeEach, describe, expect, it, vi } from 'vitest'

const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn().mockResolvedValue({ data: { id: 'email-1' }, error: null }),
}))

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(function Resend() {
    return { emails: { send: sendMock } }
  }),
}))

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
})
