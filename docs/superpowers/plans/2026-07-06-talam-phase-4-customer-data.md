# Phase 4: Customer Features Implementation Plan — Data Track

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Track order:** This is a **Data-track** plan. Do not start it until every phase's UI-track plan (Phases 1–8) is complete. This file specifically depends on `2026-07-06-talam-phase-4-customer-ui.md` having been executed first (it builds `app/store/orders/page.tsx`, `app/store/orders/[id]/page.tsx`, `app/store/account/page.tsx`, and `app/store/wishlist/page.tsx` as mock-wired, guard-free pages, which Tasks 2–5 below wire to real Prisma data and protect with `requireAuth`).

**Goal:** Build the `requireAuth`/`requireTenant` server-side guard utilities, the Prisma data layers for customer orders, account summary, and wishlist (all TDD), and swap the UI-track's mock fixtures for real data — adding the auth guard and `/auth?next={path}` redirect to each page the UI track built.

**Architecture:** Auth is verified via Supabase session (`lib/supabase/server.ts`, cookie-based, already wired through `middleware.ts` → `updateSession`). Tenant scoping uses the `x-tenant-id` / `x-tenant-tier` headers middleware already sets, read via `next/headers`. Every data task follows the TDD cycle (failing test → implement → pass) then a wiring step that replaces the page's `MOCK_*` fixture with the real query and prepends `requireAuth`/`requireTenant` — the JSX built by the UI track is reused unchanged, only the data source and the guard change.

**Tech Stack:** Prisma `withTenant` (`lib/prisma.ts`), `@supabase/ssr` session (`lib/supabase/server.ts`), Vitest for TDD, Next.js App Router (SSR).

## Global Constraints

- Inherit all prior phase constraints (multi-tenant via `x-tenant-id` header set by `middleware.ts`; `withTenant(tenantId, fn)` wraps every Prisma call to set `app.tenant_id` for RLS).
- All pages in this phase: `export const dynamic = 'force-dynamic'` (already set by the UI track; do not remove it while wiring).
- Every data-fetching function takes `tenantId` as an explicit first argument (matches `lib/data/products.ts` convention) — never infer tenant from global state.
- Redirect unauthenticated users to `/auth?next={current_path}` (matches existing `/store/auth` page, not a new login screen). The UI track deliberately shipped these pages guard-free (mocked logged-in state) so they could be screenshot-verified without auth — this file's wiring steps are where the guard lands.
- Do not change the JSX structure, Tailwind classes, or copy the UI track shipped — each wiring step swaps the data source (`MOCK_*` fixture → real query result mapped into the same shapes) and prepends the guard, nothing visual. Paper re-verification is not required in this track; all Paper lookups were done in the UI track.
- Design ground truth reference (for context only, no lookups here): live Paper file "Talam Design" (team `Surya's Team`, file id `01KVZYTDJNREHBACTQMT2D9HR9`), page "Store Front" (`1-0`), artboards Orders List (`9YD-0`/`AWZ-0`), Order Detail (`9YE-0`/`AX0-0`), Account (`AB2-0`/`AX1-0`), Wishlist (`AB3-0`/`AX3-0`).
- Restart (not reload) the dev server after any Prisma/data-layer change, per this project's Preview Tool Glitches convention.

---

## Known Gaps (flagged, not silently invented)

- **`/orders/[id]` route ownership**: Phase 3's plan (`docs/superpowers/plans/2026-07-06-talam-phase-3-commerce.md`) redirects to `/orders/{id}` after checkout and explicitly defers building that page to "whichever phase owns `app/store/orders/[id]`". This plan's Task 3 wires that exact route with a data shape (`order.status`, `order.total`, `order.items[]`, `order.trackingId`, `order.shippingAddress`) compatible with what Phase 3's order-creation Server Action produces from the `Order`/`OrderItem` Prisma models — no conflict.
- **Order Confirmed page** (Paper artboard `9V2-0`, "Order Confirmed — Mobile") is explicitly Phase 3's scope per its own Known Gaps section, not this phase's. This plan does NOT build it.
- **Reviews**: Account page links to "My Reviews" (Paper copy: "Rate your purchases") but no Reviews list/detail page exists yet and building one is out of scope for this phase — the link renders as a disabled/static row (no working destination) rather than a broken link, called out explicitly in the UI track's Task 4.
- **Coupon / discount code data**: N/A to this phase (Phase 3 concern).
- **Desktop Account page uses a different layout than mobile** (sidebar + tabs, Paper artboard `AX1-0`) vs. mobile's stacked list (`AB2-0`). The UI track built both responsively in one page component using Tailwind breakpoints, matching Paper's structure at each breakpoint — not a shared DOM tree stretched across sizes.
- **Notifications and Language rows** on the Account page (mobile) have no backing schema field for toggling — the mock/real split treats "Order Notifications" and "WhatsApp Updates" toggles as inert display-only controls wired to nothing (no `Customer.notifyOrderUpdates` field exists in `prisma/schema.prisma`); flagged rather than inventing a schema migration out of scope for this phase.

