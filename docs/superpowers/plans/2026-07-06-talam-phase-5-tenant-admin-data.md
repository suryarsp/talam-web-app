# Phase 5: Tenant Admin Implementation Plan — Data Track

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Track order:** This is a **Data-track** plan. Do not start it until every phase's UI-track plan (Phases 1–8) is complete. This file specifically depends on `2026-07-06-talam-phase-5-tenant-admin-ui.md` having been executed first (it builds `app/store/admin/layout.tsx`, `app/store/admin/dashboard/page.tsx`, `app/store/admin/products/page.tsx`, `app/store/admin/orders/page.tsx`, `components/admin/order-action-sheet.tsx`, and `app/store/admin/settings/page.tsx` as mock-wired, guard-free surfaces, which Tasks 1–7 below wire to real Prisma data, real Server Actions, and the `requireOwner` guard).

**Goal:** Build the `requireOwner` owner-only guard utility, the Prisma data layers for the admin dashboard, products, and orders (all TDD), the product CRUD / order status-transition / store settings Server Actions, and swap the UI-track's mock fixtures for real data — adding the guard to the admin layout and every admin page the UI track built.

**Architecture:** A layout-level guard (`requireOwner`, `lib/admin-guard.ts`) checks that the logged-in Supabase user's id equals `Tenant.ownerId` for the current `x-tenant-id`, redirecting to `/auth?next=...` or `/` otherwise — there is no separate staff/role model in the schema, so "admin" means "the tenant owner" for this phase. Auth is verified via Supabase session (`lib/supabase/server.ts`, cookie-based, already wired through `middleware.ts` → `updateSession`); tenant scoping uses the `x-tenant-id` header middleware already sets, read via `next/headers`. Every data task follows the TDD cycle (failing test → implement → pass) then a wiring step that replaces the page's `MOCK_*` fixture with the real query and prepends `requireOwner` — the JSX built by the UI track is reused unchanged, only the data source and the guard change. Product/order mutations use Server Actions (not client-side fetch) so they can call `withTenant` directly and `revalidatePath` the affected public storefront routes.

**Tech Stack:** Prisma `withTenant` (`lib/prisma.ts`), `@supabase/ssr` session (`lib/supabase/server.ts`), Vitest for TDD, Next.js App Router (SSR + Server Actions).

## Global Constraints

