# Phase 5: Tenant Admin Implementation Plan — UI Track

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Track order:** This is a **UI-track** plan — part of the front-end-first pass across all 8 phases. Do not start any phase's **Data-track** plan until every phase's UI-track plan is complete. See the sibling `2026-07-06-talam-phase-5-tenant-admin-data.md` for the `requireOwner` admin guard, Prisma data layers (dashboard stats, admin products, admin orders), the product/order/settings Server Actions, and the real-data + guard wiring that follow this file.

**Goal:** Build the per-tenant store-owner admin panel UI at the `/admin` route space — dashboard stats, product list + editor, order management with a status-transition action sheet, and store settings (brand/payment/notifications) — as mock-wired UI matching the live Paper "Admin Dashboard" page (team `Surya's Team`, file `Talam Design` id `01KVZYTDJNREHBACTQMT2D9HR9`, page id `4-0`) pixel-for-pixel at 390px and 1440/1500px. This is the **tenant** admin (one store owner managing their own store), NOT the platform `/super-admin` (a separate Phase 6 concern, out of scope here). Auth guarding, Prisma queries, Server Actions, and real-data wiring are out of scope for this file — see the Data-track sibling.

**Architecture:** The middleware (`middleware.ts`) rewrites every tenant-subdomain request to `app/store/*`, so admin pages live at `app/store/admin/**` and resolve to the public URL `/admin/**` on the tenant subdomain — exactly parallel to how Phase 4's `app/store/orders/page.tsx` resolves to `/orders`. Every task in this file follows Design → Mock UI → Verify → Commit: build against the exact Paper JSX/copy/colors captured below with typed mock data, screenshot-verify against Paper, commit. **These are owner-gated screens, but the UI track builds them WITHOUT the real `requireOwner` guard** (same convention Phase 4 used for its auth-gated pages): the admin layout and every admin page render an inline mocked owner state — the `MOCK_*` fixtures below stand in for the logged-in owner's store data — so every screen can be screenshot-verified on the dev server without a session or ownership check. The Data-track sibling adds `requireOwner()` to the layout and pages when it swaps mocks for Prisma data.

**Tech Stack:** Next.js App Router (SSR), `components/ui/*` (shadcn/ui), Tailwind v4 with project tokens (`app/globals.css`), `lucide-react` icons, Claude Preview MCP / dev-server screenshots for the verification steps. Admin UI uses `--font-admin` (`system-ui, sans-serif` — a real Paper token, distinct from the storefront's Playfair/DM Sans) — this token is **not yet** in `app/globals.css` and must be added in Task 1.

## Global Constraints

- Inherit all prior phase constraints as context, but do not write any Prisma, Server Action, API-route, or auth-guard code in this file — that is the Data-track's job. If a task needs a data shape that doesn't exist yet, mock it locally typed like the real shape and leave the real wiring to the Data-track sibling.
- All admin pages: `export const dynamic = 'force-dynamic'`.
- **No `requireOwner` calls in this track.** Admin pages are owner-gated in the finished product, but in this file the layout and each page render mock fixture data — an inline mocked owner state — so they render and screenshot on the dev server without a session. The Data-track sibling adds the guard and the `/auth?next={path}` redirect behavior. Do not add redirects, session reads, or `lib/admin-guard.ts` imports here.
- Design ground truth is the live Paper file "Talam Design", page **"Admin Dashboard"** (page id `4-0`, NOT page `1-0` "Store Front" used by Phases 2–4) — NOT `docs/design/2026-06-23-talam-oss-design.md`, which can lag. Exact copy/colors/spacing below were pulled directly from that page's artboards: Dashboard (`2KY-0` mobile / `2QM-0` desktop), Products (`5EX-0` mobile / `5EY-0` desktop, editor modal `5SI-0` mobile / `5SJ-0` desktop), Orders (`695-0` mobile list / `696-0` mobile action-menu / `6LS-0` desktop / `6QI-0` desktop details modal), Settings (`7HK-0` mobile / `7L5-0`, `7OK-0`–`8G8-0` desktop sub-pages).
- Design tokens: admin screens use **`--font-admin: system-ui, sans-serif`** (not `--font-heading`/`--font-body`) and the **brand** palette, distinct from the storefront's pink `--color-store-primary`: `--color-brand-primary: #4F3FF0` (admin's primary action/accent color, already in `app/globals.css`), plus `--color-fg: #18181B`, `--color-muted: #8B7D7A`, `--color-border: #E8E8E8`, `--color-surface: #FFFFFF`, `--color-bg: #F9F9F9`, `--color-amber: #F59E0B`, `--color-danger: #EF4444`, `--color-success: #10B981`. Status-pill colors that aren't tokens yet (used as literals, matching Paper exactly): pending `#FB923C1A` bg / `#FB923C` border / `#92400E` text; confirmed `#DBEAFE` bg / `#1D4ED8` text; shipped `#EFF6FF` bg / `#3B82F6` border/text; delivered success token; cancelled `#FEF2F2` bg / `#EF4444` border / `#991B1B` text.
- Admin routes render **without** `StoreHeader`/`StoreFooter`/`MobileTabBar` (those are storefront-only chrome from `app/store/layout.tsx`) — instead `app/store/admin/layout.tsx` renders its own admin chrome (desktop: dark `#1F2937` sidebar per Paper `2UP-0`; mobile: top header + fixed bottom nav per Paper's repeated `Frame "Frame" (8J4-0 / 5GX-0 / 8JZ-0 / 8KU-0)` bottom-nav pattern, identical across all four admin sections: Dashboard / Products / Orders / Settings, with **no Customers tab in Paper's actual bottom nav** — see Known Gaps in the Data-track sibling).
- Verification step for every UI task: start the dev server, hit the page through the `silk` tenant subdomain path (per the local dev routing gotcha — bare localhost root 404s on `/store/*` by design), resize to 390px (and 1440/1500px where a desktop artboard exists), screenshot and compare against the cited Paper artboard, console errors must be empty, failed network requests must be empty.

---

## Known Gaps

Phase 5's flagged gaps (no Customers page in Paper, the schema-less product-editor fields, the Ship Order tracking-id gap-fill, the desktop Orders details-modal data reuse, the Settings desktop sub-page consolidation, the read-only payment gateways, and the missing Cloudinary upload pipeline) live in the "Known Gaps" section of the sibling `2026-07-06-talam-phase-5-tenant-admin-data.md`. The ones that shape UI decisions in this file are repeated inline where they matter: the admin nav has exactly 4 items (no Customers — Task 1), the Sub Category / Coupon Applicable / Product Specifications fields render disabled (Task 4), the image dropzone is a plain `<input type="file">` with client-side preview (Task 4), the Ship Order row gets a minimal inline tracking-id input (Task 6), and the Payment Gateways / extra notification toggles / Danger Zone rows render disabled (Task 7).

