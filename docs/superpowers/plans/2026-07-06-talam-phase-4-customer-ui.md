# Phase 4: Customer Features Implementation Plan — UI Track

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Track order:** This is a **UI-track** plan — part of the front-end-first pass across all 8 phases. Do not start any phase's **Data-track** plan until every phase's UI-track plan is complete. See the sibling `2026-07-06-talam-phase-4-customer-data.md` for the auth guard utility, Prisma data layers (orders, account summary, wishlist), and the real-data + `requireAuth` wiring that follow this file.

**Goal:** Build order history (list + detail/tracking), customer account page, and wishlist as mock-wired UI matching the live Paper "Talam Design" file pixel-for-pixel at 390px and 1440px. Auth guarding, Prisma queries, and real-data wiring are out of scope for this file — see the Data-track sibling.

**Architecture:** All pages are SSR-dynamic (`force-dynamic`), rendered inside the existing `app/store/layout.tsx` which already provides `StoreHeader`, `StoreFooter`, and `MobileTabBar` — page components only render their own content region. Every task in this file follows Design → Mock UI → Verify → Commit: build against the exact Paper JSX/copy/colors captured below with typed mock data, screenshot-verify against Paper, commit. **These are auth-gated screens, but the UI track builds them WITHOUT the real auth guard**: each page renders a mocked logged-in state inline (the `MOCK_*` fixtures below stand in for the logged-in customer's data) so every screen can be screenshot-verified without auth working. The Data-track sibling adds `requireAuth`/`requireTenant` to these exact pages when it swaps mocks for Prisma data.

**Tech Stack:** Next.js App Router (SSR), existing `components/ui/*` (shadcn/ui: badge, button, card, separator), `lucide-react` icons, Tailwind v4 with the project's design tokens already wired into `app/globals.css`, Claude Preview MCP / dev-server screenshots for the verification steps.

## Global Constraints

- Inherit all prior phase constraints as context, but do not write any Prisma, Server Action, API-route, or auth-guard code in this file — that is the Data-track's job. If a task needs a data shape that doesn't exist yet, mock it locally typed like the real shape and leave the real wiring to the Data-track sibling.
- All pages in this phase: `export const dynamic = 'force-dynamic'`.
- **No `requireAuth`/`requireTenant` calls in this track.** These pages are auth-gated in the finished product, but in this file each page is a plain (non-async) component rendering mock fixture data — an inline mocked logged-in state — so it renders and screenshots on the dev server without a session. The Data-track sibling adds the guard and the `/auth?next={path}` redirect behavior to each page as part of its wiring step. Do not add redirects, session reads, or `lib/auth-guard.ts` imports here.
- Design ground truth is the live Paper file "Talam Design" (team `Surya's Team`, file id `01KVZYTDJNREHBACTQMT2D9HR9`), page "Store Front" (page id `1-0`) — NOT `docs/2026-06-23-talam-design.md`, which can lag. Exact copy, colors, and spacing below were pulled directly from that file's artboards: Orders List (`9YD-0` mobile / `AWZ-0` desktop), Order Detail (`9YE-0` mobile / `AX0-0` desktop), Account (`AB2-0` mobile / `AX1-0` desktop), Wishlist (`AB3-0` mobile / `AX3-0` desktop).
- Design tokens (from Paper, already partially wired into `app/globals.css` per prior phase notes): `--color-store-primary: #E8577E`, `--color-amber: #F59E0B`, `--color-danger: #EF4444`, `--color-success: #10B981` / `--color-success-bg: #F0FDF4` / `--color-success-border: #BBEDD4`, `--color-muted: #8B7D7A`, `--color-border: #E8E8E8`, `--color-surface: #FFFFFF`, `--color-bg: #F9F9F9`. Font: `--font-heading: "Playfair Display"`, `--font-body: "DM Sans"`.
- Every page in this phase renders inside `app/store/layout.tsx`, which already renders `StoreHeader`, `StoreFooter`, and `MobileTabBar` — do not duplicate header/footer/tab-bar chrome inside page components.
- `components/store/mobile-tab-bar.tsx` already has `/orders`, `/wishlist`, `/account` links; it accepts an `active` prop (default `'Home'`) — each page in this phase must render `<MobileTabBar active="Orders" />` etc. by passing the prop through, NOT by re-adding a duplicate nav.
- Verification step for every UI task: start the dev server, hit the page through the `silk` tenant subdomain path (per the local dev routing gotcha — bare localhost root 404s on `/store/*` by design), resize to 390px (and 1440px where a desktop artboard exists), screenshot and compare against the cited Paper artboard, console errors must be empty, failed network requests must be empty.

---

## Known Gaps

Phase 4's flagged gaps (`/orders/[id]` route ownership vs Phase 3's checkout redirect, the Order Confirmed page, the Reviews link with no destination, coupon data, the desktop-vs-mobile Account layout split, and the schema-less notification toggles) live in the "Known Gaps" section of the sibling `2026-07-06-talam-phase-4-customer-data.md`. The two that shape UI decisions in this file are repeated inline where they matter: the "My Reviews" row renders as a disabled/static row (Task 4), and the notification/language toggles are inert display-only controls (Task 4).

---

### Task 1: Auth Guard Utility — backend-only, see Data track

Entirely backend (TDD: `requireAuth` + `requireTenant` in `lib/auth-guard.ts` with Vitest mocks for Supabase/headers/navigation). No Paper step, no UI. All steps live in `2026-07-06-talam-phase-4-customer-data.md` Task 1.

---

### Task 2: Orders List Page (UI)

**Files:**
- Create: `app/store/orders/page.tsx`
- Modify: `components/store/mobile-tab-bar.tsx:56` (thread `active` prop through — no change needed to the component itself, only confirmed here that pages pass it)

**Interfaces:**
- Produces: `/orders` page rendering the list from typed mock data, tab-filtered client-side by status. The `MockOrder` status/label/price fields mirror the shape the Data-track's `getCustomerOrders` (`lib/data/customer-orders.ts`) will return, so the mock→real swap is a data-source replacement, not a rewrite.

- [ ] **Step 1: Build the orders list page against Paper mock data**

Paper's "Orders — List / Mobile" artboard (`9YD-0`, 390×1600) shows: header "My Orders" with back arrow + search icon, a tab row (All / Active / Delivered / Cancelled / Returns, active tab underlined in `--color-store-primary`), then a card per order with: order id + date in muted text, a status pill (colored per status), a 56×56 rounded-lg gradient thumbnail (or two overlapping for 2+ items), product name (`+ N more` if multiple), subtext (delivery/tracking info), price, chevron, and action buttons row. Status pill colors from Paper: Out for Delivery = `bg-[#FFF7E6] border-[#FDE68A] text-[#92400E]` dot `bg-amber`; Shipped = `bg-[#EFF6FF] border-[#BFDBFE] text-[#1E3A8A]` dot `bg-[#3B82F6]`; Delivered = `bg-success-bg border-success-border text-[#065F46]` with checkmark icon; Cancelled = `bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]` with X icon, row at `opacity-75`; Return Pickup = `bg-[#F5F3FF] border-[#DDD6FE] text-[#5B21B6]` dot `bg-[#7C3AED]`.