- Inherit all prior phase constraints (multi-tenant via `x-tenant-id` header set by `middleware.ts`; `withTenant(tenantId, fn)` wraps every Prisma call to set `app.tenant_id` for RLS).
- All admin pages: `export const dynamic = 'force-dynamic'` (already set by the UI track; do not remove it while wiring).
- Every data-fetching function takes `tenantId` as an explicit first argument (matches `lib/data/products.ts` convention) — never infer tenant from global state.
- Auth/ownership guard: `requireOwner()` redirects unauthenticated users to `/auth?next={path}` and non-owners to `/` (there's no "access denied" screen in Paper for this — a silent redirect matches how `requireTenant()` in Phase 4 handles the analogous unknown-tenant case). The UI track deliberately shipped the admin layout and pages guard-free (mocked owner state) so they could be screenshot-verified without auth — this file's Task 1 and wiring steps are where the guard lands.
- Do not change the JSX structure, Tailwind classes, or copy the UI track shipped — each wiring step swaps the data source (`MOCK_*` fixture → real query result mapped into the same shapes), sets the real `<form action={...}>`, and prepends the guard, nothing visual. Paper re-verification is not required in this track; all Paper lookups were done in the UI track.
- Design ground truth reference (for context only, no lookups here): live Paper file "Talam Design" (team `Surya's Team`, file id `01KVZYTDJNREHBACTQMT2D9HR9`), page **"Admin Dashboard"** (`4-0`), artboards Dashboard (`2KY-0`/`2QM-0`), Products (`5EX-0`/`5EY-0`, editor `5SI-0`/`5SJ-0`), Orders (`695-0`/`696-0`/`6LS-0`/`6QI-0`), Settings (`7HK-0`/`7L5-0`, `7OK-0`–`8G8-0`).
- Money fields (`Product.price`, `Order.total`, etc.) are Prisma `Decimal` — every data function narrows them to `number` via `Number(...)` before returning, matching `lib/data/products.ts`'s existing convention.
- Restart (not reload) the dev server after any Prisma/data-layer change, per this project's Preview Tool Glitches convention.

---

## Known Gaps (flagged, not silently invented)

- **No "Customers" page in Paper.** The old deleted plan (`docs/superpowers/plans/2026-06-27-admin-dashboard.md`, recovered via `git show 8acc628:...`) invented a `/admin/customers` nav item and Customers CRUD, but the live Paper file's bottom nav (mobile) and sidebar (desktop) only have **Dashboard, Orders, Products, Settings** — 4 items, not 5, and there is **no Customers artboard anywhere in the Admin Dashboard page**. This plan builds only the 4 sections Paper actually has. A customer-list admin view is not scoped here; flagged for a future phase rather than invented.
- **Sub-Category, "Coupon Applicable" checkbox, and free-form "Product Specifications" (key/value pairs) in the product editor (Paper `5SI-0`) have no backing Prisma fields.** `Product` has no `subCategoryId`, no `couponEligible` boolean, and no specifications JSON column. The UI track renders these fields as visually present (matching Paper pixel-for-pixel) but **inert/disabled**, and the real Server Action in Task 4 **does not persist them** — called out explicitly rather than inventing a schema migration out of scope for this phase. Only `name`, `description`, `categoryId`, `price`, `comparePrice`, `sizes`, `images` are wired to real columns.
- **Order action menu's "Ship Order" step ("Add tracking number") implies a tracking-id input Paper doesn't show a form for** — the bottom sheet (`696-0`) shows it as a single tap target with no visible text field in this artboard. The UI track added a minimal inline tracking-id prompt (a single text input inside the same sheet row) since `Order.trackingId` exists in the schema and an admin can't ship without providing one — this is a small good-faith gap-fill, not a full redesign, and Task 6 here persists it.
- **Desktop Orders board (`6LS-0`) and its Order Details Modal (`6QI-0`) are large multi-section artboards** (order list + a full modal with timeline/items/customer info). Task 5 builds the desktop **list** view (table/board) to Paper spec but treats the desktop **details modal** as reusing the same `getOrderDetail` data shape Task 6 defines for the mobile action menu's "View Full Details" — no separate desktop-only data function.
- **Store Settings desktop sub-pages** (`7OK-0` Store, `7RX-0` Store detail sub-page, `7X5-0` Alerts, `811-0` Promotions, `860-0` Subscription, `89R-0` Payments, `8CF-0` Contact Info, `8G8-0` Delete Store — 8 separate desktop artboards under one settings IA) are a lot of surface area. The UI track built the **single-page mobile settings** (`7HK-0`, which already contains Store Details / Brand / Payment Gateways / Notifications / Danger Zone as one scrollable page — this is the real shipped scope) and the **desktop equivalent as one page with the same sections** rather than 8 separate desktop routes, since the mobile artboard proves the intended IA is one settings page with sections, and the 8 desktop artboards read as exploratory sub-page variants of the same content. Promotions and Subscription sections have no backing schema/billing model yet (no `DiscountCode` UI exists pre-Phase-5, no subscription/billing tables) — these two sections are explicitly out of scope and not built, flagged here rather than invented.
- **Payment Gateway "Connect" actions** (Razorpay in Paper `7J6-0`) require OAuth/API-key flows with an external provider — out of scope for this phase. The settings page renders the Payment Gateways section read-only (shows `Tenant.paymentProvider` current value + a disabled "Connect"/"Change" button), consistent with how Phase 4 treated inert toggle rows.
- **No Cloudinary upload wiring yet** — `.env.example` references Cloudinary vars but no `lib/cloudinary.ts` or upload endpoint exists in the repo today. The UI track's product image field mirrors Paper's "Tap to upload" dropzone visually with a plain `<input type="file">` and client-side preview (no upload); Task 4 here stores whatever URL strings are passed in (supporting manual URL paste as a stopgap) rather than building a full Cloudinary unsigned-upload pipeline — that pipeline is flagged as a follow-up, not silently built partially.

---

### Task 1: Admin Owner Guard (Data)

**Files:**
- Create: `lib/admin-guard.ts`
- Create: `lib/admin-guard.test.ts`
- Modify: `app/store/admin/layout.tsx` (add the guard call the UI track deliberately omitted)

**Interfaces:**
- Produces: `requireOwner(nextPath?: string)` → `Promise<{ tenantId: string; ownerId: string }>` or redirects

Not a UI task — no Paper step required. (The `--font-admin` token and the layout shell are the UI track's Task 1.)

- [ ] **Step 1: Write failing test for `requireOwner`**

Create `lib/admin-guard.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'owner-uuid' } },
        error: null,
      }),
    },
  })),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({
    get: (key: string) => (key === 'x-tenant-id' ? 'tenant-uuid' : null),
  })),
}))

vi.mock('@/lib/prisma', () => ({
  withTenant: vi.fn(async (_tenantId: string, fn: (client: unknown) => unknown) =>
    fn({ tenant: { findUnique: vi.fn().mockResolvedValue({ id: 'tenant-uuid', ownerId: 'owner-uuid' }) } })
  ),
}))

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

import { requireOwner } from './admin-guard'

describe('requireOwner', () => {
  it('returns tenantId and ownerId when the logged-in user owns the current tenant', async () => {
    const result = await requireOwner()
    expect(result.tenantId).toBe('tenant-uuid')
    expect(result.ownerId).toBe('owner-uuid')
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

Run: `npm run test:run -- lib/admin-guard.test.ts`
Expected: FAIL with "Cannot find module './admin-guard'"

- [ ] **Step 3: Implement the admin guard**

Create `lib/admin-guard.ts`:
```typescript
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { withTenant } from '@/lib/prisma'

export async function requireOwner(nextPath?: string) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const suffix = nextPath ? `?next=${encodeURIComponent(nextPath)}` : ''
    redirect(`/auth${suffix}`)
  }

  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  if (!tenantId) redirect('/')

  const tenant = await withTenant(tenantId, (db) =>
    db.tenant.findUnique({ where: { id: tenantId }, select: { id: true, ownerId: true } })
  )

  if (!tenant || tenant.ownerId !== user.id) redirect('/')

  return { tenantId, ownerId: user.id }
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `npm run test:run -- lib/admin-guard.test.ts`
Expected: PASS

- [ ] **Step 5: Wire the guard into the admin layout**

Modify `app/store/admin/layout.tsx` (built guard-free by the UI track with a mocked owner state): make the component `async`, add
```tsx
import { requireOwner } from '@/lib/admin-guard'
```
and `await requireOwner()` as the first line of the component body. No JSX changes.

Start the dev server, verify that logged-out access to any `/admin/*` path on the `silk` tenant subdomain redirects to `/auth?next=...`, a logged-in non-owner is redirected to `/`, and the seeded tenant owner still sees the layout chrome unchanged.

- [ ] **Step 6: Commit**

```bash
git add lib/admin-guard.ts lib/admin-guard.test.ts app/store/admin/layout.tsx
git commit -m "feat: add owner-only admin guard and wire it into the admin layout"
```

---

### Task 2: Admin Dashboard Page (Data)

**Files:**
- Create: `lib/data/admin-dashboard.ts`
- Create: `lib/data/admin-dashboard.test.ts`
- Modify: `app/store/admin/dashboard/page.tsx` (built by the UI track — swap mocks for real data)

**Interfaces:**
- Consumes: `requireOwner`
- Produces: `getDashboardStats(tenantId: string): Promise<DashboardStats>`
- Produces: `getActionRequiredCounts(tenantId: string): Promise<ActionRequiredCounts>` where pending-order-count and low-stock-count are derived from real data; payment-failed and review-alerts are flagged as no-schema-signal (see Step 5) and omitted from the real version.
- Produces: `getRecentOrders(tenantId: string, limit = 3): Promise<RecentOrder[]>`
- Produces: `getTopProducts(tenantId: string, limit = 3): Promise<TopProduct[]>` (by order-item quantity sum)

- [ ] **Step 1: Write failing tests for the dashboard data functions**

Create `lib/data/admin-dashboard.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  withTenant: vi.fn(async (_tenantId: string, fn: (db: unknown) => unknown) =>
    fn({
      order: {
        count: vi.fn().mockResolvedValue(3),
        aggregate: vi.fn().mockResolvedValue({ _sum: { total: '24500.00' }, _avg: { total: '645.00' } }),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'order-1',
            status: 'pending',
            total: '1850.00',
            createdAt: new Date(),
            customer: { name: 'Priya Sharma' },
            items: [{ productName: 'Kurta Set', quantity: 2 }],
          },
        ]),
        groupBy: vi.fn(),
      },
      product: {
        count: vi.fn().mockResolvedValue(2),
      },
      customer: {
        count: vi.fn().mockResolvedValue(142),
      },
      orderItem: {
        groupBy: vi.fn().mockResolvedValue([
          { productId: 'p1', _sum: { quantity: 12 } },
        ]),
      },
    })
  ),
}))

import { getDashboardStats, getActionRequiredCounts, getRecentOrders } from './admin-dashboard'

describe('getDashboardStats', () => {
  it('aggregates revenue, orders, customers, and avg order value', async () => {
    const stats = await getDashboardStats('tenant-1')
    expect(stats.revenueToday).toBe(24500)
    expect(stats.avgOrderValue).toBe(645)
  })
})

describe('getActionRequiredCounts', () => {
  it('returns pending order count and low stock count', async () => {
    const counts = await getActionRequiredCounts('tenant-1')
    expect(counts.pendingOrders).toBe(3)
    expect(counts.lowStockProducts).toBe(2)
  })
})

describe('getRecentOrders', () => {
  it('returns recent orders newest first with customer and item summary', async () => {
    const orders = await getRecentOrders('tenant-1', 3)
    expect(orders).toHaveLength(1)
    expect(orders[0].customerName).toBe('Priya Sharma')
    expect(orders[0].total).toBe(1850)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

Run: `npm run test:run -- lib/data/admin-dashboard.test.ts`
Expected: FAIL with "Cannot find module './admin-dashboard'"

- [ ] **Step 3: Implement the dashboard data functions**

Create `lib/data/admin-dashboard.ts`:
```typescript
import { withTenant } from '@/lib/prisma'

export type DashboardStats = {
  revenueToday: number
  ordersToday: number
  customersTotal: number
  avgOrderValue: number
}

export type ActionRequiredCounts = {
  pendingOrders: number
  lowStockProducts: number
}

export type RecentOrder = {
  id: string
  status: string
  total: number
  createdAt: Date
  customerName: string | null
  itemSummary: string
}

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export async function getDashboardStats(tenantId: string): Promise<DashboardStats> {
  return withTenant(tenantId, async (db) => {
    const since = startOfToday()
    const [orderAgg, ordersToday, customersTotal] = await Promise.all([
      db.order.aggregate({ where: { tenantId, createdAt: { gte: since } }, _sum: { total: true }, _avg: { total: true } }),
      db.order.count({ where: { tenantId, createdAt: { gte: since } } }),
      db.customer.count({ where: { tenantId } }),
    ])

    return {
      revenueToday: Number(orderAgg._sum.total ?? 0),
      ordersToday,
      customersTotal,
      avgOrderValue: Number(orderAgg._avg.total ?? 0),
    }
  })
}

// ponytail: "low stock" threshold (< 5 units in any size) hardcoded to match Paper's copy
// ("Less than 5 units remaining") rather than a configurable Tenant setting — revisit if
// tenants ever need a per-store threshold.
const LOW_STOCK_THRESHOLD = 5

export async function getActionRequiredCounts(tenantId: string): Promise<ActionRequiredCounts> {
  return withTenant(tenantId, async (db) => {
    const [pendingOrders, products] = await Promise.all([
      db.order.count({ where: { tenantId, status: 'pending' } }),
      db.product.findMany({ where: { tenantId, isActive: true }, select: { stockBySize: true } }),
    ])

    const lowStockProducts = products.filter((p: { stockBySize: unknown }) => {
      const stock = p.stockBySize as Record<string, number>
      return Object.values(stock).some((qty) => qty > 0 && qty < LOW_STOCK_THRESHOLD)
    }).length

    return { pendingOrders, lowStockProducts }
  })
}

export async function getRecentOrders(tenantId: string, limit = 3): Promise<RecentOrder[]> {
  const orders = await withTenant(tenantId, (db) =>
    db.order.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        customer: { select: { name: true } },
        items: { select: { productName: true, quantity: true } },
      },
    })
  )

  return orders.map(
    (order: {
      id: string
      status: string
      total: unknown
      createdAt: Date
      customer: { name: string | null } | null
      items: { productName: string; quantity: number }[]
    }) => ({
      id: order.id,
      status: order.status,
      total: Number(order.total),
      createdAt: order.createdAt,
      customerName: order.customer?.name ?? null,
      itemSummary:
        order.items.length === 1
          ? `${order.items[0].quantity}× ${order.items[0].productName}`
          : `${order.items[0].quantity}× ${order.items[0].productName} + ${order.items.length - 1} more`,
    })
  )
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `npm run test:run -- lib/data/admin-dashboard.test.ts`
Expected: PASS

