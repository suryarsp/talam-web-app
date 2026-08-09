import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: { findMany: vi.fn(), update: vi.fn() },
  },
}))

vi.mock('@/lib/resend', () => ({
  sendPendingOrderReminderEmail: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/data/notifications', () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}))

import { prisma } from '@/lib/prisma'
import { sendPendingOrderReminderEmail } from '@/lib/resend'
import { createNotification } from '@/lib/data/notifications'
import { GET } from './route'

function makeRequest(authHeader?: string) {
  const init = authHeader ? { headers: { authorization: authHeader } } : undefined
  return new NextRequest('http://localhost/api/cron/pending-order-reminders', init)
}

function hoursAgo(n: number): Date {
  return new Date(Date.now() - n * 60 * 60 * 1000 - 1000)
}

const tenant = { slug: 'varnam', name: 'Varnam', contactEmail: 'owner@store.com', notifyEmailOnOrder: true }

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('CRON_SECRET', 'test-secret')
})

describe('GET /api/cron/pending-order-reminders', () => {
  it('401s when the Authorization header is missing', async () => {
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
    expect(prisma.order.findMany).not.toHaveBeenCalled()
  })

  it('401s when the Authorization header has the wrong secret', async () => {
    const res = await GET(makeRequest('Bearer wrong-secret'))
    expect(res.status).toBe(401)
  })

  it('sends one reminder for an order overdue by 7 hours and marks it reminded', async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([
      { id: 'order-1abcdef2345', tenantId: 'tenant-1', tenant, createdAt: hoursAgo(7) },
    ] as never)

    const res = await GET(makeRequest('Bearer test-secret'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ checked: 1, sent: 1 })
    expect(createNotification).toHaveBeenCalledWith('tenant-1', expect.objectContaining({ type: 'order_overdue' }))
    expect(sendPendingOrderReminderEmail).toHaveBeenCalledWith(
      'owner@store.com',
      expect.objectContaining({ storeName: 'Varnam', orderCode: '#ORDER-1A' })
    )
    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1abcdef2345' },
      data: { reminderSentAt: expect.any(Date) },
    })
  })

  it('skips the email (but still notifies in-app) when the tenant has email alerts off', async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([
      { id: 'order-1', tenantId: 'tenant-1', tenant: { ...tenant, notifyEmailOnOrder: false }, createdAt: hoursAgo(7) },
    ] as never)

    await GET(makeRequest('Bearer test-secret'))

    expect(createNotification).toHaveBeenCalled()
    expect(sendPendingOrderReminderEmail).not.toHaveBeenCalled()
  })

  it('only queries pending, unreminded orders older than 6 hours', async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([])
    await GET(makeRequest('Bearer test-secret'))

    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'pending', reminderSentAt: null, createdAt: { lt: expect.any(Date) } },
      })
    )
  })
})
