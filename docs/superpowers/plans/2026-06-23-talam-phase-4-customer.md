# Phase 4: Customer Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build order history, single order detail/tracking, customer account page, and wishlist — all auth-protected and scoped to the current tenant.

**Architecture:** All pages are SSR-dynamic. Auth is verified via Supabase session on every request (middleware already refreshes tokens). Customer profile and wishlist mutations use Server Actions. Order data is read-only from the customer side (status updates come from tenant admin in Phase 5).

**Tech Stack:** Next.js 15 App Router (SSR), Server Actions, Prisma `withTenant`, `@supabase/ssr` session, Zustand wishlist store, shadcn/ui

## Global Constraints

- Inherit all prior phase constraints
- All pages in this phase: `export const dynamic = 'force-dynamic'`
- Every Server Action verifies Supabase session before DB access
- Wishlist requires Pro/Starter tier (trial: hide button with upgrade prompt)
- Redirect unauthenticated users to `/auth?next={current_path}`

---

### Task 1: Auth Guard Utility

**Files:**
- Create: `lib/auth-guard.ts`
- Create: `lib/auth-guard.test.ts`

**Interfaces:**
- Produces: `requireAuth()` → `User` or redirects to `/auth`
- Produces: `requireTenant()` → `{ tenantId, subdomain, tier }` or throws

- [ ] **Step 1: Write failing test**

Create `lib/auth-guard.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null,
      }),
    },
  })),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: vi.fn((key: string) => {
      const map: Record<string, string> = { 'x-tenant-id': 'tenant-1', 'x-subdomain': 'silk', 'x-tenant-tier': 'starter' }
      return map[key] ?? null
    }),
  })),
}))

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

import { requireTenant } from './auth-guard'

describe('requireTenant', () => {
  it('returns tenantId, subdomain, and tier from headers', async () => {
    const result = await requireTenant()
    expect(result.tenantId).toBe('tenant-1')
    expect(result.subdomain).toBe('silk')
    expect(result.tier).toBe('starter')
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm test -- --run lib/auth-guard.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement auth guard**

Create `lib/auth-guard.ts`:
```typescript
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export async function requireAuth(redirectTo?: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const path = redirectTo ?? '/auth'
    redirect(path)
  }

  return user
}