- [ ] **Step 5: Wire real data into the page**

Modify `app/store/admin/dashboard/page.tsx` (built by the UI track with `MOCK_STATS`/`MOCK_ALERTS`/`MOCK_ORDERS`) — replace the default export:
```tsx
import { requireOwner } from '@/lib/admin-guard'
import { getDashboardStats, getActionRequiredCounts, getRecentOrders } from '@/lib/data/admin-dashboard'
// ...keep the JSX structure the UI track shipped

export default async function AdminDashboardPage() {
  const { tenantId } = await requireOwner('/admin/dashboard')
  const [stats, actionCounts, recentOrders] = await Promise.all([
    getDashboardStats(tenantId),
    getActionRequiredCounts(tenantId),
    getRecentOrders(tenantId, 3),
  ])

  // Build alerts array from actionCounts (only pendingOrders/lowStockProducts — the
  // "payment failed" and "new review" alert rows from Paper have no real-data signal
  // yet: Order has no per-attempt failure log, and ProductReview has no "needs
  // response" flag — omit those two rows for real data rather than inventing signals;
  // Task 6's order action menu still exposes manual status control regardless).
  // Map `recentOrders` into the same card list, deriving status pill color from
  // `STATUS_STYLES[order.status]` (the shared status style map Task 5 exports from
  // lib/data/admin-orders.ts).

  return (
    // ...same JSX structure the UI track shipped, sourced from `stats`, `actionCounts`, `recentOrders`
  )
}
```
Start the dev server, verify `/admin/dashboard` renders real stats for the seeded `silk` tenant owner, verify non-owner/unauthenticated access redirects.