---

### Task 1: Admin Font Token and Layout Shell (UI)

**Files:**
- Modify: `app/globals.css` (add `--font-admin` token)
- Create: `app/store/admin/layout.tsx`

**Interfaces:**
- Produces: admin layout — desktop dark sidebar nav (Dashboard/Orders/Products/Settings), mobile top header + bottom nav (same 4 items)

The `requireOwner` guard (`lib/admin-guard.ts` + Vitest test) is backend — all its steps live in `2026-07-06-talam-phase-5-tenant-admin-data.md` Task 1, which also wires `await requireOwner()` into this layout. **In this track the layout renders with an inline mocked owner state — no guard call, no session read** — so the chrome can be screenshot-verified without auth.

- [ ] **Step 1: Add the `--font-admin` token**

Modify `app/globals.css` — add to the `@theme inline` block, right after `--font-body`:
```css
  --font-admin: var(--font-admin);
```
And in `:root`, add:
```css
  --font-admin: system-ui, sans-serif;
```
(This mirrors how `--font-heading`/`--font-body` are wired — a CSS variable referencing itself inside `@theme inline` so Tailwind exposes `font-admin` as a utility class, with the literal value defined once in `:root`.)

- [ ] **Step 2: Build the admin layout against Paper mock structure**

Paper's mobile bottom nav (repeated identically on all 4 mobile artboards, e.g. `8J4-0` on Dashboard) shows 5 icon+label tabs in a 390×64 bar: Dashboard, Products, Orders, Customers, Settings — **wait, re-check**: the actual tree summary shows exactly 4 labeled tabs per artboard (`Dashboard`, `Products`, `Orders`, `Settings` — confirmed via `get_tree_summary` on `2KY-0`, `5EX-0`, `695-0`, `7HK-0`, each showing 4 `Frame` children under the bottom-nav frame, no "Customers" child). Build with exactly these 4.

Paper's desktop sidebar (`2UP-0`, reused across desktop artboards, 280px wide, `bg-[#1F2937]`) shows: a 48×48 rounded brand-primary logo mark at top, then 4 nav rows (Overview/Orders/Products/Settings) each `py-3 px-4 gap-3` with a 24×24 stroke icon (`#9CA3AF` inactive, `#4F3FF0` + `bg-[#4F3FF01A]` pill when active) and a label in `text-md` (14px) `font-admin font-medium`.

Create `app/store/admin/layout.tsx` — **note: no `requireOwner` import or call; the layout renders as if the owner is logged in (mocked owner state — the "S" avatar initial below is the mock). The Data-track sibling's Task 1 adds `await requireOwner()` as the first line of this component.**
```tsx
import Link from 'next/link'
import { LayoutDashboard, Package, ShoppingBag, Settings } from 'lucide-react'

export const dynamic = 'force-dynamic'

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', mobileLabel: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'Orders', mobileLabel: 'Orders', icon: ShoppingBag },
  { href: '/admin/products', label: 'Products', mobileLabel: 'Products', icon: Package },
  { href: '/admin/settings', label: 'Settings', mobileLabel: 'Settings', icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-admin min-h-screen bg-bg">
      {/* Desktop: dark sidebar + content */}
      <div className="hidden md:flex">
        <aside className="flex h-screen w-[280px] shrink-0 flex-col items-start gap-2 bg-[#1F2937] pt-4 pl-4">
          <div className="mb-2 flex size-12 shrink-0 items-center justify-center rounded-lg bg-brand-primary">
            <span className="font-admin text-xl font-bold text-surface">●</span>
          </div>
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex w-[calc(100%-32px)] items-center gap-3 rounded-lg px-4 py-3 text-[#9CA3AF] font-medium hover:bg-[#4F3FF01A] hover:text-brand-primary"
            >
              <Icon className="size-6" strokeWidth={1.8} />
              <span className="text-md">{label}</span>
            </Link>
          ))}
        </aside>
        <div className="flex-1">
          <header className="flex h-[72px] items-center justify-between border-b border-[#E5E7EB] bg-surface px-8">
            <span className="text-[24px] font-bold text-[#111827]">talam.</span>
            <div className="flex items-center gap-4">
              <div className="relative size-6">
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="absolute -right-1 -top-1 size-2 rounded-full bg-danger" />
              </div>
              <div className="flex size-8 items-center justify-center rounded-full bg-brand-primary">
                <span className="text-xs font-semibold text-surface">S</span>
              </div>
            </div>
          </header>
          <main className="p-8">{children}</main>
        </div>
      </div>

      {/* Mobile: top header + content + fixed bottom nav */}
      <div className="md:hidden">
        <header className="flex h-[60px] items-center justify-between border-b border-border bg-surface px-4 py-3">
          <span className="text-base font-bold text-fg">talam.</span>
        </header>
        <main className="pb-20">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-start justify-around border-t border-border bg-surface pt-2">
          {NAV.map(({ href, mobileLabel, icon: Icon }) => (
            <Link key={href} href={href} className="flex flex-col items-center gap-[3px] text-muted">
              <Icon className="size-[22px]" strokeWidth={1.8} />
              <span className="text-[10px] font-semibold uppercase tracking-[0.04em]">{mobileLabel}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify layout renders at 390px and 1440px**

Start dev server (`npm run dev`), hit the `silk` tenant subdomain path, navigate to `/admin/dashboard` (page doesn't exist yet — a 404 under the layout is fine for this step; confirm the layout chrome itself: sidebar/header at 1440px, top bar + bottom nav at 390px). Zero console errors.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css app/store/admin/layout.tsx
git commit -m "feat: add admin font token and admin layout shell matching Paper design"
```

---

### Task 2: Admin Dashboard Page (UI)

**Files:**
- Create: `app/store/admin/dashboard/page.tsx`

**Interfaces:**
- Produces: `/admin/dashboard` page rendering time-filter pills, action-required alerts, 2×2 stat grid, chart, top products, and recent orders from typed mock data. The `MockStat`/`MockAlert`/`MockOrder` shapes mirror what the Data-track's `getDashboardStats`/`getActionRequiredCounts`/`getRecentOrders` (`lib/data/admin-dashboard.ts`) will return, so the mock→real swap is a data-source replacement, not a rewrite.

