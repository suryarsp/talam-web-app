import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn().mockResolvedValue({ data: { id: 'email-1' }, error: null }),
}))

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(function Resend() {
    return { emails: { send: sendMock } }
  }),
}))

import { escapeHtml } from './email/shell'
import {
  sendNewOrderEmail,
  sendOnboardingCompleteEmail,
  sendOnboardingReminderEmail,
  sendOnboardingWelcomeEmail,
  sendOrderCancelledEmail,
  sendOrderDeliveredEmail,
  sendOrderPlacedEmail,
  sendOrderReturnedEmail,
  sendOrderShippedEmail,
  sendPaymentFailedEmail,
  sendShippingAssistRequestEmail,
  sendStaffInviteEmail,
} from './resend'
import { getSuperAdminEmails } from './auth-guard'

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

describe('order emails', () => {
  const items = [
    { name: 'Kanjivaram Saree', size: 'M', quantity: 2, unitPrice: 1000 },
    { name: 'Zari Dupatta', size: null, quantity: 1, unitPrice: 699 },
  ]

  describe('sendOrderPlacedEmail', () => {
    const params = {
      storeName: 'Meena Silks',
      orderCode: '#A1B2C3D4',
      items,
      total: 2699,
      addressLines: ['Priya Rajan', '42 Bharathi Nagar', 'Madurai, Tamil Nadu 625001'],
      trackUrl: 'https://silk.talam4shop.com/orders/o1',
      invoiceUrl: 'https://silk.talam4shop.com/orders/o1/invoice',
    }

    it('sends to the customer with the order code in the subject', async () => {
      await sendOrderPlacedEmail('priya@example.com', params)
      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'priya@example.com', subject: expect.stringContaining('#A1B2C3D4') })
      )
    })

    it('carries both the track and invoice links', async () => {
      await sendOrderPlacedEmail('priya@example.com', params)
      const html = sendMock.mock.calls[0][0].html
      expect(html).toContain('https://silk.talam4shop.com/orders/o1')
      expect(html).toContain('https://silk.talam4shop.com/orders/o1/invoice')
      expect(html).toContain('Track your order')
    })

    it('lists every line item and the total', async () => {
      await sendOrderPlacedEmail('priya@example.com', params)
      const html = sendMock.mock.calls[0][0].html
      expect(html).toContain('Kanjivaram Saree')
      expect(html).toContain('Zari Dupatta')
      expect(html).toContain('2,699')
    })

    it('escapes product names rather than injecting them raw', async () => {
      await sendOrderPlacedEmail('priya@example.com', {
        ...params,
        items: [{ name: '<script>x</script>', size: null, quantity: 1, unitPrice: 10 }],
      })
      const html = sendMock.mock.calls[0][0].html
      expect(html).not.toContain('<script>x</script>')
      expect(html).toContain(escapeHtml('<script>x</script>'))
    })

    it('does not throw when Resend fails', async () => {
      sendMock.mockRejectedValueOnce(new Error('Resend down'))
      await expect(sendOrderPlacedEmail('priya@example.com', params)).resolves.not.toThrow()
    })
  })

  describe('sendNewOrderEmail', () => {
    const params = {
      storeName: 'Meena Silks',
      orderCode: '#A1B2C3D4',
      customerName: 'Priya Rajan',
      items,
      total: 2699,
      adminOrdersUrl: 'https://silk.talam4shop.com/admin/orders',
    }

    it('points the owner at their orders page', async () => {
      await sendNewOrderEmail('owner@example.com', params)
      const call = sendMock.mock.calls[0][0]
      expect(call.to).toBe('owner@example.com')
      expect(call.html).toContain('https://silk.talam4shop.com/admin/orders')
      expect(call.html).toContain('View order')
    })

    it('puts the order value in the subject so it reads at a glance', async () => {
      await sendNewOrderEmail('owner@example.com', params)
      expect(sendMock.mock.calls[0][0].subject).toContain('2,699')
    })

    it('does not throw when Resend fails', async () => {
      sendMock.mockRejectedValueOnce(new Error('Resend down'))
      await expect(sendNewOrderEmail('owner@example.com', params)).resolves.not.toThrow()
    })
  })
})