---

### Task 1: Auth Guard Utility (Data)

**Files:**
- Create: `lib/auth-guard.ts`
- Create: `lib/auth-guard.test.ts`

**Interfaces:**
- Produces: `requireAuth(nextPath?: string)` → `Promise<User>` (Supabase `User` type) or calls `redirect('/auth?next=...')` and never returns
- Produces: `requireTenant()` → `Promise<{ tenantId: string; subdomain: string; tier: string }>` or calls `redirect('/not-found')`

Not a UI task — no Paper step required.

- [ ] **Step 1: Write failing test for `requireTenant`**

Create `lib/auth-guard.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null,
      }),
    },
  })),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({
    get: (key: string) => {
      const map: Record<string, string> = {
        'x-tenant-id': 'tenant-1',
        'x-subdomain': 'silk',
        'x-tenant-tier': 'starter',
      }
      return map[key] ?? null
    },
  })),
}))

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

import { requireTenant, requireAuth } from './auth-guard'

describe('requireTenant', () => {
  it('returns tenantId, subdomain, and tier from headers', async () => {
    const result = await requireTenant()
    expect(result.tenantId).toBe('tenant-1')
    expect(result.subdomain).toBe('silk')
    expect(result.tier).toBe('starter')
  })
})

describe('requireAuth', () => {
  it('returns the Supabase user when a session exists', async () => {
    const user = await requireAuth()
    expect(user.id).toBe('user-1')
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

Run: `npm run test:run -- lib/auth-guard.test.ts`
Expected: FAIL with "Cannot find module './auth-guard'" (file doesn't exist yet)

- [ ] **Step 3: Implement the auth guard**

Create `lib/auth-guard.ts`:
```typescript
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export async function requireAuth(nextPath?: string) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const suffix = nextPath ? `?next=${encodeURIComponent(nextPath)}` : ''
    redirect(`/auth${suffix}`)
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

Run: `npm run test:run -- lib/auth-guard.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/auth-guard.ts lib/auth-guard.test.ts
git commit -m "feat: add requireAuth and requireTenant server-side guard utilities"
```

---

### Task 2: Orders List Page (Data)

**Files:**
- Create: `lib/data/customer-orders.ts`
- Create: `lib/data/customer-orders.test.ts`
- Modify: `app/store/orders/page.tsx` (built by the UI track — swap `MOCK_ORDERS` for real data, add guard)

**Interfaces:**
- Consumes: `requireAuth`, `requireTenant` from `lib/auth-guard.ts` (Task 1)
- Produces: `getCustomerOrders(tenantId: string, customerId: string): Promise<OrderListItem[]>` in `lib/data/customer-orders.ts`, where:
  ```typescript
  type OrderListItem = {
    id: string
    status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'returned'
    total: number
    createdAt: Date
    trackingId: string | null
    items: { productName: string; size: string | null; quantity: number }[]
  }
  ```

- [ ] **Step 1: Write failing test for `getCustomerOrders`**

Create `lib/data/customer-orders.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

const findManyMock = vi.fn().mockResolvedValue([
  {
    id: 'order-1',
    status: 'shipped',
    total: '1899.00',
    createdAt: new Date('2026-06-24T00:00:00Z'),
    trackingId: 'DTDC-9876543210',
    items: [{ productName: 'Pochampally Ikat Saree', size: null, quantity: 1 }],
  },
])

vi.mock('@/lib/prisma', () => ({
  withTenant: vi.fn(async (_tenantId: string, fn: (db: unknown) => unknown) =>
    fn({ order: { findMany: findManyMock } })
  ),
}))

import { getCustomerOrders } from './customer-orders'

describe('getCustomerOrders', () => {
  it('returns orders scoped to tenant and customer, newest first', async () => {
    const orders = await getCustomerOrders('tenant-1', 'customer-1')

    expect(orders).toHaveLength(1)
    expect(orders[0].id).toBe('order-1')
    expect(orders[0].total).toBe(1899)
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'tenant-1', customerId: 'customer-1' },
        orderBy: { createdAt: 'desc' },
      })
    )
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

Run: `npm run test:run -- lib/data/customer-orders.test.ts`
Expected: FAIL with "Cannot find module './customer-orders'"

- [ ] **Step 3: Implement the data function**

Create `lib/data/customer-orders.ts`:
```typescript
import { withTenant } from '@/lib/prisma'

