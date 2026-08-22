import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockOrderFindFirst, mockCredentialFindUnique, mockUpdateStatus } = vi.hoisted(() => ({
  mockOrderFindFirst: vi.fn(),
  mockCredentialFindUnique: vi.fn(),
  mockUpdateStatus: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: { findFirst: mockOrderFindFirst },
    shippingCredential: { findUnique: mockCredentialFindUnique },
  },
}))
vi.mock('@/lib/data/orders', () => ({ updateOrderStatus: mockUpdateStatus }))

import { POST } from './route'

const TENANT_TOKEN = 'whtok_tenant_one'

function makeRequest(body: unknown, token: string | null) {
  const headers = new Headers()
  if (token) headers.set('x-shiprocket-token', token)
  return new NextRequest('http://localhost/api/webhooks/delivery-status', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

const delivered = (awb = 'AWB1') => ({ awb, current_status: 'Delivered' })

beforeEach(() => {
  vi.clearAllMocks()
  mockOrderFindFirst.mockResolvedValue({ id: 'order-1', tenantId: 'tenant-1', status: 'shipped' })
  mockCredentialFindUnique.mockResolvedValue({ webhookToken: TENANT_TOKEN })
})

describe('POST /api/webhooks/delivery-status', () => {
  it("marks a shipped order delivered when the owning tenant's token is presented", async () => {
    const res = await POST(makeRequest(delivered(), TENANT_TOKEN))

    expect(res.status).toBe(200)
    expect(mockCredentialFindUnique).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1' },
      select: { webhookToken: true },
    })
    expect(mockUpdateStatus).toHaveBeenCalledWith('tenant-1', 'order-1', 'delivered')
  })

  it("silently ignores another tenant's token against this tenant's AWB, without marking it delivered", async () => {
    // The regression this whole change exists for: one shared secret would let any shop
    // flip a competitor's order to delivered, since orders are resolved by AWB alone. Answers
    // 200 rather than 401 — Shiprocket's own webhook-URL validation requires "open access"
    // and rejects a URL that answers with anything other than 2xx — but must still not touch
    // the order.
    const res = await POST(makeRequest(delivered(), 'whtok_some_other_shop'))

    expect(res.status).toBe(200)
    expect(mockUpdateStatus).not.toHaveBeenCalled()
  })

  it('answers 200 for a request with no token at all, without touching the database', async () => {
    // This is what Shiprocket's save-time reachability probe looks like: no custom header,
    // expects a bare 2xx.
    const res = await POST(makeRequest(delivered(), null))

    expect(res.status).toBe(200)
    expect(mockOrderFindFirst).not.toHaveBeenCalled()
  })

  it('answers 200 when the tenant has no stored credential, without marking it delivered', async () => {
    mockCredentialFindUnique.mockResolvedValue(null)

    const res = await POST(makeRequest(delivered(), TENANT_TOKEN))

    expect(res.status).toBe(200)
    expect(mockUpdateStatus).not.toHaveBeenCalled()
  })

  it('answers 200 for an unparseable body instead of throwing', async () => {
    const request = new NextRequest('http://localhost/api/webhooks/delivery-status', {
      method: 'POST',
      headers: new Headers({ 'x-shiprocket-token': TENANT_TOKEN }),
      body: 'not json',
    })

    const res = await POST(request)

    expect(res.status).toBe(200)
    expect(mockOrderFindFirst).not.toHaveBeenCalled()
  })

  it('ignores non-Delivered statuses before doing any lookup', async () => {
    const res = await POST(
      makeRequest({ awb: 'AWB1', current_status: 'In Transit' }, TENANT_TOKEN)
    )

    expect(res.status).toBe(200)
    expect(mockOrderFindFirst).not.toHaveBeenCalled()
  })

  it('returns 200 when no order matches the AWB', async () => {
    mockOrderFindFirst.mockResolvedValue(null)

    const res = await POST(makeRequest(delivered('unknown'), TENANT_TOKEN))

    expect(res.status).toBe(200)
    expect(mockUpdateStatus).not.toHaveBeenCalled()
  })

  it('is a no-op when the order is already delivered (idempotent retry)', async () => {
    mockOrderFindFirst.mockResolvedValue({
      id: 'order-1',
      tenantId: 'tenant-1',
      status: 'delivered',
    })

    const res = await POST(makeRequest(delivered(), TENANT_TOKEN))

    expect(res.status).toBe(200)
    expect(mockUpdateStatus).not.toHaveBeenCalled()
  })
})
