# Shiprocket Integration (PoC) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a confirmed order through the real Shiprocket API from the admin UI, get back a real AWB, and flip the order to `delivered` when Shiprocket's webhook says so.

**Architecture:** Platform-level Shiprocket client mirroring `lib/payments/razorpay.ts` (plain fetch, env-var credentials), wired into the existing `updateOrderStatus` transition path — no schema changes, `Order.trackingId` holds the AWB.

**Tech Stack:** Next.js server actions, Prisma, Vitest (`vi.stubGlobal('fetch', ...)` for HTTP mocking — see `lib/cloudinary.test.ts` for the exact pattern).

**Spec:** `docs/superpowers/specs/2026-08-19-shiprocket-integration-design.md`

## Global Constraints

- No new Prisma models or migrations — reuse `Order.trackingId` for the AWB (spec: "No schema migration").
- Package weight/dimensions are hardcoded (`0.5kg / 10x10x10cm`) with a `ponytail:` comment — no per-product weight field exists.
- Rely on Shiprocket's own customer notifications; do not build custom SMS/WhatsApp/email for shipment status.
- Webhook only acts on `current_status === 'Delivered'`; every other status is a 200 no-op.
- Webhook auth is a static shared-secret header (`x-shiprocket-token`), not HMAC — Shiprocket has no HMAC option.

---

### Task 1: Shiprocket API client

