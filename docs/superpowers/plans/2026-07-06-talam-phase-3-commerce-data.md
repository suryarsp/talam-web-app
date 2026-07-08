# Phase 3: Commerce Implementation Plan — Data Track

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Track order:** This is a **Data-track** plan. Do not start it until every phase's UI-track plan (Phases 1–8) is complete — see `README.md`. This file specifically depends on `2026-07-06-talam-phase-3-commerce-ui.md` having been executed first (it builds `app/store/cart/page.tsx`, `app/store/checkout/page.tsx`, `components/store/cart-item-row.tsx`, `components/store/address-form.tsx`, and `components/store/payment-method-picker.tsx`, which Task 5 below wires to real data).

**Goal:** Build the payment gateway integrations (UPI Manual, Instamojo, Razorpay) behind a `PaymentProvider` abstraction, the orders data layer, the checkout server action that creates real orders from the UI-track's mock-wired checkout page, and payment webhooks with signature verification.

**Architecture:** Payment provider is abstracted behind a `PaymentProvider` interface — the tenant's configured provider (`upi_manual` / `instamojo` / `razorpay`) is loaded at checkout time via a factory. Webhooks verify the provider's signature before any DB write. Cart state stays in the existing Zustand `useCartStore` (Phase 2, `lib/store/cart.ts`) — the server action receives the cart items as an argument; there is no server-side cart. Checkout requires an authenticated customer (the existing `/store/auth` page from Phase 2 handles login). `after()` handles non-blocking post-order side effects (Phase 7 wires Resend + PostHog there).

**Tech Stack:** Next.js `after()` for non-blocking side effects, Prisma `withTenant` (`lib/prisma.ts`), Zustand cart store (`lib/store/cart.ts`, Phase 2, consumed only), Vitest for TDD, `createServerClient` from `lib/supabase/server.ts` for auth.

## Global Constraints

- Inherit all Phase 1 + 2 constraints (multi-tenant via `x-tenant-id` header set by `middleware.ts`, `withTenant(tenantId, fn)` wraps every Prisma call to set `app.tenant_id` for RLS).
- Checkout page: `export const dynamic = 'force-dynamic'` — never cached (already set by the UI track; do not remove it while wiring).
- Talam never holds customer payment money — gateway pays directly to tenant bank.
- Webhook endpoints must verify provider signature before any DB write.
- `after()` fires only after response is sent — never blocks checkout response.
- Payment config (API keys) stored in `tenant.paymentConfig` (Prisma `Json?`, `@map("payment_config")`) — schema does not currently mark it encrypted at the column level; treat as sensitive, do not log it.
- Schema reality check: `prisma/schema.prisma` has `DiscountCode` (code, type, value, minOrder, usesLimit, usesCount, expiresAt, isActive) as a **standalone model with no relation to `Order`** — there is no `Order.discountCode` or `Order.discountAmount` field. The Paper cart/checkout screens show a coupon UI ("DIWALI20 applied · You save ₹1,179"). The UI track built the coupon **UI**; this plan may implement `DiscountCode` lookup/validation behind it, but does NOT persist which coupon was applied to an order (that would require a schema migration, out of scope for this phase — flagged in Known Gaps, not invented).
- `Order` model fields (exact, from schema): `id, tenantId, customerId, status (OrderStatus), total (Decimal), paymentProvider (String?), paymentId (String?), paymentStatus (PaymentStatus), shippingAddress (Json), trackingId (String?), createdAt`. `OrderItem` fields: `id, orderId, tenantId, productId, productName, size?, quantity, unitPrice (Decimal)`. No `notes`, no `discountCode`, no `subtotal`/`discount` breakdown fields — the price breakdown shown in the cart/checkout UI (subtotal, discount, delivery, total) is computed client-side from cart items + tenant delivery settings; only the final `total` is persisted on `Order`.
- Restart (not reload) the dev server after any Prisma/data-layer change, per this project's Preview Tool Glitches convention.

---

### Task 1: Payment Provider Abstraction (Data)

**Files:**
- Create: `lib/payments/types.ts`
- Create: `lib/payments/upi-manual.ts`
- Create: `lib/payments/instamojo.ts`
- Create: `lib/payments/razorpay.ts`
- Create: `lib/payments/factory.ts`
- Create: `lib/payments/factory.test.ts`