- [ ] **Step 6: Commit the data wiring**

```bash
git add app/store/admin/dashboard/page.tsx lib/data/admin-dashboard.ts lib/data/admin-dashboard.test.ts
git commit -m "feat: wire admin dashboard to real Prisma stats with owner guard"
```

---

### Task 3: Product Category Prerequisite Check (Data)

**Files:** none (verification-only task)

- [ ] **Step 1: Confirm categories already exist for product assignment**

`lib/data/products.ts` already exports `getCategories(tenantId)` reading `ProductCategory` (name/slug/sortOrder), and `prisma/seed.ts` already seeds 3 categories (Sarees/Kurtis/Crafts) for the `silk` tenant. Unlike the old deleted plan (which built a whole `/admin/categories` CRUD page as a Task-2.5 prerequisite), **no new category CRUD is needed** — the product editor's "Category" dropdown (Task 4) reuses `getCategories` as-is. This step is a no-op confirmation, not a build step — flagged so a future worker doesn't re-invent category CRUD unless Paper is later found to have a dedicated categories-management screen (it doesn't, as of this plan's Paper review — no "Categories" artboard exists on the Admin Dashboard page).

---

### Task 4: Products List + Editor (Data)

**Files:**
- Create: `app/store/admin/products/actions.ts`
- Create: `lib/data/admin-products.ts`
- Create: `lib/data/admin-products.test.ts`
- Modify: `app/store/admin/products/page.tsx` (built by the UI track — swap mocks for real data + actions)

**Interfaces:**
- Consumes: `requireOwner`, `getCategories` (existing, from `lib/data/products.ts`)
- Produces: `getAdminProducts(tenantId: string): Promise<AdminProduct[]>` where:
  ```typescript
  type AdminProduct = {
    id: string
    name: string
    price: number
    stockLabel: 'In stock' | 'Low' | 'Out of stock'
    stockDetail: string // e.g. "3 left" for Low
    images: string[]
  }
  ```
- Produces Server Actions in `actions.ts`: `createProduct(formData: FormData)`, `updateProduct(id: string, formData: FormData)`, `deleteProduct(id: string)` — all call `requireOwner()` first, then `revalidatePath('/admin/products')` and `revalidatePath('/shop')` (the public storefront ISR page) after mutation. Per Known Gaps, the editor's disabled Sub Category / Coupon Applicable / Product Specifications fields are **not persisted** (no schema fields), and `images` accepts URL strings (no Cloudinary upload pipeline this phase).

- [ ] **Step 1: Write failing tests for `getAdminProducts` and the Server Actions**