**Files:**
- Create: `lib/shipping/shiprocket.ts`
- Test: `lib/shipping/shiprocket.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `createShiprocketShipment(input: ShiprocketOrderInput): Promise<ShiprocketShipment>`, `verifyShiprocketWebhookToken(received: string | null): boolean`, and the exported types `ShiprocketOrderInput` and `ShiprocketShipment` — Task 2 and Task 3 both import from this file.

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/shipping/shiprocket.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createShiprocketShipment, verifyShiprocketWebhookToken } from './shiprocket'

const originalEnv = { ...process.env }

beforeEach(() => {
  process.env.SHIPROCKET_EMAIL = 'ops@talam4shop.com'
  process.env.SHIPROCKET_PASSWORD = 'secret'
  process.env.SHIPROCKET_PICKUP_LOCATION = 'Talam Warehouse'
  process.env.SHIPROCKET_WEBHOOK_TOKEN = 'whtok_123'
})

afterEach(() => {
  process.env = { ...originalEnv }
  vi.unstubAllGlobals()
})

const VALID_INPUT = {
  orderId: 'order-abc',
  orderDate: new Date('2026-08-19T10:30:00Z'),
  paymentMethod: 'Prepaid' as const,
  subTotal: 1200,
  billing: { name: 'Asha Rao', line1: '12 MG Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560001', phone: '9876543210', email: 'asha@example.com' },
  items: [{ name: 'Silk Saree', sku: 'prod-1', units: 1, sellingPrice: 1200 }],
}

function mockLoginThenOrderThenAwb(orderStatus = 200, awbStatus = 200) {
  const fetchMock = vi.fn()
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'sr_token_1' }) })
  fetchMock.mockResolvedValueOnce({
    ok: orderStatus === 200,
    status: orderStatus,
    json: async () => ({ order_id: 555, shipment_id: 999 }),
    text: async () => 'order creation failed',
  })
  fetchMock.mockResolvedValueOnce({
    ok: awbStatus === 200,
    status: awbStatus,
    json: async () => ({ response: { data: { awb_code: 'AWB123', courier_name: 'Delhivery' } } }),
    text: async () => 'awb assignment failed',
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('createShiprocketShipment', () => {
  it('logs in, creates the order, assigns an AWB, and returns the shipment', async () => {
    const fetchMock = mockLoginThenOrderThenAwb()
    const result = await createShiprocketShipment(VALID_INPUT)

    expect(result).toEqual({ awbCode: 'AWB123', courierName: 'Delhivery', shipmentId: 999 })
    expect(fetchMock).toHaveBeenNthCalledWith(1, expect.stringContaining('/auth/login'), expect.objectContaining({ method: 'POST' }))

    const orderCall = fetchMock.mock.calls[1]
    expect(orderCall[0]).toContain('/orders/create/adhoc')
    const orderBody = JSON.parse(orderCall[1].body as string)
    expect(orderBody).toMatchObject({
      order_id: 'order-abc',
      pickup_location: 'Talam Warehouse',
      billing_customer_name: 'Asha Rao',
      billing_pincode: '560001',
      payment_method: 'Prepaid',
      weight: 0.5,
      length: 10,
      breadth: 10,
      height: 10,
    })
    expect(orderBody.order_items).toEqual([{ name: 'Silk Saree', sku: 'prod-1', units: 1, selling_price: 1200 }])

    const awbCall = fetchMock.mock.calls[2]
    expect(awbCall[0]).toContain('/courier/assign/awb')
    expect(JSON.parse(awbCall[1].body as string)).toEqual({ shipment_id: 999 })
  })

  it('reuses a cached token instead of logging in again within the same process', async () => {
    const fetchMock = mockLoginThenOrderThenAwb()
    await createShiprocketShipment(VALID_INPUT)
    mockLoginThenOrderThenAwb() // second call's login response would be call #4 if login happened again
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ order_id: 1, shipment_id: 2 }) })
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ response: { data: { awb_code: 'AWB2', courier_name: 'X' } } }) })

    await createShiprocketShipment(VALID_INPUT)
    // Only one login call total across both createShiprocketShipment calls.
    const loginCalls = fetchMock.mock.calls.filter((c) => String(c[0]).includes('/auth/login'))
    expect(loginCalls.length).toBe(1)
  })

  it('throws when Shiprocket order creation fails', async () => {
    mockLoginThenOrderThenAwb(422)
    await expect(createShiprocketShipment(VALID_INPUT)).rejects.toThrow('Shiprocket order creation failed')
  })

  it('throws when credentials are not configured', async () => {
    delete process.env.SHIPROCKET_EMAIL
    await expect(createShiprocketShipment(VALID_INPUT)).rejects.toThrow('Shiprocket credentials are not configured')
  })

  it('throws when the pickup location is not configured', async () => {
    delete process.env.SHIPROCKET_PICKUP_LOCATION
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'sr_token_1' }) }))
    await expect(createShiprocketShipment(VALID_INPUT)).rejects.toThrow('SHIPROCKET_PICKUP_LOCATION is not configured')
  })
})

describe('verifyShiprocketWebhookToken', () => {
  it('accepts the configured token', () => {
    expect(verifyShiprocketWebhookToken('whtok_123')).toBe(true)
  })

  it('rejects a wrong token', () => {
    expect(verifyShiprocketWebhookToken('wrong')).toBe(false)
  })

  it('rejects a missing token', () => {
    expect(verifyShiprocketWebhookToken(null)).toBe(false)
  })

  it('rejects everything when no token is configured', () => {
    delete process.env.SHIPROCKET_WEBHOOK_TOKEN
    expect(verifyShiprocketWebhookToken('whtok_123')).toBe(false)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/shipping/shiprocket.test.ts`
Expected: FAIL — `lib/shipping/shiprocket.ts` does not exist yet (`Cannot find module './shiprocket'`).

- [ ] **Step 3: Write the implementation**

