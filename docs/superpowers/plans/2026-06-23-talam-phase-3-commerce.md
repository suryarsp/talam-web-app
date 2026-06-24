# Phase 3: Commerce Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the cart page, checkout flow, and payment gateway integrations (UPI Manual + Instamojo) with webhook signature verification and order creation.

**Architecture:** Cart state lives in Zustand + localStorage (client-only, no server state). Checkout is SSR-dynamic (every request). Payment provider is abstracted behind a `PaymentProvider` interface — the tenant's configured provider is loaded at checkout time. Webhooks are verified before any order mutation. Post-payment side effects (email, analytics) run via `after()`.

**Tech Stack:** Next.js 15 `after()` for non-blocking side effects, Prisma `withTenant`, Razorpay SDK, Zustand cart store (from Phase 2), Resend (wired up fully in Phase 7 — stubs here), Vitest

## Global Constraints

- Inherit all Phase 1 + 2 constraints
- Checkout page: `export const dynamic = 'force-dynamic'` — never cached
- Talam never holds customer payment money — gateway pays directly to tenant bank
- Webhook endpoints must verify provider signature before any DB write
- `after()` fires only after response is sent — never blocks checkout response
- Payment config (API keys) stored encrypted in `tenant.paymentConfig` JSONB

---

### Task 1: Payment Provider Abstraction

**Files:**
- Create: `lib/payments/types.ts`
- Create: `lib/payments/upi-manual.ts`
- Create: `lib/payments/instamojo.ts`
- Create: `lib/payments/factory.ts`
- Create: `lib/payments/factory.test.ts`

**Interfaces:**
- Produces: `PaymentProvider` interface
- Produces: `getPaymentProvider(tenant)` factory function
- Consumes: `tenant.paymentProvider` + `tenant.paymentConfig`

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
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm test -- --run lib/payments/factory.test.ts
```

Expected: FAIL — `Cannot find module './factory'`

- [ ] **Step 3: Create types**

Create `lib/payments/types.ts`:
```typescript
export type CheckoutData = {
  paymentUrl?: string        // UPI: UPI deep link / Instamojo: redirect URL
  qrCode?: string            // UPI: QR code image URL
  razorpayOrderId?: string   // Razorpay only
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
    const amountInRupees = amount // already in rupees
    const upiUrl = `upi://pay?pa=${this.config.upiId}&pn=${encodeURIComponent(this.config.displayName)}&am=${amountInRupees}&tn=${orderId}&cu=INR`
    return {
      checkoutData: {
        paymentUrl: upiUrl,
      },
    }
  }

  async verifyWebhook(_payload: unknown, _headers: Headers): Promise<WebhookVerifyResult> {
    // UPI Manual: owner manually confirms payment in admin panel
    // No webhook — verification is manual
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
        redirect_url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/api/payment/callback`,
        allow_repeated_payments: 'false',
      }),
    })

    if (!res.ok) {
      throw new Error(`Instamojo createOrder failed: ${res.status}`)
    }

    const data = await res.json()
    return {
      checkoutData: {
        paymentUrl: data.payment_request.longurl,
      },
    }
  }

  async verifyWebhook(payload: unknown, headers: Headers): Promise<WebhookVerifyResult> {
    const body = payload as Record<string, string>
    const mac = body.mac
    if (!mac) return { valid: false }

    const fields = ['amount', 'buyer', 'fees', 'longurl', 'mac', 'payment_id', 'payment_request_id', 'purpose', 'shorturl', 'status']
    const message = fields
      .filter((f) => f !== 'mac' && body[f] !== undefined)
      .map((f) => body[f])
      .join('|')

    const expectedMac = crypto
      .createHmac('sha1', this.config.authToken)
      .update(message)
      .digest('hex')

    return {
      valid: mac === expectedMac,
      paymentId: body.payment_id,
      orderId: body.purpose?.replace('Order ', ''),
    }
  }
}
```

- [ ] **Step 6: Create factory**

Create `lib/payments/factory.ts`:
```typescript
import { UpiManualProvider } from './upi-manual'
import { InstamojoProvider } from './instamojo'
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
      return new InstamojoProvider({
        apiKey: config.apiKey,
        authToken: config.authToken,
      })
    default:
      throw new Error(`Unsupported payment provider: ${tenant.paymentProvider}`)
  }
}
```

- [ ] **Step 7: Run test — verify it passes**

```bash
npm test -- --run lib/payments/factory.test.ts
```

Expected: PASS — 3 tests pass

- [ ] **Step 8: Commit**

```bash
git add lib/payments/
git commit -m "feat: add PaymentProvider abstraction with UPI Manual and Instamojo implementations"
```

---

### Task 2: Cart Page

**Files:**
- Create: `app/store/cart/page.tsx`
- Create: `components/store/cart-item-row.tsx`

**Interfaces:**
- Consumes: `useCartStore` from `lib/store/cart`
- Produces: `/cart` page with item list, quantity controls, total, checkout CTA

- [ ] **Step 1: Create cart item row component**

Create `components/store/cart-item-row.tsx`:
```typescript
'use client'

import Image from 'next/image'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCartStore, type CartItem } from '@/lib/store/cart'

export function CartItemRow({ item }: { item: CartItem }) {
  const { updateQuantity, removeItem } = useCartStore()

  return (
    <div className="flex gap-3 py-4 border-b last:border-b-0">
      {item.image ? (
        <div className="relative w-20 h-24 shrink-0 rounded-md overflow-hidden bg-muted">
          <Image
            src={`${item.image}?f_auto,q_auto,w_160`}
            alt={item.name}
            fill
            className="object-cover"
          />
        </div>
      ) : (
        <div className="w-20 h-24 shrink-0 rounded-md bg-muted" />
      )}
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm font-medium line-clamp-2">{item.name}</p>
        {item.size && <p className="text-xs text-muted-foreground">Size: {item.size}</p>}
        <p className="text-sm font-semibold">₹{(item.price * item.quantity).toLocaleString('en-IN')}</p>
        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1)}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="text-sm w-6 text-center">{item.quantity}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1)}
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 ml-auto text-muted-foreground"
            onClick={() => removeItem(item.productId, item.size)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create cart page**

Create `app/store/cart/page.tsx`:
```typescript
'use client'

import Link from 'next/link'
import { useCartStore } from '@/lib/store/cart'
import { CartItemRow } from '@/components/store/cart-item-row'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ShoppingBag } from 'lucide-react'