- [ ] **Step 1: Build the dashboard page against Paper mock data**

Paper's "Admin Dashboard / Mobile" artboard (`2KY-0`, 390×1552) shows, top to bottom: Header (`talam.` wordmark + bell icon with red dot + avatar circle "S"); a horizontal Time Filter pill row (Today/Yesterday/This Week/This Month, "Today" active on `bg-brand-primary` white text, others `border-border` `text-muted`); an "Action Required" section (label `text-xs font-semibold uppercase text-muted tracking-wide`) with 3 alert rows — amber-left-border rows (`bg-[#F59E0B0F]`, `border-l-[3px] border-l-amber`) for "3 orders awaiting confirmation" and "2 items running low", and a red-left-border row (`bg-[#EF44440F]`, `border-l-[3px] border-l-danger`) for "1 payment failed — Razorpay"; a 2×2 Stats Grid (Revenue ₹24,500 ↑+18%, Orders 38 ↓-5%, Customers 142 ↑+3 new today, Avg Order Value ₹645 ↑+₹120) each card `rounded-lg border border-border p-[14px]` with the stat label, big value, and a colored trend line (green `text-success` for up, red `text-danger` for down); a Chart Section with a "Revenue Trend" label + 3-pill metric toggle (Revenue/Orders/Customers, Revenue active) + an SVG line+area chart (Mon–Sun x-axis, gridlines at 30k/20k/10k/0, brand-primary stroke `#4F3FF0`); a "Top Products" row of 3 120×164 product cards (image + name + sales count); a "Recent Orders" list of 3 cards (`rounded-xl border border-border p-[14px]`, each: order id + relative time, customer name, item summary, price + colored status pill) with a "View all" link.