```typescript
// lib/shipping/shiprocket.ts
import crypto from 'node:crypto'

/**
 * Shiprocket via plain fetch — same reasoning as lib/payments/razorpay.ts: the REST
 * surface we need (login, create order, assign AWB) doesn't justify an SDK dependency.
 *
 * ponytail: platform-level credentials (one Talam Shiprocket account). Per-tenant accounts
 * (needed for COD remittance — see docs/superpowers/specs/2026-08-19-shiprocket-integration-design.md)
 * would move these into tenant.shippingConfig — nothing else here changes.
 */

const API_BASE = 'https://apiv2.shiprocket.in/v1/external'

let cachedToken: { token: string; expiresAt: number } | null = null

async function getShiprocketToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token

  const email = process.env.SHIPROCKET_EMAIL
  const password = process.env.SHIPROCKET_PASSWORD
  if (!email || !password) throw new Error('Shiprocket credentials are not configured')

  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`Shiprocket login failed (${res.status}): ${await res.text()}`)

  const json = (await res.json()) as { token: string }
  // Shiprocket tokens last 10 days; refresh a day early rather than racing the exact expiry.
  cachedToken = { token: json.token, expiresAt: Date.now() + 9 * 24 * 60 * 60 * 1000 }
  return json.token
}

export type ShiprocketOrderInput = {
  orderId: string
  orderDate: Date
  paymentMethod: 'COD' | 'Prepaid'
  subTotal: number
  billing: {
    name: string
    line1: string
    line2?: string
    city: string
    state: string
    pincode: string
    phone: string
    email?: string
  }
  items: { name: string; sku: string; units: number; sellingPrice: number }[]
}

export type ShiprocketShipment = { awbCode: string; courierName: string; shipmentId: number }

function formatShiprocketDate(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ')
}

export async function createShiprocketShipment(input: ShiprocketOrderInput): Promise<ShiprocketShipment> {
  const pickupLocation = process.env.SHIPROCKET_PICKUP_LOCATION
  if (!pickupLocation) throw new Error('SHIPROCKET_PICKUP_LOCATION is not configured')

  const token = await getShiprocketToken()
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const orderRes = await fetch(`${API_BASE}/orders/create/adhoc`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      order_id: input.orderId,
      order_date: formatShiprocketDate(input.orderDate),
      pickup_location: pickupLocation,
      billing_customer_name: input.billing.name,
      billing_address: input.billing.line1,
      billing_address_2: input.billing.line2 ?? '',
      billing_city: input.billing.city,
      billing_pincode: input.billing.pincode,
      billing_state: input.billing.state,
      billing_country: 'India',
      billing_email: input.billing.email || 'orders@talam4shop.com',
      billing_phone: input.billing.phone,
      shipping_is_billing: true,
      order_items: input.items.map((item) => ({
        name: item.name,
        sku: item.sku,
        units: item.units,
        selling_price: item.sellingPrice,
      })),
      payment_method: input.paymentMethod,
      sub_total: input.subTotal,
      // ponytail: hardcoded package weight/dims — no per-product weight field yet.
      // Upgrade path: add Product.weight, sum per order.
      length: 10,
      breadth: 10,
      height: 10,
      weight: 0.5,
    }),
  })
  if (!orderRes.ok) throw new Error(`Shiprocket order creation failed (${orderRes.status}): ${await orderRes.text()}`)
  const orderJson = (await orderRes.json()) as { order_id: number; shipment_id: number }

  const awbRes = await fetch(`${API_BASE}/courier/assign/awb`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ shipment_id: orderJson.shipment_id }),
  })
  if (!awbRes.ok) throw new Error(`Shiprocket AWB assignment failed (${awbRes.status}): ${await awbRes.text()}`)
  const awbJson = (await awbRes.json()) as { response: { data: { awb_code: string; courier_name: string } } }

  return {
    awbCode: awbJson.response.data.awb_code,
    courierName: awbJson.response.data.courier_name,
    shipmentId: orderJson.shipment_id,
  }
}

/** Shiprocket has no HMAC webhook option — verification is a static shared-secret header
 *  (configured as a custom header in the Shiprocket dashboard) compared in constant time. */
export function verifyShiprocketWebhookToken(received: string | null): boolean {
  const expected = process.env.SHIPROCKET_WEBHOOK_TOKEN
  if (!expected || !received || expected.length !== received.length) return false
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received))
}
```

- [ ] **Step 4: Add the new env vars**

In `.env.example`, under the `SERVER ONLY` section, after `TALAM_RAZORPAY_WEBHOOK_SECRET=`:

```
SHIPROCKET_EMAIL=
SHIPROCKET_PASSWORD=
SHIPROCKET_PICKUP_LOCATION=
SHIPROCKET_WEBHOOK_TOKEN=
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run lib/shipping/shiprocket.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/shipping/shiprocket.ts lib/shipping/shiprocket.test.ts .env.example
git commit -m "feat: add Shiprocket API client for shipment creation"
```