Create `app/store/orders/page.tsx`:
```tsx
import Link from 'next/link'
import { MobileTabBar } from '@/components/store/mobile-tab-bar'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

type MockOrder = {
  id: string
  code: string
  date: string
  status: 'out_for_delivery' | 'shipped' | 'delivered' | 'cancelled' | 'return_pickup'
  statusLabel: string
  productSummary: string
  subtext: string
  price: string
  strikePrice?: string
  actions: { label: string; primary?: boolean }[]
}

const MOCK_ORDERS: MockOrder[] = [
  {
    id: 'ord-2649',
    code: '#ORD-2649',
    date: '28 Jun 2026',
    status: 'out_for_delivery',
    statusLabel: 'Out for Delivery',
    productSummary: 'Kanjivaram Silk Saree + 1 more',
    subtext: 'Arrives today by 7 PM',
    price: '₹2,998',
    actions: [{ label: 'Track Package', primary: true }, { label: 'View Invoice' }],
  },
  {
    id: 'ord-2641',
    code: '#ORD-2641',
    date: '24 Jun 2026',
    status: 'shipped',
    statusLabel: 'Shipped',
    productSummary: 'Pochampally Ikat Saree',
    subtext: 'Expected 2 Jul · DTDC #9876543210',
    price: '₹1,899',
    actions: [{ label: 'Track Package', primary: true }, { label: 'View Invoice' }],
  },
  {
    id: 'ord-2618',
    code: '#ORD-2618',
    date: '10 Jun 2026',
    status: 'delivered',
    statusLabel: 'Delivered',
    productSummary: 'Chanderi Silk Dupatta',
    subtext: 'Delivered on 13 Jun 2026',
    price: '₹699',
    actions: [{ label: 'Buy Again' }, { label: 'Return / Exchange' }],
  },
  {
    id: 'ord-2605',
    code: '#ORD-2605',
    date: '2 Jun 2026',
    status: 'cancelled',
    statusLabel: 'Cancelled',
    productSummary: 'Block Print Kurti Set',
    subtext: 'Cancelled on 2 Jun · Refund: ₹1,299',
    price: '₹1,299',
    strikePrice: '₹1,299',
    actions: [],
  },
  {
    id: 'ord-2590',
    code: '#ORD-2590',
    date: '18 May 2026',
    status: 'return_pickup',
    statusLabel: 'Return Pickup',
    productSummary: 'Anarkali Suit Set',
    subtext: 'Pickup scheduled: 30 Jun · 10 AM – 2 PM',
    price: '₹2,099',
    actions: [{ label: 'Track Return', primary: true }],
  },
]

const STATUS_STYLES: Record<MockOrder['status'], { pill: string; dot: string; text: string }> = {
  out_for_delivery: { pill: 'bg-[#FFF7E6] border-[#FDE68A]', dot: 'bg-amber-500', text: 'text-[#92400E]' },
  shipped: { pill: 'bg-[#EFF6FF] border-[#BFDBFE]', dot: 'bg-[#3B82F6]', text: 'text-[#1E3A8A]' },
  delivered: { pill: 'bg-[#F0FDF4] border-[#BBEDD4]', dot: 'bg-[#10B981]', text: 'text-[#065F46]' },
  cancelled: { pill: 'bg-[#FEF2F2] border-[#FECACA]', dot: 'bg-[#EF4444]', text: 'text-[#991B1B]' },
  return_pickup: { pill: 'bg-[#F5F3FF] border-[#DDD6FE]', dot: 'bg-[#7C3AED]', text: 'text-[#5B21B6]' },
}

const TABS = ['All', 'Active', 'Delivered', 'Cancelled', 'Returns']

export default function OrdersPage() {
  return (
    <>
      <div className="mx-auto min-h-screen max-w-[390px] bg-[#F9F9F9] sm:max-w-none">
        <div className="flex h-14 items-center justify-between border-b border-[#E8E8E8] bg-white px-4 sm:hidden">
          <div className="flex items-center gap-3">
            <ChevronLeft className="h-5 w-5 text-[#18181B]" />
            <h1 className="font-heading text-lg font-bold text-[#18181B]">My Orders</h1>
          </div>
          <Search className="h-5 w-5 text-[#18181B]" />
        </div>

        <div className="flex overflow-x-auto border-b border-[#E8E8E8] bg-white sm:hidden">
          {TABS.map((tab, i) => (
            <div
              key={tab}
              className={`shrink-0 px-4 py-3 text-sm font-body ${
                i === 0
                  ? 'border-b-[2.5px] border-[#E8577E] font-bold text-[#E8577E]'
                  : 'border-b-[2.5px] border-transparent text-[#8B7D7A]'
              }`}
            >
              {tab}
            </div>
          ))}
        </div>

        <div className="pb-20 sm:pb-8">
          {MOCK_ORDERS.map((order) => {
            const style = STATUS_STYLES[order.status]
            return (
              <div key={order.id} className={`mb-2 bg-white p-4 ${order.status === 'cancelled' ? 'opacity-75' : ''}`}>
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-body text-base text-[#8B7D7A]">
                    {order.code} {order.date}
                  </span>
                  <span className={`inline-flex items-center gap-[5px] rounded-full border px-[10px] py-1 ${style.pill}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                    <span className={`font-body text-[11px] font-bold ${style.text}`}>{order.statusLabel}</span>
                  </span>
                </div>
                <div className="flex items-center gap-[10px]">
                  <div className="h-14 w-14 shrink-0 rounded-lg bg-gradient-to-br from-rose-800 to-indigo-900" />
                  <div className="min-w-0 grow">
                    <p className="truncate font-body text-sm font-semibold text-[#18181B]">{order.productSummary}</p>
                    <p className="mt-[3px] font-body text-xs text-[#8B7D7A]">{order.subtext}</p>
                    <p className="mt-1 font-body text-sm font-bold text-[#18181B]">
                      {order.price}
                      {order.strikePrice && <span className="ml-1 text-xs font-normal text-[#8B7D7A] line-through">{order.strikePrice}</span>}
                    </p>
                  </div>
                  <ChevronRight className="h-[18px] w-[18px] shrink-0 text-[#8B7D7A]" />
                </div>
                {order.actions.length > 0 && (
                  <div className="mt-3 flex gap-2 border-t border-[#E8E8E8] pt-3">
                    {order.actions.map((action) => (
                      <div
                        key={action.label}
                        className={`flex h-9 grow items-center justify-center rounded-lg text-xs font-semibold ${
                          action.primary
                            ? 'border-[1.5px] border-[#E8577E] text-[#E8577E]'
                            : 'border-[1.5px] border-[#E8E8E8] text-[#8B7D7A]'
                        }`}
                      >
                        {action.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <MobileTabBar active="Orders" />
    </>
  )
}
```

- [ ] **Step 2: Start dev server and verify at 390px against Paper `9YD-0`**

Run the dev server (`npm run dev`), open `http://localhost:3000` resolved to the `silk` tenant (per the local dev routing gotcha, hit it through the tenant subdomain path, not bare localhost root), navigate to `/orders`, resize preview to 390px width. Because this track renders mock data with no auth guard, the page loads without logging in — that is expected and correct at this stage. Compare against the Paper screenshot pulled for `9YD-0`: 5 order cards, tab row with "All" active/underlined in pink, correct status pill colors and text per order. Confirm zero console errors and zero failed network requests.

- [ ] **Step 3: Commit the mock UI**

```bash
git add app/store/orders/page.tsx
git commit -m "feat: add orders list page UI with mock data matching Paper design"
```

---

### Task 3: Order Detail Page (UI)

**Files:**
- Create: `app/store/orders/[id]/page.tsx`

**Interfaces:**
- Produces: `/orders/[id]` page rendered from a typed `MockOrderDetail` fixture — satisfies Phase 3's checkout redirect target `app/store/orders/[id]` visually; the Data-track's `getCustomerOrder` swap makes it functionally real.

- [ ] **Step 1: Build the order detail page against Paper mock data**

Paper's "Order Detail / Mobile" artboard (`9YE-0`, 390×2100) shows, top to bottom: header with back arrow + order id (`#ORD-2649`) + "Placed 28 Jun 2026 · 2 items" + kebab menu; an amber status banner (`bg-[#FFF7E6]`, 3px bottom border `border-b-amber`) with truck icon, "Out for Delivery" heading, "Arrives today by 7:00 PM" subtext, and a courier row (`DTDC · #9876543210`, "Track Live →" pill button); an "ORDER TIMELINE" section with 5 steps (Order Placed, Order Confirmed, Shipped, Out for Delivery, Delivered) each with a filled pink checkmark circle for completed steps, an amber pulsing ring for the current step, and an empty outlined circle for future steps, connected by a vertical line; an "ITEMS (2)" section listing each item with a 72×72 rounded thumbnail, name, "Size: X · Qty: N", price (with strikethrough MRP where applicable), followed by a Subtotal/Discount/Delivery/Total Paid breakdown; a "DELIVERING TO" section with name + address + phone; a "PAYMENT" section with a UPI badge, payment handle, and amount; and finally two action buttons (Track Package primary pink, Invoice outlined) plus a WhatsApp "Need help? Message Meena Silks" outlined green button.

Create `app/store/orders/[id]/page.tsx`:
```tsx
import { Truck, Check, FileText, MessageCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

type MockOrderDetail = {
  code: string
  placedDate: string
  itemCount: number
  status: string
  statusSubtext: string
  courier: string
  timeline: { label: string; timestamp: string; detail: string; state: 'done' | 'current' | 'upcoming' }[]
  items: { name: string; sizeQty: string; price: string; strikePrice?: string }[]
  subtotal: string
  discount: string
  delivery: string
  totalPaid: string
  deliverTo: { name: string; address: string }
  payment: { method: string; handle: string; amount: string }
}

const MOCK_ORDER: MockOrderDetail = {
  code: '#ORD-2649',
  placedDate: '28 Jun 2026',
  itemCount: 2,
  status: 'Out for Delivery',
  statusSubtext: 'Arrives today by 7:00 PM',
  courier: 'DTDC · #9876543210',
  timeline: [
    { label: 'Order Placed', timestamp: '28 Jun 2026 · 10:42 AM', detail: 'Payment confirmed via UPI', state: 'done' },
    { label: 'Order Confirmed', timestamp: '28 Jun 2026 · 11:15 AM', detail: 'Meena Silks confirmed your order', state: 'done' },
    { label: 'Shipped', timestamp: '29 Jun 2026 · 9:30 AM', detail: 'Dispatched via DTDC from Chennai Hub', state: 'done' },
    { label: 'Out for Delivery', timestamp: '29 Jun 2026 · 11:08 AM · NOW', detail: 'Delivery agent: Rajan K · +91 98765 00001', state: 'current' },
    { label: 'Delivered', timestamp: 'Expected today by 7:00 PM', detail: '', state: 'upcoming' },
  ],
  items: [
    { name: 'Kanjivaram Silk Saree', sizeQty: 'Size: Free · Qty: 1', price: '₹2,499', strikePrice: '₹3,299' },
    { name: 'Banarasi Silk Kurti', sizeQty: 'Size: M · Qty: 1', price: '₹499' },
  ],
  subtotal: '₹3,798',
  discount: '−₹800',
  delivery: 'Free',
  totalPaid: '₹2,998',
  deliverTo: {
    name: 'Priya Rajan',
    address: '12, Green Park Colony, Anna Nagar\nChennai, Tamil Nadu — 600040\n+91 98765 43210',
  },
  payment: { method: 'UPI', handle: 'meenasilks@okaxis', amount: '₹2,998' },
}

export default function OrderDetailPage() {
  const order = MOCK_ORDER

  return (
    <div className="mx-auto min-h-screen max-w-[390px] bg-white pb-10 sm:max-w-2xl">
      <div className="border-b border-[#E8E8E8] px-4 py-4">
        <p className="font-body text-base font-bold text-[#18181B]">{order.code}</p>
        <p className="font-body text-[11px] text-[#8B7D7A]">
          Placed {order.placedDate} · {order.itemCount} items
        </p>
      </div>

      <div className="mb-2 border-b-[3px] border-amber-500 bg-[#FFF7E6] px-4 py-5">
        <div className="mb-[10px] flex items-center gap-[10px]">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-500">
            <Truck className="h-[22px] w-[22px] text-white" />
          </div>
          <div>
            <p className="font-body text-lg font-bold text-[#92400E]">{order.status}</p>
            <p className="mt-[2px] font-body text-sm text-[#B45309]">{order.statusSubtext}</p>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-[#F59E0B4D] bg-[#F59E0B1A] px-3 py-[10px]">
          <div>
            <p className="mb-[2px] font-body text-[11px] font-semibold uppercase tracking-[0.06em] text-[#92400E]">Courier</p>
            <p className="font-body text-sm font-bold text-[#78350F]">{order.courier}</p>
          </div>
          <div className="flex h-8 items-center rounded-md bg-amber-500 px-[14px]">
            <span className="font-body text-xs font-bold text-white">Track Live →</span>
          </div>
        </div>
      </div>

      <div className="mb-2 bg-white px-4 py-5">
        <p className="mb-4 font-body text-sm font-bold uppercase tracking-[0.06em] text-[#18181B]">Order Timeline</p>
        {order.timeline.map((step, i) => (
          <div key={step.label} className="flex gap-3">
            <div className="flex w-6 shrink-0 flex-col items-center">
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  step.state === 'done'
                    ? 'bg-[#E8577E]'
                    : step.state === 'current'
                      ? 'border-[3px] border-[#FDE68A] bg-amber-500'
                      : 'border-2 border-[#E8E8E8] bg-white'
                }`}
              >
                {step.state === 'done' && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
              </div>
              {i < order.timeline.length - 1 && (
                <div className={`min-h-8 w-[2px] grow ${step.state === 'done' ? 'bg-[#E8577E]' : 'bg-[#E8E8E8]'}`} />
              )}
            </div>
            <div className={i < order.timeline.length - 1 ? 'pb-6' : ''}>
              <p className={`font-body text-sm font-semibold ${step.state === 'current' ? 'text-[#92400E] font-bold' : step.state === 'upcoming' ? 'text-[#8B7D7A]' : 'text-[#18181B]'}`}>
                {step.label}
              </p>
              {step.timestamp && (
                <p className={`mt-[2px] font-body text-xs ${step.state === 'current' ? 'text-[#B45309]' : 'text-[#8B7D7A]'}`}>{step.timestamp}</p>
              )}
              {step.detail && (
                <p className={`font-body text-xs ${step.state === 'current' ? 'text-[#92400E]' : 'text-[#8B7D7A]'}`}>{step.detail}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-2 bg-white p-4">
        <p className="mb-3 font-body text-sm font-bold uppercase tracking-[0.06em] text-[#18181B]">Items ({order.itemCount})</p>
        {order.items.map((item, i) => (
          <div key={item.name} className={`flex gap-3 ${i < order.items.length - 1 ? 'mb-3 border-b border-[#E8E8E8] pb-3' : ''}`}>
            <div className="h-[72px] w-[72px] shrink-0 rounded-xl bg-gradient-to-br from-rose-800 to-indigo-900" />
            <div className="grow">
              <p className="font-body text-sm font-semibold text-[#18181B]">{item.name}</p>
              <p className="mt-[3px] font-body text-xs text-[#8B7D7A]">{item.sizeQty}</p>
              <div className="mt-[6px] flex items-center gap-2">
                <span className="font-body text-sm font-bold text-[#18181B]">{item.price}</span>
                {item.strikePrice && <span className="font-body text-[11px] text-[#8B7D7A] line-through">{item.strikePrice}</span>}
              </div>
            </div>
          </div>
        ))}
        <div className="mt-3 border-t border-[#E8E8E8] pt-3">
          <div className="mb-1 flex justify-between font-body text-xs">
            <span className="text-[#8B7D7A]">Subtotal</span>
            <span className="text-[#18181B]">{order.subtotal}</span>
          </div>
          <div className="mb-1 flex justify-between font-body text-xs">
            <span className="text-[#8B7D7A]">Discount (MRP)</span>
            <span className="text-[#10B981]">{order.discount}</span>
          </div>
          <div className="mb-1 flex justify-between font-body text-xs">
            <span className="text-[#8B7D7A]">Delivery</span>
            <span className="text-[#10B981]">{order.delivery}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-[#E8E8E8] pt-2 font-body text-sm font-bold text-[#18181B]">
            <span>Total Paid</span>
            <span>{order.totalPaid}</span>
          </div>
        </div>
      </div>

      <div className="mb-2 bg-white p-4">
        <div className="mb-4 border-b border-[#E8E8E8] pb-4">
          <p className="mb-2 font-body text-[11px] font-bold uppercase tracking-[0.08em] text-[#8B7D7A]">Delivering to</p>
          <p className="font-body text-sm font-semibold text-[#18181B]">{order.deliverTo.name}</p>
          <p className="mt-[2px] whitespace-pre-wrap font-body text-sm leading-[150%] text-[#8B7D7A]">{order.deliverTo.address}</p>
        </div>
        <div>
          <p className="mb-2 font-body text-[11px] font-bold uppercase tracking-[0.08em] text-[#8B7D7A]">Payment</p>
          <div className="flex items-center gap-2">
            <span className="rounded-sm bg-[#1A1040] px-2 py-[3px] font-body text-[10px] font-bold text-amber-500">{order.payment.method}</span>
            <span className="font-body text-sm text-[#18181B]">{order.payment.handle}</span>
            <span className="ml-auto font-body text-sm font-bold text-[#18181B]">{order.payment.amount}</span>
          </div>
        </div>
      </div>

      <div className="mb-2 flex flex-col gap-[10px] bg-white p-4">
        <div className="flex gap-[10px]">
          <div className="flex h-[46px] grow items-center justify-center gap-[6px] rounded-xl bg-[#E8577E]">
            <Truck className="h-4 w-4 text-white" />
            <span className="font-body text-sm font-bold text-white">Track Package</span>
          </div>
          <div className="flex h-[46px] grow items-center justify-center gap-[6px] rounded-xl border-[1.5px] border-[#E8E8E8]">
            <FileText className="h-4 w-4 text-[#8B7D7A]" />
            <span className="font-body text-sm font-semibold text-[#8B7D7A]">Invoice</span>
          </div>
        </div>
        <div className="flex h-11 items-center justify-center gap-2 rounded-xl border-[1.5px] border-[#25D366]">
          <MessageCircle className="h-4 w-4 text-[#25D366]" />
          <span className="font-body text-sm font-semibold text-[#25D366]">Need help? Message Meena Silks</span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify at 390px against Paper `9YE-0`**

Start dev server, navigate to `/orders/ord-2649` (any id works since it's mock data at this stage — the page ignores `params` until the Data-track wires `getCustomerOrder`), resize to 390px, compare timeline steps, status banner color, item breakdown, and button styling against the Paper screenshot. No login is required at this stage (mock logged-in state, no guard). Confirm zero console/network errors.

- [ ] **Step 3: Commit the mock UI**

```bash
git add "app/store/orders/[id]/page.tsx"
git commit -m "feat: add order detail page UI with mock data matching Paper design"
```

---

### Task 4: Account Page (UI)

**Files:**
- Create: `app/store/account/page.tsx`

**Interfaces:**
- Produces: `/account` page rendered from a typed `MockAccount` fixture whose fields mirror the Data-track's `AccountSummary` shape (`lib/data/customer-account.ts`), so the mock→real swap is a data-source replacement.

- [ ] **Step 1: Build the account page against Paper mock data**

Paper's "Account & Settings — Mobile" artboard (`AB2-0`, 390×1466) shows: header "My Account" + search icon; a dark gradient profile card (`linear-gradient(135deg, #1A1040-ish → #430D1A-ish` per Paper's oklab values — approximate with `bg-gradient-to-br from-[#1F1730] to-[#431A2E]`) with a 72×72 circular avatar (initial "P" on `--color-store-primary` background, 3px semi-transparent white border), name "Priya Rajan", phone "+91 98765 43210", email "priya.rajan@gmail.com" (both at reduced white opacity), an edit-pencil icon button, and a 3-column stats row (Orders: 8, Wishlist: 12 in pink, Total Spent: ₹14.2K in amber) separated by 1px translucent white dividers. Below: grouped list sections with uppercase muted section labels — "MY ACTIVITY" (My Orders w/ "1 Active" amber pill badge, My Wishlist, My Reviews — all with colored icon-badge + chevron), "ADDRESSES & PAYMENT" (Saved Addresses, Payment Methods), "PREFERENCES" (Order Notifications toggle ON pink, WhatsApp Updates toggle ON green, Language → English), "SUPPORT" (Help Centre, Chat with Meena Silks), "ACCOUNT" (Log Out in red, Delete Account in red with subtext). Footer: "Powered by talam" pill + "App version 1.0.0".

Desktop variant (`AX1-0`, 1440×960) uses a different layout: left sidebar card with avatar/name/phone + a vertical menu (Profile active/highlighted, My Orders, Addresses, Payments, Notifications), and a right content area with "Personal Information" card (editable Full Name / Phone / Email inputs + "Save Changes" button), "Notification Preferences" card (Order Updates, WhatsApp Alerts, Promotions & Offers toggles), and an "Account" card (Log Out / Delete Account buttons side by side).

Two scope flags carried from the plan's Known Gaps (data-track file): the "My Reviews" row renders as a disabled/static row ("Coming soon", `opacity-60`, no link) since no Reviews page exists; the "Order Notifications" / "WhatsApp Updates" toggles are inert display-only controls (no backing schema field exists) — both by design, not omissions.

Create `app/store/account/page.tsx`:
```tsx
import { MobileTabBar } from '@/components/store/mobile-tab-bar'
import { Package, Heart, Star, MapPin, CreditCard, Bell, Globe, HelpCircle, MessageCircle, LogOut, Trash2, Pencil, ChevronRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

type MockAccount = {
  name: string
  phone: string
  email: string
  orderCount: number
  wishlistCount: number
  totalSpent: string
  activeOrderCount: number
}

const MOCK_ACCOUNT: MockAccount = {
  name: 'Priya Rajan',
  phone: '+91 98765 43210',
  email: 'priya.rajan@gmail.com',
  orderCount: 8,
  wishlistCount: 12,
  totalSpent: '₹14.2K',
  activeOrderCount: 1,
}

export default function AccountPage() {
  const account = MOCK_ACCOUNT

  return (
    <>
      <div className="mx-auto min-h-screen max-w-[390px] bg-[#F9F9F9] sm:hidden">
        <div className="flex h-14 items-center justify-between border-b border-[#E8E8E8] bg-white px-4">
          <h1 className="font-heading text-lg font-bold text-[#18181B]">My Account</h1>
        </div>

        <div className="mb-2 bg-gradient-to-br from-[#1F1730] to-[#431A2E] px-5 py-6">
          <div className="flex items-center gap-4">
            <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full border-[3px] border-white/30 bg-[#E8577E]">
              <span className="font-body text-2xl font-bold text-white">{account.name[0]}</span>
            </div>
            <div className="min-w-0 grow">
              <p className="font-heading mb-[3px] text-xl font-bold text-white">{account.name}</p>
              <p className="mb-[2px] font-body text-sm text-white/60">{account.phone}</p>
              <p className="font-body text-xs text-white/45">{account.email}</p>
            </div>
            <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25">
              <Pencil className="h-4 w-4 text-white/70" />
            </button>
          </div>
          <div className="mt-5 flex border-t border-white/[0.12] pt-4">
            <div className="grow border-r border-white/[0.12] text-center">
              <p className="font-body text-[22px] font-bold text-white">{account.orderCount}</p>
              <p className="mt-[2px] font-body text-[11px] text-white/50">Orders</p>
            </div>
            <div className="grow border-r border-white/[0.12] text-center">
              <p className="font-body text-[22px] font-bold text-[#E8577E]">{account.wishlistCount}</p>
              <p className="mt-[2px] font-body text-[11px] text-white/50">Wishlist</p>
            </div>
            <div className="grow text-center">
              <p className="font-body text-[22px] font-bold text-amber-500">{account.totalSpent}</p>
              <p className="mt-[2px] font-body text-[11px] text-white/50">Total Spent</p>
            </div>
          </div>
        </div>

        <section className="mb-2 bg-white">
          <p className="pt-[14px] px-4 font-body text-[11px] font-bold uppercase tracking-wide text-[#8B7D7A]">My Activity</p>
          <div className="flex items-center gap-[14px] border-b border-[#E8E8E8] px-4 py-[14px]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F0F4FF]">
              <Package className="h-5 w-5 text-[#4F3FF0]" />
            </div>
            <div className="grow">
              <p className="font-body text-sm font-semibold text-[#18181B]">My Orders</p>
              <p className="mt-px font-body text-xs text-[#8B7D7A]">Track, return, reorder</p>
            </div>
            <span className="rounded-full bg-[#FEF3C7] px-2 py-[2px] font-body text-[11px] font-bold text-[#92400E]">
              {account.activeOrderCount} Active
            </span>
            <ChevronRight className="h-4 w-4 text-[#8B7D7A]" />
          </div>
          <div className="flex items-center gap-[14px] border-b border-[#E8E8E8] px-4 py-[14px]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF0F4]">
              <Heart className="h-5 w-5 fill-[#E8577E] text-[#E8577E]" />
            </div>
            <div className="grow">
              <p className="font-body text-sm font-semibold text-[#18181B]">My Wishlist</p>
              <p className="mt-px font-body text-xs text-[#8B7D7A]">{account.wishlistCount} saved items</p>
            </div>
            <ChevronRight className="h-4 w-4 text-[#8B7D7A]" />
          </div>
          <div className="flex items-center gap-[14px] px-4 py-[14px] opacity-60">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFFBEB]">
              <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
            </div>
            <div className="grow">
              <p className="font-body text-sm font-semibold text-[#18181B]">My Reviews</p>
              <p className="mt-px font-body text-xs text-[#8B7D7A]">Coming soon</p>
            </div>
          </div>
        </section>

        <section className="mb-2 bg-white">
          <p className="pt-[14px] px-4 font-body text-[11px] font-bold uppercase tracking-wide text-[#8B7D7A]">Addresses &amp; Payment</p>
          <div className="flex items-center gap-[14px] border-b border-[#E8E8E8] px-4 py-[14px]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F0FDF4]">
              <MapPin className="h-5 w-5 text-[#10B981]" />
            </div>
            <div className="grow">
              <p className="font-body text-sm font-semibold text-[#18181B]">Saved Addresses</p>
              <p className="mt-px font-body text-xs text-[#8B7D7A]">2 addresses saved</p>
            </div>
            <ChevronRight className="h-4 w-4 text-[#8B7D7A]" />
          </div>
          <div className="flex items-center gap-[14px] px-4 py-[14px]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5F3FF]">
              <CreditCard className="h-5 w-5 text-[#7C3AED]" />
            </div>
            <div className="grow">
              <p className="font-body text-sm font-semibold text-[#18181B]">Payment Methods</p>
              <p className="mt-px font-body text-xs text-[#8B7D7A]">UPI · Cards · Net banking</p>
            </div>
            <ChevronRight className="h-4 w-4 text-[#8B7D7A]" />
          </div>
        </section>

        <section className="mb-2 bg-white">
          <p className="pt-[14px] px-4 font-body text-[11px] font-bold uppercase tracking-wide text-[#8B7D7A]">Preferences</p>
          <div className="flex items-center gap-[14px] border-b border-[#E8E8E8] px-4 py-[14px]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF0F4]">
              <Bell className="h-5 w-5 text-[#E8577E]" />
            </div>
            <div className="grow">
              <p className="font-body text-sm font-semibold text-[#18181B]">Order Notifications</p>
              <p className="mt-px font-body text-xs text-[#8B7D7A]">Get updates on your orders</p>
            </div>
            <div className="h-6 w-11 shrink-0 rounded-full bg-[#E8577E]" aria-hidden />
          </div>
          <div className="flex items-center gap-[14px] border-b border-[#E8E8E8] px-4 py-[14px]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F0FDF4]">
              <MessageCircle className="h-5 w-5 text-[#25D366]" />
            </div>
            <div className="grow">
              <p className="font-body text-sm font-semibold text-[#18181B]">WhatsApp Updates</p>
              <p className="mt-px font-body text-xs text-[#8B7D7A]">Order alerts on WhatsApp</p>
            </div>
            <div className="h-6 w-11 shrink-0 rounded-full bg-[#25D366]" aria-hidden />
          </div>
          <div className="flex items-center gap-[14px] px-4 py-[14px]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F9FAFB]">
              <Globe className="h-5 w-5 text-[#8B7D7A]" />
            </div>
            <div className="grow">
              <p className="font-body text-sm font-semibold text-[#18181B]">Language</p>
              <p className="mt-px font-body text-xs text-[#8B7D7A]">English</p>
            </div>
            <ChevronRight className="h-4 w-4 text-[#8B7D7A]" />
          </div>
        </section>

        <section className="mb-2 bg-white">
          <p className="pt-[14px] px-4 font-body text-[11px] font-bold uppercase tracking-wide text-[#8B7D7A]">Support</p>
          <div className="flex items-center gap-[14px] border-b border-[#E8E8E8] px-4 py-[14px]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F9FAFB]">
              <HelpCircle className="h-5 w-5 text-[#8B7D7A]" />
            </div>
            <div className="grow">
              <p className="font-body text-sm font-semibold text-[#18181B]">Help Centre</p>
              <p className="mt-px font-body text-xs text-[#8B7D7A]">FAQs, returns, shipping</p>
            </div>
            <ChevronRight className="h-4 w-4 text-[#8B7D7A]" />
          </div>
          <div className="flex items-center gap-[14px] px-4 py-[14px]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F0FDF4]">
              <MessageCircle className="h-5 w-5 text-[#25D366]" />
            </div>
            <div className="grow">
              <p className="font-body text-sm font-semibold text-[#18181B]">Chat with Meena Silks</p>
              <p className="mt-px font-body text-xs text-[#8B7D7A]">WhatsApp · Usually replies in 1 hr</p>
            </div>
            <ChevronRight className="h-4 w-4 text-[#8B7D7A]" />
          </div>
        </section>

        <section className="mb-2 bg-white">
          <p className="pt-[14px] px-4 font-body text-[11px] font-bold uppercase tracking-wide text-[#8B7D7A]">Account</p>
          <button className="flex w-full items-center gap-[14px] border-b border-[#E8E8E8] px-4 py-[14px]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FEF2F2]">
              <LogOut className="h-5 w-5 text-[#EF4444]" />
            </div>
            <p className="font-body text-sm font-semibold text-[#EF4444]">Log Out</p>
          </button>
          <button className="flex w-full items-center gap-[14px] px-4 py-[14px]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FEF2F2]">
              <Trash2 className="h-5 w-5 text-[#EF4444]" />
            </div>
            <div className="text-left">
              <p className="font-body text-sm font-semibold text-[#EF4444]">Delete Account</p>
              <p className="mt-px font-body text-xs text-[#8B7D7A]">Permanently remove your data</p>
            </div>
          </button>
        </section>

        <div className="p-5 pb-24 text-center">
          <span className="inline-flex items-center gap-[5px] rounded-full border border-[#E8E8E8] px-[14px] py-[6px]">
            <span className="font-body text-[11px] text-[#8B7D7A]">Powered by</span>
            <span className="font-body text-[11px] font-bold text-[#4F3FF0]">talam</span>
          </span>
          <p className="mt-2 font-body text-[11px] text-[#8B7D7A]">App version 1.0.0</p>
        </div>
      </div>

      {/* Desktop: two-column layout per Paper AX1-0 */}
      <div className="mx-auto hidden max-w-6xl gap-6 px-8 py-8 sm:flex">
        <aside className="w-64 shrink-0 rounded-xl border border-[#E8E8E8] bg-white p-5">
          <div className="mb-4 flex flex-col items-center text-center">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#E8577E]">
              <span className="font-body text-xl font-bold text-white">{account.name[0]}</span>
            </div>
            <p className="font-body text-base font-semibold text-[#18181B]">{account.name}</p>
            <p className="font-body text-sm text-[#8B7D7A]">{account.phone}</p>
          </div>
          <nav className="flex flex-col gap-1">
            {['Profile', 'My Orders', 'Addresses', 'Payments', 'Notifications'].map((item, i) => (
              <div
                key={item}
                className={`rounded-lg px-3 py-2 font-body text-sm ${i === 0 ? 'bg-[#FFF0F4] font-semibold text-[#E8577E]' : 'text-[#8B7D7A]'}`}
              >
                {item}
              </div>
            ))}
          </nav>
        </aside>

        <div className="flex-1 space-y-6">
          <div className="rounded-xl border border-[#E8E8E8] bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-body text-lg font-bold text-[#18181B]">Personal Information</h2>
              <button className="rounded-lg border border-[#E8577E] px-4 py-2 font-body text-sm font-semibold text-[#E8577E]">
                Save Changes
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block font-body text-xs font-medium uppercase tracking-wide text-[#8B7D7A]">Full Name</label>
                <input readOnly value={account.name} className="w-full rounded-lg border border-[#E8E8E8] px-3 py-2 font-body text-sm text-[#18181B]" />
              </div>
              <div>
                <label className="mb-1 block font-body text-xs font-medium uppercase tracking-wide text-[#8B7D7A]">Phone Number</label>
                <input readOnly value={account.phone} className="w-full rounded-lg border border-[#E8E8E8] px-3 py-2 font-body text-sm text-[#18181B]" />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block font-body text-xs font-medium uppercase tracking-wide text-[#8B7D7A]">Email Address</label>
                <input readOnly value={account.email} className="w-full rounded-lg border border-[#E8E8E8] px-3 py-2 font-body text-sm text-[#18181B]" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#E8E8E8] bg-white p-6">
            <h2 className="mb-4 font-body text-lg font-bold text-[#18181B]">Notification Preferences</h2>
            {[
              { label: 'Order Updates', sub: 'Track your order status in real time', on: true, color: 'bg-[#E8577E]' },
              { label: 'WhatsApp Alerts', sub: 'Receive order updates on WhatsApp', on: true, color: 'bg-[#25D366]' },
              { label: 'Promotions & Offers', sub: 'Deals, flash sales, and new arrivals', on: false, color: 'bg-[#D1D5DB]' },
            ].map((pref) => (
              <div key={pref.label} className="flex items-center justify-between border-b border-[#E8E8E8] py-3 last:border-b-0">
                <div>
                  <p className="font-body text-sm font-semibold text-[#18181B]">{pref.label}</p>
                  <p className="font-body text-xs text-[#8B7D7A]">{pref.sub}</p>
                </div>
                <div className={`h-6 w-11 rounded-full ${pref.color}`} aria-hidden />
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-[#E8E8E8] bg-white p-6">
            <h2 className="mb-4 font-body text-lg font-bold text-[#18181B]">Account</h2>
            <div className="flex gap-3">
              <button className="rounded-lg border border-[#EF4444] px-4 py-2 font-body text-sm font-semibold text-[#EF4444]">Log Out</button>
              <button className="rounded-lg border border-[#E8E8E8] px-4 py-2 font-body text-sm font-semibold text-[#8B7D7A]">Delete Account</button>
            </div>
          </div>
        </div>
      </div>

      <MobileTabBar active="Account" />
    </>
  )
}
```

- [ ] **Step 2: Verify at 390px and 1440px against Paper `AB2-0` / `AX1-0`**

Start dev server, navigate to `/account` (no login required — mock logged-in state). At 390px: confirm the gradient profile card, stats row values (8 / 12 / ₹14.2K), all 5 grouped sections in order, toggle colors, and the "Powered by talam" footer. At 1440px: confirm sidebar + two-column content layout, editable-looking (read-only for this mock step) input fields, and the notification preferences card. Zero console/network errors both sizes.

- [ ] **Step 3: Commit the mock UI**

```bash
git add app/store/account/page.tsx
git commit -m "feat: add account page UI (mobile + desktop) with mock data matching Paper design"
```

---

### Task 5: Wishlist Page (UI)

**Files:**
- Create: `app/store/wishlist/page.tsx`

**Interfaces:**
- Produces: `/wishlist` page rendered from a typed `MockWishlistItem[]` fixture. The Data-track's `getWishlist` (`lib/data/wishlist.ts`) returns the real `WishlistItem` shape this page later maps into the same card grid.

- [ ] **Step 1: Build the wishlist page against Paper mock data**

Paper's "Wishlist — Mobile" artboard (`AB3-0`, 390×1149) shows: header "Saved Items (12)" + back arrow + "Share" button; a filter pill row (All Items / In Stock / Price ↑ / On Sale, "All Items" active on black background); a summary bar "12 items · ₹18,490 total" + "Add All to Cart" pink button; a 2-column product grid where each card has a gradient image with badges (top-left: "24% OFF" red or "NEW" green), a filled pink heart icon top-right (already saved), a bottom-left "Only 3 left!" urgency tag where applicable, category eyebrow text, product name, price (+ struck-through compare price), and an "Add to Cart" button (or "Notify Me" outlined for out-of-stock items, card at `opacity-65` with an "Out of Stock" overlay badge); footer "View 8 more items" outlined pink pill button. Desktop (`AX3-0`, 1440×1363) uses the same card design in a denser 4-column grid with a "Share" + "Sort: All Items" dropdown + "Add All to Cart" row, and shows star ratings (e.g. "★★★★★ 4.9 (248)") under each price that the mobile 2-column cards omit for space.

Create `app/store/wishlist/page.tsx`:
```tsx
import { MobileTabBar } from '@/components/store/mobile-tab-bar'
import { Heart, ShoppingCart, Share2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

type MockWishlistItem = {
  id: string
  badge?: { label: string; color: string }
  urgency?: string
  category: string
  name: string
  price: string
  comparePrice?: string
  rating?: string
  outOfStock?: boolean
  gradient: string
}

const MOCK_ITEMS: MockWishlistItem[] = [
  {
    id: 'w-1',
    badge: { label: '24% OFF', color: 'bg-[#EF4444]' },
    urgency: 'Only 3 left!',
    category: 'Handwoven Silk',
    name: 'Kanjivaram Silk Saree',
    price: '₹2,499',
    comparePrice: '₹3,299',
    rating: '★★★★★ 4.9 (248)',
    gradient: 'from-rose-800 to-indigo-900',
  },
  {
    id: 'w-2',
    badge: { label: 'NEW', color: 'bg-[#10B981]' },
    category: 'Embroidered',
    name: 'Block Print Kurti Set',
    price: '₹1,299',
    rating: '★★★★☆ 4.2 (152)',
    gradient: 'from-indigo-700 to-indigo-950',
  },
  {
    id: 'w-3',
    category: 'Chanderi Silk',
    name: 'Zari Border Dupatta',
    price: '₹699',
    rating: '★★★★★ 4.7 (89)',
    outOfStock: true,
    gradient: 'from-amber-700 to-amber-900',
  },
  {
    id: 'w-4',
    badge: { label: '15% OFF', color: 'bg-[#EF4444]' },
    category: 'Georgette',
    name: 'Anarkali Suit Set',
    price: '₹2,099',
    comparePrice: '₹2,499',
    rating: '★★★★☆ 4.4 (67)',
    gradient: 'from-emerald-800 to-emerald-950',
  },
]

const FILTERS = ['All Items', 'In Stock', 'Price ↑', 'On Sale']

export default function WishlistPage() {
  return (
    <>
      <div className="mx-auto min-h-screen max-w-[390px] bg-[#FAFAFA] sm:max-w-none">
        <div className="flex h-14 items-center justify-between border-b border-[#E8E8E8] bg-white px-4">
          <h1 className="font-body text-base text-[#18181B]">Saved Items (12)</h1>
          <button className="rounded-lg border border-[#E8E8E8] px-3 py-[6px]">
            <span className="flex items-center gap-1 font-body text-xs font-semibold text-[#8B7D7A]">
              <Share2 className="h-3.5 w-3.5" /> Share
            </span>
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-[#E8E8E8] bg-white px-4 py-3">
          {FILTERS.map((filter, i) => (
            <span
              key={filter}
              className={`shrink-0 rounded-full px-[14px] py-[6px] font-body text-xs ${
                i === 0 ? 'bg-[#18181B] font-semibold text-white' : 'border border-[#E8E8E8] text-[#8B7D7A]'
              }`}
            >
              {filter}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between border-b border-[#FFD6DF] bg-[#FFF8F9] px-4 py-[10px]">
          <span className="font-body text-sm text-[#8B7D7A]">12 items · ₹18,490 total</span>
          <button className="flex items-center gap-[6px] rounded-lg bg-[#E8577E] px-4 py-2">
            <ShoppingCart className="h-3.5 w-3.5 text-white" />
            <span className="font-body text-xs font-bold text-white">Add All to Cart</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-px bg-[#E8E8E8]">
          {MOCK_ITEMS.map((item) => (
            <div key={item.id} className={`flex flex-col bg-white ${item.outOfStock ? 'opacity-65' : ''}`}>
              <div className={`relative aspect-[2/3] overflow-hidden bg-gradient-to-br ${item.gradient}`}>
                {item.badge && (
                  <span className={`absolute left-0 top-0 px-2 py-1 font-body text-[11px] font-bold text-white ${item.badge.color}`}>
                    {item.badge.label}
                  </span>
                )}
                <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90">
                  <Heart className="h-4 w-4 fill-[#E8577E] text-[#E8577E]" />
                </span>
                {item.urgency && (
                  <span className="absolute bottom-[6px] left-[6px] rounded-full bg-[#EF4444E0] px-[7px] py-[2px] font-body text-[9px] font-bold text-white">
                    {item.urgency}
                  </span>
                )}
                {item.outOfStock && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                    <span className="rounded-md bg-black/70 px-3 py-[5px] font-body text-[11px] font-bold text-white">Out of Stock</span>
                  </span>
                )}
              </div>
              <div className="px-[10px] pb-[6px] pt-[10px]">
                <p className="mb-[2px] font-body text-[10px] uppercase tracking-[0.05em] text-[#8B7D7A]">{item.category}</p>
                <p className="font-heading mb-[5px] text-sm font-bold text-[#18181B]">{item.name}</p>
                <div className="mb-2 flex items-baseline gap-[5px]">
                  <span className={`font-body text-sm font-extrabold ${item.outOfStock ? 'text-[#8B7D7A]' : 'text-[#E8577E]'}`}>{item.price}</span>
                  {item.comparePrice && <span className="font-body text-[11px] text-[#8B7D7A] line-through">{item.comparePrice}</span>}
                </div>
                {item.outOfStock ? (
                  <div className="flex h-[34px] items-center justify-center rounded-[7px] border-[1.5px] border-[#E8E8E8]">
                    <span className="font-body text-xs font-semibold text-[#8B7D7A]">Notify Me</span>
                  </div>
                ) : (
                  <div className="flex h-[34px] items-center justify-center rounded-[7px] bg-[#E8577E]">
                    <span className="font-body text-xs font-bold text-white">Add to Cart</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 pb-24">
          <div className="inline-flex items-center rounded-xl border-[1.5px] border-[#E8577E] px-6 py-[10px]">
            <span className="font-body text-sm font-semibold text-[#E8577E]">View 8 more items</span>
          </div>
        </div>
      </div>
      <MobileTabBar active="Wishlist" />
    </>
  )
}
```

- [ ] **Step 2: Verify at 390px against Paper `AB3-0`**

Start dev server, navigate to `/wishlist` (no login required — mock logged-in state), resize to 390px. Compare against Paper: header + Share button, filter pills, summary bar with "Add All to Cart", 2-column grid with correct badges/urgency tags/out-of-stock overlay, "View 8 more items" pill. Zero console/network errors.

- [ ] **Step 3: Commit the mock UI**

```bash
git add app/store/wishlist/page.tsx
git commit -m "feat: add wishlist page UI with mock data matching Paper design"
```

---

## Phase 4 UI-Track Verification

- [ ] Run `npm run lint` — expect zero errors introduced by this file's pages.
- [ ] Manually click through `/orders` → `/orders/[id]` → `/account` → `/wishlist` on the `silk` tenant subdomain — all four render mock data without any login, screenshot-matched against their cited Paper artboards at 390px (and 1440px for Account).
- [ ] Zero console errors and zero failed network requests on every page at every verified width.

## Known Gaps

Phase 4's flagged gaps (route ownership, Order Confirmed page, Reviews destination, coupon data, desktop Account layout split, schema-less notification toggles) are data/schema-scoped or repeated inline above — they live in full in the "Known Gaps" section of the sibling `2026-07-06-talam-phase-4-customer-data.md`.

## Self-Review

- **Spec coverage:** All four UI-bearing tasks from the original combined file (1696 lines) carry their Design → Mock UI → Verify → Commit steps verbatim: Task 2 (Orders List, steps 1–3), Task 3 (Order Detail, steps 1–3), Task 4 (Account, steps 1–3), Task 5 (Wishlist, steps 1–3) — 12 checkbox steps, matching the original's Step-A counts for those tasks exactly. Task 1 (Auth Guard) is genuinely backend-only in the original (5 TDD steps, no Paper artboard, no markup) and appears here as a one-liner pointer so task numbering stays aligned with the Data-track sibling — nothing UI was lost by pointing. The original's Post-Plan Verification is split by nature: the lint + visual clickthrough items live here (adapted to no-auth mock rendering), the test-suite + logged-in/logged-out redirect items live in the Data-track file.
- **Placeholder scan:** No `<name>`-style unresolved placeholders. The "My Reviews" disabled row and the inert notification toggles are explicitly flagged design decisions carried from the original's Known Gaps, not stubs.
- **Type consistency:** Each `Mock*` fixture mirrors the real shape its Data-track counterpart returns (`MockOrder` ↔ `OrderListItem`, `MockOrderDetail` ↔ `OrderDetail`, `MockAccount` ↔ `AccountSummary`, `MockWishlistItem` ↔ `WishlistItem`), so every mock→real swap in the Data-track sibling is a data-source replacement inside the same JSX, not a rewrite.
- **Track discipline:** No Prisma queries, Server Actions, API routes, Supabase session reads, or `lib/auth-guard.ts` imports appear anywhere in this file — the original interleaved `requireAuth`/`requireTenant` into each page's Step 8; that wiring (and the guard utility itself) moved wholesale to the Data-track sibling, and every page here is a plain sync component rendering an inline mocked logged-in state so it screenshots without auth. `export const dynamic = 'force-dynamic'` is route-cache config, not data wiring. No new raw hexes beyond those cited from Paper in the original plan.