Create `lib/data/admin-products.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  withTenant: vi.fn(async (_tenantId: string, fn: (db: unknown) => unknown) =>
    fn({
      product: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'p1', name: 'Cotton Kurta Set', price: '1299.00', images: ['url1'], stockBySize: { M: 20 } },
          { id: 'p2', name: 'Silk Banarasi Saree', price: '3499.00', images: ['url2'], stockBySize: { Free: 3 } },
          { id: 'p3', name: 'Anarkali Suit', price: '2199.00', images: ['url3'], stockBySize: { S: 0, M: 0 } },
        ]),
      },
    })
  ),
}))

import { getAdminProducts } from './admin-products'

describe('getAdminProducts', () => {
  it('derives stock label from stockBySize', async () => {
    const products = await getAdminProducts('tenant-1')
    expect(products[0].stockLabel).toBe('In stock')
    expect(products[1]).toMatchObject({ stockLabel: 'Low', stockDetail: '3 left' })
    expect(products[2].stockLabel).toBe('Out of stock')
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

Run: `npm run test:run -- lib/data/admin-products.test.ts`
Expected: FAIL with "Cannot find module './admin-products'"

- [ ] **Step 3: Implement `getAdminProducts`**

Create `lib/data/admin-products.ts`:
```typescript
import { withTenant } from '@/lib/prisma'

export type AdminProduct = {
  id: string
  name: string
  price: number
  images: string[]
  stockLabel: 'In stock' | 'Low' | 'Out of stock'
  stockDetail: string
}

const LOW_STOCK_THRESHOLD = 5

function deriveStock(stockBySize: Record<string, number>): { stockLabel: AdminProduct['stockLabel']; stockDetail: string } {
  const total = Object.values(stockBySize).reduce((sum, qty) => sum + qty, 0)
  if (total === 0) return { stockLabel: 'Out of stock', stockDetail: '0 left' }
  if (total < LOW_STOCK_THRESHOLD) return { stockLabel: 'Low', stockDetail: `${total} left` }
  return { stockLabel: 'In stock', stockDetail: `${total} left` }
}

export async function getAdminProducts(tenantId: string): Promise<AdminProduct[]> {
  const products = await withTenant(tenantId, (db) =>
    db.product.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, price: true, images: true, stockBySize: true },
    })
  )

  return products.map((p: { id: string; name: string; price: unknown; images: string[]; stockBySize: unknown }) => ({
    id: p.id,
    name: p.name,
    price: Number(p.price),
    images: p.images,
    ...deriveStock(p.stockBySize as Record<string, number>),
  }))
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `npm run test:run -- lib/data/admin-products.test.ts`
Expected: PASS

- [ ] **Step 5: Implement the Server Actions**

Create `app/store/admin/products/actions.ts`:
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { requireOwner } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'

function parseSizes(formData: FormData): string[] {
  return formData.getAll('sizes').map(String)
}

export async function createProduct(formData: FormData) {
  const { tenantId } = await requireOwner()

  const name = String(formData.get('name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim() || null
  const categoryId = String(formData.get('categoryId') ?? '') || null
  const price = Number(formData.get('price'))
  const comparePriceRaw = formData.get('comparePrice')
  const comparePrice = comparePriceRaw ? Number(comparePriceRaw) : null
  const images = formData.getAll('images').map(String).filter(Boolean)
  const sizes = parseSizes(formData)
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  if (!name || !price || images.length === 0) {
    throw new Error('Product name, price, and at least one image are required')
  }

  await withTenant(tenantId, (db) =>
    db.product.create({
      data: { tenantId, name, slug, description, categoryId, price, comparePrice, images, sizes, stockBySize: {} },
    })
  )

  revalidatePath('/admin/products')
  revalidatePath('/shop')
}

export async function updateProduct(id: string, formData: FormData) {
  const { tenantId } = await requireOwner()

  const name = String(formData.get('name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim() || null
  const categoryId = String(formData.get('categoryId') ?? '') || null
  const price = Number(formData.get('price'))
  const comparePriceRaw = formData.get('comparePrice')
  const comparePrice = comparePriceRaw ? Number(comparePriceRaw) : null
  const images = formData.getAll('images').map(String).filter(Boolean)
  const sizes = parseSizes(formData)

  await withTenant(tenantId, (db) =>
    db.product.update({
      where: { id, tenantId },
      data: { name, description, categoryId, price, comparePrice, images, sizes },
    })
  )

  revalidatePath('/admin/products')
  revalidatePath('/shop')
}

export async function deleteProduct(id: string) {
  const { tenantId } = await requireOwner()
  // ponytail: soft-delete via isActive rather than a hard DELETE — preserves
  // OrderItem history that references this product.
  await withTenant(tenantId, (db) => db.product.update({ where: { id, tenantId }, data: { isActive: false } }))
  revalidatePath('/admin/products')
  revalidatePath('/shop')
}
```

- [ ] **Step 6: Wire real data + actions into the page**

Modify `app/store/admin/products/page.tsx` (the UI track's mock-wired client page) — split into a server component wrapper (fetches `getAdminProducts` + `getCategories`, passes as props) and keep the interactive editor as a client component receiving `createProduct`/`updateProduct`/`deleteProduct` as props to call from `<form action={...}>`. Reuse the exact JSX/Tailwind the UI track shipped, sourcing rows from real `AdminProduct[]` and the Category select from real `getCategories(tenantId)`.

Start the dev server, verify `/admin/products` lists real seeded products with correct stock labels, verify creating a product through the sheet actually persists (check via a second reload) and revalidates `/shop`.

- [ ] **Step 7: Commit the data wiring**

```bash
git add app/store/admin/products/ lib/data/admin-products.ts lib/data/admin-products.test.ts
git commit -m "feat: wire admin products page to real Prisma CRUD via Server Actions"
```

---

### Task 5: Orders List (Mobile + Desktop) (Data)

**Files:**
- Create: `lib/data/admin-orders.ts`
- Create: `lib/data/admin-orders.test.ts`
- Modify: `app/store/admin/orders/page.tsx` (built by the UI track — swap mocks for real data)

**Interfaces:**
- Produces: `getAdminOrders(tenantId: string, statusFilter?: string): Promise<AdminOrderListItem[]>` where:
  ```typescript
  type AdminOrderListItem = {
    id: string
    code: string // derived display id, e.g. first 8 chars of uuid uppercased, prefixed "#ORD-"
    status: string
    total: number
    createdAt: Date
    customerName: string | null
    itemSummary: string
  }
  ```
- Produces: shared `STATUS_STYLES` map (pending/confirmed/shipped/delivered/cancelled/returned → `{ bg, border, text }`) exported from `lib/data/admin-orders.ts` for reuse across Task 2 (dashboard) and Task 6 (action menu). It is data-coupled (keyed by the real Prisma status values), which is why it lives here and replaces the UI track's purely-visual inline class map.

- [ ] **Step 1: Write failing test for `getAdminOrders`**

Create `lib/data/admin-orders.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  withTenant: vi.fn(async (_tenantId: string, fn: (db: unknown) => unknown) =>
    fn({
      order: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            status: 'pending',
            total: '649.00',
            createdAt: new Date(),
            customer: { name: 'Ananya Krishnan' },
            items: [{ productName: 'Block Print Kurti', size: 'L', quantity: 1 }],
          },
        ]),
      },
    })
  ),
}))