---

### Task 2: Shiprocket webhook route

**Files:**
- Create: `app/api/webhooks/shiprocket/route.ts`
- Test: `app/api/webhooks/shiprocket/route.test.ts`

**Interfaces:**
- Consumes: `verifyShiprocketWebhookToken` from `lib/shipping/shiprocket.ts` (Task 1); `updateOrderStatus` from `lib/data/orders.ts` (existing, signature `(tenantId: string, orderId: string, status: OrderStatus, trackingId?: string, cancelReason?: string) => Promise<void>`); `prisma` from `lib/prisma.ts`.

- [ ] **Step 1: Write the failing tests**

```typescript
// app/api/webhooks/shiprocket/route.test.ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run app/api/webhooks/shiprocket/route.test.ts`
Expected: FAIL — `./route` does not exist yet.

- [ ] **Step 3: Write the implementation**

```typescript
// app/api/webhooks/shiprocket/route.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateOrderStatus } from '@/lib/data/orders'
import { verifyShiprocketWebhookToken } from '@/lib/shipping/shiprocket'

/**
 * Shiprocket has no concept of tenants, so this is not tenant-scoped via withTenant —
 * same reasoning as app/api/webhooks/razorpay/route.ts. The AWB (trackingId) is globally
 * unique, so it alone identifies the order. Shiprocket retries failed deliveries, so this
 * must be idempotent.
 */
export async function POST(request: NextRequest) {
  const token = request.headers.get('x-shiprocket-token')
  if (!verifyShiprocketWebhookToken(token)) {
    return NextResponse.json({ error: 'invalid token' }, { status: 401 })
  }

  const payload = (await request.json()) as { awb?: string; current_status?: string }

  // Our OrderStatus enum has no "out for delivery"/RTO states, and shipped -> delivered is
  // the only transition currently reachable from "shipped" — every other status is a no-op.
  if (payload.current_status !== 'Delivered' || !payload.awb) {
    return NextResponse.json({ ok: true, ignored: payload.current_status })
  }

  const order = await prisma.order.findFirst({
    where: { trackingId: payload.awb },
    select: { id: true, tenantId: true, status: true },
  })
  if (!order) {
    console.info('[shiprocket webhook] no order for awb', payload.awb)
    return NextResponse.json({ ok: true })
  }

  if (order.status === 'shipped') {
    await updateOrderStatus(order.tenantId, order.id, 'delivered')
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run app/api/webhooks/shiprocket/route.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/webhooks/shiprocket/route.ts app/api/webhooks/shiprocket/route.test.ts
git commit -m "feat: add Shiprocket delivery webhook"
```

---

### Task 3: Admin action to ship an order via Shiprocket

**Files:**
- Modify: `app/admin/orders/actions.ts`
- Modify: `app/admin/orders/actions.test.ts`

**Interfaces:**
- Consumes: `createShiprocketShipment` and `ShiprocketOrderInput` from `lib/shipping/shiprocket.ts` (Task 1); `updateOrderStatus` from `lib/data/orders.ts` (existing); `requireOwnerTenant` from `lib/admin-guard.ts` (existing); `withTenant`, `prisma` from `lib/prisma.ts` (existing); `AdminOrderAddress` type from `lib/data/orders.ts` (existing).
- Produces: `shipViaShiprocketAction(orderId: string): Promise<{ error?: string; trackingId?: string }>` — Task 4's UI calls this directly.

- [ ] **Step 1: Write the failing tests**

Add to `app/admin/orders/actions.test.ts` (extend the existing mocks — add `mockCreateShipment` and an `order.findFirst` case that includes items/customer):