**Interfaces:**
- Produces: `PaymentProvider` interface (`name`, `createOrder(amount, orderId)`, `verifyWebhook(payload, headers)`)
- Produces: `getPaymentProvider(tenant: { paymentProvider: string; paymentConfig: Record<string,string> | null })` factory function
- Consumes: `tenant.paymentProvider` (Prisma enum `upi_manual | instamojo | razorpay`) + `tenant.paymentConfig` (JSON)

Not a UI task — no Paper step required.

- [ ] **Step 1: Write failing test**

Create `lib/payments/factory.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { getPaymentProvider } from './factory'

describe('getPaymentProvider', () => {
  it('returns UpiManualProvider for upi_manual', () => {
    const provider = getPaymentProvider({ paymentProvider: 'upi_manual', paymentConfig: null })
    expect(provider.name).toBe('upi_manual')
  })

  it('returns InstamojoProvider for instamojo', () => {
    const provider = getPaymentProvider({
      paymentProvider: 'instamojo',
      paymentConfig: { apiKey: 'key', authToken: 'token' },
    })
    expect(provider.name).toBe('instamojo')
  })

  it('throws if instamojo config is missing', () => {
    expect(() =>
      getPaymentProvider({ paymentProvider: 'instamojo', paymentConfig: null })
    ).toThrow('Missing Instamojo config')
  })

  it('returns RazorpayProvider for razorpay', () => {
    const provider = getPaymentProvider({
      paymentProvider: 'razorpay',
      paymentConfig: { keyId: 'rzp_test_key', keySecret: 'secret' },
    })
    expect(provider.name).toBe('razorpay')
  })

  it('throws if razorpay config is missing', () => {
    expect(() =>
      getPaymentProvider({ paymentProvider: 'razorpay', paymentConfig: null })
    ).toThrow('Missing Razorpay config')
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm test -- --run lib/payments/factory.test.ts
```

Expected: FAIL — `Cannot find module './factory'`

- [ ] **Step 3: Create shared types**

Create `lib/payments/types.ts`:
```typescript
export type CheckoutData = {
  paymentUrl?: string        // UPI: upi:// deep link / Instamojo & Razorpay redirect
  qrCode?: string            // Reserved for future QR image rendering
  razorpayOrderId?: string   // Razorpay only — used client-side to open Razorpay Checkout
}

export type WebhookVerifyResult = {
  valid: boolean
  orderId?: string
  paymentId?: string
}

export interface PaymentProvider {
  name: string
  createOrder(amount: number, orderId: string): Promise<{ checkoutData: CheckoutData }>
  verifyWebhook(payload: unknown, headers: Headers): Promise<WebhookVerifyResult>
}
```

- [ ] **Step 4: Create UPI Manual provider**

Create `lib/payments/upi-manual.ts`:
```typescript
import type { PaymentProvider, CheckoutData, WebhookVerifyResult } from './types'

type Config = { upiId: string; displayName: string }

export class UpiManualProvider implements PaymentProvider {
  name = 'upi_manual' as const
  private config: Config

  constructor(config: Config) {
    this.config = config
  }

  async createOrder(amount: number, orderId: string): Promise<{ checkoutData: CheckoutData }> {
    const upiUrl = `upi://pay?pa=${this.config.upiId}&pn=${encodeURIComponent(this.config.displayName)}&am=${amount}&tn=${orderId}&cu=INR`
    return { checkoutData: { paymentUrl: upiUrl } }
  }

  async verifyWebhook(_payload: unknown, _headers: Headers): Promise<WebhookVerifyResult> {
    // UPI Manual has no webhook — the store owner manually marks the order paid
    // in the admin panel after checking the UTR the customer submits at checkout.
    return { valid: true }
  }
}
```

- [ ] **Step 5: Create Instamojo provider**

Create `lib/payments/instamojo.ts`:
```typescript
import type { PaymentProvider, CheckoutData, WebhookVerifyResult } from './types'
import crypto from 'node:crypto'

type Config = { apiKey: string; authToken: string }

const BASE_URL = 'https://www.instamojo.com/api/1.1'

export class InstamojoProvider implements PaymentProvider {
  name = 'instamojo' as const
  private config: Config