export async function requireTenant() {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  const subdomain = headersList.get('x-subdomain') ?? ''
  const tier = headersList.get('x-tenant-tier') ?? 'trial'

  if (!tenantId) redirect('/not-found')

  return { tenantId, subdomain, tier }
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npm test -- --run lib/auth-guard.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/auth-guard.ts lib/auth-guard.test.ts
git commit -m "feat: add requireAuth and requireTenant server-side guard utilities"
```

---

### Task 2: Orders List & Detail Pages

**Files:**
- Create: `app/store/orders/page.tsx`
- Create: `app/store/orders/[id]/page.tsx`
- Create: `lib/data/customer-orders.ts`

**Interfaces:**
- Consumes: `requireAuth()`, `requireTenant()`, `withTenant`
- Produces: `/orders` — list of customer's orders with status badges
- Produces: `/orders/[id]` — single order with items, status timeline, tracking

- [ ] **Step 1: Create customer orders data function**

Create `lib/data/customer-orders.ts`:
```typescript
import { withTenant } from '@/lib/prisma'

export async function getCustomerOrders(tenantId: string, customerId: string) {
  return withTenant(tenantId, (db) =>
    db.order.findMany({
      where: { tenantId, customerId },
      include: {
        items: {
          select: { productName: true, size: true, quantity: true, unitPrice: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  )
}

export async function getCustomerOrder(tenantId: string, customerId: string, orderId: string) {
  return withTenant(tenantId, (db) =>
    db.order.findFirst({
      where: { id: orderId, tenantId, customerId },
      include: { items: true },
    })
  )
}
```

- [ ] **Step 2: Create orders list page**

Create `app/store/orders/page.tsx`:
```typescript
import { requireAuth, requireTenant } from '@/lib/auth-guard'
import { getCustomerOrders } from '@/lib/data/customer-orders'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Package } from 'lucide-react'

export const dynamic = 'force-dynamic'

const STATUS_COLORS: Record<string, string> = {
  pending: 'secondary',
  confirmed: 'default',
  shipped: 'default',
  delivered: 'outline',
  cancelled: 'destructive',
  returned: 'destructive',
}

export default async function OrdersPage() {
  const user = await requireAuth('/auth?next=/orders')
  const { tenantId } = await requireTenant()

  const orders = await getCustomerOrders(tenantId, user.id)

  if (orders.length === 0) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <Package className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">No orders yet</p>
        <Link href="/shop" className="text-sm text-primary underline">Start shopping</Link>
      </main>
    )
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-semibold mb-6">My Orders</h1>
      <div className="space-y-3">
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/orders/${order.id}`}
            className="block rounded-lg border p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">Order #{order.id.slice(-8).toUpperCase()}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <p className="text-xs text-muted-foreground">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-sm font-semibold">₹{Number(order.total).toLocaleString('en-IN')}</p>
                <Badge variant={STATUS_COLORS[order.status] as never}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </Badge>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Create order detail page**

Create `app/store/orders/[id]/page.tsx`:
```typescript
import { requireAuth, requireTenant } from '@/lib/auth-guard'
import { getCustomerOrder } from '@/lib/data/customer-orders'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Package, Truck, CheckCircle2, XCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

const STATUS_STEPS = ['confirmed', 'shipped', 'delivered']

type Props = { params: Promise<{ id: string }> }

export default async function OrderDetailPage({ params }: Props) {
  const user = await requireAuth()
  const { tenantId } = await requireTenant()
  const { id } = await params

  const order = await getCustomerOrder(tenantId, user.id, id)
  if (!order) notFound()

  const currentStep = STATUS_STEPS.indexOf(order.status)

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Order #{id.slice(-8).toUpperCase()}</h1>
        <p className="text-sm text-muted-foreground">
          Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Status timeline */}
      {order.status !== 'cancelled' && order.status !== 'returned' && (
        <div className="flex items-center gap-2">
          {STATUS_STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-2 flex-1 last:flex-none">
              <div className={`flex flex-col items-center gap-1 ${i <= currentStep ? 'text-primary' : 'text-muted-foreground'}`}>
                {step === 'confirmed' && <Package className="h-5 w-5" />}
                {step === 'shipped' && <Truck className="h-5 w-5" />}
                {step === 'delivered' && <CheckCircle2 className="h-5 w-5" />}
                <span className="text-xs capitalize">{step}</span>
              </div>
              {i < STATUS_STEPS.length - 1 && (
                <div className={`h-px flex-1 ${i < currentStep ? 'bg-primary' : 'bg-border'}`} />
              )}
            </div>
          ))}
        </div>
      )}

      {(order.status === 'cancelled' || order.status === 'returned') && (
        <div className="flex items-center gap-2 text-destructive">
          <XCircle className="h-5 w-5" />
          <span className="text-sm font-medium capitalize">{order.status}</span>
        </div>
      )}

      {order.trackingId && (
        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs text-muted-foreground">Tracking ID</p>
          <p className="text-sm font-mono font-medium">{order.trackingId}</p>
        </div>
      )}

      {/* Items */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Items</p>
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {item.productName}{item.size ? ` (${item.size})` : ''} × {item.quantity}
            </span>
            <span>₹{(Number(item.unitPrice) * item.quantity).toLocaleString('en-IN')}</span>
          </div>
        ))}
        <Separator />
        <div className="flex justify-between text-sm font-semibold">
          <span>Total</span>
          <span>₹{Number(order.total).toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Shipping address */}
      <div className="space-y-1">
        <p className="text-sm font-medium">Delivery Address</p>
        {(() => {
          const addr = order.shippingAddress as Record<string, string>
          return (
            <p className="text-sm text-muted-foreground">
              {addr.name}<br />
              {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}<br />
              {addr.city}, {addr.state} — {addr.pin}
            </p>
          )
        })()}
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/store/orders/ lib/data/customer-orders.ts
git commit -m "feat: add orders list and order detail pages with status timeline"
```

---

### Task 3: Account Page

**Files:**
- Create: `app/store/account/page.tsx`
- Create: `app/store/account/actions.ts`

**Interfaces:**
- Consumes: `requireAuth()`, `requireTenant()`, Supabase `auth.getUser()`
- Produces: `/account` — customer profile with name/email display and sign out

- [ ] **Step 1: Create account server action**

Create `app/store/account/actions.ts`:
```typescript
'use server'

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signOut() {
  const supabase = await createServerClient()
  await supabase.auth.signOut()
  redirect('/auth')
}
```

- [ ] **Step 2: Create account page**

Create `app/store/account/page.tsx`:
```typescript
import { requireAuth, requireTenant } from '@/lib/auth-guard'
import { signOut } from './actions'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import { Package, LogOut } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const user = await requireAuth('/auth?next=/account')
  await requireTenant()

  const displayName = user.user_metadata?.full_name ?? user.email ?? user.phone ?? 'Customer'
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-lg">
          {initials}
        </div>
        <div>
          <p className="font-medium">{displayName}</p>
          {user.email && <p className="text-sm text-muted-foreground">{user.email}</p>}
          {user.phone && <p className="text-sm text-muted-foreground">{user.phone}</p>}
        </div>
      </div>

      <Separator />

      <nav className="space-y-1">
        <Link
          href="/orders"
          className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted transition-colors"
        >
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">My Orders</span>
        </Link>
      </nav>

      <Separator />

      <form action={signOut}>
        <Button type="submit" variant="outline" className="w-full gap-2">
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </form>
    </main>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/store/account/
git commit -m "feat: add account page with profile display and sign-out"
```

---

### Task 4: Wishlist

**Files:**
- Create: `app/store/wishlist/page.tsx`
- Create: `app/store/wishlist/actions.ts`
- Create: `lib/data/wishlist.ts`
- Create: `lib/data/wishlist.test.ts`
- Create: `components/store/wishlist-button.tsx`

**Interfaces:**
- Produces: `toggleWishlist(productId)` Server Action
- Produces: `getWishlist(tenantId, customerId)` → `Product[]`
- Produces: `/wishlist` page with product grid
- Produces: `<WishlistButton>` client component on product detail page

- [ ] **Step 1: Write failing test**

Create `lib/data/wishlist.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  withTenant: vi.fn(async (_id: string, fn: (client: unknown) => Promise<unknown>) => {
    const mockClient = {
      wishlist: {
        findMany: vi.fn().mockResolvedValue([
          { product: { id: 'p1', name: 'Silk Saree', slug: 'silk-saree', price: '4500', images: [] } },
        ]),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'w1' }),
        delete: vi.fn().mockResolvedValue({ id: 'w1' }),
      },
    }
    return fn(mockClient)
  }),
}))