```typescript
// Add to the vi.hoisted(...) block at the top of the file:
//   mockCreateShipment: vi.fn(),
// Add alongside the existing vi.mock('@/lib/prisma', ...) — keep mockDb.order.findFirst as-is,
// it's reused by markOrderPaidAction's tests too.
// Add: vi.mock('@/lib/shipping/shiprocket', () => ({ createShiprocketShipment: mockCreateShipment }))

// Then import shipViaShiprocketAction alongside the existing named imports, and add:

describe('shipViaShiprocketAction', () => {
  const baseOrder = {
    id: 'o1',
    status: 'confirmed',
    createdAt: new Date('2026-08-19T10:00:00Z'),
    total: '1200.00',
    paymentProvider: 'upi_manual',
    shippingAddress: { name: 'Asha Rao', line1: '12 MG Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560001', phone: '9876543210' },
    customer: { email: 'asha@example.com' },
    items: [{ productId: 'p1', productName: 'Silk Saree', quantity: 1, unitPrice: '1200.00' }],
  }

  it('creates a shipment and moves the order to shipped with the real AWB', async () => {
    mockDb.order.findFirst.mockResolvedValue(baseOrder)
    mockCreateShipment.mockResolvedValue({ awbCode: 'AWB123', courierName: 'Delhivery', shipmentId: 999 })

    const result = await shipViaShiprocketAction('o1')

    expect(result).toEqual({ trackingId: 'AWB123' })
    expect(mockCreateShipment).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'o1',
        paymentMethod: 'Prepaid',
        subTotal: 1200,
        billing: expect.objectContaining({ name: 'Asha Rao', pincode: '560001', email: 'asha@example.com' }),
        items: [{ name: 'Silk Saree', sku: 'p1', units: 1, sellingPrice: 1200 }],
      })
    )
    expect(mockUpdateStatus).toHaveBeenCalledWith('t1', 'o1', 'shipped', 'AWB123')
  })

  it('uses COD as the payment method for cash-on-delivery orders', async () => {
    mockDb.order.findFirst.mockResolvedValue({ ...baseOrder, paymentProvider: 'cod' })
    mockCreateShipment.mockResolvedValue({ awbCode: 'AWB1', courierName: 'X', shipmentId: 1 })
    await shipViaShiprocketAction('o1')
    expect(mockCreateShipment).toHaveBeenCalledWith(expect.objectContaining({ paymentMethod: 'COD' }))
  })

  it('refuses an order that is not confirmed', async () => {
    mockDb.order.findFirst.mockResolvedValue({ ...baseOrder, status: 'pending' })
    const result = await shipViaShiprocketAction('o1')
    expect(result.error).toBeTruthy()
    expect(mockCreateShipment).not.toHaveBeenCalled()
  })

  it('refuses an order with an incomplete shipping address', async () => {
    mockDb.order.findFirst.mockResolvedValue({ ...baseOrder, shippingAddress: { name: 'Asha Rao' } })
    const result = await shipViaShiprocketAction('o1')
    expect(result.error).toBeTruthy()
    expect(mockCreateShipment).not.toHaveBeenCalled()
  })

  it('returns an error when the order does not exist', async () => {
    mockDb.order.findFirst.mockResolvedValue(null)
    const result = await shipViaShiprocketAction('missing')
    expect(result.error).toBeTruthy()
  })

  it('surfaces the Shiprocket error message without updating order status', async () => {
    mockDb.order.findFirst.mockResolvedValue(baseOrder)
    mockCreateShipment.mockRejectedValue(new Error('Shiprocket order creation failed (422): bad pincode'))
    const result = await shipViaShiprocketAction('o1')
    expect(result.error).toBe('Shiprocket order creation failed (422): bad pincode')
    expect(mockUpdateStatus).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run app/admin/orders/actions.test.ts`
Expected: FAIL — `shipViaShiprocketAction` is not exported yet.

- [ ] **Step 3: Write the implementation**

In `app/admin/orders/actions.ts`, add the import and the new action:

```typescript
// Add to the top imports:
import { createShiprocketShipment } from '@/lib/shipping/shiprocket'
import type { AdminOrderAddress } from '@/lib/data/orders'
```