export default function CartPage() {
  const { items, total, count } = useCartStore()
  const itemCount = count()
  const cartTotal = total()

  if (itemCount === 0) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <ShoppingBag className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">Your cart is empty</p>
        <Button asChild>
          <Link href="/shop">Continue Shopping</Link>
        </Button>
      </main>
    )
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-semibold mb-4">Cart ({itemCount})</h1>

      <div>
        {items.map((item) => (
          <CartItemRow key={`${item.productId}-${item.size}`} item={item} />
        ))}
      </div>

      <Separator className="my-4" />

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>₹{cartTotal.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Shipping</span>
          <span className="text-green-600">Free</span>
        </div>
        <Separator />
        <div className="flex justify-between font-semibold text-base">
          <span>Total</span>
          <span>₹{cartTotal.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <Button className="w-full mt-6" size="lg" asChild>
        <Link href="/checkout">Proceed to Checkout</Link>
      </Button>
    </main>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/store/cart/ components/store/cart-item-row.tsx
git commit -m "feat: add cart page with quantity controls and order summary"
```

---

### Task 3: Checkout Page & Order Creation

**Files:**
- Create: `app/store/checkout/page.tsx`
- Create: `app/store/checkout/actions.ts`
- Create: `components/store/address-form.tsx`
- Create: `lib/data/orders.ts`
- Create: `lib/data/orders.test.ts`

**Interfaces:**
- Consumes: `getPaymentProvider(tenant)`, `withTenant`, `useCartStore`
- Produces: Server Action `createOrder(cartItems, address)` → `{ orderId, checkoutData }`
- Produces: `getOrder(tenantId, orderId)` → `Order & { items: OrderItem[] }`

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
          paymentStatus: 'pending',
          shippingAddress: {},
          createdAt: new Date(),
        }),
        findFirst: vi.fn().mockResolvedValue({
          id: 'order-1',
          items: [{ id: 'item-1', productName: 'Silk Saree', quantity: 1, unitPrice: 4500 }],
        }),
      },
    }
    return fn(mockClient)
  }),
}))

import { createOrder, getOrder } from './orders'

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
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm test -- --run lib/data/orders.test.ts
```

Expected: FAIL

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

export async function createOrder(
  tenantId: string,
  input: CreateOrderInput
): Promise<Order> {
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

Expected: PASS

- [ ] **Step 5: Create address form component**

Create `components/store/address-form.tsx`:
```typescript
'use client'

import { useForm } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export type AddressData = {
  name: string
  phone: string
  line1: string
  line2?: string
  city: string
  state: string
  pin: string
}

type Props = {
  onSubmit: (data: AddressData) => void
  loading?: boolean
}

export function AddressForm({ onSubmit, loading }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<AddressData>()

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1 col-span-2">
          <Label htmlFor="name">Full Name</Label>
          <Input id="name" {...register('name', { required: 'Required' })} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1 col-span-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" inputMode="tel" {...register('phone', { required: 'Required', pattern: { value: /^[6-9]\d{9}$/, message: 'Enter valid 10-digit number' } })} />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
        </div>
        <div className="space-y-1 col-span-2">
          <Label htmlFor="line1">Address Line 1</Label>
          <Input id="line1" {...register('line1', { required: 'Required' })} />
          {errors.line1 && <p className="text-xs text-destructive">{errors.line1.message}</p>}
        </div>
        <div className="space-y-1 col-span-2">
          <Label htmlFor="line2">Address Line 2 (optional)</Label>
          <Input id="line2" {...register('line2')} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="city">City</Label>
          <Input id="city" {...register('city', { required: 'Required' })} />
          {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="pin">PIN Code</Label>
          <Input id="pin" inputMode="numeric" maxLength={6} {...register('pin', { required: 'Required', pattern: { value: /^\d{6}$/, message: '6 digits required' } })} />
          {errors.pin && <p className="text-xs text-destructive">{errors.pin.message}</p>}
        </div>
        <div className="space-y-1 col-span-2">
          <Label htmlFor="state">State</Label>
          <Input id="state" {...register('state', { required: 'Required' })} />
          {errors.state && <p className="text-xs text-destructive">{errors.state.message}</p>}
        </div>
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading ? 'Processing…' : 'Place Order'}
      </Button>
    </form>
  )
}
```

Install react-hook-form:
```bash
npm install react-hook-form
```

- [ ] **Step 6: Create checkout server action**

Create `app/store/checkout/actions.ts`:
```typescript
'use server'

import { headers } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { withTenant } from '@/lib/prisma'
import { createOrder } from '@/lib/data/orders'
import { getPaymentProvider } from '@/lib/payments/factory'
import type { AddressData } from '@/components/store/address-form'
import type { CartItem } from '@/lib/store/cart'
import { after } from 'next/server'

export async function initiateCheckout(
  cartItems: CartItem[],
  address: AddressData
): Promise<{ orderId: string; checkoutData: Record<string, string> }> {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  if (!tenantId) throw new Error('No tenant context')

  // Auth check
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get tenant payment config
  const tenant = await withTenant(tenantId, (db) =>
    db.tenant.findUnique({
      where: { id: tenantId },
      select: { paymentProvider: true, paymentConfig: true, tier: true, trialEndsAt: true },
    })
  )
  if (!tenant) throw new Error('Tenant not found')

  // Check trial expiry
  if (tenant.tier === 'trial' && tenant.trialEndsAt && tenant.trialEndsAt < new Date()) {
    throw new Error('Store is on expired trial — checkout is disabled')
  }

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  // Create order in DB
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

  // Get checkout data from payment provider
  const provider = getPaymentProvider({
    paymentProvider: tenant.paymentProvider,
    paymentConfig: tenant.paymentConfig as Record<string, string> | null,
  })
  const { checkoutData } = await provider.createOrder(total, order.id)

  // Non-blocking: log event (Resend + PostHog wired in Phase 7)
  after(async () => {
    console.log(`[after] Order ${order.id} created for tenant ${tenantId}`)
  })

  return { orderId: order.id, checkoutData: checkoutData as Record<string, string> }
}
```

- [ ] **Step 7: Create checkout page**

Create `app/store/checkout/page.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/store/cart'
import { AddressForm, type AddressData } from '@/components/store/address-form'
import { initiateCheckout } from './actions'
import { Separator } from '@/components/ui/separator'

export const dynamic = 'force-dynamic'

export default function CheckoutPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { items, total, clear } = useCartStore()
  const router = useRouter()

  async function handleSubmit(address: AddressData) {
    setLoading(true)
    setError('')
    try {
      const { orderId, checkoutData } = await initiateCheckout(items, address)

      // UPI Manual: show UPI deep link / QR
      if (checkoutData.paymentUrl?.startsWith('upi://')) {
        clear()
        router.push(`/orders/${orderId}?upi=${encodeURIComponent(checkoutData.paymentUrl)}`)
        return
      }

      // Instamojo / others: redirect to payment page
      if (checkoutData.paymentUrl) {
        clear()
        window.location.href = checkoutData.paymentUrl
        return
      }

      router.push(`/orders/${orderId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-semibold mb-6">Checkout</h1>

      {/* Order summary */}
      <div className="rounded-lg border p-4 mb-6 space-y-2">
        <p className="text-sm font-medium">{items.length} item{items.length !== 1 ? 's' : ''}</p>
        {items.map((item) => (
          <div key={`${item.productId}-${item.size}`} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{item.name}{item.size ? ` (${item.size})` : ''} × {item.quantity}</span>
            <span>₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
          </div>
        ))}
        <Separator />
        <div className="flex justify-between text-sm font-semibold">
          <span>Total</span>
          <span>₹{total().toLocaleString('en-IN')}</span>
        </div>
      </div>

      <h2 className="text-base font-medium mb-4">Delivery Address</h2>
      {error && <p className="text-sm text-destructive mb-4">{error}</p>}
      <AddressForm onSubmit={handleSubmit} loading={loading} />
    </main>
  )
}
```

- [ ] **Step 8: Commit**

```bash
git add app/store/checkout/ components/store/address-form.tsx lib/data/orders.ts lib/data/orders.test.ts
git commit -m "feat: add checkout page with address form, order creation, and payment provider dispatch"
```

---

### Task 4: Payment Webhooks

**Files:**
- Create: `app/api/webhooks/instamojo/route.ts`

**Interfaces:**
- Produces: `POST /api/webhooks/instamojo` — verifies signature, marks order paid, fires after()

- [ ] **Step 1: Create Instamojo webhook handler**

Create `app/api/webhooks/instamojo/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { InstamojoProvider } from '@/lib/payments/instamojo'
import { updateOrderPayment, getOrder } from '@/lib/data/orders'
import { withTenant } from '@/lib/prisma'
import { after } from 'next/server'

export async function POST(request: NextRequest) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  if (!tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 400 })

  const formData = await request.formData()
  const body = Object.fromEntries(formData.entries()) as Record<string, string>

  // Get tenant Instamojo config
  const tenant = await withTenant(tenantId, (db) =>
    db.tenant.findUnique({
      where: { id: tenantId },
      select: { paymentConfig: true },
    })
  )
  if (!tenant?.paymentConfig) return NextResponse.json({ error: 'No config' }, { status: 400 })

  const config = tenant.paymentConfig as Record<string, string>
  const provider = new InstamojoProvider({ apiKey: config.apiKey, authToken: config.authToken })

  const { valid, orderId, paymentId } = await provider.verifyWebhook(body, request.headers)
  if (!valid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })

  if (!orderId || !paymentId) return NextResponse.json({ error: 'Missing data' }, { status: 400 })

  const isPaid = body.status === 'Credit'
  if (!isPaid) return NextResponse.json({ ok: true })

  await updateOrderPayment(tenantId, orderId, {
    paymentId,
    paymentStatus: 'paid',
    status: 'confirmed',
  })

  after(async () => {
    // Phase 7: send confirmation email + PostHog event here
    console.log(`[after] Order ${orderId} paid via Instamojo`)
  })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/webhooks/
git commit -m "feat: add Instamojo payment webhook with signature verification"
```

---

## Phase 3 Verification

```bash
npm test -- --run
```
Expected: All tests pass including factory.test and orders.test

```bash
npm run build
```
Expected: No TypeScript errors

Manual smoke test (Vercel preview with test Instamojo account):
- [ ] Cart page shows items from localStorage, quantity controls work
- [ ] Empty cart shows "Your cart is empty" with Continue Shopping
- [ ] Checkout: fill address form → UPI tenant → redirects to order page with UPI link
- [ ] Checkout: fill address form → Instamojo tenant → redirects to Instamojo payment page
- [ ] Order created in Supabase DB with status `pending`
- [ ] Simulated Instamojo webhook → order updates to `confirmed`, paymentStatus `paid`
