# Phase 3: Commerce Implementation Plan — UI Track

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Track order:** This is a **UI-track** plan — part of the front-end-first pass across all 8 phases. Do not start any phase's **Data-track** plan until every phase's UI-track plan is complete. See the sibling `2026-07-06-talam-phase-3-commerce-data.md` for the payment providers, orders data layer, checkout wiring, and webhooks that follow this file.

**Goal:** Build the cart page and the 2-step checkout flow (address → payment) as mock-wired UI matching the live Paper "Talam Design" file pixel-for-pixel. Payment gateway integrations, order creation, and webhook handling are out of scope for this file — see the Data-track sibling.

**Architecture:** Cart state lives in the existing Zustand `useCartStore` (from Phase 2, `lib/store/cart.ts`, localStorage-persisted, client-only) — the cart page reads it directly, so cart "mock data" is just console-seeded store items, not a scratch fixture file. Checkout is SSR-dynamic (`force-dynamic`, never cached) and assumes an authenticated customer (the existing `/store/auth` page from Phase 2 handles login — checkout only ever renders steps 2 "Address" and 3 "Payment" from the Paper file, since step 1 "Login" is the pre-existing auth page users are redirected to first). Every UI task pulls exact copy/spacing/colors from the live Paper "Talam Design" file (team `Surya's Team`, file id `01KVZYTDJNREHBACTQMT2D9HR9`) before any component is written — Paper is ground truth over `docs/2026-06-23-talam-design.md`. The checkout page's "Place Order" button stays a disabled no-op in this file; the real Server Action submit handler is swapped in by the Data-track's Task 5.

**Tech Stack:** Next.js 16 App Router, Zustand cart store (`lib/store/cart.ts`, Phase 2), `react-hook-form` for the address form, existing `components/ui/*` (base-ui based `Button`, `Input`), Claude Preview MCP / dev-server screenshots for the verification step.

## Global Constraints

- Inherit all Phase 1 + 2 constraints as context, but do not write any Prisma, Server Action, API-route, webhook, or payment-provider code in this file — that is the Data-track's job. If a task needs a data shape that doesn't exist yet, mock it locally typed like the real shape and leave the real wiring to the Data-track sibling.
- Checkout page: `export const dynamic = 'force-dynamic'` — never cached.
- Design source of truth is the live Paper "Talam Design" file, not `docs/2026-06-23-talam-design.md`. All UI tasks below cite exact values pulled from Paper on 2026-07-06 (design tokens: `--color-fg #18181B`, `--color-muted #8B7D7A`, `--color-border #E8E8E8`, `--color-surface #FFFFFF`, `--color-bg #F9F9F9`, `--color-store-primary #E8577E`, `--color-danger #EF4444`, `--color-success #10B981`/`--color-success-bg #F0FDF4`/`--color-success-border #BBEDD4`, `--color-amber #F59E0B`; fonts `--font-heading "Playfair Display"`, `--font-body "DM Sans"`, `--font-admin system-ui`; these are already wired into `app/globals.css` per Phase 2 — reuse the existing Tailwind utility classes `text-fg`, `text-muted`, `border-border`, `bg-store-primary`, `text-success`, `bg-success-bg`, `border-success-border`, `text-danger`, `font-body`, `font-admin`, `font-heading` seen in `components/store/add-to-cart-button.tsx` and `size-picker.tsx` — do not invent new hexes).
- Coupon UI: the Paper cart/checkout screens show a coupon UI ("DIWALI20 applied · You save ₹1,179"). This track builds the coupon **UI** only; validation against `DiscountCode` and the persistence gap (no `Order.discountCode` field exists in the schema) are the Data-track's concern — see the "Known Gaps" section in `2026-07-06-talam-phase-3-commerce-data.md`.
- Verification step for every UI task: start the dev server, resize to 390px width then 1440px width, screenshot at both and compare against the cited Paper artboard, console errors must be empty, failed network requests must be empty.
- Note on the address form's pincode autofill: `AddressForm.handlePinBlur` fetches `/api/pincode/{pin}`, a route created by the Data-track's Task 5. Until that route exists the fetch fails silently by design (best-effort `catch → null`) — during UI verification, an expected 404 on that one route (only triggered by blurring a 6-digit pincode) is acceptable; do not build the route in this file.

---

### Task 1: Payment Provider Abstraction — backend-only, see Data track

Entirely backend (TDD: `PaymentProvider` interface, UPI Manual / Instamojo / Razorpay implementations, `getPaymentProvider` factory + tests). No Paper step, no UI. All steps live in `2026-07-06-talam-phase-3-commerce-data.md` Task 1.

---

### Task 2: Cart Page — Mock UI (Paper-verified) (UI)