```typescript
// Add at the end of the file:

/**
 * Pushes a confirmed order to Shiprocket, gets back a real AWB, and moves the order to
 * "shipped" with that AWB as trackingId — the auto-fill alternative to the manual
 * tracking-number entry in updateOrderStatusAction.
 */
export async function shipViaShiprocketAction(orderId: string): Promise<{ error?: string; trackingId?: string }> {
  const { tenantId } = await requireOwnerTenant()

  const order = await withTenant(tenantId, (db) =>
    db.order.findFirst({
      where: { id: orderId, tenantId },
      include: {
        items: { select: { productId: true, productName: true, quantity: true, unitPrice: true } },
        customer: { select: { email: true } },
      },
    })
  )
  if (!order) return { error: 'Order not found.' }
  if (order.status !== 'confirmed') return { error: 'Only confirmed orders can be shipped.' }

  const address = (order.shippingAddress ?? {}) as AdminOrderAddress
  if (!address.name || !address.line1 || !address.city || !address.state || !address.pincode || !address.phone) {
    return { error: 'This order is missing a complete shipping address.' }
  }

  let shipment
  try {
    shipment = await createShiprocketShipment({
      orderId: order.id,
      orderDate: order.createdAt,
      paymentMethod: order.paymentProvider === 'cod' ? 'COD' : 'Prepaid',
      subTotal: Number(order.total),
      billing: {
        name: address.name,
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        phone: address.phone,
        email: order.customer.email ?? undefined,
      },
      items: order.items.map((item) => ({
        name: item.productName,
        sku: item.productId,
        units: item.quantity,
        sellingPrice: Number(item.unitPrice),
      })),
    })
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not create the Shiprocket shipment.' }
  }

  await updateOrderStatus(tenantId, orderId, 'shipped', shipment.awbCode)
  revalidatePath('/admin/orders')
  revalidatePath('/admin/dashboard')
  return { trackingId: shipment.awbCode }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run app/admin/orders/actions.test.ts`
Expected: PASS (all existing tests plus the 6 new ones)

- [ ] **Step 5: Commit**

```bash
git add app/admin/orders/actions.ts app/admin/orders/actions.test.ts
git commit -m "feat: add shipViaShiprocketAction"
```

---

### Task 4: Admin UI — "Ship via Shiprocket" button and tracking link

**Files:**
- Modify: `components/admin/order-action-sheet.tsx`
- Modify: `components/admin/order-details-modal.tsx`

**Interfaces:**
- Consumes: `shipViaShiprocketAction` from `app/admin/orders/actions.ts` (Task 3), return type `{ error?: string; trackingId?: string }`.

This task is UI-only glue code with no new branching logic worth a unit test beyond what Task 3 already covers — verify it by running the app (see Step 5).

- [ ] **Step 1: Add the button to `order-action-sheet.tsx`**

```typescript
// Add to the imports:
import { updateOrderStatusAction, shipViaShiprocketAction } from '@/app/admin/orders/actions'
```

Add a handler inside `OrderActionSheet`, alongside `applyStatus`:

```typescript
async function shipViaShiprocket() {
  setSaving(true)
  setSaveError('')
  const result = await shipViaShiprocketAction(order.id)
  setSaving(false)
  if (result.error) {
    setSaveError(result.error)
    return
  }
  onUpdated({ ...order, status: 'shipped', trackingId: result.trackingId ?? order.trackingId })
  handleClose()
}
```

Replace the existing shipped-tracking form block (the one with `<input name="trackingId" ...>` and the "Save" button) with:

```tsx
{pendingStatus === action.key && action.key === 'shipped' && (
  <div className="flex flex-col gap-2 border-b border-border bg-bg px-5 py-3">
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        const trackingId = new FormData(e.currentTarget).get('trackingId') as string
        void applyStatus('shipped', trackingId)
      }}
    >
      <input name="trackingId" required placeholder="Tracking number" className="grow rounded-md border border-border px-2 py-1 text-sm" />
      <button type="submit" disabled={saving} className="rounded-md bg-brand-primary px-3 py-1 text-sm font-semibold text-surface transition-transform active:scale-95 disabled:opacity-50">Save</button>
    </form>
    <button
      type="button"
      onClick={() => void shipViaShiprocket()}
      disabled={saving}
      className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold text-fg transition-colors active:bg-border disabled:opacity-50"
    >
      Or ship via Shiprocket (auto-fills tracking)
    </button>
  </div>
)}
```