import { getWishlist, isInWishlist } from './wishlist'

describe('getWishlist', () => {
  it('returns products for a customer', async () => {
    const items = await getWishlist('tenant-1', 'customer-1')
    expect(items).toHaveLength(1)
    expect(items[0].name).toBe('Silk Saree')
  })
})

describe('isInWishlist', () => {
  it('returns false when product not in wishlist', async () => {
    const result = await isInWishlist('tenant-1', 'customer-1', 'p1')
    expect(result).toBe(false)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm test -- --run lib/data/wishlist.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement wishlist data layer**

Create `lib/data/wishlist.ts`:
```typescript
import { withTenant } from '@/lib/prisma'
import type { Product } from '@prisma/client'

export async function getWishlist(tenantId: string, customerId: string): Promise<Product[]> {
  const items = await withTenant(tenantId, (db) =>
    db.wishlist.findMany({
      where: { tenantId, customerId },
      include: { product: true },
    })
  )
  return items.map((item: { product: Product }) => item.product)
}

export async function isInWishlist(tenantId: string, customerId: string, productId: string): Promise<boolean> {
  const item = await withTenant(tenantId, (db) =>
    db.wishlist.findFirst({
      where: { tenantId, customerId, productId },
    })
  )
  return item !== null
}

export async function addToWishlist(tenantId: string, customerId: string, productId: string) {
  return withTenant(tenantId, (db) =>
    db.wishlist.create({
      data: { tenantId, customerId, productId },
    })
  )
}

export async function removeFromWishlist(tenantId: string, customerId: string, productId: string) {
  return withTenant(tenantId, (db) =>
    db.wishlist.deleteMany({
      where: { tenantId, customerId, productId },
    })
  )
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npm test -- --run lib/data/wishlist.test.ts
```

Expected: PASS

- [ ] **Step 5: Create wishlist server action**

Create `app/store/wishlist/actions.ts`:
```typescript
'use server'

import { requireAuth, requireTenant } from '@/lib/auth-guard'
import { addToWishlist, removeFromWishlist, isInWishlist } from '@/lib/data/wishlist'
import { revalidatePath } from 'next/cache'

export async function toggleWishlist(productId: string) {
  const user = await requireAuth()
  const { tenantId, tier } = await requireTenant()

  if (tier === 'trial') {
    throw new Error('Wishlist requires a paid plan')
  }

  const alreadyIn = await isInWishlist(tenantId, user.id, productId)

  if (alreadyIn) {
    await removeFromWishlist(tenantId, user.id, productId)
  } else {
    await addToWishlist(tenantId, user.id, productId)
  }

  revalidatePath('/wishlist')
  return { wishlisted: !alreadyIn }
}
```

- [ ] **Step 6: Create wishlist button component**

Create `components/store/wishlist-button.tsx`:
```typescript
'use client'

import { useState, useTransition } from 'react'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toggleWishlist } from '@/app/store/wishlist/actions'
import { cn } from '@/lib/utils'

type Props = {
  productId: string
  initialWishlisted: boolean
  tier: string
}

export function WishlistButton({ productId, initialWishlisted, tier }: Props) {
  const [wishlisted, setWishlisted] = useState(initialWishlisted)
  const [isPending, startTransition] = useTransition()

  if (tier === 'trial') return null

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleWishlist(productId)
      setWishlisted(result.wishlisted)
    })
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="absolute top-3 right-3"
      onClick={handleToggle}
      disabled={isPending}
      aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <Heart className={cn('h-4 w-4', wishlisted && 'fill-red-500 text-red-500')} />
    </Button>
  )
}
```

- [ ] **Step 7: Create wishlist page**

Create `app/store/wishlist/page.tsx`:
```typescript
import { requireAuth, requireTenant } from '@/lib/auth-guard'
import { getWishlist } from '@/lib/data/wishlist'
import { ProductGrid } from '@/components/store/product-grid'
import { Heart } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function WishlistPage() {
  const user = await requireAuth('/auth?next=/wishlist')
  const { tenantId, subdomain, tier } = await requireTenant()

  if (tier === 'trial') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 px-4 text-center">
        <Heart className="h-10 w-10 text-muted-foreground" />
        <p className="font-medium">Wishlist is a paid feature</p>
        <p className="text-sm text-muted-foreground">Upgrade to Starter or Pro to use wishlists.</p>
      </main>
    )
  }

  const products = await getWishlist(tenantId, user.id)

  if (products.length === 0) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 px-4">
        <Heart className="h-10 w-10 text-muted-foreground" />
        <p className="font-medium">Your wishlist is empty</p>
        <Link href="/shop" className="text-sm text-primary underline">Browse products</Link>
      </main>
    )
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-xl font-semibold mb-6">Wishlist ({products.length})</h1>
      <ProductGrid products={products} subdomain={subdomain} />
    </main>
  )
}
```

- [ ] **Step 8: Commit**

```bash
git add app/store/wishlist/ lib/data/wishlist.ts lib/data/wishlist.test.ts components/store/wishlist-button.tsx
git commit -m "feat: add wishlist with toggle action, tier guard, and wishlist page"
```

---

## Phase 4 Verification

```bash
npm test -- --run
```
Expected: All tests pass

```bash
npm run build
```
Expected: No TypeScript errors

Manual smoke test:
- [ ] Unauthenticated visit to `/orders` → redirected to `/auth?next=/orders`
- [ ] After login → `/orders` shows order history
- [ ] Click order → detail page with status timeline and items
- [ ] `/account` shows user name/email and sign-out button
- [ ] Sign out → redirected to `/auth`, session cleared
- [ ] Trial store: wishlist button hidden on product cards
- [ ] Starter store: wishlist button visible, toggles heart fill on click
- [ ] `/wishlist` shows saved products for authenticated user