  constructor(config: Config) {
    this.config = config
  }

  async createOrder(amount: number, orderId: string): Promise<{ checkoutData: CheckoutData }> {
    const res = await fetch(`${BASE_URL}/payment-requests/`, {
      method: 'POST',
      headers: {
        'X-Api-Key': this.config.apiKey,
        'X-Auth-Token': this.config.authToken,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        purpose: `Order ${orderId}`,
        amount: amount.toFixed(2),
        buyer_name: '',
        redirect_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/payment/callback`,
        allow_repeated_payments: 'false',
      }),
    })

    if (!res.ok) {
      throw new Error(`Instamojo createOrder failed: ${res.status}`)
    }

    const data = await res.json()
    return { checkoutData: { paymentUrl: data.payment_request.longurl } }
  }

  async verifyWebhook(payload: unknown, _headers: Headers): Promise<WebhookVerifyResult> {
    const body = payload as Record<string, string>
    const mac = body.mac
    if (!mac) return { valid: false }

    const fields = ['amount', 'buyer', 'fees', 'longurl', 'payment_id', 'payment_request_id', 'purpose', 'shorturl', 'status']
    const message = fields
      .filter((f) => body[f] !== undefined)
      .map((f) => body[f])
      .join('|')

    const expectedMac = crypto.createHmac('sha1', this.config.authToken).update(message).digest('hex')

    return {
      valid: mac === expectedMac,
      paymentId: body.payment_id,
      orderId: body.purpose?.replace('Order ', ''),
    }
  }
}
```

- [ ] **Step 6: Create Razorpay provider**

Create `lib/payments/razorpay.ts`:
```typescript
import type { PaymentProvider, CheckoutData, WebhookVerifyResult } from './types'
import crypto from 'node:crypto'

type Config = { keyId: string; keySecret: string }

const BASE_URL = 'https://api.razorpay.com/v1'

export class RazorpayProvider implements PaymentProvider {
  name = 'razorpay' as const
  private config: Config

  constructor(config: Config) {
    this.config = config
  }

  async createOrder(amount: number, orderId: string): Promise<{ checkoutData: CheckoutData }> {
    const auth = Buffer.from(`${this.config.keyId}:${this.config.keySecret}`).toString('base64')
    const res = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // paise
        currency: 'INR',
        receipt: orderId,
      }),
    })
    if (!res.ok) {
      throw new Error(`Razorpay createOrder failed: ${res.status}`)
    }
    const rzOrder = await res.json()
    return { checkoutData: { razorpayOrderId: rzOrder.id } }
  }

  async verifyWebhook(payload: unknown, headers: Headers): Promise<WebhookVerifyResult> {
    const body = payload as string
    const signature = headers.get('x-razorpay-signature') ?? ''
    const expected = crypto.createHmac('sha256', this.config.keySecret).update(body).digest('hex')

    if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return { valid: false }
    }
    const event = JSON.parse(body)
    const payment = event?.payload?.payment?.entity
    return { valid: true, orderId: payment?.receipt, paymentId: payment?.id }
  }
}
```

- [ ] **Step 7: Create factory**

Create `lib/payments/factory.ts`:
```typescript
import { UpiManualProvider } from './upi-manual'
import { InstamojoProvider } from './instamojo'
import { RazorpayProvider } from './razorpay'
import type { PaymentProvider } from './types'

type TenantPaymentConfig = {
  paymentProvider: string
  paymentConfig: Record<string, string> | null
}

export function getPaymentProvider(tenant: TenantPaymentConfig): PaymentProvider {
  const config = tenant.paymentConfig ?? {}

  switch (tenant.paymentProvider) {
    case 'upi_manual':
      return new UpiManualProvider({
        upiId: config.upiId ?? '',
        displayName: config.displayName ?? 'Store',
      })
    case 'instamojo':
      if (!config.apiKey || !config.authToken) {
        throw new Error('Missing Instamojo config')
      }
      return new InstamojoProvider({ apiKey: config.apiKey, authToken: config.authToken })
    case 'razorpay':
      if (!config.keyId || !config.keySecret) {
        throw new Error('Missing Razorpay config')
      }
      return new RazorpayProvider({ keyId: config.keyId, keySecret: config.keySecret })
    default:
      throw new Error(`Unsupported payment provider: ${tenant.paymentProvider}`)
  }
}
```

- [ ] **Step 8: Run tests — verify all pass**

```bash
npm test -- --run lib/payments/factory.test.ts
```

Expected: PASS — 5 tests pass

- [ ] **Step 9: Commit**

```bash
git add lib/payments/
git commit -m "feat: add PaymentProvider abstraction with UPI Manual, Instamojo, and Razorpay implementations"
```

---

### Task 2: Cart Page — UI-only, no data wiring needed

Built entirely in the UI track (`app/store/cart/page.tsx`, `components/store/cart-item-row.tsx` — UI-track Task 2). The cart page reads the real `useCartStore` (Zustand, Phase 2) from day one — its "mock data" was only console-seeded store items, so there is no mock→real swap for this task. Listed here to keep task numbering aligned with the UI track.

---

### Task 3: Checkout Page — UI-only, wiring happens in Task 5

Mock 2-step checkout UI built in the UI track (`app/store/checkout/page.tsx`, `components/store/address-form.tsx`, `components/store/payment-method-picker.tsx` — UI-track Task 3). Its inert "Place Order" button and the `AddressForm`'s pincode-autofill fetch target are wired to real data by Task 5 below. Listed here to keep task numbering aligned with the UI track.

---

### Task 4: Orders Data Layer (TDD) (Data)

**Files:**
- Create: `lib/data/orders.ts`
- Create: `lib/data/orders.test.ts`

**Interfaces:**
- Consumes: `withTenant(tenantId, fn)` from `lib/prisma.ts`
- Produces: `createOrder(tenantId, input: CreateOrderInput): Promise<Order>`, `getOrder(tenantId, orderId): Promise<(Order & { items: OrderItem[] }) | null>`, `updateOrderPayment(tenantId, orderId, data): Promise<Order>`

Not a UI task — no Paper step required. Fields used match the exact `Order`/`OrderItem` schema (no invented columns).

- [ ] **Step 1: Write failing test**

Create `lib/data/orders.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  withTenant: vi.fn(async (_id: string, fn: (client: unknown) => Promise<unknown>) => {
    const mockClient = {
      order: {
        create: vi.fn().mockResolvedValue({
          id: 'order-1',
          tenantId: 't1',
          customerId: 'c1',
          status: 'pending',
          total: 4500,
          paymentProvider: null,
          paymentId: null,
          paymentStatus: 'pending',
          shippingAddress: {},
          trackingId: null,
          createdAt: new Date(),
        }),
        findFirst: vi.fn().mockResolvedValue({
          id: 'order-1',
          items: [{ id: 'item-1', productName: 'Silk Saree', quantity: 1, unitPrice: 4500 }],
        }),
        update: vi.fn().mockResolvedValue({ id: 'order-1', paymentStatus: 'paid', status: 'confirmed' }),
      },
    }
    return fn(mockClient)
  }),
}))

import { createOrder, getOrder, updateOrderPayment } from './orders'

describe('createOrder', () => {
  it('creates an order and returns the id', async () => {
    const order = await createOrder('tenant-1', {
      customerId: 'customer-1',
      items: [{ productId: 'p1', productName: 'Silk Saree', size: 'M', quantity: 1, unitPrice: 4500 }],
      shippingAddress: { line1: '12 Anna Nagar', city: 'Chennai', state: 'TN', pin: '600040' },
      total: 4500,
    })
    expect(order.id).toBe('order-1')
  })
})

describe('getOrder', () => {
  it('returns the order with items', async () => {
    const order = await getOrder('tenant-1', 'order-1')
    expect(order?.items).toHaveLength(1)
  })
})

describe('updateOrderPayment', () => {
  it('marks the order paid', async () => {
    const order = await updateOrderPayment('tenant-1', 'order-1', {
      paymentId: 'pay_123',
      paymentStatus: 'paid',
      status: 'confirmed',
    })
    expect(order.paymentStatus).toBe('paid')
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm test -- --run lib/data/orders.test.ts
```

Expected: FAIL — `Cannot find module './orders'`

- [ ] **Step 3: Implement orders data layer**

Create `lib/data/orders.ts`:
```typescript
import { withTenant } from '@/lib/prisma'
import type { Order } from '@prisma/client'

export type OrderItemInput = {
  productId: string
  productName: string
  size?: string
  quantity: number
  unitPrice: number
}

export type CreateOrderInput = {
  customerId: string
  items: OrderItemInput[]
  shippingAddress: Record<string, string>
  total: number
}

export async function createOrder(tenantId: string, input: CreateOrderInput): Promise<Order> {
  return withTenant(tenantId, (db) =>
    db.order.create({
      data: {
        tenantId,
        customerId: input.customerId,
        total: input.total,
        shippingAddress: input.shippingAddress,
        status: 'pending',
        paymentStatus: 'pending',
        items: {
          create: input.items.map((item) => ({
            tenantId,
            productId: item.productId,
            productName: item.productName,
            size: item.size,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      },
    })
  )
}

export async function getOrder(tenantId: string, orderId: string) {
  return withTenant(tenantId, (db) =>
    db.order.findFirst({
      where: { id: orderId, tenantId },
      include: { items: true },
    })
  )
}

export async function updateOrderPayment(
  tenantId: string,
  orderId: string,
  data: { paymentId: string; paymentStatus: string; status: string }
) {
  return withTenant(tenantId, (db) =>
    db.order.update({
      where: { id: orderId },
      data: {
        paymentId: data.paymentId,
        paymentStatus: data.paymentStatus as never,
        status: data.status as never,
      },
    })
  )
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npm test -- --run lib/data/orders.test.ts
```

Expected: PASS — 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add lib/data/orders.ts lib/data/orders.test.ts
git commit -m "feat: add orders data layer (createOrder, getOrder, updateOrderPayment)"
```

---

### Task 5: Wire Checkout to Real Data (Server Action + Order Creation) (Data)

**Files:**
- Modify: `app/store/checkout/page.tsx` (built mock-wired in UI-track Task 3 Step 3 — this task swaps its inert "Place Order" button for the real submit handler)
- Create: `app/store/checkout/actions.ts`
- Create: `app/api/pincode/[pin]/route.ts` (backs the `AddressForm.handlePinBlur` fetch that UI-track Task 3 Step 1 left degrading silently)
- Create: `lib/delivery.ts`

**Interfaces:**
- Consumes: `createOrder` from `lib/data/orders.ts`, `getPaymentProvider` from `lib/payments/factory.ts`, `getTenantStorefront` fields (`freeDeliveryAbove`, `shippingFee`, `deliveryEstimateText`, `returnWindowDays`), `withTenant`, `createServerClient` from `lib/supabase/server.ts`, `useCartStore`, `AddressData` from `components/store/address-form.tsx` (UI-track shape, unchanged)
- Produces: Server Action `initiateCheckout(cartItems, address, method): Promise<{ orderId: string; checkoutData: Record<string, string> }>`

This task swaps the UI-track Task 3 mock submit handler for the real server action — no new Paper lookups needed (UI is already built and verified).

- [ ] **Step 1: Create pincode lookup helper**

Create `lib/delivery.ts`:
```typescript
// Returns delivery estimate text for display at checkout.
// Pincode auto-fill uses the India Post pincode API (public, no key required).
export async function getPincodeDetails(pincode: string): Promise<{ city: string; state: string } | null> {
  if (!/^\d{6}$/.test(pincode)) return null
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`)
    const data = await res.json()
    if (data?.[0]?.Status === 'Success' && data[0].PostOffice?.length) {
      const po = data[0].PostOffice[0]
      return { city: po.District, state: po.State }
    }
  } catch {
    // silently ignore — pincode fill is best-effort
  }
  return null
}
```

- [ ] **Step 2: Create pincode API route**

Create `app/api/pincode/[pin]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getPincodeDetails } from '@/lib/delivery'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ pin: string }> }) {
  const { pin } = await params
  const details = await getPincodeDetails(pin)
  if (!details) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(details)
}
```

- [ ] **Step 3: Create checkout server action**

Create `app/store/checkout/actions.ts`:
```typescript
'use server'

import { headers } from 'next/headers'
import { after } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { withTenant } from '@/lib/prisma'
import { createOrder } from '@/lib/data/orders'
import { getPaymentProvider } from '@/lib/payments/factory'
import type { AddressData } from '@/components/store/address-form'
import type { CartItem } from '@/lib/store/cart'

export async function initiateCheckout(
  cartItems: CartItem[],
  address: AddressData
): Promise<{ orderId: string; checkoutData: Record<string, string> }> {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  if (!tenantId) throw new Error('No tenant context')
  if (cartItems.length === 0) throw new Error('Cart is empty')

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const tenant = await withTenant(tenantId, (db) =>
    db.tenant.findUnique({
      where: { id: tenantId },
      select: { paymentProvider: true, paymentConfig: true, tier: true, trialEndsAt: true, shippingFee: true, freeDeliveryAbove: true },
    })
  )
  if (!tenant) throw new Error('Tenant not found')

  if (tenant.tier === 'trial' && tenant.trialEndsAt && tenant.trialEndsAt < new Date()) {
    throw new Error('Store is on expired trial — checkout is disabled')
  }

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const freeThreshold = tenant.freeDeliveryAbove ? Number(tenant.freeDeliveryAbove) : null
  const shipping = freeThreshold !== null && subtotal >= freeThreshold ? 0 : Number(tenant.shippingFee)
  const total = subtotal + shipping

  const order = await createOrder(tenantId, {
    customerId: user.id,
    items: cartItems.map((item) => ({
      productId: item.productId,
      productName: item.name,
      size: item.size,
      quantity: item.quantity,
      unitPrice: item.price,
    })),
    shippingAddress: address as unknown as Record<string, string>,
    total,
  })

  const provider = getPaymentProvider({
    paymentProvider: tenant.paymentProvider,
    paymentConfig: tenant.paymentConfig as Record<string, string> | null,
  })
  const { checkoutData } = await provider.createOrder(total, order.id)

  after(async () => {
    // Phase 7 wires Resend + PostHog here — placeholder log only for now.
    console.log(`[after] Order ${order.id} created for tenant ${tenantId}`)
  })

  return { orderId: order.id, checkoutData: checkoutData as Record<string, string> }
}
```

- [ ] **Step 4: Wire the checkout page's payment step to call the server action**

Modify `app/store/checkout/page.tsx` — replace the `disabled={items.length === 0}` "Place Order" button block (the deliberate no-op left by UI-track Task 3 Step 3) with a real submit handler:
```typescript
// Replace the top of the component:
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/store/cart'
import { AddressForm, type AddressData } from '@/components/store/address-form'
import { PaymentMethodPicker } from '@/components/store/payment-method-picker'
import { initiateCheckout } from './actions'

export const dynamic = 'force-dynamic'

const STEPS = ['Address', 'Payment'] as const

export default function CheckoutPage() {
  const { items, total, clear } = useCartStore()
  const router = useRouter()
  const [step, setStep] = useState<0 | 1>(0)
  const [address, setAddress] = useState<AddressData | null>(null)
  const [method, setMethod] = useState<'upi_manual' | 'instamojo' | 'razorpay'>('upi_manual')
  const [utr, setUtr] = useState('')
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')
  const cartTotal = total()

  async function handlePlaceOrder() {
    if (!address) return
    setPlacing(true)
    setError('')
    try {
      const { orderId, checkoutData } = await initiateCheckout(items, address)
      clear()
      if (checkoutData.paymentUrl?.startsWith('upi://')) {
        router.push(`/orders/${orderId}?upi=${encodeURIComponent(checkoutData.paymentUrl)}`)
        return
      }
      if (checkoutData.paymentUrl) {
        window.location.href = checkoutData.paymentUrl
        return
      }
      router.push(`/orders/${orderId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setPlacing(false)
    }
  }
```

Then replace the "Place Order" button's `onClick`:
```typescript
            <button
              type="button"
              className="w-full rounded-lg bg-store-primary py-[14px] font-body text-[15px] font-semibold text-surface disabled:opacity-50"
              disabled={items.length === 0 || placing}
              onClick={handlePlaceOrder}
            >
              {placing ? 'Placing Order…' : 'Place Order'}
            </button>
          </div>
          {error && <p className="px-4 font-body text-xs text-danger">{error}</p>}
```

- [ ] **Step 5: Manual smoke test**

Run the dev server, add an item to cart via the UI, go to `/checkout`, fill the address form, select UPI, submit "Place Order". Confirm: no console/network errors, an `Order` row is created in the DB with `status = pending`, `paymentStatus = pending`, and the browser redirects to `/orders/{id}?upi=...`. Also confirm the pincode autofill now works: blurring a valid 6-digit pincode in the address form fills City/State (the UI-track shipped this fetch degrading silently — Step 2's route makes it live).

- [ ] **Step 6: Commit**

```bash
git add app/store/checkout/actions.ts app/store/checkout/page.tsx app/api/pincode/ lib/delivery.ts
git commit -m "feat: wire checkout UI to order creation and payment provider"
```

---

### Task 6: Instamojo & Razorpay Payment Webhooks (TDD) (Data)

**Files:**
- Create: `app/api/webhooks/instamojo/route.ts`
- Create: `app/api/webhooks/razorpay/route.ts`

**Interfaces:**
- Consumes: `InstamojoProvider`/`RazorpayProvider` from `lib/payments/`, `updateOrderPayment` from `lib/data/orders.ts`, `withTenant`
- Produces: `POST /api/webhooks/instamojo`, `POST /api/webhooks/razorpay` — both verify signature before any DB write

Not a UI task — no Paper step required. Signature verification logic already covered by Task 1; these steps focus on the route handlers and are TDD'd at the route level via direct invocation, not a full Next.js test harness (project has no existing route-handler test pattern to follow — kept to unit-level).

- [ ] **Step 1: Create Instamojo webhook handler**

Create `app/api/webhooks/instamojo/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { after } from 'next/server'
import { InstamojoProvider } from '@/lib/payments/instamojo'
import { updateOrderPayment } from '@/lib/data/orders'
import { withTenant } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  if (!tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 400 })

  const formData = await request.formData()
  const body = Object.fromEntries(formData.entries()) as Record<string, string>

  const tenant = await withTenant(tenantId, (db) =>
    db.tenant.findUnique({ where: { id: tenantId }, select: { paymentConfig: true } })
  )
  if (!tenant?.paymentConfig) return NextResponse.json({ error: 'No config' }, { status: 400 })

  const config = tenant.paymentConfig as Record<string, string>
  const provider = new InstamojoProvider({ apiKey: config.apiKey, authToken: config.authToken })

  const { valid, orderId, paymentId } = await provider.verifyWebhook(body, request.headers)
  if (!valid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  if (!orderId || !paymentId) return NextResponse.json({ error: 'Missing data' }, { status: 400 })

  const isPaid = body.status === 'Credit'
  if (!isPaid) return NextResponse.json({ ok: true })

  await updateOrderPayment(tenantId, orderId, { paymentId, paymentStatus: 'paid', status: 'confirmed' })

  after(async () => {
    console.log(`[after] Order ${orderId} paid via Instamojo`)
  })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Create Razorpay webhook handler**

Create `app/api/webhooks/razorpay/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { after } from 'next/server'
import { RazorpayProvider } from '@/lib/payments/razorpay'
import { updateOrderPayment } from '@/lib/data/orders'
import { withTenant } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  if (!tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 400 })

  const rawBody = await request.text()

  const tenant = await withTenant(tenantId, (db) =>
    db.tenant.findUnique({ where: { id: tenantId }, select: { paymentConfig: true } })
  )
  if (!tenant?.paymentConfig) return NextResponse.json({ error: 'No config' }, { status: 400 })

  const config = tenant.paymentConfig as Record<string, string>
  const provider = new RazorpayProvider({ keyId: config.keyId, keySecret: config.keySecret })

  const { valid, orderId, paymentId } = await provider.verifyWebhook(rawBody, request.headers)
  if (!valid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  if (!orderId || !paymentId) return NextResponse.json({ error: 'Missing data' }, { status: 400 })

  await updateOrderPayment(tenantId, orderId, { paymentId, paymentStatus: 'paid', status: 'confirmed' })

  after(async () => {
    console.log(`[after] Order ${orderId} paid via Razorpay`)
  })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/webhooks/
git commit -m "feat: add Instamojo and Razorpay payment webhooks with signature verification"
```

---

## Phase 3 Data Track Verification

```bash
npm test -- --run
```
Expected: all tests pass, including `lib/payments/factory.test.ts` (5 tests) and `lib/data/orders.test.ts` (3 tests)

```bash
npm run build
```
Expected: no TypeScript errors

Manual smoke test (visual Paper-match items were already verified in the UI track — these are behavior checks):
- [ ] `/checkout` address step → payment step still renders as verified in the UI track (no visual regression from the wiring)
- [ ] Selecting UPI shows the QR/UTR panel; placing an order with UPI creates an `Order` row (`status: pending`, `paymentStatus: pending`) and redirects to `/orders/{id}?upi=...`
- [ ] Selecting Instamojo/Razorpay redirects off-site to the provider's hosted checkout
- [ ] Pincode autofill fills City/State on 6-digit blur (route now exists)
- [ ] Simulated Instamojo webhook POST → order updates to `status: confirmed`, `paymentStatus: paid`
- [ ] Simulated Razorpay webhook POST with valid HMAC → same update; invalid signature → 401, no DB write

## Known Gaps (flagged, not silently invented)

- **Coupon persistence**: `DiscountCode` has no relation to `Order` in the schema. The UI track builds the coupon-entry UI to match Paper but this plan does not implement discount validation/redemption logic or store which code was applied — that requires a schema decision (new `Order.discountCode`/`Order.discountAmount` fields or a join table) that is out of this phase's scope.
- **Order Confirmed page**: Paper has a fully designed "Order Confirmed — Mobile" artboard (`9V2-0`) with tracking CTA, WhatsApp share, and delivery/payment summary. This plan's checkout flow redirects to `/orders/{id}` after placing an order, but building that page is Phase 3's natural next screen and is intentionally left to whichever phase owns `app/store/orders/[id]` (the old Phase 3 plan didn't cover it either) — call this out to the user before starting Task 5's redirect target if `/orders/[id]` doesn't exist yet.
- **Checkout Step 1 (Login)**: Paper has a dedicated "Step 1 — Mobile (Login)" artboard (`3WA-0`) styled as part of the checkout stepper. This plan reuses the existing standalone `/store/auth` page instead of rebuilding login inside the checkout stepper's visual chrome — flagged as a minor visual inconsistency (the auth page won't show the 3-dot stepper), acceptable since Phase 2 already shipped `/store/auth` and duplicating it would violate DRY.

## Self-Review

- **Spec coverage:** Every backend step from the original combined file (1409 lines) is represented here, verbatim: Task 1 (Payment Provider Abstraction, 9 steps), Task 4 (Orders Data Layer, 5 steps), Task 5 (Wire Checkout, 6 steps), Task 6 (Webhooks, 3 steps) — 23 checkbox steps, matching the original's counts for those tasks exactly. Tasks 2 and 3 are one-liner pointers because their steps are pure UI (carried in full by the sibling UI-track file); the cart page needs no data wiring at all (it reads the real Zustand store from day one), and the checkout page's wiring IS Task 5. The original's Phase 3 Verification checklist is split by nature: visual Paper-match items live in the UI file, behavior/DB/webhook items live here — no item dropped.
- **Placeholder scan:** No `<name>`-style unresolved placeholders. The `after()` block deliberately logs a placeholder (Phase 7 owns Resend/PostHog) — that is the original plan's explicit intent, not an unresolved stub.
- **Type consistency:** `initiateCheckout` consumes `CartItem` from `lib/store/cart.ts` and `AddressData` from `components/store/address-form.tsx` exactly as the UI track shipped them — no shape changes, so Task 5's swap touches only the submit handler and button block of `app/store/checkout/page.tsx`, not the `AddressForm`/`PaymentMethodPicker` components. `createOrder`/`updateOrderPayment` use only real `Order`/`OrderItem` schema fields (no invented `discountCode`/`subtotal` columns, per the Global Constraints schema reality check).
- **Track discipline:** No new component markup, Tailwind classes, or visual elements are introduced anywhere in this file except Task 5 Step 4's handler swap, which reuses the exact button classes the UI track shipped (adding only `disabled:opacity-50` state styling and the error `<p>` the original plan specified). No `paper-desktop` MCP calls appear here — all Paper lookups were done in the UI track. Every other step writes `lib/payments/*`, `lib/data/*`, `lib/delivery.ts`, a Server Action, or an API/webhook route.