**Files:**
- Create: `components/store/cart-item-row.tsx`
- Create: `app/store/cart/page.tsx`

**Interfaces:**
- Consumes: `useCartStore` from `lib/store/cart` (existing: `items: CartItem[]`, `removeItem(productId, size?)`, `updateQuantity(productId, size, quantity)`, `total()`, `count()`)
- Produces: `/cart` page rendered pixel-for-pixel against Paper artboard "Cart — Mobile" (node `AKE-0`, 390×1700) and "Cart — Desktop" (node `AX2-0`, 1440×960)

**Design truth pulled from Paper** (file "Talam Design", page "Store Front", artboard "Cart — Mobile" `AKE-0`, retrieved 2026-07-06 via `get_jsx`):
- Header: back-arrow icon button (36×36) + "My Cart ({count} items)" label in `text-muted text-base`, right-aligned "Clear All" in `text-danger font-semibold text-xs`, `border-b border-border`, `h-[56px]`.
- Free-delivery banner: `bg-success-bg border-b border-success-border`, `py-[10px] px-4`, truck icon in `--color-success`, text `text-[#065F46] text-xs` reading "Add ₹{amount} more to get free delivery on this order!" — text color is a literal hex not in the token list (`#065F46`, a darker success-text shade used only in banners); use it as an inline value since no `--color-success-text` token exists.
- Item row: `w-[80px] h-[80px] rounded-xl` image thumbnail, optional `bg-danger` badge top-left showing `"{pct}% OFF"` in `text-[9px] font-bold text-surface`; name `text-md font-semibold text-fg`; meta line `text-muted text-xs` as `"Size: {size} · {material}"` (material has no schema field — omit it, show only `Size: {size}` when size exists); price row: `text-store-primary text-base font-[800]` current price, `text-muted text-xs line-through` compare price (only if `comparePrice` set), `text-success text-2xs font-bold` "Save ₹{diff}"; quantity stepper is a `border-border` (1.5px) rounded pill with 36×32px minus/count/plus cells; trailing "Save"/"Remove" text-icon pair (`text-muted`/`text-danger` `text-2xs`) — Remove maps to `removeItem`, minus/plus map to `updateQuantity`. Rows separated by `border-b border-border`, last row has no bottom border.
- Coupon block: `bg-surface p-[14px] px-4`, label "Have a coupon?" `font-semibold text-fg text-sm`, input pill `border-border` (1.5px) placeholder "ENTER COUPON CODE" `text-muted text-sm`, "Apply" button `bg-store-primary text-surface font-bold text-sm`. Applied state: `bg-success-bg border-success-border` row with checkmark + `"{CODE} applied · You save ₹{amount}!"` `text-[#065F46] font-semibold text-xs` and an "×" dismiss icon.
- Trust row: 3 lines with `--color-success` icons and `text-muted text-xs`: "Secure checkout — your data is 100% encrypted", "Easy 30-day returns on all orders", "Free delivery on orders above ₹500" (last line's threshold is tenant-configurable via `freeDeliveryAbove`, not hardcoded).
- Price Details card: `bg-surface p-4`, heading "Price Details" `font-bold text-md`, rows: "Items ({n})" / "MRP Discount" (green, `−₹{amt}`) / "Coupon ({CODE})" (green, only if applied) / "Delivery" ("Free" in green or ₹amount) / divider / "Total" `font-bold text-base`; celebratory `bg-success-bg` strip "You're saving ₹{amt} on this order 🎉" when any discount applies.
- Sticky footer bar: `h-[80px] bg-surface border-t border-border`, left side "Total ({n} items)" `text-muted text-xs` + `₹{total}` `text-success font-[800] text-xl` with "Saved ₹{amt}" trailing, right/below a full-width `h-[52px] rounded-[12px] bg-store-primary` "Proceed to Checkout" button with a right-arrow icon, and a centered "← Continue Shopping" text link in `text-store-primary font-semibold text-xs`.
- No artboard exists for an *empty* cart state in Paper — the empty state below is **not verified against Paper** and uses existing app conventions (`ShoppingBag` icon + CTA) already established in Phase 2's product page empty states; flagged as an invented fallback, not a Paper-sourced layout.

Mock data used for this task (typed like the real `CartItem` from `lib/store/cart.ts`, verified pixel/copy match against Paper):
```typescript
// Used only in Storybook-less manual dev-server verification — actual page reads useCartStore.
// Shape matches lib/store/cart.ts CartItem exactly.
const MOCK_CART_ITEMS: CartItem[] = [
  { productId: 'p1', name: 'Kanjivaram Silk Saree', price: 2499, size: undefined, image: '', tenantId: 't1', quantity: 1 },
  { productId: 'p2', name: 'Block Print Kurti Set', price: 1299, size: 'M', image: '', tenantId: 't1', quantity: 1 },
]
```

- [ ] **Step 1: Create cart item row component**

Create `components/store/cart-item-row.tsx`:
```typescript
'use client'

import Image from 'next/image'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { useCartStore, type CartItem } from '@/lib/store/cart'

export function CartItemRow({ item }: { item: CartItem }) {
  const { updateQuantity, removeItem } = useCartStore()

  return (
    <div className="flex gap-3 border-b border-border py-[14px] px-4 last:border-b-0">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-bg">
        {item.image && (
          <Image
            src={`${item.image}?f_auto,q_auto,w_160`}
            alt={item.name}
            fill
            className="object-cover"
          />
        )}
      </div>
      <div className="min-w-0 grow space-y-1">
        <p className="font-body text-md font-semibold leading-[130%] text-fg">{item.name}</p>
        {item.size && <p className="font-body text-xs text-muted">Size: {item.size}</p>}
        <p className="font-body text-base font-[800] text-store-primary">
          ₹{(item.price * item.quantity).toLocaleString('en-IN')}
        </p>
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center overflow-hidden rounded-lg border-[1.5px] border-border">
            <button
              type="button"
              className="flex h-8 w-9 shrink-0 items-center justify-center border-r border-border"
              onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1)}
              aria-label="Decrease quantity"
            >
              <Minus className="h-3.5 w-3.5 text-fg" />
            </button>
            <div className="flex h-8 w-9 shrink-0 items-center justify-center font-body text-md font-bold text-fg">
              {item.quantity}
            </div>
            <button
              type="button"
              className="flex h-8 w-9 shrink-0 items-center justify-center border-l border-border"
              onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1)}
              aria-label="Increase quantity"
            >
              <Plus className="h-3.5 w-3.5 text-fg" />
            </button>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 font-body text-2xs text-danger"
            onClick={() => removeItem(item.productId, item.size)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create cart page with mock fallback wiring**

Create `app/store/cart/page.tsx`:
```typescript
'use client'

import Link from 'next/link'
import { ShoppingBag, ArrowRight } from 'lucide-react'
import { useCartStore } from '@/lib/store/cart'
import { CartItemRow } from '@/components/store/cart-item-row'

export default function CartPage() {
  const { items, total, count, removeItem, updateQuantity } = useCartStore()
  const itemCount = count()
  const cartTotal = total()

  if (itemCount === 0) {
    // No Paper artboard exists for the empty-cart state — this reuses the
    // existing empty-state convention from Phase 2's product listing page.
    return (
      <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4">
        <ShoppingBag className="h-12 w-12 text-muted" />
        <p className="font-body text-lg font-medium text-fg">Your cart is empty</p>
        <Link
          href="/shop"
          className="rounded-lg bg-store-primary px-6 py-3 font-body text-sm font-bold text-surface"
        >
          Continue Shopping
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-lg pb-24">
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <p className="font-body text-base text-muted">My Cart ({itemCount} items)</p>
        <button
          type="button"
          className="font-body text-xs font-semibold text-danger"
          onClick={() => items.forEach((i) => removeItem(i.productId, i.size))}
        >
          Clear All
        </button>
      </div>

      <div>
        {items.map((item) => (
          <CartItemRow key={`${item.productId}-${item.size}`} item={item} />
        ))}
      </div>

      <div className="space-y-2 bg-surface p-4">
        <p className="font-body text-md font-bold text-fg">Price Details</p>
        <div className="flex justify-between font-body text-sm">
          <span className="text-muted">Items ({itemCount})</span>
          <span className="text-fg">₹{cartTotal.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between font-body text-sm">
          <span className="text-muted">Delivery</span>
          <span className="text-success">Free</span>
        </div>
        <div className="h-px bg-border" />
        <div className="flex justify-between font-body text-base font-bold text-fg">
          <span>Total</span>
          <span>₹{cartTotal.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-surface p-4">
        <div className="mx-auto flex max-w-lg items-center justify-between pb-2">
          <div>
            <p className="font-body text-xs text-muted">Total ({itemCount} items)</p>
            <p className="font-body text-xl font-[800] text-fg">₹{cartTotal.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <Link
          href="/checkout"
          className="mx-auto flex h-[52px] max-w-lg items-center justify-center gap-2 rounded-[12px] bg-store-primary font-body text-base font-bold text-surface"
        >
          Proceed to Checkout
          <ArrowRight className="h-[18px] w-[18px]" />
        </Link>
        <Link
          href="/shop"
          className="mt-2 block text-center font-body text-xs font-semibold text-store-primary"
        >
          ← Continue Shopping
        </Link>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Verify against Paper at 390px and 1440px**

Start the dev server, open `/cart` (seed the cart via `useCartStore.getState().addItem(...)` in the browser console using the `MOCK_CART_ITEMS` shape above), screenshot at 390px width and compare side-by-side against the Paper screenshot of `AKE-0`. Check: header height/text, image thumbnail 80×80 rounding, quantity stepper cell widths, price colors (`text-store-primary` for discounted price, `text-danger` for Remove), sticky footer button height (52px) and border-radius (12px). Confirm zero console/network errors via the dev tools console.

- [ ] **Step 4: Commit**

```bash
git add app/store/cart/ components/store/cart-item-row.tsx
git commit -m "feat: add cart page UI matching Paper Cart — Mobile/Desktop artboards"
```

---

### Task 3: Checkout Page — Mock UI (Paper-verified) (UI)

**Files:**
- Create: `components/store/address-form.tsx`
- Create: `components/store/payment-method-picker.tsx`
- Create: `app/store/checkout/page.tsx`

**Interfaces:**
- Consumes: `useCartStore` (`items`, `total`, `clear`)
- Produces: 2-step client-side checkout UI (`address` step, `payment` step) inside a single `/checkout` route, with local component state driving which step shows — matches Paper's "Step 2 — Mobile (Address)" (`3WC-0`, 390×1386) and "Step 3 — Mobile (Payment)" (`3WE-0`, 390×933). Paper's "Step 1 — Mobile (Login)" (`3WA-0`) is NOT rebuilt here — the existing `/store/auth` page (built in Phase 2) is the login screen; this checkout route assumes an authenticated customer and starts at the Address step.

**Design truth pulled from Paper** (retrieved 2026-07-06):
- Top bar: `h-[60px] border-b border-border`, back-arrow `←` button, store wordmark in `font-heading font-bold text-lg` (e.g. "silk." per-tenant in real data, tenant name here), right-aligned "🔒 Secure" `text-success font-semibold text-xs`.
- 3-dot stepper directly under the top bar, `border-b border-border py-4`, three equal-width columns each with a 30×30 circle + label; completed/current step circle is `bg-store-primary border-store-primary` with white checkmark or the step number, label `text-store-primary text-2xs font-semibold uppercase tracking-[0.04em]`; upcoming step circle is `border-border` with `text-muted` number and `text-muted` label; a 2px connecting line between circles is `bg-store-primary` when passed, `bg-border` when not yet reached.
- Verified-phone banner (both address and payment steps): `bg-[#10B98114] border border-[#10B98133] rounded-lg py-3 px-[14px]`, shield-check icon in `--color-success`, "Verified" `text-success font-semibold text-md`, right-aligned phone number `text-muted text-sm` — pulled from the authenticated customer's phone.
- **Address step fields** (label above input, `font-admin font-semibold text-sm text-fg`; input pill `rounded-lg border-[1.5px] border-border py-[13px] px-[14px]`, placeholder text `font-body text-[15px] text-fg opacity-50`): Full Name*, Phone*, Address Line 1* (placeholder "Flat / House No., Building, Street"), Address Line 2 (placeholder "Locality, Area (optional)"), City* + Pincode* (2-col row), State* (select with chevron-down icon). CTA: full-width `rounded-xl bg-store-primary p-4` "Continue to Payment" `text-surface font-bold text-base`.
- **Order Summary card** (shown below the address form on the same scroll, per Paper): `border-t border-border p-4`, heading "Order Summary" + running total `font-bold text-md`; each line item `py-3 border-t border-border` with 52×52 rounded thumbnail, name `font-medium text-md`, "Size: {size} · Qty: {qty}" `text-muted text-xs`, price `font-semibold text-md`; totals block: Subtotal / Discount (green) / Delivery (green "Free" or amount) / divider / Total `font-bold text-base`; coupon entry row identical pattern to cart page; trust-badges box (`border border-border rounded-lg p-[14px]`) repeating the 3 trust lines seen on cart, with tenant-specific `returnWindowDays` driving the "Easy {n}-day returns" copy (Paper shows "7-day" here vs "30-day" on the cart mock — both are placeholder copy per-tenant, not a literal mismatch to preserve; use the real `tenant.returnWindowDays`).
- **Payment step**: same top bar + stepper (now step 3 highlighted) + verified-phone banner. "Delivery Address" summary card (`bg-bg border border-border rounded-lg p-3`) showing name + full address + an "Edit" link (`text-store-primary text-sm font-medium`) that returns to the address step. "Payment Method" heading `font-semibold text-base`. Three selectable payment method cards, each `rounded-xl border-[1.5px]`:
  - **UPI / QR Code** (selected/expanded state is the visual default in Paper): border `border-store-primary`, filled radio dot, a small "UPI" badge (`bg-[#1A1040] text-amber`), title "UPI / QR Code" `font-semibold text-[15px]`, subtitle "Scan & pay using any UPI app" `text-muted text-xs`. Expanded body: 100×100 QR placeholder box (`bg-bg border border-border`), "UPI ID" label (`text-2xs uppercase tracking-[0.04em] text-muted`) + value e.g. "meenasilks@okaxis" `font-semibold text-md`, 3-line instructions `text-muted text-xs leading-[160%]` ("1. Open PhonePe / GPay / Paytm", "2. Scan QR or enter UPI ID", "3. Pay ₹{total} and note the UTR"), "Enter UTR / Transaction ID" input (placeholder "e.g. 402115678901") + helper text "12-digit reference number from your payment app", full-width `rounded-xl bg-store-primary p-4` "Confirm Payment" button.
  - **Instamojo**: unselected style `border-border`, empty radio circle, badge `bg-[#004282] text-surface` "IM", title "Instamojo" `font-semibold text-[15px]`, subtitle "Cards, NetBanking, Wallets" `text-muted text-xs`.
  - **Razorpay**: unselected style `border-border`, empty radio circle, badge `bg-[#072654] text-surface` "RZ", title "Razorpay" `font-semibold text-[15px]`, subtitle "Cards, UPI, EMI, Wallets" `text-muted text-xs`.
  - Only render the payment method(s) matching `tenant.paymentProvider` for real data later — the mock UI in this task renders all three to match Paper visually, radio-selectable, defaulting to whichever is first.
  - Sticky footer: `border-t border-border p-3`, full-width `rounded-lg bg-store-primary py-[14px] px-4` "Place Order" `text-surface font-semibold text-[15px]`.

Mock data (typed like the real shapes used later — `CartItem[]` from the cart store, plus an `AddressData` shape matching what the Data-track's Task 5 server action will accept):
```typescript
type AddressData = {
  name: string
  phone: string
  line1: string
  line2?: string
  city: string
  state: string
  pin: string
}

const MOCK_ADDRESS: AddressData = {
  name: 'Priya Rajan',
  phone: '9876543210',
  line1: '12, Green Park Colony, Anna Nagar',
  city: 'Chennai',
  state: 'Tamil Nadu',
  pin: '600040',
}

type PaymentMethodOption = 'upi_manual' | 'instamojo' | 'razorpay'
```

- [ ] **Step 1: Create address form component**

Create `components/store/address-form.tsx`:
```typescript
'use client'

import { useForm } from 'react-hook-form'

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
  defaultValues?: Partial<AddressData>
}

export function AddressForm({ onSubmit, defaultValues }: Props) {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<AddressData>({ defaultValues })

  async function handlePinBlur(pin: string) {
    if (pin.length !== 6) return
    const details = await fetch(`/api/pincode/${pin}`).then((r) => (r.ok ? r.json() : null)).catch(() => null)
    if (details?.city) setValue('city', details.city)
    if (details?.state) setValue('state', details.state)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-4">
      <div>
        <label className="mb-1.5 block font-admin text-sm font-semibold text-fg">Full Name *</label>
        <input
          className="w-full rounded-lg border-[1.5px] border-border bg-surface px-[14px] py-[13px] font-body text-[15px] text-fg"
          placeholder="Priya Rajan"
          {...register('name', { required: true })}
        />
        {errors.name && <p className="mt-1 font-body text-xs text-danger">Required</p>}
      </div>
      <div>
        <label className="mb-1.5 block font-admin text-sm font-semibold text-fg">Phone *</label>
        <input
          inputMode="tel"
          className="w-full rounded-lg border-[1.5px] border-border bg-surface px-[14px] py-[13px] font-body text-[15px] text-fg"
          placeholder="98765 43210"
          {...register('phone', { required: true, pattern: /^[6-9]\d{9}$/ })}
        />
        {errors.phone && <p className="mt-1 font-body text-xs text-danger">Enter a valid 10-digit number</p>}
      </div>
      <div>
        <label className="mb-1.5 block font-admin text-sm font-semibold text-fg">Address Line 1 *</label>
        <input
          className="w-full rounded-lg border-[1.5px] border-border bg-surface px-[14px] py-[13px] font-body text-[15px] text-fg"
          placeholder="Flat / House No., Building, Street"
          {...register('line1', { required: true })}
        />
        {errors.line1 && <p className="mt-1 font-body text-xs text-danger">Required</p>}
      </div>
      <div>
        <label className="mb-1.5 block font-admin text-sm font-semibold text-fg">Address Line 2</label>
        <input
          className="w-full rounded-lg border-[1.5px] border-border bg-surface px-[14px] py-[13px] font-body text-[15px] text-fg"
          placeholder="Locality, Area (optional)"
          {...register('line2')}
        />
      </div>
      <div className="flex gap-3">
        <div className="grow">
          <label className="mb-1.5 block font-admin text-sm font-semibold text-fg">City *</label>
          <input
            className="w-full rounded-lg border-[1.5px] border-border bg-surface px-[14px] py-[13px] font-body text-[15px] text-fg"
            placeholder="Chennai"
            {...register('city', { required: true })}
          />
        </div>
        <div className="grow">
          <label className="mb-1.5 block font-admin text-sm font-semibold text-fg">Pincode *</label>
          <input
            inputMode="numeric"
            maxLength={6}
            className="w-full rounded-lg border-[1.5px] border-border bg-surface px-[14px] py-[13px] font-body text-[15px] text-fg"
            placeholder="600001"
            {...register('pin', { required: true, pattern: /^\d{6}$/, onBlur: (e) => handlePinBlur(e.target.value) })}
          />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block font-admin text-sm font-semibold text-fg">State *</label>
        <select
          className="w-full rounded-lg border-[1.5px] border-border bg-surface px-[14px] py-[13px] font-body text-[15px] text-fg"
          {...register('state', { required: true })}
        >
          <option value="">Select state</option>
          <option value="Tamil Nadu">Tamil Nadu</option>
          <option value="Karnataka">Karnataka</option>
          <option value="Kerala">Kerala</option>
          <option value="Andhra Pradesh">Andhra Pradesh</option>
          <option value="Telangana">Telangana</option>
        </select>
      </div>
      <button type="submit" className="rounded-xl bg-store-primary p-4 font-body text-base font-bold text-surface">
        Continue to Payment
      </button>
    </form>
  )
}
```

Install react-hook-form:
```bash
npm install react-hook-form
```

Note: `handlePinBlur`'s fetch targets `/api/pincode/[pin]`, which the Data-track's Task 5 creates — the `catch(() => null)` means it degrades silently until then. Do not build the route in this track.

- [ ] **Step 2: Create payment method picker**

Create `components/store/payment-method-picker.tsx`:
```typescript
'use client'

type Method = 'upi_manual' | 'instamojo' | 'razorpay'

const METHOD_META: Record<Method, { badge: string; badgeClass: string; title: string; subtitle: string }> = {
  upi_manual: { badge: 'UPI', badgeClass: 'bg-[#1A1040] text-amber', title: 'UPI / QR Code', subtitle: 'Scan & pay using any UPI app' },
  instamojo: { badge: 'IM', badgeClass: 'bg-[#004282] text-surface', title: 'Instamojo', subtitle: 'Cards, NetBanking, Wallets' },
  razorpay: { badge: 'RZ', badgeClass: 'bg-[#072654] text-surface', title: 'Razorpay', subtitle: 'Cards, UPI, EMI, Wallets' },
}

type Props = {
  available: Method[]
  selected: Method
  onSelect: (m: Method) => void
  upiId?: string
  total: number
  utr: string
  onUtrChange: (utr: string) => void
}

export function PaymentMethodPicker({ available, selected, onSelect, upiId, total, utr, onUtrChange }: Props) {
  return (
    <div className="flex flex-col gap-3 px-4">
      {available.map((method) => {
        const meta = METHOD_META[method]
        const isSelected = selected === method
        return (
          <div
            key={method}
            className={`overflow-hidden rounded-xl border-[1.5px] ${isSelected ? 'border-store-primary' : 'border-border'}`}
          >
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-[14px] text-left"
              onClick={() => onSelect(method)}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${isSelected ? 'border-store-primary bg-store-primary' : 'border-border'}`}
              >
                {isSelected && <span className="h-2 w-2 rounded-full bg-surface" />}
              </span>
              <span className={`flex h-7 w-10 shrink-0 items-center justify-center rounded-[5px] font-admin text-[10px] font-bold ${meta.badgeClass}`}>
                {meta.badge}
              </span>
              <span>
                <span className="block font-admin text-[15px] font-semibold text-fg">{meta.title}</span>
                <span className="block font-admin text-xs text-muted">{meta.subtitle}</span>
              </span>
            </button>
            {isSelected && method === 'upi_manual' && (
              <div className="flex flex-col gap-3 px-4 pb-4">
                <div className="flex items-start gap-[14px]">
                  <div className="flex h-[100px] w-[100px] shrink-0 items-center justify-center rounded-lg border border-border bg-bg">
                    <div className="h-20 w-20 rounded-sm bg-surface" />
                  </div>
                  <div className="grow">
                    <p className="mb-1 font-admin text-2xs font-semibold uppercase tracking-[0.04em] text-muted">UPI ID</p>
                    <p className="mb-2 font-admin text-md font-semibold text-fg">{upiId}</p>
                    <p className="font-admin text-xs leading-[160%] text-muted">
                      1. Open PhonePe / GPay / Paytm<br />
                      2. Scan QR or enter UPI ID<br />
                      3. Pay ₹{total.toLocaleString('en-IN')} and note the UTR
                    </p>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block font-admin text-sm font-semibold text-fg">Enter UTR / Transaction ID</label>
                  <input
                    className="w-full rounded-lg border-[1.5px] border-border px-[13px] py-[11px] font-body text-[15px] text-fg"
                    placeholder="e.g. 402115678901"
                    value={utr}
                    onChange={(e) => onUtrChange(e.target.value)}
                  />
                  <p className="mt-1 font-admin text-xs text-muted">12-digit reference number from your payment app</p>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Create checkout page (mock, 2-step, force-dynamic)**

Create `app/store/checkout/page.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { useCartStore } from '@/lib/store/cart'
import { AddressForm, type AddressData } from '@/components/store/address-form'
import { PaymentMethodPicker } from '@/components/store/payment-method-picker'

export const dynamic = 'force-dynamic'

const STEPS = ['Address', 'Payment'] as const

export default function CheckoutPage() {
  const { items, total } = useCartStore()
  const [step, setStep] = useState<0 | 1>(0)
  const [address, setAddress] = useState<AddressData | null>(null)
  const [method, setMethod] = useState<'upi_manual' | 'instamojo' | 'razorpay'>('upi_manual')
  const [utr, setUtr] = useState('')
  const cartTotal = total()

  return (
    <main className="mx-auto max-w-lg pb-10">
      <div className="flex h-[60px] items-center gap-3 border-b border-border px-4">
        <button type="button" aria-label="Back" className="text-lg text-fg">←</button>
        <p className="grow font-heading text-lg font-bold text-fg">Checkout</p>
        <p className="font-admin text-xs font-semibold text-success">🔒 Secure</p>
      </div>

      <div className="mx-auto flex max-w-[480px] items-center justify-center border-b border-border py-4">
        {STEPS.map((label, i) => (
          <div key={label} className="flex grow flex-col items-center gap-1.5">
            <div
              className={`flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 ${
                i <= step ? 'border-store-primary bg-store-primary text-surface' : 'border-border text-muted'
              }`}
            >
              <span className="font-admin text-xs font-bold">{i < step ? '✓' : i + 1}</span>
            </div>
            <p className={`font-admin text-2xs font-semibold uppercase tracking-[0.04em] ${i <= step ? 'text-store-primary' : 'text-muted'}`}>
              {label}
            </p>
          </div>
        ))}
      </div>

      {step === 0 && (
        <AddressForm
          defaultValues={address ?? undefined}
          onSubmit={(data) => {
            setAddress(data)
            setStep(1)
          }}
        />
      )}

      {step === 1 && address && (
        <div className="flex flex-col gap-4 px-4 pt-4">
          <div className="rounded-lg border border-border bg-bg px-[14px] py-3">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="font-admin text-sm font-semibold text-fg">Delivery Address</p>
              <button type="button" className="font-admin text-sm font-medium text-store-primary" onClick={() => setStep(0)}>
                Edit
              </button>
            </div>
            <p className="font-admin text-sm font-medium text-fg">{address.name}</p>
            <p className="font-admin text-xs text-muted">
              {address.line1}, {address.city}, {address.state} — {address.pin}
            </p>
          </div>

          <p className="font-admin text-base font-semibold text-fg">Payment Method</p>

          <PaymentMethodPicker
            available={['upi_manual', 'instamojo', 'razorpay']}
            selected={method}
            onSelect={setMethod}
            upiId="store@okaxis"
            total={cartTotal}
            utr={utr}
            onUtrChange={setUtr}
          />

          <div className="border-t border-border p-3">
            <button
              type="button"
              className="w-full rounded-lg bg-store-primary py-[14px] font-body text-[15px] font-semibold text-surface"
              disabled={items.length === 0}
            >
              Place Order
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
```

The "Place Order" button is a deliberate no-op here — the Data-track's Task 5 replaces it with the real `initiateCheckout` server action call.

- [ ] **Step 4: Verify against Paper at 390px and 1440px**

With items seeded in `useCartStore` (via browser console, same mock shape as Task 2), walk through both steps at 390px width. Screenshot the address step and compare against Paper `3WC-0`; screenshot the payment step and compare against `3WE-0`. Verify: stepper circle sizing (30px), border widths (1.5px on inputs/cards), payment card selected-state border color (`border-store-primary`), UPI badge colors (`bg-[#1A1040]`, `bg-[#004282]`, `bg-[#072654]`). Confirm zero console/network errors.

- [ ] **Step 5: Commit**

```bash
git add app/store/checkout/ components/store/address-form.tsx components/store/payment-method-picker.tsx
git commit -m "feat: add 2-step checkout UI matching Paper Address/Payment artboards"
```

---

### Task 4: Orders Data Layer (TDD) — backend-only, see Data track

Entirely backend (TDD: `createOrder`/`getOrder`/`updateOrderPayment` in `lib/data/orders.ts` + tests). No Paper step, no UI. All steps live in `2026-07-06-talam-phase-3-commerce-data.md` Task 4.

---

### Task 5: Wire Checkout to Real Data (Server Action + Order Creation) — backend-only, see Data track

Data-wiring of the checkout page built in Task 3 above (server action `initiateCheckout`, pincode API route, delivery helper, real "Place Order" submit handler). All steps live in `2026-07-06-talam-phase-3-commerce-data.md` Task 5.

---

### Task 6: Instamojo & Razorpay Payment Webhooks (TDD) — backend-only, see Data track

Entirely backend (webhook route handlers with signature verification). No Paper step, no UI. All steps live in `2026-07-06-talam-phase-3-commerce-data.md` Task 6.

---

## Phase 3 UI Track Verification

```bash
npm run build
```
Expected: no TypeScript errors.

Manual smoke test (dev server, cart seeded via browser console):
- [ ] `/cart` renders items from `useCartStore`, quantity +/- and Remove work, matches Paper `AKE-0` at 390px
- [ ] Empty cart shows fallback empty state (not Paper-verified, flagged above)
- [ ] `/checkout` address step matches Paper `3WC-0`; submitting moves to payment step matching Paper `3WE-0`
- [ ] Selecting UPI shows the QR/UTR panel; radio-switching between the three payment method cards updates selected-state borders
- [ ] "Place Order" is present but inert (real submit lands in the Data-track's Task 5)
- [ ] Zero console errors and zero failed network requests at both 390px and 1440px (an expected 404 on `/api/pincode/*` — a Data-track route — is the only tolerated exception, and only if a 6-digit pincode was blurred)

## Known Gaps

Phase 3's flagged gaps (coupon persistence has no schema home, the Order Confirmed page `9V2-0` is unowned, checkout Step 1 login reuses `/store/auth` without the stepper chrome) are all schema/data-scoped — they live in the "Known Gaps" section of the sibling `2026-07-06-talam-phase-3-commerce-data.md`.

## Self-Review

- **Spec coverage:** Both UI-bearing tasks from the original combined file (1409 lines) are carried verbatim: Task 2 (Cart, 4 steps) and Task 3 (Checkout, 5 steps) — 9 checkbox steps total, matching the original's step counts for those tasks exactly. Tasks 1, 4, 5, and 6 are genuinely backend-only in the original (payment providers, orders data layer, checkout server-action wiring, webhooks) and appear here as one-liner pointers so task numbering stays aligned with the Data-track sibling — none of their steps were UI work, so nothing UI was lost by pointing.
- **Placeholder scan:** No `<name>`-style unresolved placeholders. The empty-cart state is explicitly flagged as an invented fallback (no Paper artboard exists), not passed off as Paper-sourced.
- **Type consistency:** `MOCK_CART_ITEMS` matches `lib/store/cart.ts`'s `CartItem` field-for-field; `AddressData` in `components/store/address-form.tsx` is the exact shape the Data-track Task 5's `initiateCheckout` accepts, so the mock→real swap there is a handler replacement, not a form rewrite. `PaymentMethodPicker`'s `Method` union matches the Prisma `paymentProvider` enum values (`upi_manual | instamojo | razorpay`) the Data-track factory consumes.
- **Track discipline:** No Prisma queries, Server Actions, API routes, webhook handlers, or payment-provider code appear anywhere in this file. The two data-adjacent touchpoints are both read-side and deliberate: the cart page reads the pre-existing Phase 2 Zustand store (client state, not backend), and `AddressForm.handlePinBlur` fetches a route this track does not build, degrading silently until the Data-track creates it. `export const dynamic = 'force-dynamic'` is route-cache config, not data wiring. No new raw hexes beyond those cited from Paper (`#065F46`, `#10B98114`, `#10B98133`, `#1A1040`, `#004282`, `#072654`).
