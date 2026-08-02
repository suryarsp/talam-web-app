import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    tenant: { findMany: vi.fn(), update: vi.fn() },
  },
}))

vi.mock('@/lib/resend', () => ({
  sendOnboardingReminderEmail: vi.fn().mockResolvedValue(undefined),
}))

import { prisma } from '@/lib/prisma'
import { sendOnboardingReminderEmail } from '@/lib/resend'
import { GET } from './route'

function makeRequest(authHeader?: string) {
  const init = authHeader ? { headers: { authorization: authHeader } } : undefined
  return new NextRequest('http://localhost/api/cron/onboarding-reminders', init)
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000 - 1000)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('CRON_SECRET', 'test-secret')
})

describe('GET /api/cron/onboarding-reminders', () => {
  it('401s when the Authorization header is missing', async () => {
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
    expect(prisma.tenant.findMany).not.toHaveBeenCalled()
  })

  it('401s when the Authorization header has the wrong secret', async () => {
    const res = await GET(makeRequest('Bearer wrong-secret'))
    expect(res.status).toBe(401)
  })

  it('401s (fail-closed) when CRON_SECRET itself is unset', async () => {
    vi.stubEnv('CRON_SECRET', '')
    const res = await GET(makeRequest('Bearer test-secret'))
    expect(res.status).toBe(401)
  })

  it('sends reminder 1 and increments the count when a tenant has been idle 1+ days', async () => {
    vi.mocked(prisma.tenant.findMany).mockResolvedValue([
      { id: 'tenant-1', contactEmail: 'owner@store.com', createdAt: daysAgo(1), onboardingReminderCount: 0 },
    ] as never)

    const res = await GET(makeRequest('Bearer test-secret'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ checked: 1, sent: 1 })
    expect(sendOnboardingReminderEmail).toHaveBeenCalledWith('owner@store.com', {
      onboardingUrl: expect.stringContaining('/admin/onboarding'),
      reminderNumber: 1,
    })
    expect(prisma.tenant.update).toHaveBeenCalledWith({
      where: { id: 'tenant-1' },
      data: { onboardingReminderCount: { increment: 1 } },
    })
  })

  it('sends reminder 2 (not 1) when the tenant already has count 1 and is 3+ days idle', async () => {
    vi.mocked(prisma.tenant.findMany).mockResolvedValue([
      { id: 'tenant-1', contactEmail: 'owner@store.com', createdAt: daysAgo(3), onboardingReminderCount: 1 },
    ] as never)

    await GET(makeRequest('Bearer test-secret'))

    expect(sendOnboardingReminderEmail).toHaveBeenCalledWith('owner@store.com', expect.objectContaining({ reminderNumber: 2 }))
  })

  it('does not send or increment when the tenant has not yet crossed the next threshold', async () => {
    vi.mocked(prisma.tenant.findMany).mockResolvedValue([
      { id: 'tenant-1', contactEmail: 'owner@store.com', createdAt: daysAgo(0), onboardingReminderCount: 0 },
    ] as never)

    const res = await GET(makeRequest('Bearer test-secret'))
    const body = await res.json()

    expect(body).toEqual({ checked: 1, sent: 0 })
    expect(sendOnboardingReminderEmail).not.toHaveBeenCalled()
    expect(prisma.tenant.update).not.toHaveBeenCalled()
  })

  it('queries only tenants eligible for a reminder', async () => {
    vi.mocked(prisma.tenant.findMany).mockResolvedValue([])
    await GET(makeRequest('Bearer test-secret'))

    expect(prisma.tenant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isOnboarded: false, contactEmail: { not: null }, onboardingReminderCount: { lt: 3 } },
      })
    )
  })
})