describe('sendOrderShippedEmail', () => {
  const params = {
    storeName: 'Meena Silks',
    orderCode: '#A1B2C3D4',
    trackingId: 'AWB123456',
    trackUrl: 'https://silk.talam4shop.com/orders/o1',
  }

  it('includes the tracking id and track link', async () => {
    await sendOrderShippedEmail('priya@example.com', params)
    const call = sendMock.mock.calls[0][0]
    expect(call.to).toBe('priya@example.com')
    expect(call.subject).toContain('#A1B2C3D4')
    expect(call.html).toContain('AWB123456')
    expect(call.html).toContain('https://silk.talam4shop.com/orders/o1')
  })

  it('does not throw when Resend fails', async () => {
    sendMock.mockRejectedValueOnce(new Error('Resend down'))
    await expect(sendOrderShippedEmail('priya@example.com', params)).resolves.not.toThrow()
  })
})

describe('sendOrderDeliveredEmail', () => {
  const params = { storeName: 'Meena Silks', orderCode: '#A1B2C3D4', trackUrl: 'https://silk.talam4shop.com/orders/o1' }

  it('sends to the customer with the order code in the subject', async () => {
    await sendOrderDeliveredEmail('priya@example.com', params)
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ to: 'priya@example.com', subject: expect.stringContaining('#A1B2C3D4') }))
  })

  it('does not throw when Resend fails', async () => {
    sendMock.mockRejectedValueOnce(new Error('Resend down'))
    await expect(sendOrderDeliveredEmail('priya@example.com', params)).resolves.not.toThrow()
  })
})

describe('sendOrderCancelledEmail', () => {
  const params = { storeName: 'Meena Silks', orderCode: '#A1B2C3D4', cancelReason: 'Item out of stock', storeUrl: 'https://silk.talam4shop.com' }

  it('includes the cancellation reason', async () => {
    await sendOrderCancelledEmail('priya@example.com', params)
    expect(sendMock.mock.calls[0][0].html).toContain('Item out of stock')
  })

  it('falls back to a generic line when no reason is given', async () => {
    await sendOrderCancelledEmail('priya@example.com', { ...params, cancelReason: null })
    expect(sendMock.mock.calls[0][0].html).toContain('Not specified')
  })

  it('escapes the reason rather than injecting it raw', async () => {
    await sendOrderCancelledEmail('priya@example.com', { ...params, cancelReason: '<script>x</script>' })
    const html = sendMock.mock.calls[0][0].html
    expect(html).not.toContain('<script>x</script>')
    expect(html).toContain(escapeHtml('<script>x</script>'))
  })

  it('does not throw when Resend fails', async () => {
    sendMock.mockRejectedValueOnce(new Error('Resend down'))
    await expect(sendOrderCancelledEmail('priya@example.com', params)).resolves.not.toThrow()
  })
})

describe('sendOrderReturnedEmail', () => {
  const params = { storeName: 'Meena Silks', orderCode: '#A1B2C3D4', storeUrl: 'https://silk.talam4shop.com' }

  it('sends to the customer with the order code in the subject', async () => {
    await sendOrderReturnedEmail('priya@example.com', params)
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ to: 'priya@example.com', subject: expect.stringContaining('#A1B2C3D4') }))
  })

  it('does not throw when Resend fails', async () => {
    sendMock.mockRejectedValueOnce(new Error('Resend down'))
    await expect(sendOrderReturnedEmail('priya@example.com', params)).resolves.not.toThrow()
  })
})