export type OrderListItem = {
  id: string
  status: string
  total: number
  createdAt: Date
  trackingId: string | null
  items: { productName: string; size: string | null; quantity: number }[]
}

export async function getCustomerOrders(tenantId: string, customerId: string): Promise<OrderListItem[]> {
  const orders = await withTenant(tenantId, (db) =>
    db.order.findMany({
      where: { tenantId, customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { select: { productName: true, size: true, quantity: true } },
      },
    })
  )

  return orders.map((order: { id: string; status: string; total: unknown; createdAt: Date; trackingId: string | null; items: { productName: string; size: string | null; quantity: number }[] }) => ({
    id: order.id,
    status: order.status,
    total: Number(order.total),
    createdAt: order.createdAt,
    trackingId: order.trackingId,
    items: order.items,
  }))
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `npm run test:run -- lib/data/customer-orders.test.ts`
Expected: PASS

- [ ] **Step 5: Wire real data into the page and add the auth guard**

Modify `app/store/orders/page.tsx` (built by the UI track) — replace the default export with:
```tsx
import { requireAuth, requireTenant } from '@/lib/auth-guard'
import { getCustomerOrders } from '@/lib/data/customer-orders'
// ...keep MOCK_ORDERS type shapes / STATUS_STYLES / TABS as-is, remove MOCK_ORDERS array usage

export default async function OrdersPage() {
  const user = await requireAuth('/orders')
  const { tenantId } = await requireTenant()
  const orders = await getCustomerOrders(tenantId, user.id)

  // map `orders` (real OrderListItem[]) into the same card view the UI track built,
  // deriving `statusLabel`/style key from `order.status` via STATUS_STYLES,
  // `productSummary` from `items[0].productName + (items.length > 1 ? ' + N more' : '')`,
  // `price` from `₹${order.total.toLocaleString('en-IN')}`.
  // Empty state (orders.length === 0): render a centered "No orders yet" message with
  // a link to `/shop`, still inside the same page shell and MobileTabBar.

  return (
    // ...same JSX structure the UI track built, sourced from `orders` instead of MOCK_ORDERS
  )
}
```
Run the dev server again, confirm the page still renders (with real/seeded `silk` tenant data or an empty state if no orders exist for the logged-in test customer), and confirm unauthenticated access redirects to `/auth?next=%2Forders`.

- [ ] **Step 6: Commit the data wiring**

```bash
git add app/store/orders/page.tsx lib/data/customer-orders.ts lib/data/customer-orders.test.ts
git commit -m "feat: wire orders list page to real Prisma data with auth guard"
```

---

### Task 3: Order Detail Page (Data)

**Files:**
- Modify: `lib/data/customer-orders.ts` (add `getCustomerOrder`)
- Modify: `lib/data/customer-orders.test.ts` (add test for `getCustomerOrder`)
- Modify: `app/store/orders/[id]/page.tsx` (built by the UI track — swap `MOCK_ORDER` for real data, add guard + 404)

**Interfaces:**
- Consumes: `requireAuth`, `requireTenant`
- Produces: `getCustomerOrder(tenantId: string, customerId: string, orderId: string): Promise<OrderDetail | null>` where:
  ```typescript
  type OrderDetail = {
    id: string
    status: string
    total: number
    createdAt: Date
    trackingId: string | null
    shippingAddress: { name: string; line1: string; city: string; state: string; pincode: string; phone: string }
    items: { productName: string; size: string | null; quantity: number; unitPrice: number }[]
  }
  ```
- Produces: functional `/orders/[id]` page — satisfies Phase 3's checkout redirect target `app/store/orders/[id]`.

- [ ] **Step 1: Write failing test for `getCustomerOrder`**

Append to `lib/data/customer-orders.test.ts`:
```typescript
describe('getCustomerOrder', () => {
  it('returns a single order scoped to tenant, customer, and order id', async () => {
    const findFirstMock = vi.fn().mockResolvedValue({
      id: 'order-1',
      status: 'shipped',
      total: '1899.00',
      createdAt: new Date('2026-06-24T00:00:00Z'),
      trackingId: 'DTDC-9876543210',
      shippingAddress: { name: 'Priya Rajan', line1: '12, Green Park Colony', city: 'Chennai', state: 'Tamil Nadu', pincode: '600040', phone: '+91 98765 43210' },
      items: [{ productName: 'Pochampally Ikat Saree', size: null, quantity: 1, unitPrice: '1899.00' }],
    })

    const { withTenant } = await import('@/lib/prisma')
    vi.mocked(withTenant).mockImplementationOnce(async (_tenantId, fn) =>
      fn({ order: { findFirst: findFirstMock } } as never)
    )

    const { getCustomerOrder } = await import('./customer-orders')
    const order = await getCustomerOrder('tenant-1', 'customer-1', 'order-1')

    expect(order?.id).toBe('order-1')
    expect(order?.items[0].unitPrice).toBe(1899)
    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'order-1', tenantId: 'tenant-1', customerId: 'customer-1' } })
    )
  })

  it('returns null when the order does not exist for this customer', async () => {
    const findFirstMock = vi.fn().mockResolvedValue(null)
    const { withTenant } = await import('@/lib/prisma')
    vi.mocked(withTenant).mockImplementationOnce(async (_tenantId, fn) =>
      fn({ order: { findFirst: findFirstMock } } as never)
    )

    const { getCustomerOrder } = await import('./customer-orders')
    const order = await getCustomerOrder('tenant-1', 'customer-1', 'missing-order')

    expect(order).toBeNull()
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

Run: `npm run test:run -- lib/data/customer-orders.test.ts`
Expected: FAIL with "getCustomerOrder is not a function"

- [ ] **Step 3: Implement `getCustomerOrder`**

Append to `lib/data/customer-orders.ts`:
```typescript
export type OrderDetail = {
  id: string
  status: string
  total: number
  createdAt: Date
  trackingId: string | null
  shippingAddress: { name: string; line1: string; city: string; state: string; pincode: string; phone: string }
  items: { productName: string; size: string | null; quantity: number; unitPrice: number }[]
}

export async function getCustomerOrder(
  tenantId: string,
  customerId: string,
  orderId: string
): Promise<OrderDetail | null> {
  const order = await withTenant(tenantId, (db) =>
    db.order.findFirst({
      where: { id: orderId, tenantId, customerId },
      include: {
        items: { select: { productName: true, size: true, quantity: true, unitPrice: true } },
      },
    })
  )

  if (!order) return null

  return {
    id: order.id,
    status: order.status,
    total: Number(order.total),
    createdAt: order.createdAt,
    trackingId: order.trackingId,
    shippingAddress: order.shippingAddress as OrderDetail['shippingAddress'],
    items: order.items.map((item: { productName: string; size: string | null; quantity: number; unitPrice: unknown }) => ({
      productName: item.productName,
      size: item.size,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
    })),
  }
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `npm run test:run -- lib/data/customer-orders.test.ts`
Expected: PASS (4 tests total across both describe blocks)

- [ ] **Step 5: Wire real data into the page with auth guard and 404 handling**

Modify `app/store/orders/[id]/page.tsx` (built by the UI track) — replace the default export:
```tsx
import { notFound } from 'next/navigation'
import { requireAuth, requireTenant } from '@/lib/auth-guard'
import { getCustomerOrder } from '@/lib/data/customer-orders'
// ...keep the visual JSX the UI track built, remove MOCK_ORDER

type Props = { params: Promise<{ id: string }> }

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  const user = await requireAuth(`/orders/${id}`)
  const { tenantId } = await requireTenant()

  const order = await getCustomerOrder(tenantId, user.id, id)
  if (!order) notFound()

  // Derive timeline steps from `order.status` (pending/confirmed/shipped/delivered/cancelled/returned),
  // map `order.items` to the item rows, compute subtotal from unitPrice*quantity sums,
  // render `order.shippingAddress` fields in the "Delivering to" block.
  // Reuse the exact JSX structure and Tailwind classes the UI track shipped.

  return (
    // ...same JSX structure the UI track built, sourced from `order`
  )
}
```
Start the dev server, verify `/orders/{real-seeded-order-id}` renders with real data, verify a non-existent id 404s, and verify unauthenticated access redirects to `/auth?next=%2Forders%2F{id}`.

- [ ] **Step 6: Commit the data wiring**

```bash
git add "app/store/orders/[id]/page.tsx" lib/data/customer-orders.ts lib/data/customer-orders.test.ts
git commit -m "feat: wire order detail page to real Prisma data with auth guard, satisfies Phase 3 checkout redirect"
```

---

### Task 4: Account Page (Data)

**Files:**
- Create: `lib/data/customer-account.ts`
- Create: `lib/data/customer-account.test.ts`
- Modify: `app/store/account/page.tsx` (built by the UI track — swap `MOCK_ACCOUNT` for real data, add guard)

**Interfaces:**
- Consumes: `requireAuth`, `requireTenant`
- Produces: `getCustomerAccountSummary(tenantId: string, customerId: string): Promise<AccountSummary>` where:
  ```typescript
  type AccountSummary = {
    name: string | null
    phone: string | null
    email: string | null
    orderCount: number
    wishlistCount: number
    totalSpent: number
    activeOrderCount: number
  }
  ```

- [ ] **Step 1: Write failing test for `getCustomerAccountSummary`**

Create `lib/data/customer-account.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  withTenant: vi.fn(async (_tenantId: string, fn: (db: unknown) => unknown) =>
    fn({
      customer: {
        findUnique: vi.fn().mockResolvedValue({
          name: 'Priya Rajan',
          phone: '+91 98765 43210',
          email: 'priya.rajan@gmail.com',
        }),
      },
      order: {
        findMany: vi.fn().mockResolvedValue([
          { total: '2998.00', status: 'delivered' },
          { total: '1899.00', status: 'shipped' },
        ]),
      },
      wishlist: {
        count: vi.fn().mockResolvedValue(12),
      },
    })
  ),
}))

import { getCustomerAccountSummary } from './customer-account'

describe('getCustomerAccountSummary', () => {
  it('aggregates profile, order stats, and wishlist count', async () => {
    const summary = await getCustomerAccountSummary('tenant-1', 'customer-1')

    expect(summary.name).toBe('Priya Rajan')
    expect(summary.orderCount).toBe(2)
    expect(summary.totalSpent).toBe(4897)
    expect(summary.activeOrderCount).toBe(1) // 'shipped' counts as active, 'delivered' does not
    expect(summary.wishlistCount).toBe(12)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

Run: `npm run test:run -- lib/data/customer-account.test.ts`
Expected: FAIL with "Cannot find module './customer-account'"

- [ ] **Step 3: Implement `getCustomerAccountSummary`**

Create `lib/data/customer-account.ts`:
```typescript
import { withTenant } from '@/lib/prisma'

export type AccountSummary = {
  name: string | null
  phone: string | null
  email: string | null
  orderCount: number
  wishlistCount: number
  totalSpent: number
  activeOrderCount: number
}

const ACTIVE_STATUSES = new Set(['pending', 'confirmed', 'shipped'])

export async function getCustomerAccountSummary(tenantId: string, customerId: string): Promise<AccountSummary> {
  return withTenant(tenantId, async (db) => {
    const [customer, orders, wishlistCount] = await Promise.all([
      db.customer.findUnique({ where: { id: customerId }, select: { name: true, phone: true, email: true } }),
      db.order.findMany({ where: { tenantId, customerId }, select: { total: true, status: true } }),
      db.wishlist.count({ where: { tenantId, customerId } }),
    ])

    const totalSpent = orders.reduce((sum: number, o: { total: unknown }) => sum + Number(o.total), 0)
    const activeOrderCount = orders.filter((o: { status: string }) => ACTIVE_STATUSES.has(o.status)).length

    return {
      name: customer?.name ?? null,
      phone: customer?.phone ?? null,
      email: customer?.email ?? null,
      orderCount: orders.length,
      wishlistCount,
      totalSpent,
      activeOrderCount,
    }
  })
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `npm run test:run -- lib/data/customer-account.test.ts`
Expected: PASS

- [ ] **Step 5: Wire real data into the page with auth guard**

Modify `app/store/account/page.tsx` (built by the UI track) — replace the default export:
```tsx
import { requireAuth, requireTenant } from '@/lib/auth-guard'
import { getCustomerAccountSummary } from '@/lib/data/customer-account'
// ...keep all JSX the UI track built, remove MOCK_ACCOUNT

export default async function AccountPage() {
  const user = await requireAuth('/account')
  const { tenantId } = await requireTenant()
  const summary = await getCustomerAccountSummary(tenantId, user.id)

  const account = {
    name: summary.name ?? user.email ?? 'Customer',
    phone: summary.phone ?? '—',
    email: summary.email ?? user.email ?? '—',
    orderCount: summary.orderCount,
    wishlistCount: summary.wishlistCount,
    totalSpent: `₹${(summary.totalSpent / 1000).toFixed(1)}K`,
    activeOrderCount: summary.activeOrderCount,
  }

  // ...same JSX the UI track built, sourced from `account`
}
```
Start the dev server, verify `/account` renders real stats for the logged-in test customer, verify unauthenticated access redirects to `/auth?next=%2Faccount`.

- [ ] **Step 6: Commit the data wiring**

```bash
git add app/store/account/page.tsx lib/data/customer-account.ts lib/data/customer-account.test.ts
git commit -m "feat: wire account page to real Prisma data with auth guard"
```

---

### Task 5: Wishlist Page (Data)

**Files:**
- Create: `lib/data/wishlist.ts`
- Create: `lib/data/wishlist.test.ts`
- Modify: `app/store/wishlist/page.tsx` (built by the UI track — swap `MOCK_ITEMS` for real data, add guard)

**Interfaces:**
- Consumes: `requireAuth`, `requireTenant`
- Produces: `getWishlist(tenantId: string, customerId: string): Promise<WishlistItem[]>` where:
  ```typescript
  type WishlistItem = {
    wishlistId: string
    productId: string
    name: string
    slug: string
    price: number
    comparePrice: number | null
    images: string[]
    isActive: boolean
    stockBySize: Record<string, number>
  }
  ```

- [ ] **Step 1: Write failing test for `getWishlist`**

Create `lib/data/wishlist.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

const findManyMock = vi.fn().mockResolvedValue([
  {
    id: 'wishlist-1',
    product: {
      id: 'product-1',
      name: 'Kanjivaram Silk Saree',
      slug: 'kanjivaram-silk-saree',
      price: '2499.00',
      comparePrice: '3299.00',
      images: ['https://example.com/img1.jpg'],
      isActive: true,
      stockBySize: { Free: 3 },
    },
  },
])

vi.mock('@/lib/prisma', () => ({
  withTenant: vi.fn(async (_tenantId: string, fn: (db: unknown) => unknown) =>
    fn({ wishlist: { findMany: findManyMock } })
  ),
}))

import { getWishlist } from './wishlist'

describe('getWishlist', () => {
  it('returns wishlist items with product details, tenant and customer scoped', async () => {
    const items = await getWishlist('tenant-1', 'customer-1')

    expect(items).toHaveLength(1)
    expect(items[0].productId).toBe('product-1')
    expect(items[0].price).toBe(2499)
    expect(items[0].comparePrice).toBe(3299)
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: 'tenant-1', customerId: 'customer-1' } })
    )
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

Run: `npm run test:run -- lib/data/wishlist.test.ts`
Expected: FAIL with "Cannot find module './wishlist'"

- [ ] **Step 3: Implement `getWishlist`**

Create `lib/data/wishlist.ts`:
```typescript
import { withTenant } from '@/lib/prisma'

export type WishlistItem = {
  wishlistId: string
  productId: string
  name: string
  slug: string
  price: number
  comparePrice: number | null
  images: string[]
  isActive: boolean
  stockBySize: Record<string, number>
}

export async function getWishlist(tenantId: string, customerId: string): Promise<WishlistItem[]> {
  const rows = await withTenant(tenantId, (db) =>
    db.wishlist.findMany({
      where: { tenantId, customerId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            comparePrice: true,
            images: true,
            isActive: true,
            stockBySize: true,
          },
        },
      },
    })
  )

  return rows.map(
    (row: {
      id: string
      product: {
        id: string
        name: string
        slug: string
        price: unknown
        comparePrice: unknown
        images: string[]
        isActive: boolean
        stockBySize: unknown
      }
    }) => ({
      wishlistId: row.id,
      productId: row.product.id,
      name: row.product.name,
      slug: row.product.slug,
      price: Number(row.product.price),
      comparePrice: row.product.comparePrice ? Number(row.product.comparePrice) : null,
      images: row.product.images,
      isActive: row.product.isActive,
      stockBySize: row.product.stockBySize as Record<string, number>,
    })
  )
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `npm run test:run -- lib/data/wishlist.test.ts`
Expected: PASS

- [ ] **Step 5: Wire real data into the page with auth guard**

Modify `app/store/wishlist/page.tsx` (built by the UI track) — replace the default export:
```tsx
import { requireAuth, requireTenant } from '@/lib/auth-guard'
import { getWishlist } from '@/lib/data/wishlist'
// ...keep JSX/types the UI track built, remove MOCK_ITEMS

export default async function WishlistPage() {
  const user = await requireAuth('/wishlist')
  const { tenantId } = await requireTenant()
  const items = await getWishlist(tenantId, user.id)

  const totalValue = items.reduce((sum, item) => sum + item.price, 0)

  // Empty state (items.length === 0): centered "Your wishlist is empty" message
  // with a link to `/shop`, inside the same page shell and MobileTabBar.
  // Map `items` into the same 2-column grid card the UI track built: derive
  // `outOfStock` from `!item.isActive || Object.values(item.stockBySize).every(qty => qty === 0)`,
  // `badge`/`urgency`/`rating` are decorative fields with no schema backing yet — omit them
  // for real data (Paper's badges came from mock merchandising copy, not a DB field) rather
  // than inventing a schema column out of scope for this phase.

  return (
    // ...same JSX structure the UI track built, sourced from `items` and `totalValue`
  )
}
```
Start the dev server, verify `/wishlist` renders real wishlist items for the logged-in test customer (or the empty state if none saved), and verify unauthenticated access redirects to `/auth?next=%2Fwishlist`.

- [ ] **Step 6: Commit the data wiring**

```bash
git add app/store/wishlist/page.tsx lib/data/wishlist.ts lib/data/wishlist.test.ts
git commit -m "feat: wire wishlist page to real Prisma data with auth guard"
```

---

## Post-Plan Verification

- [ ] Run the full test suite: `npm run test:run` — expect all tests (including this phase's 4 new/updated test files) to pass.
- [ ] Run `npm run lint` — expect zero errors introduced by this phase's files.
- [ ] Manually click through `/orders` → `/orders/[id]` → `/account` → `/wishlist` on the `silk` tenant subdomain, both logged in and logged out, confirming redirects and empty states behave as specified in each task.

## Self-Review

- **Spec coverage:** Every backend/data step from the original combined file (1696 lines) is represented here, verbatim: Task 1 (Auth Guard, 5 steps — the full task, since it was backend-only and appears as a one-liner pointer in the UI sibling), plus the Step-B halves of Tasks 2–5 (each originally steps 4–9, renumbered 1–6 here: failing test → verify fail → implement → verify pass → wire page with guard → commit) — 5 + 6×4 = 29 checkbox steps, matching the original's counts for those steps exactly. Combined with the UI sibling's 12 steps, that is 41 checkbox steps — the original had exactly 41 (5 + 9×4); no step lost or duplicated. The original's Post-Plan Verification is split by nature: lint + visual mock-data clickthrough live in the UI file, full-test-suite + logged-in/logged-out redirect clickthrough live here (lint appears in both since both tracks add files).
- **Placeholder scan:** No `<name>`-style unresolved placeholders. The `// ...same JSX structure...` comments in the wiring steps deliberately reference the UI track's shipped markup rather than duplicating ~900 lines of JSX — that is the split's intent, not a stub; the exact markup lives in the sibling file's Task steps.
- **Type consistency:** `OrderListItem`, `OrderDetail`, `AccountSummary`, and `WishlistItem` match the `Mock*` fixture shapes the UI track shipped (`MockOrder`, `MockOrderDetail`, `MockAccount`, `MockWishlistItem`), so each wiring step is a data-source swap plus a guard prepend inside unchanged JSX. All queries use only real `Order`/`OrderItem`/`Customer`/`Wishlist`/`Product` schema fields — no invented `badge`/`rating`/`notifyOrderUpdates` columns, per Known Gaps.
- **Track discipline:** No new component markup, Tailwind classes, Paper lookups, or visual elements are introduced anywhere in this file — every wiring step reuses the exact JSX the UI track shipped, changing only the data source, the guard, and behavior-only additions the original specified (empty states, `notFound()` for missing orders). All `paper-desktop` MCP work was done in the UI track. Every other step writes `lib/auth-guard.ts` or `lib/data/*` with a Vitest TDD cycle.