import { getAdminOrders } from './admin-orders'

describe('getAdminOrders', () => {
  it('returns orders with derived display code and item summary', async () => {
    const orders = await getAdminOrders('tenant-1')
    expect(orders[0].code).toBe('#ORD-A1B2C3D4')
    expect(orders[0].itemSummary).toBe('Block Print Kurti (L) · 1 item')
    expect(orders[0].total).toBe(649)
  })

  it('filters by status when provided', async () => {
    const { withTenant } = await import('@/lib/prisma')
    await getAdminOrders('tenant-1', 'pending')
    expect(withTenant).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

Run: `npm run test:run -- lib/data/admin-orders.test.ts`
Expected: FAIL with "Cannot find module './admin-orders'"

- [ ] **Step 3: Implement `getAdminOrders` and shared `STATUS_STYLES`**

Create `lib/data/admin-orders.ts`:
```typescript
import { withTenant } from '@/lib/prisma'

export type AdminOrderListItem = {
  id: string
  code: string
  status: string
  total: number
  createdAt: Date
  customerName: string | null
  itemSummary: string
}

export const STATUS_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  pending: { bg: 'bg-[#FB923C1A]', border: 'border-[#FB923C]', text: 'text-[#92400E]' },
  confirmed: { bg: 'bg-[#DBEAFE]', border: 'border-[#DBEAFE]', text: 'text-[#1D4ED8]' },
  shipped: { bg: 'bg-[#EFF6FF]', border: 'border-[#BFDBFE]', text: 'text-[#1E3A8A]' },
  delivered: { bg: 'bg-success-bg', border: 'border-success-border', text: 'text-[#065F46]' },
  cancelled: { bg: 'bg-[#FEF2F2]', border: 'border-[#FECACA]', text: 'text-[#991B1B]' },
  returned: { bg: 'bg-[#F5F3FF]', border: 'border-[#DDD6FE]', text: 'text-[#5B21B6]' },
}

function itemSummary(items: { productName: string; size: string | null; quantity: number }[]): string {
  const first = items[0]
  const sizeSuffix = first.size ? ` (${first.size})` : ''
  const base = `${first.productName}${sizeSuffix}`
  return items.length === 1 ? `${base} · 1 item` : `${base} · ${items.length} items`
}

export async function getAdminOrders(tenantId: string, statusFilter?: string): Promise<AdminOrderListItem[]> {
  const orders = await withTenant(tenantId, (db) =>
    db.order.findMany({
      where: { tenantId, ...(statusFilter ? { status: statusFilter } : {}) },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true } },
        items: { select: { productName: true, size: true, quantity: true } },
      },
    })
  )

  return orders.map(
    (order: {
      id: string
      status: string
      total: unknown
      createdAt: Date
      customer: { name: string | null } | null
      items: { productName: string; size: string | null; quantity: number }[]
    }) => ({
      id: order.id,
      code: `#ORD-${order.id.slice(0, 8).toUpperCase()}`,
      status: order.status,
      total: Number(order.total),
      createdAt: order.createdAt,
      customerName: order.customer?.name ?? null,
      itemSummary: itemSummary(order.items),
    })
  )
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `npm run test:run -- lib/data/admin-orders.test.ts`
Expected: PASS

- [ ] **Step 5: Wire real data into the page**

Modify `app/store/admin/orders/page.tsx` (the UI track's mock-wired page) — add `requireOwner()`, fetch via `getAdminOrders(tenantId, searchParams.status)` (read `status` from the page's `searchParams` prop for filter-pill links), map the shared `STATUS_STYLES` by `order.status` for the pill classes (replacing the UI track's inline mock class map), and only render the "Action" button for `status === 'pending'` (opens the action sheet the UI track built in `components/admin/order-action-sheet.tsx`, wired in Task 6).

Start the dev server, verify `/admin/orders` and `/admin/orders?status=pending` render real seeded orders.

- [ ] **Step 6: Commit the data wiring**

```bash
git add app/store/admin/orders/page.tsx lib/data/admin-orders.ts lib/data/admin-orders.test.ts
git commit -m "feat: wire admin orders list to real Prisma data with status filter"
```

---

### Task 6: Order Action Menu (Status Transitions) (Data)

**Files:**
- Create: `app/store/admin/orders/actions.ts`
- Create: `app/store/admin/orders/actions.test.ts`
- Modify: `components/admin/order-action-sheet.tsx` (built by the UI track — wire the real Server Action)

**Interfaces:**
- Produces: Server Action `updateOrderStatus(orderId: string, formData: FormData)` reading a `status` field (`'confirmed' | 'shipped' | 'delivered' | 'cancelled'`) and, when `status === 'shipped'`, a `trackingId` field (the inline tracking-id input the UI track added per Known Gaps).

- [ ] **Step 1: Write failing test for `updateOrderStatus`**

Create `app/store/admin/orders/actions.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/admin-guard', () => ({
  requireOwner: vi.fn(async () => ({ tenantId: 'tenant-1', ownerId: 'owner-1' })),
}))

const updateMock = vi.fn().mockResolvedValue({ id: 'order-1', status: 'shipped' })
vi.mock('@/lib/prisma', () => ({
  withTenant: vi.fn(async (_tenantId: string, fn: (db: unknown) => unknown) => fn({ order: { update: updateMock } })),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { updateOrderStatus } from './actions'

describe('updateOrderStatus', () => {
  it('updates status and stores trackingId when shipping', async () => {
    const formData = new FormData()
    formData.set('status', 'shipped')
    formData.set('trackingId', 'DTDC-123456')

    await updateOrderStatus('order-1', formData)

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 'order-1', tenantId: 'tenant-1' },
      data: { status: 'shipped', trackingId: 'DTDC-123456' },
    })
  })

  it('updates status without trackingId for non-shipping transitions', async () => {
    const formData = new FormData()
    formData.set('status', 'confirmed')

    await updateOrderStatus('order-1', formData)

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 'order-1', tenantId: 'tenant-1' },
      data: { status: 'confirmed' },
    })
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

Run: `npm run test:run -- app/store/admin/orders/actions.test.ts`
Expected: FAIL with "Cannot find module './actions'"

- [ ] **Step 3: Implement `updateOrderStatus`**

Create `app/store/admin/orders/actions.ts`:
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { requireOwner } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'

const VALID_STATUSES = new Set(['confirmed', 'shipped', 'delivered', 'cancelled'])

export async function updateOrderStatus(orderId: string, formData: FormData) {
  const { tenantId } = await requireOwner()

  const status = String(formData.get('status') ?? '')
  if (!VALID_STATUSES.has(status)) throw new Error(`Invalid status: ${status}`)

  const trackingId = formData.get('trackingId')
  const data =
    status === 'shipped' && trackingId
      ? { status: status as 'shipped', trackingId: String(trackingId) }
      : { status: status as 'confirmed' | 'delivered' | 'cancelled' }

  await withTenant(tenantId, (db) => db.order.update({ where: { id: orderId, tenantId }, data }))

  revalidatePath('/admin/orders')
  revalidatePath('/admin/dashboard')
  revalidatePath(`/orders/${orderId}`) // Phase 4's customer-facing order detail page
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `npm run test:run -- app/store/admin/orders/actions.test.ts`
Expected: PASS

- [ ] **Step 5: Wire the Server Action into `OrderActionSheet`**

Modify `components/admin/order-action-sheet.tsx` (the UI track's inert sheet) to call `updateOrderStatus(orderId, formData)` via a `<form action={...}>` on each action row (Confirm/Deliver/Cancel submit immediately on click via a hidden single-field form; Ship submits only after the tracking-id sub-form is filled in). Start the dev server, verify tapping "Confirm Order" on a real seeded pending order actually flips its status (confirm via reload), and that `/orders/{id}` (Phase 4's customer page) reflects the new status.

- [ ] **Step 6: Commit the data wiring**

```bash
git add components/admin/order-action-sheet.tsx app/store/admin/orders/actions.ts app/store/admin/orders/actions.test.ts
git commit -m "feat: wire order action sheet to real status-transition Server Action"
```

---

### Task 7: Settings Page (Store Details, Brand, Payment, Notifications) (Data)

**Files:**
- Create: `app/store/admin/settings/actions.ts`
- Create: `lib/data/admin-settings.test.ts` (co-located with the actions test since settings has no separate read model beyond `Tenant` fields already exposed by `getTenantStorefront`)
- Modify: `app/store/admin/settings/page.tsx` (built by the UI track — swap mock defaults for real data + action)

**Interfaces:**
- Consumes: existing `getTenantStorefront` (`lib/data/tenant.ts`) for the read side — no new read function needed since `Tenant` already has all the fields Paper's settings form edits (`name`, `tagline`, `contactPhone`, `contactEmail`, `brandColor`, `logoUrl`, `paymentProvider`, `notifyEmailOnOrder`).
- Produces: Server Action `updateStoreSettings(formData: FormData)` in `actions.ts`.

- [ ] **Step 1: Write failing test for `updateStoreSettings`**

Create `lib/data/admin-settings.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/admin-guard', () => ({
  requireOwner: vi.fn(async () => ({ tenantId: 'tenant-1', ownerId: 'owner-1' })),
}))