describe('sendPaymentFailedEmail', () => {
  const params = { storeName: 'Meena Silks', orderCode: '#A1B2C3D4', retryUrl: 'https://silk.talam4shop.com/orders/o1' }

  it('sends to the customer with the order code in the subject and a retry link', async () => {
    await sendPaymentFailedEmail('priya@example.com', params)
    const call = sendMock.mock.calls[0][0]
    expect(call.to).toBe('priya@example.com')
    expect(call.subject).toContain('#A1B2C3D4')
    expect(call.html).toContain('https://silk.talam4shop.com/orders/o1')
  })

  it('does not throw when Resend fails', async () => {
    sendMock.mockRejectedValueOnce(new Error('Resend down'))
    await expect(sendPaymentFailedEmail('priya@example.com', params)).resolves.not.toThrow()
  })
})

describe('sendStaffInviteEmail', () => {
  const params = { name: 'New Person', role: 'Support Agent', loginUrl: 'https://talam4shop.com/super-admin/login' }

  it('includes the role and login link', async () => {
    await sendStaffInviteEmail('new@talam.com', params)
    const call = sendMock.mock.calls[0][0]
    expect(call.to).toBe('new@talam.com')
    expect(call.html).toContain('Support Agent')
    expect(call.html).toContain('https://talam4shop.com/super-admin/login')
  })

  it('does not throw when Resend fails', async () => {
    sendMock.mockRejectedValueOnce(new Error('Resend down'))
    await expect(sendStaffInviteEmail('new@talam.com', params)).resolves.not.toThrow()
  })
})

describe('sendShippingAssistRequestEmail', () => {
  const params = {
    tenantName: "D'Mystique Boutique",
    tenantSlug: 'dmystique',
    contactEmail: 'hello@dmystique.com',
    contactPhone: '+91 98765 43210',
    tenantAdminUrl: 'https://talam4shop.com/super-admin/tenants/t1',
  }

  it('emails the whole ops allow-list in one send', async () => {
    await sendShippingAssistRequestEmail(['ops@talam4shop.com', 'founder@talam4shop.com'], params)

    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(sendMock.mock.calls[0][0].to).toEqual(['ops@talam4shop.com', 'founder@talam4shop.com'])
  })

  it("names the shop in the subject so staff can triage without opening it", async () => {
    await sendShippingAssistRequestEmail(['ops@talam4shop.com'], params)
    expect(sendMock.mock.calls[0][0].subject).toBe("Shiprocket setup requested — D'Mystique Boutique")
  })

  it('includes the phone number so staff can call straight away', async () => {
    await sendShippingAssistRequestEmail(['ops@talam4shop.com'], params)
    expect(sendMock.mock.calls[0][0].html).toContain('+91 98765 43210')
  })

  it('says so rather than breaking when the shop has no contact details', async () => {
    await sendShippingAssistRequestEmail(['ops@talam4shop.com'], {
      ...params,
      contactEmail: null,
      contactPhone: null,
    })
    expect(sendMock.mock.calls[0][0].html).toContain('not provided')
  })

  it('skips the send entirely when no ops emails are configured', async () => {
    await sendShippingAssistRequestEmail([], params)
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('swallows a Resend failure like every other sender here', async () => {
    sendMock.mockRejectedValueOnce(new Error('resend down'))
    await expect(sendShippingAssistRequestEmail(['ops@talam4shop.com'], params)).resolves.toBeUndefined()
  })
})

describe('getSuperAdminEmails', () => {
  const original = process.env.SUPER_ADMIN_EMAILS
  afterEach(() => {
    process.env.SUPER_ADMIN_EMAILS = original
  })

  it('splits, trims and lowercases the allow-list', () => {
    process.env.SUPER_ADMIN_EMAILS = ' Ops@Talam4shop.com , founder@talam4shop.com '
    expect(getSuperAdminEmails()).toEqual(['ops@talam4shop.com', 'founder@talam4shop.com'])
  })

  it('drops empty entries from a trailing comma', () => {
    process.env.SUPER_ADMIN_EMAILS = 'ops@talam4shop.com,,'
    expect(getSuperAdminEmails()).toEqual(['ops@talam4shop.com'])
  })

  it('returns an empty list when unset, which disables staff notifications', () => {
    delete process.env.SUPER_ADMIN_EMAILS
    expect(getSuperAdminEmails()).toEqual([])
  })
})
