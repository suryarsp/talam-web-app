# Versions Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/admin/versions` to match the established admin visual language, add a date-range filter, and let an owner expand a publish to see which items changed.

**Architecture:** Add an `items` JSON column to `PublishLog`, capture item names in `publishChangesAction` before the existing bulk `updateMany` calls flip draft rows to published, expose the enriched log list through a new server action, and rebuild the page as a client component (matching `admin/dashboard/page.tsx`'s existing pattern) with filter pills and expandable rows.

**Tech Stack:** Next.js (App Router), Prisma, Vitest, lucide-react, Tailwind (project's CSS-variable design tokens).

## Global Constraints

- Only money/security/data-integrity-adjacent logic gets automated tests (per this project's testing convention) — `publishChangesAction` gets a test; the data-read wrapper, the new server action, and the page UI do not.
- Migrations run via the session-mode pooler (port 5432); never `prisma migrate reset` — pre-existing schema drift in this project makes that destructive.
- Use the project's real design tokens already established in `admin/dashboard/page.tsx` (`font-marketing`, `text-muted-warm`, `bg-surface`, `text-2xs uppercase tracking-[0.06em]`, `rounded-full` pill filters) — not Paper's token names, which differ from what's wired into `app/globals.css`.
- Client components in this admin section fetch via a server action on mount (`useEffect` + `useState`), matching `admin/dashboard/page.tsx` and `admin/orders/page.tsx` — no URL search params for filter state.

---

### Task 1: Add `items` column to `PublishLog`

**Files:**
- Modify: `prisma/schema.prisma:423-433`
- Create: `prisma/migrations/20260726010000_publish_log_items/migration.sql`

**Interfaces:**
- Produces: `PublishLog.items` — a `Json` column, DB default `'[]'`, storing an array of `{ type: 'product' | 'store_info' | 'occasion', name: string }` (shape enforced in application code in Task 2, not at the DB level).

- [ ] **Step 1: Add the field to the schema**

In `prisma/schema.prisma`, the `PublishLog` model currently reads:

```prisma
model PublishLog {
  id          String   @id @default(uuid()) @db.Uuid
  tenantId    String   @map("tenant_id") @db.Uuid
  publishedAt DateTime @default(now()) @map("published_at") @db.Timestamptz
  itemCount   Int      @map("item_count")
  summary     String

  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@map("publish_logs")
}
```

Change it to:

```prisma
model PublishLog {
  id          String   @id @default(uuid()) @db.Uuid
  tenantId    String   @map("tenant_id") @db.Uuid
  publishedAt DateTime @default(now()) @map("published_at") @db.Timestamptz
  itemCount   Int      @map("item_count")
  summary     String
  items       Json     @default("[]") @map("items")

  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@map("publish_logs")
}
```

- [ ] **Step 2: Write the migration SQL**

Create `prisma/migrations/20260726010000_publish_log_items/migration.sql`:

```sql
ALTER TABLE "publish_logs" ADD COLUMN "items" JSONB NOT NULL DEFAULT '[]';
```

- [ ] **Step 3: Apply the migration and regenerate the Prisma client**

Run:
```bash
npx prisma migrate deploy
npx prisma generate
```
Expected: migration applies cleanly against the session-mode pooler connection already configured for this project; `npx prisma generate` completes without error.

- [ ] **Step 4: Verify the schema compiles**

Run: `npx tsc --noEmit`
Expected: no new type errors (the `items` field isn't consumed by any code yet, so this just confirms the generated Prisma types are valid).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260726010000_publish_log_items
git commit -m "feat(db): add items column to publish_logs"
```

---

### Task 2: Extend `listPublishLogs` to return typed item data

**Files:**
- Modify: `lib/data/publish-logs.ts`

**Interfaces:**
- Consumes: `PublishLog.items` (Prisma `Json` field, Task 1).
- Produces:
  - `export type PublishLogItem = { type: 'product' | 'store_info' | 'occasion'; name: string }`
  - `export type PublishLogEntry = { id: string; publishedAt: Date; summary: string; itemCount: number; items: PublishLogItem[] }`
  - `export async function listPublishLogs(tenantId: string): Promise<PublishLogEntry[]>`

No automated test for this task — it's a thin data-read wrapper with no branching logic beyond a null-safety cast, matching this project's convention of not unit-testing pure display/query code.

- [ ] **Step 1: Update the file**

Replace the full contents of `lib/data/publish-logs.ts` with:

```ts
import { withTenant } from '@/lib/prisma'

export type PublishLogItem = { type: 'product' | 'store_info' | 'occasion'; name: string }

export type PublishLogEntry = {
  id: string
  publishedAt: Date
  summary: string
  itemCount: number
  items: PublishLogItem[]
}

export async function listPublishLogs(tenantId: string): Promise<PublishLogEntry[]> {
  const logs = await withTenant(tenantId, (db) =>
    db.publishLog.findMany({
      where: { tenantId },
      orderBy: { publishedAt: 'desc' },
      select: { id: true, publishedAt: true, summary: true, itemCount: true, items: true },
    })
  )

  return logs.map((log) => ({
    ...log,
    items: Array.isArray(log.items) ? (log.items as unknown as PublishLogItem[]) : [],
  }))
}
```

The `Array.isArray` check handles both the DB default (`'[]'`, which parses to `[]`) and defends against a malformed/null value without throwing.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/data/publish-logs.ts
git commit -m "feat: return typed items from listPublishLogs"
```

---

### Task 3: Capture item names in `publishChangesAction`

**Files:**
- Modify: `app/admin/actions.ts`
- Modify: `app/admin/actions.test.ts`

**Interfaces:**
- Consumes: `PublishLogItem` type (Task 2, `@/lib/data/publish-logs`).
- Produces: `publishChangesAction`'s signature is unchanged (`(input?: { force?: boolean }) => Promise<PublishResult>`); its `PublishLog.create` call now includes `items: PublishLogItem[]` alongside the existing `tenantId`/`itemCount`/`summary`.

- [ ] **Step 1: Write the failing test**

Replace the full contents of `app/admin/actions.test.ts` with:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequireOwnerTenant, mockProductFindMany, mockStoreAboutFindFirst, mockProductTagFindMany, mockTransaction, mockCreate } =
  vi.hoisted(() => ({
    mockRequireOwnerTenant: vi.fn(async () => ({ userId: 'u1', tenantId: 'tenant-1' })),
    mockProductFindMany: vi.fn(),
    mockStoreAboutFindFirst: vi.fn(),
    mockProductTagFindMany: vi.fn(),
    mockTransaction: vi.fn(),
    mockCreate: vi.fn(),
  }))

vi.mock('@/lib/admin-guard', () => ({ requireOwnerTenant: mockRequireOwnerTenant }))

vi.mock('@/lib/prisma', () => ({
  withTenant: vi.fn(async (_tenantId: string, fn: (client: unknown) => Promise<unknown>) =>
    fn({
      product: { findMany: mockProductFindMany, updateMany: vi.fn() },
      storeAbout: { findFirst: mockStoreAboutFindFirst, updateMany: vi.fn() },
      productTag: { findMany: mockProductTagFindMany, updateMany: vi.fn() },
      publishLog: { create: mockCreate },
      $transaction: mockTransaction,
    })
  ),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { publishChangesAction } from './actions'

describe('publishChangesAction', () => {
  beforeEach(() => {
    mockProductFindMany.mockReset()
    mockStoreAboutFindFirst.mockReset()
    mockProductTagFindMany.mockReset()
    mockTransaction.mockReset()
    mockCreate.mockReset()
  })

  it('returns conflicts without publishing when a draft product has open orders', async () => {
    mockProductFindMany.mockResolvedValueOnce([
      { name: 'Silk Saree', _count: { orderItems: 2 } },
    ])

    const result = await publishChangesAction()

    expect(result.conflicts).toEqual([{ productName: 'Silk Saree', openOrderCount: 2 }])
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('publishes directly and captures item names when there are no conflicts', async () => {
    mockProductFindMany
      .mockResolvedValueOnce([]) // conflict check: no open-order conflicts
      .mockResolvedValueOnce([
        { name: 'Cotton Kurta Set' },
        { name: 'Silk Banarasi Saree' },
        { name: 'Anarkali Suit' },
      ]) // draft name capture
    mockStoreAboutFindFirst.mockResolvedValueOnce(null)
    mockProductTagFindMany.mockResolvedValueOnce([{ name: 'Diwali Sale' }])
    mockTransaction.mockResolvedValueOnce([{ count: 3 }, { count: 0 }, { count: 1 }])

    const result = await publishChangesAction()

    expect(result.conflicts).toBeUndefined()
    expect(mockTransaction).toHaveBeenCalledTimes(1)
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        itemCount: 4,
        summary: '3 products, 1 occasion',
        items: [
          { type: 'product', name: 'Cotton Kurta Set' },
          { type: 'product', name: 'Silk Banarasi Saree' },
          { type: 'product', name: 'Anarkali Suit' },
          { type: 'occasion', name: 'Diwali Sale' },
        ],
      },
    })
  })

  it('includes store info in captured items when StoreAbout has a draft', async () => {
    mockProductFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([])
    mockStoreAboutFindFirst.mockResolvedValueOnce({ id: 'about-1' })
    mockProductTagFindMany.mockResolvedValueOnce([])
    mockTransaction.mockResolvedValueOnce([{ count: 0 }, { count: 1 }, { count: 0 }])

    await publishChangesAction()

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        itemCount: 1,
        summary: 'store info',
        items: [{ type: 'store_info', name: 'Store info' }],
      },
    })
  })

  it('force publishes even when conflicts exist, skipping only the pre-check', async () => {
    mockProductFindMany.mockResolvedValueOnce([]) // draft name capture only — no conflict-check call
    mockStoreAboutFindFirst.mockResolvedValueOnce(null)
    mockProductTagFindMany.mockResolvedValueOnce([])
    mockTransaction.mockResolvedValueOnce([{ count: 1 }, { count: 0 }, { count: 0 }])

    const result = await publishChangesAction({ force: true })

    expect(result.conflicts).toBeUndefined()
    expect(mockTransaction).toHaveBeenCalledTimes(1)
    expect(mockProductFindMany).toHaveBeenCalledTimes(1)
    expect(mockProductFindMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', status: 'draft' },
      select: { name: true },
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run app/admin/actions.test.ts`
Expected: FAIL — `mockCreate` is called without `items` (current implementation doesn't capture or pass it), and `mockStoreAboutFindFirst`/`mockProductTagFindMany` are never called since the current code only reads counts via the transaction.

- [ ] **Step 3: Implement the item capture**

Replace the full contents of `app/admin/actions.ts` with:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireOwnerTenant } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'
import type { PublishLogItem } from '@/lib/data/publish-logs'

const OPEN_ORDER_STATUSES = ['pending', 'confirmed', 'shipped'] as const

export type PublishConflict = { productName: string; openOrderCount: number }
export type PublishResult = { conflicts?: PublishConflict[] }

export async function getPendingChangeCountAction(): Promise<number> {
  const { tenantId } = await requireOwnerTenant()
  const [products, about, occasions] = await withTenant(tenantId, (db) =>
    Promise.all([
      db.product.count({ where: { tenantId, status: 'draft' } }),
      db.storeAbout.count({ where: { tenantId, status: 'draft' } }),
      db.productTag.count({ where: { tenantId, status: 'draft' } }),
    ])
  )
  return products + about + occasions
}

export async function publishChangesAction(input?: { force?: boolean }): Promise<PublishResult> {
  const { tenantId } = await requireOwnerTenant()

  if (!input?.force) {
    const conflictingProducts = await withTenant(tenantId, (db) =>
      db.product.findMany({
        where: {
          tenantId,
          status: 'draft',
          orderItems: { some: { order: { status: { in: [...OPEN_ORDER_STATUSES] } } } },
        },
        select: {
          name: true,
          _count: { select: { orderItems: { where: { order: { status: { in: [...OPEN_ORDER_STATUSES] } } } } } },
        },
      })
    )

    if (conflictingProducts.length > 0) {
      return {
        conflicts: conflictingProducts.map((p) => ({
          productName: p.name,
          openOrderCount: p._count.orderItems,
        })),
      }
    }
  }

  const [draftProducts, draftAbout, draftOccasions] = await withTenant(tenantId, (db) =>
    Promise.all([
      db.product.findMany({ where: { tenantId, status: 'draft' }, select: { name: true } }),
      db.storeAbout.findFirst({ where: { tenantId, status: 'draft' } }),
      db.productTag.findMany({ where: { tenantId, status: 'draft' }, select: { name: true } }),
    ])
  )

  const items: PublishLogItem[] = [
    ...draftProducts.map((p) => ({ type: 'product' as const, name: p.name })),
    ...(draftAbout ? [{ type: 'store_info' as const, name: 'Store info' }] : []),
    ...draftOccasions.map((o) => ({ type: 'occasion' as const, name: o.name })),
  ]

  const [products, about, occasions] = await withTenant(tenantId, (db) =>
    db.$transaction([
      db.product.updateMany({ where: { tenantId, status: 'draft' }, data: { status: 'published' } }),
      db.storeAbout.updateMany({ where: { tenantId, status: 'draft' }, data: { status: 'published' } }),
      db.productTag.updateMany({ where: { tenantId, status: 'draft' }, data: { status: 'published' } }),
    ])
  )

  const itemCount = products.count + about.count + occasions.count
  if (itemCount > 0) {
    const parts: string[] = []
    if (products.count) parts.push(`${products.count} product${products.count === 1 ? '' : 's'}`)
    if (about.count) parts.push('store info')
    if (occasions.count) parts.push(`${occasions.count} occasion${occasions.count === 1 ? '' : 's'}`)

    await withTenant(tenantId, (db) =>
      db.publishLog.create({ data: { tenantId, itemCount, summary: parts.join(', '), items } })
    )
  }

  revalidatePath('/admin/products')
  revalidatePath('/admin/settings')
  revalidatePath('/admin/versions')
  revalidatePath('/store')

  return {}
}
```

The item-capture read runs after the conflict pre-check (so a conflict still returns early without any reads beyond the pre-check) but before the transaction that flips `status: draft → published` — it's a separate, non-transactional `Promise.all` of reads, consistent with the existing conflict-check read that's also outside the transaction. Per this project's single-owner-per-tenant assumption (documented in the 2026-07-18 publish-workflow spec), there's no concurrent-write race to guard against here.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run app/admin/actions.test.ts`
Expected: PASS, all 4 tests.

- [ ] **Step 5: Commit**

```bash
git add app/admin/actions.ts app/admin/actions.test.ts
git commit -m "feat: capture per-item names in publishChangesAction"
```

---

### Task 4: Add `getPublishLogsAction` server action

**Files:**
- Create: `app/admin/versions/actions.ts`

**Interfaces:**
- Consumes: `listPublishLogs`, `PublishLogEntry` (Task 2, `@/lib/data/publish-logs`); `requireOwnerTenant` (`@/lib/admin-guard`).
- Produces: `export async function getPublishLogsAction(): Promise<PublishLogEntry[]>`

No automated test — thin auth-scoped read wrapper, same shape as `getLiveStoreUrl`/`getTenantLiveStateAction` in `app/admin/dashboard/actions.ts`, which also aren't unit-tested in this codebase.

- [ ] **Step 1: Create the file**

```ts
'use server'

import { requireOwnerTenant } from '@/lib/admin-guard'
import { listPublishLogs, type PublishLogEntry } from '@/lib/data/publish-logs'

export async function getPublishLogsAction(): Promise<PublishLogEntry[]> {
  const { tenantId } = await requireOwnerTenant()
  return listPublishLogs(tenantId)
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/admin/versions/actions.ts
git commit -m "feat: add getPublishLogsAction for the Versions page"
```

---

### Task 5: Redesign the Versions page

**Files:**
- Modify: `app/admin/versions/page.tsx`

**Interfaces:**
- Consumes: `getPublishLogsAction` (Task 4, `./actions`); `PublishLogEntry`, `PublishLogItem` (Task 2, `@/lib/data/publish-logs`).

No automated test — pure UI/layout, matching this project's convention (the 2026-07-18 publish-workflow spec explicitly left the `/welcome` publishes list and profile dropdown untested for the same reason).

- [ ] **Step 1: Replace the page**

Replace the full contents of `app/admin/versions/page.tsx` with:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { History, Package, PartyPopper, Store } from 'lucide-react'
import { getPublishLogsAction } from './actions'
import type { PublishLogEntry, PublishLogItem } from '@/lib/data/publish-logs'

function formatPublishedAt(date: Date) {
  return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const FILTERS = ['All', 'This Week', 'This Month', 'Last 3 Months'] as const
type Filter = (typeof FILTERS)[number]

function cutoffFor(filter: Filter): Date | null {
  const now = Date.now()
  const DAY = 24 * 60 * 60 * 1000
  if (filter === 'This Week') return new Date(now - 7 * DAY)
  if (filter === 'This Month') return new Date(now - 30 * DAY)
  if (filter === 'Last 3 Months') return new Date(now - 90 * DAY)
  return null
}

function iconForItems(items: PublishLogItem[]) {
  const firstType = items[0]?.type
  if (firstType === 'product') return Package
  if (firstType === 'occasion') return PartyPopper
  if (firstType === 'store_info') return Store
  return History
}

function itemLabel(item: PublishLogItem) {
  if (item.type === 'store_info') return 'Store info'
  return `${item.name} (${item.type})`
}

export default function AdminVersionsPage() {
  const [logs, setLogs] = useState<PublishLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<Filter>('All')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    getPublishLogsAction()
      .then(setLogs)
      .finally(() => setLoading(false))
  }, [])

  const cutoff = cutoffFor(activeFilter)
  const filteredLogs = cutoff ? logs.filter((log) => log.publishedAt >= cutoff) : logs

  return (
    <div className="px-4 pb-8 md:px-0">
      <div className="pb-5 pt-1 md:pt-0">
        <p className="text-2xs font-medium uppercase tracking-[0.06em] text-muted-warm">Publish History</p>
        <h1 className="font-marketing mt-0.5 text-[24px] font-semibold leading-tight text-fg md:text-[28px]">Versions</h1>
        <p className="mt-1 text-sm text-muted-warm">Every publish is saved here — what changed, and when.</p>
      </div>

      <div className="mb-5 flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`shrink-0 cursor-pointer rounded-full px-3 py-[5px] text-2xs font-semibold transition-colors ${
              filter === activeFilter ? 'bg-fg text-surface' : 'text-muted-warm hover:text-fg'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {!loading && filteredLogs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-bg">
            <History className="size-5 text-muted-warm" strokeWidth={2} />
          </span>
          <p className="text-sm text-muted-warm">
            {logs.length === 0 ? 'No versions published yet.' : 'No publishes in this range.'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-lg bg-surface sm:block">
            <div className="grid grid-cols-[20px_1fr_2fr_auto] items-center gap-x-4 border-b border-border px-4 pb-2 pt-3 text-xs font-bold uppercase tracking-[0.06em] text-muted-warm">
              <span />
              <span>Published</span>
              <span>What changed</span>
              <span>Items</span>
            </div>
            {filteredLogs.map((log, i) => {
              const Icon = iconForItems(log.items)
              const expanded = expandedId === log.id
              return (
                <div key={log.id} className={i > 0 ? 'border-t border-border-light' : ''}>
                  <button
                    onClick={() => setExpandedId(expanded ? null : log.id)}
                    className="grid w-full cursor-pointer grid-cols-[20px_1fr_2fr_auto] items-center gap-x-4 px-4 py-3 text-left text-sm transition-colors hover:bg-bg"
                  >
                    <Icon className="size-4 shrink-0 text-muted-warm" strokeWidth={2} />
                    <span className="text-fg">{formatPublishedAt(log.publishedAt)}</span>
                    <span className="text-fg">{log.summary}</span>
                    <span className="text-muted-warm">{log.itemCount}</span>
                  </button>
                  {expanded && log.items.length > 0 ? (
                    <ul className="flex flex-col gap-1 px-4 pb-3 pl-11 text-xs text-muted-warm">
                      {log.items.map((item, idx) => (
                        <li key={idx}>• {itemLabel(item)}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              )
            })}
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-2 sm:hidden">
            {filteredLogs.map((log) => {
              const Icon = iconForItems(log.items)
              const expanded = expandedId === log.id
              return (
                <div key={log.id} className="rounded-lg border border-border-light bg-surface p-3">
                  <button
                    onClick={() => setExpandedId(expanded ? null : log.id)}
                    className="flex w-full cursor-pointer items-start gap-3 text-left"
                  >
                    <Icon className="mt-0.5 size-4 shrink-0 text-muted-warm" strokeWidth={2} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-fg">{log.summary}</p>
                      <p className="mt-1 text-xs text-muted-warm">
                        {formatPublishedAt(log.publishedAt)} · {log.itemCount} item{log.itemCount === 1 ? '' : 's'}
                      </p>
                    </div>
                  </button>
                  {expanded && log.items.length > 0 ? (
                    <ul className="mt-2 flex flex-col gap-1 pl-7 text-xs text-muted-warm">
                      {log.items.map((item, idx) => (
                        <li key={idx}>• {itemLabel(item)}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification in the browser**

Run the dev server, sign in as a tenant owner, navigate to `/admin/versions`, and confirm:
- Filter pills render and switching between them changes which rows show (test against a tenant with publishes older than a week, if seed data allows — otherwise confirm "All" shows everything and the others don't error on an empty result).
- Clicking a row expands/collapses the item list beneath it, on both desktop (resize to confirm the table variant) and mobile width.
- The empty state (no publishes at all) still renders correctly for a tenant with none.

Per this project's known limitation, there's no dev-auth bypass — this check requires an authenticated admin session; if one isn't available, confirm via `npx tsc --noEmit` and a careful code read instead, and say so explicitly rather than claiming an in-browser check happened.

- [ ] **Step 4: Commit**

```bash
git add app/admin/versions/page.tsx
git commit -m "feat: redesign Versions page with filters and expandable item detail"
```

---

### Task 6: Design the page in Paper (documentation parity with the rest of the admin UI)

**Files:** None (Paper file only — `Talam Design`, `Admin Dashboard` page).

This project's convention (established for Dashboard/Orders/Products/Customers) is that every admin page has a matching Paper artboard as the design source of truth, and none exists yet for Versions. This task creates `Admin Dashboard / Versions / Desktop` and `Admin Dashboard / Versions / Mobile` artboards reflecting the shipped design from Task 5 (filter pills, icon + row layout, expanded-row item list), using the Paper MCP tools the same way the Customers page artboards were built: clone the existing sidebar/header/bottom-nav from the Orders artboards, set "Versions" active, and build the table/card rows fresh using the design-token CSS variables already defined in the file.

- [ ] **Step 1:** Build the desktop artboard, screenshot, and review against the checkpoints (spacing, typography, contrast, alignment, artboard fit).
- [ ] **Step 2:** Build the mobile artboard, screenshot, and review against the same checkpoints.
- [ ] **Step 3:** Call `finish_working_on_nodes`.

No commit — Paper files aren't part of this git repo.

---

## Self-Review Notes

- **Spec coverage:** §2 (visual redesign) → Task 5. §3 (filter pills) → Task 5. §4 (expand-row detail) → Task 5. §5 (data model) → Task 1. §6 (`publishChangesAction` change) → Task 3. §7 (client component + server action) → Tasks 4–5. §8 (testing) → Task 3's test file, explicitly no tests elsewhere per convention. §9 (migration) → Task 1. Paper design parity wasn't in the original spec's numbered sections but matches this project's established convention for every other admin page, so it's added as Task 6.
- **Type consistency:** `PublishLogItem` and `PublishLogEntry` are defined once in Task 2 and imported by name (never redefined) in Tasks 3, 4, and 5.
- **No placeholders:** every step has runnable code or an exact command.