- [ ] **Step 2: Add the button to `order-details-modal.tsx`**

```typescript
// Add to the imports:
import { updateOrderStatusAction, markOrderPaidAction, shipViaShiprocketAction } from '@/app/admin/orders/actions'
```

Add a handler inside `OrderDetailsModal`, alongside `confirm`:

```typescript
async function shipViaShiprocket() {
  setSaving(true)
  setSaveError('')
  const result = await shipViaShiprocketAction(order.id)
  setSaving(false)
  if (result.error) {
    setSaveError(result.error)
    return
  }
  onUpdated({ ...order, status: 'shipped', trackingId: result.trackingId ?? order.trackingId })
  setConfirmKey(null)
  setTrackingId('')
}
```

Replace the existing `confirmAction.key === 'shipped'` block (the one with just the tracking-number `<input>`) with:

```tsx
{confirmAction.key === 'shipped' && (
  <div className="mt-3 flex flex-col gap-2">
    <input
      autoFocus
      value={trackingId}
      onChange={(e) => setTrackingId(e.target.value)}
      placeholder="Tracking number"
      className="w-full rounded-md border border-border px-3 py-2 text-sm"
    />
    <button
      type="button"
      onClick={() => void shipViaShiprocket()}
      disabled={saving}
      className="w-full cursor-pointer rounded-lg border border-border p-2 text-sm font-semibold text-fg transition-colors active:bg-bg disabled:opacity-50"
    >
      Or ship via Shiprocket (auto-fills tracking)
    </button>
  </div>
)}
```

Add a tracking link near the "Order Tracking Timeline" heading (around line 303) so a shipped/delivered order shows the real AWB:

```tsx
{/* Order Tracking Timeline */}
<div className="mb-6">
  <div className="mb-3 flex items-center justify-between">
    <p className="text-xs font-bold uppercase tracking-wide text-fg">Order Tracking Timeline</p>
    {order.trackingId && (
      <a
        href={`https://shiprocket.co/tracking/${order.trackingId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-semibold text-brand-primary underline"
      >
        Track {order.trackingId} →
      </a>
    )}
  </div>
```

(This replaces the existing single-line `<p className="mb-3 ...">Order Tracking Timeline</p>` — wrap it in the flex row above instead of a bare `<p>`.)

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors in the four touched files.

- [ ] **Step 4: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — no regressions in existing order/action tests.

- [ ] **Step 5: Manually verify in the running app**

Run: `npm run dev`, sign in as the seeded `silk` tenant owner, open an order in `confirmed` status, open its action sheet or details modal, confirm the new "Ship via Shiprocket" button renders next to the manual tracking field. (Actually clicking it will fail with a clear error until `SHIPROCKET_EMAIL`/`SHIPROCKET_PASSWORD`/`SHIPROCKET_PICKUP_LOCATION` are set and a real Shiprocket account with wallet balance exists — that account setup is on you, per the design spec's prerequisite.)

- [ ] **Step 6: Commit**

```bash
git add components/admin/order-action-sheet.tsx components/admin/order-details-modal.tsx
git commit -m "feat: add Ship via Shiprocket button and tracking link to admin order UI"
```

---

## After this plan

Once you've completed the real Shiprocket account setup (signup, KYC, pickup location, wallet balance — see the spec's Prerequisite section) and deployed to a Vercel preview:

1. Set `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD`, `SHIPROCKET_PICKUP_LOCATION` as Vercel env vars.
2. Generate a random value for `SHIPROCKET_WEBHOOK_TOKEN`, set it as a Vercel env var too.
3. In the Shiprocket dashboard (Settings → API → Webhook), point the webhook at `https://<your-preview-url>/api/webhooks/shiprocket` with a custom header `x-shiprocket-token: <same value>`.
4. Place a real order on the seeded `silk` tenant storefront, confirm it in admin, click "Ship via Shiprocket", and watch the AWB and Shiprocket's own notifications arrive.