Create `app/store/admin/dashboard/page.tsx`:
```tsx
import { Bell, TrendingUp, TrendingDown } from 'lucide-react'

export const dynamic = 'force-dynamic'

type MockStat = { label: string; value: string; change: string; up: boolean }
const MOCK_STATS: MockStat[] = [
  { label: 'Revenue', value: '₹24,500', change: '+18% vs yesterday', up: true },
  { label: 'Orders', value: '38', change: '-5% vs yesterday', up: false },
  { label: 'Customers', value: '142', change: '+3 new today', up: true },
  { label: 'Avg Order Value', value: '₹645', change: '+₹120 vs yesterday', up: true },
]

type MockAlert = { text: string; sub: string; tone: 'amber' | 'danger' }
const MOCK_ALERTS: MockAlert[] = [
  { text: '3 orders awaiting confirmation', sub: 'Pending for over 2 hours', tone: 'amber' },
  { text: '2 items running low', sub: 'Less than 5 units remaining', tone: 'amber' },
  { text: '1 payment failed — Razorpay', sub: 'Order #1042 · ₹1,850', tone: 'danger' },
]

type MockOrder = { code: string; time: string; customer: string; items: string; price: string; status: 'Pending' | 'Confirmed' | 'Delivered'; statusColor: string }
const MOCK_ORDERS: MockOrder[] = [
  { code: '#1045', time: '⏱ 3h ago', customer: 'Priya Sharma', items: '2× Kurta Set, 1× Dupatta', price: '₹1,850', status: 'Pending', statusColor: 'bg-[#FEF3C7] text-[#92400E]' },
  { code: '#1044', time: '1h ago', customer: 'Rahul Verma', items: '1× Silk Banarasi Saree', price: '₹3,200', status: 'Confirmed', statusColor: 'bg-[#DBEAFE] text-[#1D4ED8]' },
  { code: '#1043', time: 'Yesterday', customer: 'Ananya Patel', items: '3× Cotton Kurta', price: '₹1,890', status: 'Delivered', statusColor: 'bg-success-bg text-[#065F46]' },
]

const TABS = ['Today', 'Yesterday', 'This Week', 'This Month']

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto max-w-[390px] md:max-w-none">
      <div className="flex gap-2 overflow-x-auto border-b border-border px-4 py-3 md:hidden">
        {TABS.map((tab, i) => (
          <span key={tab} className={`shrink-0 rounded-full px-3 py-[6px] text-xs font-semibold ${i === 0 ? 'bg-brand-primary text-surface' : 'border border-border text-muted'}`}>
            {tab}
          </span>
        ))}
      </div>

      <section className="px-4 py-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Action Required</p>
        <div className="flex flex-col gap-2">
          {MOCK_ALERTS.map((alert) => (
            <div
              key={alert.text}
              className={`flex items-center gap-[10px] rounded-lg px-[14px] py-3 ${
                alert.tone === 'amber' ? 'bg-[#F59E0B0F] border-l-[3px] border-l-amber' : 'bg-[#EF44440F] border-l-[3px] border-l-danger'
              }`}
            >
              <div className="min-w-0 grow">
                <p className="text-sm font-semibold text-fg">{alert.text}</p>
                <p className="text-xs text-muted">{alert.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-[10px] px-4 pb-4">
        {MOCK_STATS.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border p-[14px]">
            <p className="mb-1 text-xs text-muted">{stat.label}</p>
            <p className="text-2xl font-bold text-fg">{stat.value}</p>
            <p className={`mt-1 flex items-center gap-1 text-[11px] font-semibold ${stat.up ? 'text-success' : 'text-danger'}`}>
              {stat.up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {stat.change}
            </p>
          </div>
        ))}
      </section>

      <section className="px-4 py-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Recent Orders</p>
          <span className="text-sm text-brand-primary">View all</span>
        </div>
        <div className="flex flex-col gap-2">
          {MOCK_ORDERS.map((order) => (
            <div key={order.code} className="rounded-xl border border-border p-[14px]">
              <div className="mb-1 flex justify-between text-xs">
                <span className="font-semibold text-muted">{order.code}</span>
                <span className="font-semibold text-muted">{order.time}</span>
              </div>
              <p className="mb-[2px] text-md font-bold text-fg">{order.customer}</p>
              <p className="mb-[10px] text-sm text-muted">{order.items}</p>
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-bold text-fg">{order.price}</span>
                <span className={`rounded-full px-[10px] py-1 text-2xs font-semibold ${order.statusColor}`}>{order.status}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
```
(Chart SVG and Top Products carousel are visually decorative and reuse the same static SVG path/markup captured from Paper `2N2-0`/`2O1-0` — copy verbatim from the Paper JSX export rather than re-deriving, since it's presentational only with no dynamic data binding beyond the metric-toggle label.)

- [ ] **Step 2: Verify at 390px and 1440px against Paper `2KY-0` / `2QM-0`**

Start dev server, navigate to `/admin/dashboard` on the `silk` tenant subdomain (no login required in this track — the page renders the mocked owner state). At 390px: confirm time-filter pills, 3 alert rows with correct left-border colors, 2×2 stat grid with correct up/down trend colors, recent orders list with correct status pill colors. At 1440px: confirm sidebar layout renders around the same content. Zero console/network errors.

- [ ] **Step 3: Commit the mock UI**

```bash
git add app/store/admin/dashboard/page.tsx
git commit -m "feat: add admin dashboard UI with mock data matching Paper design"
```

---

### Task 3: Product Category Prerequisite Check — no-op, see Data track

Verification-only no-op (categories + `getCategories` already exist; no category CRUD needed). No Paper step, no UI. The full confirmation note lives in `2026-07-06-talam-phase-5-tenant-admin-data.md` Task 3. Kept here so task numbering stays aligned across both tracks.

---

### Task 4: Products List + Editor (UI)

**Files:**
- Create: `app/store/admin/products/page.tsx`

**Interfaces:**
- Produces: `/admin/products` page rendering the list + FAB + editor sheet from typed mock data. The `MockProduct` shape mirrors what the Data-track's `getAdminProducts` (`lib/data/admin-products.ts`) will return (`stockLabel`/`stockDetail` derived server-side), and the editor form's field names (`name`, `description`, `categoryId`, `price`, `comparePrice`, `sizes`, `images`) match the FormData contract the Data-track's `createProduct`/`updateProduct` Server Actions read, so the mock→real swap is a data-source + form-action replacement, not a rewrite.
- The Category select renders empty in this track (the Data-track populates it from the existing `getCategories`); Sub Category / Coupon Applicable / Product Specifications render disabled per Known Gaps (no schema fields).

- [ ] **Step 1: Build the products list + FAB + editor sheet against Paper mock data**

Paper's "Admin Dashboard / Products / Mobile" artboard (`5EX-0`, 390×984) shows: Header (`talam.` + search icon + avatar); a Search Bar (rounded input + filter button); a Results Bar ("12 products" muted text + "All categories" dropdown label); 3 product rows each `h-[83px]` with a 48×48 rounded image placeholder, name (`text-md font-semibold`), price (`text-md`), and a stock-status subtext colored per state — "In stock" (muted/neutral), "Low (3 left)" (amber), "Out of stock" (danger) — plus a trailing 32×32 kebab/edit icon button; a 56×56 circular FAB (`+` icon, brand-primary) fixed bottom-right above the bottom nav.

The product editor (`5SI-0`, mobile bottom-sheet modal, 390×1351 over a `bg-[#00000080]` backdrop) is a scrollable form: "Add Product" header + × close; **Product Name** (required, text input); **Description** (textarea); **Category** (required, select — the Data-track populates it from `getCategories`); **Sub Category** (select — no schema field, render disabled with a "Coming soon" placeholder, see Known Gaps); **Product Pictures* (Min 1, Max 5)** (dashed dropzone, "Tap to upload" + "PNG, JPG, up to 5MB each"); **Price*** (₹-prefixed input); **Price After Discount** (₹-prefixed input, maps to `comparePrice`); **Sizes Available** (6 checkboxes: XS/S/M/L/XL/XXL, 3-column grid — maps to `sizes: string[]`); **Coupon Applicable** (checkbox, no schema field, render disabled, see Known Gaps); **Product Specifications** (key/value row + "+ Add Specification", no schema field, render disabled, see Known Gaps); Cancel / Add Product button row (brand-primary).

Desktop variant (`5EY-0` list; `5SJ-0` editor at 1440×1200) reuses the identical field set in a wider two-column form layout rather than a bottom sheet — build responsively with one component, not two DOM trees.

Create `app/store/admin/products/page.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { Search, SlidersHorizontal, MoreVertical, Plus, X } from 'lucide-react'

export const dynamicParams = true

type MockProduct = {
  id: string
  name: string
  price: string
  stockLabel: string
  stockColor: string
}

const MOCK_PRODUCTS: MockProduct[] = [
  { id: 'p1', name: 'Cotton Kurta Set', price: '₹1,299', stockLabel: 'In stock', stockColor: 'text-muted' },
  { id: 'p2', name: 'Silk Banarasi Saree', price: '₹3,499', stockLabel: 'Low (3 left)', stockColor: 'text-amber' },
  { id: 'p3', name: 'Anarkali Suit', price: '₹2,199', stockLabel: 'Out of stock', stockColor: 'text-danger' },
]

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

export default function AdminProductsPage() {
  const [editorOpen, setEditorOpen] = useState(false)

  return (
    <div className="relative mx-auto max-w-[390px] md:max-w-none">
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex h-10 grow items-center gap-2 rounded-lg border border-border px-3">
          <Search className="size-[18px] text-muted" />
          <input className="grow bg-transparent text-md outline-none" placeholder="Search products" />
        </div>
        <button className="flex size-10 items-center justify-center rounded-lg border border-border">
          <SlidersHorizontal className="size-[18px] text-muted" />
        </button>
      </div>

      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-sm text-muted">{MOCK_PRODUCTS.length} products</span>
        <span className="text-sm text-muted">All categories</span>
      </div>

      <div>
        {MOCK_PRODUCTS.map((product) => (
          <div key={product.id} className="flex items-center gap-3 border-b border-border px-4 py-[18px]">
            <div className="size-12 shrink-0 rounded-lg bg-gradient-to-br from-rose-800 to-indigo-900" />
            <div className="min-w-0 grow">
              <p className="truncate text-md font-semibold text-fg">{product.name}</p>
              <p className="text-md text-fg">{product.price}</p>
              <p className={`text-sm ${product.stockColor}`}>{product.stockLabel}</p>
            </div>
            <button className="flex size-8 items-center justify-center rounded-lg" onClick={() => setEditorOpen(true)}>
              <MoreVertical className="size-4 text-muted" />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => setEditorOpen(true)}
        className="fixed bottom-24 right-4 z-30 flex size-14 items-center justify-center rounded-full bg-brand-primary shadow-lg md:bottom-8 md:right-8"
      >
        <Plus className="size-7 text-surface" />
      </button>

      {editorOpen && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/50 md:items-center md:justify-center">
          <div className="max-h-[95vh] w-full overflow-y-auto rounded-t-2xl bg-surface md:max-w-lg md:rounded-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-surface p-4">
              <span className="text-base font-semibold text-fg">Add Product</span>
              <button onClick={() => setEditorOpen(false)}>
                <X className="size-6 text-muted" />
              </button>
            </div>
            <form className="flex flex-col gap-5 p-4">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-fg">Product Name *</span>
                <input required className="rounded-lg border border-border px-3 py-[11px] text-md" placeholder="e.g., Cotton Kurta Set" />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-fg">Description</span>
                <textarea className="h-[90px] rounded-lg border border-border px-3 py-[11px] text-md" placeholder="Add product details, features, care instructions..." />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-fg">Category *</span>
                <select required className="rounded-lg border border-border px-3 py-[11px] text-md">
                  <option value="">Select category</option>
                </select>
              </label>
              <label className="flex flex-col gap-2 opacity-50">
                <span className="text-sm font-semibold text-fg">Sub Category</span>
                <select disabled className="rounded-lg border border-border px-3 py-[11px] text-md">
                  <option>Coming soon</option>
                </select>
              </label>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-fg">Product Pictures * (Min 1, Max 5)</span>
                <label className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-border bg-bg px-4 py-7">
                  <input type="file" accept="image/*" multiple className="hidden" />
                  <span className="mb-1 text-sm font-medium text-fg">Tap to upload</span>
                  <span className="text-2xs text-muted">PNG, JPG, up to 5MB each</span>
                </label>
              </div>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-fg">Price *</span>
                <div className="flex items-center">
                  <span className="rounded-l-lg border border-r-0 border-border bg-bg px-3 py-[11px] text-muted">₹</span>
                  <input required type="number" className="grow rounded-r-lg border border-border px-3 py-[11px] text-md" placeholder="1,299" />
                </div>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-fg">Price After Discount</span>
                <div className="flex items-center">
                  <span className="rounded-l-lg border border-r-0 border-border bg-bg px-3 py-[11px] text-muted">₹</span>
                  <input type="number" className="grow rounded-r-lg border border-border px-3 py-[11px] text-md" placeholder="999" />
                </div>
              </label>
              <div className="flex flex-col gap-[10px]">
                <span className="text-sm font-semibold text-fg">Sizes Available</span>
                <div className="grid grid-cols-3 gap-2">
                  {SIZES.map((size) => (
                    <label key={size} className="flex items-center gap-[6px] text-sm text-fg">
                      <input type="checkbox" value={size} className="size-[13px] rounded-sm border border-[#C7C7C7]" />
                      {size}
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-[10px] rounded-lg bg-bg p-3 opacity-50">
                <input type="checkbox" disabled className="size-[13px] rounded-sm border border-[#C7C7C7]" />
                <span className="text-sm font-semibold text-fg">Coupon Applicable (coming soon)</span>
              </label>
              <div className="flex gap-3 pb-4">
                <button type="button" onClick={() => setEditorOpen(false)} className="grow rounded-lg border border-border p-3 text-md font-semibold text-fg">
                  Cancel
                </button>
                <button type="submit" className="grow rounded-lg bg-brand-primary p-3 text-md font-semibold text-surface">
                  Add Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify at 390px and 1440px against Paper `5EX-0` / `5EY-0` / `5SI-0` / `5SJ-0`**

Start dev server, navigate to `/admin/products`, confirm list rows + stock-color states + FAB, then click a row to open the editor sheet and confirm all fields render (with Sub Category / Coupon Applicable visibly disabled/greyed as designed). Zero console/network errors at both sizes.

- [ ] **Step 3: Commit the mock UI**

```bash
git add app/store/admin/products/page.tsx
git commit -m "feat: add admin products list + editor UI with mock data matching Paper design"
```

---

### Task 5: Orders List (Mobile + Desktop) (UI)

**Files:**
- Create: `app/store/admin/orders/page.tsx`

**Interfaces:**
- Produces: `/admin/orders` page rendering the status-filter pill row and order cards from typed mock data. The `MockOrder` shape mirrors what the Data-track's `getAdminOrders` (`lib/data/admin-orders.ts`) returns (`code`/`customerName`/`itemSummary`/`total`/`status`), so the mock→real swap is a data-source replacement, not a rewrite.
- The inline `STATUS_STYLES` class map below is purely visual for the mock; the Data-track exports a shared, status-enum-keyed `STATUS_STYLES` from `lib/data/admin-orders.ts` (reused by the dashboard and action-sheet wiring) that replaces it during the swap.

- [ ] **Step 1: Build the orders list page against Paper mock data**

Paper's "Admin Dashboard / Orders / Mobile" artboard (`695-0`, 390×844) shows: Header (`talam.` + "Orders" title + search button); a Status Filters pill row ("All (8)" active on `bg-[#4F3FF01A] border-brand-primary text-brand-primary`, then "Pending (2)"/"Confirmed (1)"/"Shipped (3)"/"Delivered (2)" each `border-[#FB923C]`-toned when the status matches, muted otherwise); an Orders List of cards (`rounded-xl border border-border p-[14px] shadow-sm`), each: order id + relative timestamp header row + a status pill top-right (`bg-[#FB923C1A] border-[#FB923C] text-[#92400E]` for Pending, shown as example), customer name (`font-semibold`), item summary (`text-muted`), then price + an "Action" button (`bg-brand-primary text-surface`, only shown for actionable statuses like Pending — matches Paper's `2P2-0` recent-order card behavior at the dashboard, and `69R-0`'s admin order-list card).

Desktop (`6LS-0`, 1500×900) uses a sidebar + wider order rows/table — same data, denser layout; details open in a modal (`6QI-0`) rather than navigating away.

Create `app/store/admin/orders/page.tsx`:
```tsx
export const dynamic = 'force-dynamic'

type MockOrder = {
  code: string
  time: string
  customer: string
  items: string
  price: string
  status: 'Pending' | 'Confirmed' | 'Shipped' | 'Delivered'
}

const STATUS_STYLES: Record<MockOrder['status'], string> = {
  Pending: 'bg-[#FB923C1A] border border-[#FB923C] text-[#92400E]',
  Confirmed: 'bg-[#DBEAFE] text-[#1D4ED8]',
  Shipped: 'bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E3A8A]',
  Delivered: 'bg-success-bg border border-success-border text-[#065F46]',
}

const MOCK_ORDERS: MockOrder[] = [
  { code: '#ORD-2648', time: 'Today · 08:14am', customer: 'Ananya Krishnan', items: 'Block Print Kurti (L) · 1 item', price: '₹649', status: 'Pending' },
  { code: '#ORD-2647', time: 'Today · 07:02am', customer: 'Rekha Mohan', items: 'Chanderi Saree (Free) · 1 item', price: '₹2,199', status: 'Confirmed' },
  { code: '#ORD-2646', time: 'Yesterday', customer: 'Deepa Subramanian', items: 'Anarkali Set (S) + Dupatta · 2 items', price: '₹3,398', status: 'Shipped' },
  { code: '#ORD-2645', time: '2 days ago', customer: 'Meera Verma', items: 'Cotton Dupatta + Salwar · 2 items', price: '₹1,148', status: 'Delivered' },
]

const FILTERS = ['All (8)', 'Pending (2)', 'Confirmed (1)', 'Shipped (3)', 'Delivered (2)']

export default function AdminOrdersPage() {
  return (
    <div className="mx-auto max-w-[390px] md:max-w-none">
      <div className="flex gap-2 overflow-x-auto border-b border-border px-4 py-3">
        {FILTERS.map((filter, i) => (
          <span
            key={filter}
            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${
              i === 0 ? 'border-[1.5px] border-brand-primary bg-[#4F3FF01A] text-brand-primary' : 'border-[1.5px] border-[#FB923C] bg-[#FB923C1A] text-[#92400E] opacity-50'
            }`}
          >
            {filter}
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-3 p-4">
        {MOCK_ORDERS.map((order) => (
          <div key={order.code} className="rounded-xl border border-border p-[14px] shadow-sm">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="mb-[2px] text-sm font-bold text-fg">{order.code}</p>
                <p className="text-2xs text-muted">{order.time}</p>
              </div>
              <span className={`rounded-md px-[10px] py-[6px] text-[10px] font-bold ${STATUS_STYLES[order.status]}`}>{order.status}</span>
            </div>
            <p className="mb-1 text-sm font-semibold text-fg">{order.customer}</p>
            <p className="mb-3 text-xs text-muted">{order.items}</p>
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-bold text-fg">{order.price}</span>
              {order.status === 'Pending' && (
                <span className="rounded-md bg-brand-primary px-3 py-[6px] text-xs font-semibold text-surface">Action</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify at 390px and 1440px against Paper `695-0` / `6LS-0`**

Start dev server, navigate to `/admin/orders`, confirm status filter pill row + order cards with correct status colors + conditional "Action" button. Zero console/network errors.

- [ ] **Step 3: Commit the mock UI**

```bash
git add app/store/admin/orders/page.tsx
git commit -m "feat: add admin orders list UI with mock data matching Paper design"
```

---

### Task 6: Order Action Menu (Status Transitions) (UI)

**Files:**
- Create: `components/admin/order-action-sheet.tsx`
- Modify: `app/store/admin/orders/page.tsx` (open the sheet from the "Action" button)

**Interfaces:**
- Produces: `<OrderActionSheet>` client component (bottom sheet on mobile, dialog on desktop) with the 5 actions from Paper. In this track the action rows are inert (they only toggle the inline tracking-id sub-form); the Data-track's Task 6 wires each row to the `updateOrderStatus` Server Action via `<form action={...}>`.

- [ ] **Step 1: Build the action sheet against Paper mock structure**

Paper's "Admin Dashboard / Orders / Mobile - Action Menu" artboard (`696-0`) shows a bottom sheet (`rounded-t-2xl`, drag handle, "Order Actions" title) with 5 rows, each a 24×24 colored rounded-square icon + title + subtitle, separated by `border-b border-border`: **Confirm Order** (brand-primary icon, checkmark, "Mark as confirmed"), **Ship Order** (`#3B82F6` icon, arrow-up, "Add tracking number"), **Mark Delivered** (`#22C55E` icon, package+check, "Order received by customer"), **Cancel Order** (danger icon, X, "Permanently cancel this order"), **View Full Details** (muted icon, +, "See order history & timeline") — then a full-width "Close" button (`bg-bg`).

Create `components/admin/order-action-sheet.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { Check, ArrowUp, Package, X as XIcon, Plus } from 'lucide-react'

type Props = {
  orderId: string
  currentStatus: string
  onClose: () => void
}

const ACTIONS = [
  { key: 'confirmed', label: 'Confirm Order', sub: 'Mark as confirmed', icon: Check, color: 'bg-brand-primary' },
  { key: 'shipped', label: 'Ship Order', sub: 'Add tracking number', icon: ArrowUp, color: 'bg-[#3B82F6]' },
  { key: 'delivered', label: 'Mark Delivered', sub: 'Order received by customer', icon: Package, color: 'bg-[#22C55E]' },
  { key: 'cancelled', label: 'Cancel Order', sub: 'Permanently cancel this order', icon: XIcon, color: 'bg-danger' },
] as const

export function OrderActionSheet({ orderId, currentStatus, onClose }: Props) {
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 md:items-center md:justify-center">
      <div className="w-full rounded-t-2xl bg-surface py-5 shadow-lg md:max-w-sm md:rounded-2xl">
        <div className="mb-3 flex justify-center md:hidden">
          <div className="h-1 w-8 rounded-[2px] bg-border" />
        </div>
        <div className="mb-4 px-5">
          <p className="text-base font-bold text-fg">Order Actions</p>
        </div>
        <div className="flex flex-col">
          {ACTIONS.map((action) => (
            <div key={action.key}>
              <button
                type="button"
                onClick={() => setPendingStatus(action.key)}
                className="flex w-full items-center gap-3 border-b border-border px-5 py-4 text-left"
              >
                <span className={`flex size-6 shrink-0 items-center justify-center rounded-md ${action.color}`}>
                  <action.icon className="size-[14px] text-surface" strokeWidth={2.5} />
                </span>
                <span>
                  <span className="block text-md font-semibold text-fg">{action.label}</span>
                  <span className="block text-xs text-muted">{action.sub}</span>
                </span>
              </button>
              {pendingStatus === action.key && action.key === 'shipped' && (
                <form className="flex gap-2 border-b border-border bg-bg px-5 py-3">
                  <input name="trackingId" required placeholder="Tracking number" className="grow rounded-md border border-border px-2 py-1 text-sm" />
                  <button type="submit" className="rounded-md bg-brand-primary px-3 py-1 text-sm font-semibold text-surface">Save</button>
                </form>
              )}
            </div>
          ))}
          <button className="flex items-center gap-3 px-5 py-4 text-left">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted">
              <Plus className="size-[14px] text-surface" strokeWidth={2.5} />
            </span>
            <span className="text-md font-semibold text-fg">View Full Details</span>
          </button>
        </div>
        <div className="mt-2 border-t border-border px-5 pt-3">
          <button onClick={onClose} className="w-full rounded-lg bg-bg p-3 text-md font-semibold text-fg">Close</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire the sheet into the orders page and verify at 390px against Paper `696-0`**

Modify `app/store/admin/orders/page.tsx` (client-side orchestration for opening the sheet, e.g. a small client wrapper around the "Action" button) to render `<OrderActionSheet>` on click. Verify the 5-row layout, icon colors, and the inline tracking-id sub-form appearing under "Ship Order" only after it's tapped.

- [ ] **Step 3: Commit the mock UI**

```bash
git add components/admin/order-action-sheet.tsx app/store/admin/orders/page.tsx
git commit -m "feat: add order action sheet UI matching Paper design"
```

---

### Task 7: Settings Page (Store Details, Brand, Payment, Notifications) (UI)

**Files:**
- Create: `app/store/admin/settings/page.tsx`

**Interfaces:**
- Produces: `/admin/settings` page rendering all 5 sections from mock default values. The form field names (`name`, `tagline`, `contactPhone`, `contactEmail`, `brandColor`, `notifyEmailOnOrder`) match the FormData contract the Data-track's `updateStoreSettings` Server Action reads, and the mock defaults mirror the `Tenant` fields the Data-track populates via the existing `getTenantStorefront` (`lib/data/tenant.ts`) — so the swap is a defaultValue + form-action replacement, not a rewrite. (The "Meena Silks" copy is Paper's fictional mockup flavor text, standing in for the real tenant's values.)

- [ ] **Step 1: Build the settings page against Paper mock data**

Paper's "Admin Dashboard / Settings / Mobile" artboard (`7HK-0`, 390×1397, one scrollable page) shows, section by section: Header ("Settings" + a "Save" button, top-right); **Store Details** section (label row + 4 fields: Store Name text input "Meena Silks", Tagline text input "Handcrafted for every occasion", Contact Phone "+91 98765 43210", Contact Email "hello@meenasilks.com" — each a labeled `rounded-lg border-[1.5px] border-border py-[10px] px-3` read-value row, separated by `h-px bg-border mx-4` dividers); **Brand** section (Store Logo row with a 56×56 rounded-xl monogram placeholder "MS" + "Change" button + helper text "PNG or SVG, min 200×200px"; Primary Colour row — 6 preset color swatches as 36×36 circles [brand-primary selected with a `border-[3px] border-fg` ring, store-primary pink, success green, amber, danger red, and a sky blue `#0EA5E9`] plus a custom hex-input row showing `#4F3FF0`); **Payment Gateways** section (UPI/QR Code row — `#1A1040` badge "UPI", "Connected" in success green, "Change" button; Razorpay row — `#072654` badge "RZRPAY", "Not connected" in muted, "Connect" button in brand-primary outline — both rendered but **read-only/disabled** per Known Gaps, no OAuth flow this phase); **Notifications** section (3 toggle rows: "New Order" ON brand-primary, "Low Stock Alert" ON brand-primary, "New Review" OFF `#D1D5DB` — maps to `Tenant.notifyEmailOnOrder` for the first row only, the other two have no schema field yet, see Known Gaps); **Danger Zone** section (a single full-width outlined-danger "Delete Store" button, disabled — deleting a tenant is a Phase 6/super-admin-level operation, out of scope here).

Desktop settings (`7L5-0` + the 8 sub-page artboards under `7OK-0`–`8G8-0`) render the same sections as one wider single-column or two-column page rather than 8 routes, per Known Gaps.

Create `app/store/admin/settings/page.tsx`:
```tsx
export const dynamic = 'force-dynamic'

const COLOR_PRESETS = ['#4F3FF0', '#E8577E', '#10B981', '#F59E0B', '#EF4444', '#0EA5E9']

export default function AdminSettingsPage() {
  return (
    <div className="mx-auto max-w-[390px] md:max-w-2xl">
      <div className="flex items-center justify-between border-b border-border px-4 py-4">
        <span className="text-lg font-semibold text-fg">Settings</span>
        <button className="rounded-md bg-brand-primary px-4 py-[6px] text-sm font-semibold text-surface">Save</button>
      </div>

      <form className="flex flex-col">
        <p className="px-4 pt-[14px] text-xs font-semibold uppercase tracking-wide text-muted">Store Details</p>
        <div className="flex flex-col divide-y divide-border border-y border-border">
          {[
            { label: 'Store Name', name: 'name', defaultValue: 'Meena Silks' },
            { label: 'Tagline', name: 'tagline', defaultValue: 'Handcrafted for every occasion' },
            { label: 'Contact Phone', name: 'contactPhone', defaultValue: '+91 98765 43210' },
            { label: 'Contact Email', name: 'contactEmail', defaultValue: 'hello@meenasilks.com' },
          ].map((field) => (
            <label key={field.name} className="flex flex-col gap-1 px-4 py-[14px]">
              <span className="text-xs font-semibold tracking-[0.02em] text-fg">{field.label}</span>
              <input name={field.name} defaultValue={field.defaultValue} className="rounded-lg border-[1.5px] border-border px-3 py-[10px] text-[15px] text-fg" />
            </label>
          ))}
        </div>

        <p className="px-4 pt-[14px] text-xs font-semibold uppercase tracking-wide text-muted">Brand</p>
        <div className="flex flex-col divide-y divide-border border-y border-border">
          <div className="flex items-center gap-[14px] px-4 py-[14px]">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-border bg-[#F0EDF8]">
              <span className="text-2xs font-bold tracking-[0.04em] text-brand-primary">MS</span>
            </div>
            <div className="grow">
              <p className="text-md font-semibold text-fg">Store Logo</p>
              <p className="text-xs text-muted">PNG or SVG, min 200×200px</p>
            </div>
            <button type="button" className="rounded-lg border-[1.5px] border-border px-[14px] py-2 text-sm font-semibold text-fg">Change</button>
          </div>
          <div className="flex flex-col gap-[10px] px-4 py-[14px]">
            <span className="text-2xs font-bold uppercase tracking-wide text-muted">Primary Colour</span>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_PRESETS.map((color, i) => (
                <button
                  key={color}
                  type="button"
                  className={`size-9 shrink-0 rounded-full ${i === 0 ? 'border-[3px] border-fg' : ''}`}
                  style={{ backgroundColor: color }}
                />
              ))}
              <input name="brandColor" defaultValue="#4F3FF0" className="min-w-[120px] grow rounded-lg border-[1.5px] border-border px-[10px] py-2 font-mono text-md text-fg" />
            </div>
          </div>
        </div>

        <p className="px-4 pt-[14px] text-xs font-semibold uppercase tracking-wide text-muted">Payment Gateways</p>
        <div className="flex flex-col divide-y divide-border border-y border-border">
          <div className="flex items-center justify-between px-4 py-[14px] opacity-70">
            <div className="flex items-center gap-3">
              <span className="flex h-[30px] w-11 items-center justify-center rounded-[5px] bg-[#1A1040] text-[10px] font-bold text-amber">UPI</span>
              <div>
                <p className="text-md font-semibold text-fg">UPI / QR Code</p>
                <p className="text-xs font-semibold text-success">Connected</p>
              </div>
            </div>
            <button type="button" disabled className="rounded-lg border-[1.5px] border-border px-[14px] py-2 text-sm font-semibold text-fg">Change</button>
          </div>
          <div className="flex items-center justify-between px-4 py-[14px] opacity-70">
            <div className="flex items-center gap-3">
              <span className="flex h-[30px] w-11 items-center justify-center rounded-[5px] bg-[#072654] text-[9px] font-bold text-surface">RZRPAY</span>
              <div>
                <p className="text-md font-semibold text-fg">Razorpay</p>
                <p className="text-xs text-muted">Not connected</p>
              </div>
            </div>
            <button type="button" disabled className="rounded-lg border-[1.5px] border-brand-primary px-[14px] py-2 text-sm font-semibold text-brand-primary">Connect</button>
          </div>
        </div>

        <p className="px-4 pt-[14px] text-xs font-semibold uppercase tracking-wide text-muted">Notifications</p>
        <div className="flex flex-col divide-y divide-border border-y border-border">
          <label className="flex items-center justify-between px-4 py-[14px]">
            <div>
              <p className="text-md font-semibold text-fg">New Order</p>
              <p className="text-xs text-muted">Alert when a new order is placed</p>
            </div>
            <input type="checkbox" name="notifyEmailOnOrder" defaultChecked className="sr-only peer" />
            <span className="h-[26px] w-12 rounded-full bg-brand-primary" aria-hidden />
          </label>
          <div className="flex items-center justify-between px-4 py-[14px] opacity-50">
            <div>
              <p className="text-md font-semibold text-fg">Low Stock Alert (coming soon)</p>
              <p className="text-xs text-muted">When a product drops below 5 units</p>
            </div>
            <span className="h-[26px] w-12 rounded-full bg-[#D1D5DB]" aria-hidden />
          </div>
          <div className="flex items-center justify-between px-4 py-[14px] opacity-50">
            <div>
              <p className="text-md font-semibold text-fg">New Review (coming soon)</p>
              <p className="text-xs text-muted">Alert when a customer leaves a review</p>
            </div>
            <span className="h-[26px] w-12 rounded-full bg-[#D1D5DB]" aria-hidden />
          </div>
        </div>

        <p className="px-4 pt-[14px] text-xs font-semibold uppercase tracking-wide text-muted">Danger Zone</p>
        <div className="px-4 py-[14px]">
          <button type="button" disabled className="w-full rounded-lg border-[1.5px] border-danger py-3 text-md font-semibold text-danger opacity-50">
            Delete Store
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Verify at 390px and 1440px against Paper `7HK-0` / `7L5-0`**

Start dev server, navigate to `/admin/settings`, confirm all 5 sections render in order with correct field values, toggle colors, and disabled states on the payment/notification/danger rows that lack schema backing. Zero console/network errors.

- [ ] **Step 3: Commit the mock UI**

```bash
git add app/store/admin/settings/page.tsx
git commit -m "feat: add admin settings page UI with mock data matching Paper design"
```

---

## Post-Plan Verification

- [ ] Run `npm run lint` — expect zero errors introduced by this track's files.
- [ ] Manually click through `/admin/dashboard` → `/admin/products` (open the editor sheet) → `/admin/orders` (open the action sheet) → `/admin/settings` on the `silk` tenant subdomain at 390px and 1440px — all mock-rendered, no login required. Zero console/network errors on every page.
- [ ] Confirm no `lib/admin-guard.ts`, Prisma, or Server Action code exists yet from this track — that is the Data-track sibling's scope.

---

## Self-Review

- **Spec coverage:** All 7 original Phase 5 tasks accounted for: Tasks 1–2 and 4–7 carry every Design → Mock UI → Verify → Commit step from the original plan verbatim (Paper artboard citations, exact JSX/Tailwind, mock fixtures); Task 3 is the original's verification-only no-op, kept as a one-liner pointer so numbering stays aligned with the Data-track sibling.
- **Placeholder scan:** No `<name>`-style unresolved placeholders. The disabled Sub Category / Coupon Applicable / Product Specifications fields, read-only payment gateways, inert extra notification toggles, and disabled Danger Zone are explicitly flagged design decisions carried from the original's Known Gaps (now in the Data-track sibling), not stubs. The dashboard chart/top-products note deliberately defers to the Paper JSX export as the original did.
- **Type consistency:** Each `Mock*` fixture mirrors the real shape its Data-track counterpart returns (`MockStat`/`MockAlert`/`MockOrder` ↔ `DashboardStats`/`ActionRequiredCounts`/`RecentOrder`, `MockProduct` ↔ `AdminProduct`, orders `MockOrder` ↔ `AdminOrderListItem`) and the editor/settings form field names match the FormData contracts the Data-track's Server Actions read — so every mock→real swap in the sibling is a data-source + form-action replacement inside the same JSX, not a rewrite.
- **Track discipline:** No Prisma imports, `withTenant` calls, Server Actions, API routes, `lib/data/*.ts` writes, or `lib/admin-guard.ts` imports appear anywhere in this file. The one structural deviation from the original is deliberate and stated: `app/store/admin/layout.tsx` ships without `await requireOwner()` (mocked owner state) so every admin screen can be screenshot-verified without auth — the Data-track sibling's Task 1 adds the guard call. The inline `STATUS_STYLES` in Task 5's mock page is purely visual Tailwind classes; the shared status-enum-keyed map lives in the Data-track (`lib/data/admin-orders.ts`) where it belongs, since it is keyed by real Prisma status values.