const updateMock = vi.fn().mockResolvedValue({})
vi.mock('@/lib/prisma', () => ({
  withTenant: vi.fn(async (_tenantId: string, fn: (db: unknown) => unknown) => fn({ tenant: { update: updateMock } })),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { updateStoreSettings } from '@/app/store/admin/settings/actions'

describe('updateStoreSettings', () => {
  it('updates the editable Tenant fields from form data', async () => {
    const formData = new FormData()
    formData.set('name', 'Meena Silks')
    formData.set('tagline', 'New tagline')
    formData.set('contactPhone', '+91 90000 00000')
    formData.set('contactEmail', 'new@meenasilks.com')
    formData.set('brandColor', '#4F3FF0')
    formData.set('notifyEmailOnOrder', 'on')

    await updateStoreSettings(formData)

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 'tenant-1' },
      data: {
        name: 'Meena Silks',
        tagline: 'New tagline',
        contactPhone: '+91 90000 00000',
        contactEmail: 'new@meenasilks.com',
        brandColor: '#4F3FF0',
        notifyEmailOnOrder: true,
      },
    })
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

Run: `npm run test:run -- lib/data/admin-settings.test.ts`
Expected: FAIL with "Cannot find module '@/app/store/admin/settings/actions'"

- [ ] **Step 3: Implement `updateStoreSettings`**

Create `app/store/admin/settings/actions.ts`:
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { requireOwner } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'

export async function updateStoreSettings(formData: FormData) {
  const { tenantId } = await requireOwner()

  const data = {
    name: String(formData.get('name') ?? '').trim(),
    tagline: String(formData.get('tagline') ?? '').trim() || null,
    contactPhone: String(formData.get('contactPhone') ?? '').trim() || null,
    contactEmail: String(formData.get('contactEmail') ?? '').trim() || null,
    brandColor: String(formData.get('brandColor') ?? '').trim() || null,
    notifyEmailOnOrder: formData.get('notifyEmailOnOrder') === 'on',
  }

  await withTenant(tenantId, (db) => db.tenant.update({ where: { id: tenantId }, data }))

  revalidatePath('/admin/settings')
  revalidatePath('/') // storefront header/footer read Tenant.name, logoUrl, etc.
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `npm run test:run -- lib/data/admin-settings.test.ts`
Expected: PASS

- [ ] **Step 5: Wire real data + action into the page**

Modify `app/store/admin/settings/page.tsx` (the UI track's mock-wired page) — add `requireOwner()` + `getTenantStorefront(tenantId)` (existing function from `lib/data/tenant.ts`) to populate `defaultValue`s (replacing the "Meena Silks" mock defaults), and set `<form action={updateStoreSettings}>`. Payment/low-stock/review/danger-zone rows stay disabled per Known Gaps.

Start the dev server, verify `/admin/settings` shows the real seeded `silk` tenant's values, verify saving actually persists (reload confirms), and verify the public storefront header (`/`) reflects a changed store name after revalidation.

- [ ] **Step 6: Commit the data wiring**

```bash
git add app/store/admin/settings/page.tsx app/store/admin/settings/actions.ts lib/data/admin-settings.test.ts
git commit -m "feat: wire admin settings page to real Tenant data via Server Action"
```

---

## Post-Plan Verification

- [ ] Run the full test suite: `npm run test:run` — expect all tests (including this phase's new/updated test files) to pass.
- [ ] Run `npm run lint` — expect zero errors introduced by this phase's files.
- [ ] Manually click through `/admin/dashboard` → `/admin/products` (create + edit a product) → `/admin/orders` (confirm/ship/deliver/cancel a seeded pending order via the action sheet) → `/admin/settings` (save a change) on the `silk` tenant subdomain, logged in as the tenant owner. Confirm a non-owner or logged-out user is redirected away from every `/admin/*` route.
- [ ] Confirm `/orders/{id}` (Phase 4, customer-facing) reflects a status change made via the admin action sheet in Task 6 — this is the one cross-phase data dependency this plan introduces.

---

## Self-Review

- **Spec coverage:** All 7 original Phase 5 tasks accounted for: Task 1 carries the full `requireOwner` TDD cycle plus a new explicit step wiring the guard into the layout the UI track shipped guard-free; Tasks 2 and 4–7 carry every data-layer TDD step, Server Action, and mock→real wiring step from the original verbatim; Task 3 keeps the original's full verification-only no-op text (numbering stays aligned with the UI-track sibling). The original's Known Gaps section lives here in full.
- **Placeholder scan:** No `<name>`-style unresolved placeholders. The `// ...same JSX structure...` comments in the wiring steps deliberately reference the UI track's shipped markup rather than duplicating hundreds of lines of JSX — that is the split's intent, not a stub; the exact markup lives in the sibling file's Task steps. The unpersisted Sub Category / Coupon / Specifications fields and the missing Cloudinary pipeline are flagged Known Gaps, not stubs.
- **Type consistency:** `DashboardStats`/`ActionRequiredCounts`/`RecentOrder`, `AdminProduct`, and `AdminOrderListItem` match the `Mock*` fixture shapes the UI track shipped, and the Server Actions' FormData field names (`name`/`description`/`categoryId`/`price`/`comparePrice`/`sizes`/`images`; `status`/`trackingId`; the settings fields) match the form field names in the UI track's JSX — so each wiring step is a data-source swap plus a guard/action prepend inside unchanged JSX. All queries use only real `Tenant`/`Product`/`Order`/`OrderItem`/`Customer`/`ProductCategory` schema fields — no invented `subCategoryId`/`couponEligible`/specifications columns, per Known Gaps.
- **Track discipline:** No new component markup, Tailwind classes, Paper lookups, or visual elements are introduced anywhere in this file — every wiring step reuses the exact JSX the UI track shipped, changing only the data source, the guard, and the form actions. The one Tailwind-string export here, `STATUS_STYLES` in `lib/data/admin-orders.ts`, is data-coupled (keyed by real Prisma status enum values and shared across dashboard/orders/action-sheet wiring), carried exactly as the original plan specified — it replaces the UI track's purely-visual inline mock map at swap time rather than adding new visuals. Every other step writes `lib/admin-guard.ts`, `lib/data/*`, or a Server Action with a Vitest TDD cycle.
