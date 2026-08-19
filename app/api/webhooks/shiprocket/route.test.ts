import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockVerifyToken, mockFindFirst, mockUpdateStatus } = vi.hoisted(() => ({
  mockVerifyToken: vi.fn(),
  mockFindFirst: vi.fn(),
  mockUpdateStatus: vi.fn(),
}))

vi.mock('@/lib/shipping/shiprocket', () => ({ verifyShiprocketWebhookToken: mockVerifyToken }))
vi.mock('@/lib/prisma', () => ({ prisma: { order: { findFirst: mockFindFirst } } }))
vi.mock('@/lib/data/orders', () => ({ updateOrderStatus: mockUpdateStatus }))

import { POST } from './route'

function makeRequest(body: unknown, token: string | null) {
  const headers = new Headers()
  if (token) headers.set('x-shiprocket-token', token)
  return new NextRequest('http://localhost/api/webhooks/shiprocket', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/webhooks/shiprocket', () => {
  it('rejects a request with a missing/invalid token', async () => {
    mockVerifyToken.mockReturnValue(false)
    const res = await POST(makeRequest({ awb: 'AWB1', current_status: 'Delivered' }, 'bad'))
    expect(res.status).toBe(401)
    expect(mockFindFirst).not.toHaveBeenCalled()
  })

  it('ignores non-Delivered statuses', async () => {
    mockVerifyToken.mockReturnValue(true)
    const res = await POST(makeRequest({ awb: 'AWB1', current_status: 'In Transit' }, 'whtok_123'))
    expect(res.status).toBe(200)
    expect(mockFindFirst).not.toHaveBeenCalled()
  })

  it('marks a shipped order delivered on a Delivered webhook', async () => {
    mockVerifyToken.mockReturnValue(true)
    mockFindFirst.mockResolvedValue({ id: 'order-1', tenantId: 'tenant-1', status: 'shipped' })
    const res = await POST(makeRequest({ awb: 'AWB1', current_status: 'Delivered' }, 'whtok_123'))
    expect(res.status).toBe(200)
    expect(mockUpdateStatus).toHaveBeenCalledWith('tenant-1', 'order-1', 'delivered')
  })

  it('is a no-op when the order is already delivered (idempotent retry)', async () => {
    mockVerifyToken.mockReturnValue(true)
    mockFindFirst.mockResolvedValue({ id: 'order-1', tenantId: 'tenant-1', status: 'delivered' })
    const res = await POST(makeRequest({ awb: 'AWB1', current_status: 'Delivered' }, 'whtok_123'))
    expect(res.status).toBe(200)
    expect(mockUpdateStatus).not.toHaveBeenCalled()
  })

  it('returns 200 when no order matches the AWB', async () => {
    mockVerifyToken.mockReturnValue(true)
    mockFindFirst.mockResolvedValue(null)
    const res = await POST(makeRequest({ awb: 'unknown', current_status: 'Delivered' }, 'whtok_123'))
    expect(res.status).toBe(200)
    expect(mockUpdateStatus).not.toHaveBeenCalled()
  })
})
