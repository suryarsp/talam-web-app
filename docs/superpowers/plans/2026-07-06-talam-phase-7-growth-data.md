# Phase 7: Growth Infrastructure Implementation Plan — Data Track

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Track order:** This is a **Data-track** plan. Do not start it until every phase's UI-track plan (Phases 1–8) is complete. This file specifically depends on `2026-07-06-talam-phase-7-growth-ui.md` having been executed first (it builds `app/join/page.tsx` as a mock-wired page with a hardcoded referrer banner, which this file's Task 5 wires to a real `getReferrerTenant` lookup).

**Goal:** Wire up growth/retention infrastructure for the platform: OTP rate limiting (Upstash Redis), PostHog product analytics (server + client), Resend transactional emails (order confirmation + owner new-order alert), `@vercel/og` social-card generation for WhatsApp sharing, and the real referrer-lookup data layer for the `/join` tenant-signup landing page the UI track already built. This phase is almost entirely backend/integration plumbing — the only UI surface is `/join`, and even that has no live Paper artboard to match (see Known Gaps).

**Architecture:** Rate limiting wraps the existing OTP-send flow with a sliding-window check (`lib/rate-limit.ts`) in front of a new `/api/otp/send` route, keeping Supabase's `signInWithOtp` (→ MSG91 SMS Hook) as the actual OTP delivery mechanism — this phase adds a guard in front of it, it does not replace it or reroute it through email. PostHog is wired as two independent pieces: a client-side pageview/autocapture provider in the root layout, and a server-side `trackEvent` helper called from `after()` blocks Phase 3 already stubbed in `app/store/checkout/actions.ts` and the two payment webhook routes. Resend sends two emails per paid order (customer confirmation, owner alert) from the same `after()` blocks — **gated behind `Tenant.notifyEmailOnOrder`** (an existing schema field) for the owner alert. `@vercel/og` renders OG images at a per-tenant `/{store}/og` edge route referenced from store/product `<head>` metadata. `/join`'s data layer is a read-only referrer-tenant lookup keyed off `utm_campaign`, wired into the page the UI track already shipped.

**Tech Stack:** `@upstash/ratelimit` + `@upstash/redis` (already installed, unused), `posthog-js` (already installed, unused) + `posthog-node` (not yet installed), `resend` (already installed, unused), `@vercel/og` (not yet installed), Next.js `after()`, Vitest.

## Global Constraints

- Inherit all prior phase constraints (multi-tenant via `x-tenant-id` header set by `middleware.ts`; `withTenant(tenantId, fn)` wraps every tenant-scoped Prisma call).
- **This phase has a hard dependency on Phase 3 (commerce) and Phase 4 (customer), neither of which is implemented yet** — both exist only as plans (`docs/superpowers/plans/2026-07-06-talam-phase-3-commerce.md`, `-phase-4-customer.md`). Every task below that references order/checkout data (Task 2's `order_placed`/`order_paid` PostHog events, Task 3's order-confirmation emails) depends on:
  - `app/store/checkout/actions.ts` — Phase 3 Task 5, which already contains the exact `after()` stub this plan fills in (`// Phase 7 wires Resend + PostHog here — placeholder log only for now.`, confirmed present in the Phase 3 plan at that file/task).
  - `app/api/webhooks/instamojo/route.ts` and `app/api/webhooks/razorpay/route.ts` — Phase 3 Task 6, same stub pattern (`console.log('[after] Order ... paid via ...')`).
  - The exact `Order`/`OrderItem`/`Customer` shapes Phase 3 defines against the real `prisma/schema.prisma` (verified directly, not assumed): `Order { id, tenantId, customerId, status: OrderStatus, total: Decimal, paymentProvider: String?, paymentId: String?, paymentStatus: PaymentStatus, shippingAddress: Json, trackingId: String?, createdAt }`, `OrderItem { id, orderId, tenantId, productId, productName, size?: String, quantity: Int, unitPrice: Decimal }`, `Customer { id, tenantId, name?: String, phone?: String, email?: String, createdAt }` — note `Customer.email` is **nullable**, so every email-send task below must handle the no-email case by skipping, not throwing.
  - If Phase 7 is executed before Phase 3/4 land, Tasks 2 and 3 below **cannot be wired past their mock/interface stage** — their data-layer steps import functions (`getOrder`, `createOrder`'s call site in `actions.ts`) that will not exist yet. Task 1 (rate limiting), Task 4 (OG images), and Task 5 (`/join`) have no such dependency and can proceed independently.
- **OTP auth is SMS-only via MSG91 — never Resend, never email.** Confirmed directly against `app/store/auth/page.tsx` (the only copy on the page is "Enter your mobile number — we'll text you a one-time code to continue," no email field exists anywhere in the auth flow) and `.env.example` (`MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID` are the OTP-delivery config; `RESEND_API_KEY` is a separate, unrelated var). Resend in this phase is used **exclusively** for post-purchase transactional email (order confirmation, owner alert) — no task in this plan touches `signInWithOtp`'s delivery channel. WhatsApp (`Tenant.whatsappNumber`, `Tenant.showWhatsappButton` — both already in schema) is for customer-support contact links elsewhere in the app, not built or touched by this phase either.
- **Schema reality check** (`prisma/schema.prisma`, read directly): `Tenant.notifyEmailOnOrder` (`Boolean @default(true)`) already exists — this is the real gate for whether the owner gets a new-order email, not a field this plan invents. `Tenant` also has `ownerId` (`String @db.Uuid`) — the owner's email is not stored on `Tenant` itself; it must be looked up via Supabase Admin (`auth.admin.getUserById(tenant.ownerId)`), same pattern used for Supabase-authenticated users elsewhere in the codebase. There is no `Tenant.utmSource`/`referredBySlug`/any referral-tracking field — Task 5's referral attribution is **read-only display** (look up the referrer tenant by slug for a banner), not persisted anywhere; no discount/credit is granted or written to the schema (flagged in Known Gaps, not fabricated).
- **`.env.example` already has placeholders for this phase's services** (checked directly, not assumed greenfield): `NEXT_PUBLIC_POSTHOG_KEY` (public section), `RESEND_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (server section) are already present as empty values. This plan does not re-add them; it only adds `CRON_SECRET` if/where needed (not needed — this plan has no cron task, unlike an earlier draft; nurture-sequence cron is explicitly out of scope, see Known Gaps).
- **Dependency reality check** (`package.json`, read directly): `@upstash/ratelimit`, `@upstash/redis`, `posthog-js`, and `resend` are **already installed** — this plan wires them, it does not `npm install` them. `posthog-node` (server-side PostHog SDK) and `@vercel/og` are **not installed** — Tasks 2 and 4 install them.
- **No existing `lib/rate-limit.ts`, PostHog config, Resend config, or `opengraph-image.tsx`/OG route anywhere in the repo** (verified via repo-wide search — zero matches for `rate-limit`, `posthog` outside `node_modules`/`package.json`, `resend` outside `package.json`, or `opengraph`). This phase is greenfield for all four integrations at the code level, even though the dependencies/env vars are partially scaffolded.
- Money fields (`Order.total`, `OrderItem.unitPrice`) are Prisma `Decimal` — narrow to `number` via `Number(...)` before use in email templates or analytics payloads, matching every prior phase's convention.
- `after()` callbacks must never throw — every `after()` block in this plan wraps its body in try/catch and logs on failure, matching the existing stubs' structure.
- No PII in PostHog event properties — use `tenantId` and Supabase `user.id` as identifiers, never phone numbers or emails.
- All money in emails/OG images formatted `₹{n.toLocaleString('en-IN')}`, matching every prior phase's convention.
- Do not change the JSX structure, Tailwind classes, or copy the UI track shipped in `app/join/page.tsx` — Task 5's wiring step swaps the hardcoded `referrerName` constant for a real `getReferrerTenant` call, nothing visual.

---

## Known Gaps (flagged, not silently invented)

- **No live Paper artboard exists for `/join` (or any marketing/landing page).** Verified directly: the "Marketing" page (`8-0`) in the live "Talam Design" Paper file has **0 artboards** (confirmed via `get_basic_info` — `"pageName": "Marketing"`, `"artboardCount": 0`). A text search for `*join*` across the "Store Front" page's 27 artboards (`find_nodes`, `textValue: "*join*"`) returned zero matches — there is no signup/referral page hiding under a different page. This is the same shape of gap Phase 6 hit for platform-admin: a hard gap, not a lookup miss. `/join` is built freehand, reusing this project's existing marketing-adjacent conventions (the design tokens in `app/globals.css`, `font-heading`/`font-body`, `--color-brand-primary`) rather than pixel-matching a design that doesn't exist. Its Design → Mock UI → Verify step (see UI-track sibling) is downgraded from "pixel-match Paper" to "matches existing design-token conventions, zero console errors," per the required methodology for gap cases. No Paper lookups are needed in this track; that verification was done in the UI track.
- **No referral-credit schema.** There is no `Tenant.referredBy`/`referralCode`/any field linking one tenant's signup to another tenant's slug, and no `Subscription`/billing-credit model (confirmed absent in `prisma/schema.prisma`, consistent with Phase 6's finding that no billing/subscription schema exists at all). Task 5 shows a **read-only referral banner** ("You found us via {name}") when a `utm_campaign` query param matches a real tenant slug — it does not grant, track, or persist any referral reward. A "referrer gets 1 free month" mechanic would need a schema migration (a credit/referral table) plus Phase 6's not-yet-built billing system; both are out of scope here.
- **Owner nurture-sequence emails (welcome/no-products/no-orders/trial-ending drip) and any cron job are out of scope for this plan.** An earlier draft of this phase (visible in `git show 8acc628:...-phase-7-growth.md`, the prior/rejected version) included a `vercel.json` cron + `/api/cron/nurture` route sending day-0/day-2/day-7/day-13 emails. That is a distinct feature (lifecycle marketing automation) layered on top of the transactional-email infra this plan builds, and it depends on knowing exact tenant lifecycle timestamps/product-count/order-count queries that are better scoped as their own follow-up phase once Phase 3/4 are live and there's real usage data to tune send timing against. This plan builds `lib/email.ts` with `sendOrderConfirmation`/`sendNewOrderAlert` only — a future phase can add nurture sends on top of the same `lib/email.ts` helper.
- **Coupon/discount attribution in PostHog events**: Phase 3's plan documents that `DiscountCode` has no relation to `Order` in the schema (coupon UI exists, redemption isn't persisted). Consequently this phase's `order_placed`/`order_paid` PostHog events do not include a `discount_code` property — there is nothing in the `Order` row to read it from. Flagged, not fabricated.
- **OG image tenant logo/brand color**: `Tenant.logoUrl` and `Tenant.brandColor` both already exist in the schema and are used directly by Task 4 — no gap here, called out only to confirm this was checked rather than assumed.

---

### Task 1: OTP Rate Limiting (Data)

**Files:**
- Create: `lib/rate-limit.ts`
- Create: `lib/rate-limit.test.ts`
- Create: `app/api/otp/send/route.ts`
- Modify: `components/auth/otp-form.tsx`

**Interfaces:**
- Produces: `checkOtpRateLimit(phone: string): Promise<{ allowed: boolean; remaining: number }>`
- Produces: `POST /api/otp/send` — accepts `{ phone: string }`, rate-checks, then calls Supabase `signInWithOtp({ phone })` (unchanged delivery mechanism — still SMS via the MSG91 Auth Hook already configured for Supabase phone auth; this route adds a gate in front of it, it is not a new delivery path)

Not a UI-bearing task in the Paper sense — `components/auth/otp-form.tsx` already exists and its visible markup does not change, only its submit handler's target URL.

- [ ] **Step 1: Write failing test for `checkOtpRateLimit`**

Create `lib/rate-limit.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: vi.fn().mockImplementation(() => ({
    limit: vi.fn().mockResolvedValue({ success: true, remaining: 4 }),
  })),
  slidingWindow: vi.fn(),
}))

vi.mock('@upstash/redis', () => ({
  Redis: { fromEnv: vi.fn().mockReturnValue({}) },
}))

import { checkOtpRateLimit } from './rate-limit'

describe('checkOtpRateLimit', () => {
  it('returns allowed:true and the remaining count when under the limit', async () => {
    const result = await checkOtpRateLimit('+919876543210')
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

Run: `npm run test:run -- lib/rate-limit.test.ts`
Expected: FAIL with "Cannot find module './rate-limit'"

- [ ] **Step 3: Implement the rate limiter**

Create `lib/rate-limit.ts`:
```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

// ponytail: one sliding-window limiter, 5 attempts per 10 min per phone number.
// Upstash's serverless REST client is stateless per-request — no connection
// pool to manage, no separate rate-limit service to stand up.
const otpLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '10 m'),
  prefix: 'talam:otp',
})

export async function checkOtpRateLimit(phone: string): Promise<{ allowed: boolean; remaining: number }> {
  const { success, remaining } = await otpLimiter.limit(`otp:${phone}`)
  return { allowed: success, remaining }
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `npm run test:run -- lib/rate-limit.test.ts`
Expected: PASS

- [ ] **Step 5: Create the rate-checked OTP send route**

Create `app/api/otp/send/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { checkOtpRateLimit } from '@/lib/rate-limit'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { phone } = (await request.json()) as { phone?: string }

  if (!phone) {
    return NextResponse.json({ error: 'Phone number required' }, { status: 400 })
  }

  const { allowed, remaining } = await checkOtpRateLimit(phone)

  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many OTP requests. Try again in 10 minutes.' },
      { status: 429, headers: { 'Retry-After': '600' } }
    )
  }

  // Delivery is unchanged from before this phase: Supabase phone auth fires
  // its configured SMS Hook (MSG91) — this route only adds the rate-limit
  // gate in front of it. Never routes through Resend/email.
  const supabase = await createServerClient()
  const { error } = await supabase.auth.signInWithOtp({ phone })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, remaining })
}
```

- [ ] **Step 6: Point the existing OTP form at the rate-limited route**

Read `components/auth/otp-form.tsx` first to find its current `supabase.auth.signInWithOtp(...)` call site (built in an earlier phase). Replace that direct Supabase call with a `fetch('/api/otp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) })`, surfacing `data.error` (including the 429 rate-limit message) in the form's existing error-display state. Do not change any visible markup/JSX structure — only the function body of the send handler.

- [ ] **Step 7: Verify manually**

Start the dev server. Submit the OTP form 5 times in a row for the same phone number — confirm the 6th attempt shows "Too many OTP requests. Try again in 10 minutes." instead of sending. Confirm zero console errors on a normal (under-limit) send.

- [ ] **Step 8: Commit**

```bash
git add lib/rate-limit.ts lib/rate-limit.test.ts app/api/otp/send/route.ts components/auth/otp-form.tsx
git commit -m "feat: add Upstash Redis OTP rate limiting (5 per 10 min per phone)"
```

---

### Task 2: PostHog Analytics (Client Pageviews + Server Events) (Data)

**Files:**
- Create: `lib/analytics.ts`
- Create: `lib/analytics.test.ts`
- Create: `components/providers/posthog-provider.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/store/checkout/actions.ts` (Phase 3 dependency — see Global Constraints)
- Modify: `app/api/webhooks/instamojo/route.ts` (Phase 3 dependency)
- Modify: `app/api/webhooks/razorpay/route.ts` (Phase 3 dependency)

**Interfaces:**
- Produces: `trackEvent(userId: string, event: string, properties?: Record<string, unknown>): Promise<void>` (server-side, `posthog-node`)
- Produces: `<PostHogProvider>` client component — wraps the app, auto-captures pageviews via `posthog-js`

Not a UI-bearing task in the Paper sense (no visible markup — the provider is invisible instrumentation). No mock/data-layer split applies; this is TDD'd directly since there's no UI to build first.

- [ ] **Step 1: Install `posthog-node`**

```bash
npm install posthog-node
```
(`posthog-js` is already a dependency — only the server SDK is missing.)

- [ ] **Step 2: Write failing test for `trackEvent`**

Create `lib/analytics.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const captureMock = vi.fn()
const flushMock = vi.fn().mockResolvedValue(undefined)

vi.mock('posthog-node', () => ({
  PostHog: vi.fn().mockImplementation(() => ({
    capture: captureMock,
    flush: flushMock,
  })),
}))

import { trackEvent } from './analytics'

describe('trackEvent', () => {
  beforeEach(() => {
    captureMock.mockClear()
    flushMock.mockClear()
  })

  it('captures an event with the given distinctId, event name, and properties', async () => {
    await trackEvent('user-1', 'order_placed', { tenantId: 'tenant-1', amount: 2998 })
    expect(captureMock).toHaveBeenCalledWith({
      distinctId: 'user-1',
      event: 'order_placed',
      properties: { tenantId: 'tenant-1', amount: 2998 },
    })
    expect(flushMock).toHaveBeenCalled()
  })

  it('does not throw when PostHog capture fails', async () => {
    captureMock.mockImplementationOnce(() => {
      throw new Error('network down')
    })
    await expect(trackEvent('user-1', 'order_placed')).resolves.not.toThrow()
  })
})
```

- [ ] **Step 3: Run test — verify it fails**

Run: `npm run test:run -- lib/analytics.test.ts`
Expected: FAIL with "Cannot find module './analytics'"

- [ ] **Step 4: Implement `trackEvent`**

Create `lib/analytics.ts`:
```typescript
import { PostHog } from 'posthog-node'

let client: PostHog | null = null

function getClient(): PostHog {
  if (!client) {
    // ponytail: flushAt:1/flushInterval:0 forces every capture() to send
    // immediately — correct for serverless/edge request lifetimes where the
    // process may be frozen right after the response is sent, but means no
    // batching. Revisit if event volume ever makes per-call flush costly.
    client = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '', {
      host: 'https://app.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    })
  }
  return client
}

// No PII: callers pass `userId` (Supabase auth user id) as the PostHog
// distinctId, and `properties` must never include phone numbers or emails —
// see Global Constraints. `tenantId` is fine; it identifies a store, not a person.
export async function trackEvent(
  userId: string,
  event: string,
  properties: Record<string, unknown> = {}
): Promise<void> {
  try {
    const ph = getClient()
    ph.capture({ distinctId: userId, event, properties })
    await ph.flush()
  } catch (err) {
    console.error('[PostHog] trackEvent failed:', err)
  }
}
```

- [ ] **Step 5: Run test — verify it passes**

Run: `npm run test:run -- lib/analytics.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Create the client-side PostHog provider**

Create `components/providers/posthog-provider.tsx`:
```tsx
'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: 'https://app.posthog.com',
      capture_pageview: true,
      capture_pageleave: true,
      persistence: 'localStorage',
    })
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
```

- [ ] **Step 7: Wrap the root layout**

Read `app/layout.tsx` first to see its current structure (font setup, any existing providers from prior phases) before editing — do not assume its current contents. Wrap the existing `{children}` with `<PostHogProvider>{children}</PostHogProvider>`, adding the import. Do not remove or reorder any existing provider/wrapper already in the file.

- [ ] **Step 8: Verify the client provider loads with zero console errors**

Start the dev server, load any page, confirm no console errors (a missing/blank `NEXT_PUBLIC_POSTHOG_KEY` in local `.env` should no-op per the `if` guard in Step 6, not throw). Confirm a PostHog network request fires if a real key is set locally (optional — not required to proceed if no test PostHog project key is available).

- [ ] **Step 9: Commit the analytics infrastructure**

```bash
git add lib/analytics.ts lib/analytics.test.ts components/providers/posthog-provider.tsx app/layout.tsx
git commit -m "feat: add PostHog analytics (server-side trackEvent, client-side pageview provider)"
```

- [ ] **Step 10: Wire `order_placed` into the checkout `after()` block — REQUIRES PHASE 3**

This step modifies `app/store/checkout/actions.ts`, which is defined by Phase 3's plan and does not exist until Phase 3 is implemented. Before starting this step, confirm `app/store/checkout/actions.ts` exists in the repo — if it does not, stop here and leave Steps 10–12 for whenever Phase 3 lands; Steps 1–9 above stand independently.

Once Phase 3 exists, its `initiateCheckout` Server Action ends with this exact stub (per Phase 3's plan, Task 5):
```typescript
after(async () => {
  // Phase 7 wires Resend + PostHog here — placeholder log only for now.
  console.log(`[after] Order ${order.id} created for tenant ${tenantId}`)
})
```
Replace it with:
```typescript
after(async () => {
  try {
    await trackEvent(user.id, 'order_placed', {
      orderId: order.id,
      tenantId,
      amount: total,
      itemCount: cartItems.length,
    })
  } catch (err) {
    console.error('[after] order_placed tracking failed:', err)
  }
})
```
Add `import { trackEvent } from '@/lib/analytics'` at the top. `user` and `total` are already in scope at that point in `initiateCheckout` per Phase 3's plan — no new variables needed. No `discount_code` property (see Known Gaps).

- [ ] **Step 11: Wire `order_paid` into both payment webhooks — REQUIRES PHASE 3**

Same precondition as Step 10 — confirm `app/api/webhooks/instamojo/route.ts` and `app/api/webhooks/razorpay/route.ts` exist (Phase 3 Task 6) before proceeding.

Each webhook's `after()` stub (per Phase 3's plan) is:
```typescript
after(async () => {
  console.log(`[after] Order ${orderId} paid via Instamojo`)  // or "via Razorpay"
})
```
Replace each with:
```typescript
after(async () => {
  try {
    const order = await getOrder(tenantId, orderId)
    if (!order) return
    await trackEvent(order.customerId, 'order_paid', {
      orderId: order.id,
      tenantId,
      amount: Number(order.total),
    })
  } catch (err) {
    console.error('[after] order_paid tracking failed:', err)
  }
})
```
Add `import { trackEvent } from '@/lib/analytics'` and `import { getOrder } from '@/lib/data/orders'` (the latter already exists per Phase 3 Task 4). Both webhook files already have `tenantId`/`orderId` in scope per Phase 3's implementation.

- [ ] **Step 12: Manual smoke test and commit — REQUIRES PHASE 3**

Once Phase 3 is live: place a test order, confirm PostHog's Live Events view shows `order_placed` within ~30s; simulate a payment webhook, confirm `order_paid` appears with matching `orderId`.

```bash
git add app/store/checkout/actions.ts app/api/webhooks/instamojo/route.ts app/api/webhooks/razorpay/route.ts
git commit -m "feat: wire order_placed/order_paid PostHog events into checkout and payment webhooks"
```

---

### Task 3: Resend Transactional Emails (Order Confirmation + Owner Alert) (Data)

**Files:**
- Create: `lib/email.ts`
- Create: `lib/email.test.ts`
- Modify: `app/api/webhooks/instamojo/route.ts` (Phase 3 dependency)
- Modify: `app/api/webhooks/razorpay/route.ts` (Phase 3 dependency)

**Interfaces:**
- Produces: `sendOrderConfirmation(to: string, order: OrderEmailSummary): Promise<void>` — customer-facing
- Produces: `sendNewOrderAlert(to: string, order: OrderEmailSummary): Promise<void>` — owner-facing
- `OrderEmailSummary = { id: string; total: number; storeName: string; customerName: string; items: { productName: string; size: string | null; quantity: number; unitPrice: number }[] }`

Not a UI-bearing task — email HTML has no Paper artboard and none is expected (transactional emails aren't part of the Store Front/Checkout Flow Paper pages either, consistent with the "no Paper reference" pattern established for backend-adjacent output). No mock/data split needed — this is TDD'd directly against the Resend SDK's interface, mocked.

- [ ] **Step 1: Write failing test for `sendOrderConfirmation`**

Create `lib/email.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const sendMock = vi.fn().mockResolvedValue({ data: { id: 'email-1' }, error: null })

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: sendMock },
  })),
}))

import { sendOrderConfirmation, sendNewOrderAlert } from './email'

const ORDER = {
  id: 'order-123456789',
  total: 2998,
  storeName: 'Meena Silks',
  customerName: 'Priya Rajan',
  items: [
    { productName: 'Kanjivaram Silk Saree', size: null, quantity: 1, unitPrice: 2499 },
    { productName: 'Block Print Kurti Set', size: 'M', quantity: 1, unitPrice: 499 },
  ],
}

describe('sendOrderConfirmation', () => {
  beforeEach(() => sendMock.mockClear())

  it('sends to the customer with the order total and item list', async () => {
    await sendOrderConfirmation('priya@example.com', ORDER)
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'priya@example.com',
        subject: expect.stringContaining('Meena Silks'),
        html: expect.stringContaining('₹2,998'),
      })
    )
  })

  it('does not throw when Resend fails', async () => {
    sendMock.mockRejectedValueOnce(new Error('Resend down'))
    await expect(sendOrderConfirmation('priya@example.com', ORDER)).resolves.not.toThrow()
  })
})

describe('sendNewOrderAlert', () => {
  beforeEach(() => sendMock.mockClear())

  it('sends to the owner with the customer name and amount in the subject', async () => {
    await sendNewOrderAlert('owner@example.com', ORDER)
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'owner@example.com',
        subject: expect.stringContaining('Priya Rajan'),
      })
    )
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

Run: `npm run test:run -- lib/email.test.ts`
Expected: FAIL with "Cannot find module './email'"

- [ ] **Step 3: Implement the email helpers**

Create `lib/email.ts`:
```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = `orders@mail.${process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'mytalam.com'}`

export type OrderEmailSummary = {
  id: string
  total: number
  storeName: string
  customerName: string
  items: { productName: string; size: string | null; quantity: number; unitPrice: number }[]
}

function itemsHtml(items: OrderEmailSummary['items']): string {
  return items
    .map(
      (item) => `
        <tr>
          <td>${item.productName}${item.size ? ` (${item.size})` : ''} &times;${item.quantity}</td>
          <td>&#8377;${(item.unitPrice * item.quantity).toLocaleString('en-IN')}</td>
        </tr>`
    )
    .join('')
}

export async function sendOrderConfirmation(to: string, order: OrderEmailSummary): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Order confirmed — ${order.storeName}`,
      html: `
        <h2>Thank you for your order!</h2>
        <p>Order #${order.id.slice(-8).toUpperCase()} from <strong>${order.storeName}</strong></p>
        <table>${itemsHtml(order.items)}</table>
        <p><strong>Total: &#8377;${order.total.toLocaleString('en-IN')}</strong></p>
      `,
    })
  } catch (err) {
    console.error('[Resend] sendOrderConfirmation failed:', err)
  }
}

export async function sendNewOrderAlert(to: string, order: OrderEmailSummary): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `New order from ${order.customerName} — ₹${order.total.toLocaleString('en-IN')}`,
      html: `
        <h2>New order received!</h2>
        <p>Order #${order.id.slice(-8).toUpperCase()} &middot; &#8377;${order.total.toLocaleString('en-IN')}</p>
        <p>From: ${order.customerName}</p>
        <table>${itemsHtml(order.items)}</table>
      `,
    })
  } catch (err) {
    console.error('[Resend] sendNewOrderAlert failed:', err)
  }
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `npm run test:run -- lib/email.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit the email infrastructure**

```bash
git add lib/email.ts lib/email.test.ts
git commit -m "feat: add Resend order confirmation and new-order alert email helpers"
```

- [ ] **Step 6: Wire both emails into the payment webhooks' `after()` blocks — REQUIRES PHASE 3**

Precondition: confirm `app/api/webhooks/instamojo/route.ts` and `app/api/webhooks/razorpay/route.ts` exist (Phase 3 Task 6) before starting. If Task 2 Step 11 above has already been done in the same session, extend that same `after()` block rather than writing a second one — do not create two separate `after()` calls in the same route handler.

For each webhook, extend the `after()` block from Task 2 Step 11 to also send emails:
```typescript
after(async () => {
  try {
    const order = await getOrder(tenantId, orderId)
    if (!order) return

    await trackEvent(order.customerId, 'order_paid', {
      orderId: order.id,
      tenantId,
      amount: Number(order.total),
    })

    const [tenant, customer] = await Promise.all([
      withTenant(tenantId, (db) => db.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, ownerId: true, notifyEmailOnOrder: true },
      })),
      withTenant(tenantId, (db) => db.customer.findUnique({
        where: { id: order.customerId },
        select: { name: true, email: true },
      })),
    ])

    const summary: OrderEmailSummary = {
      id: order.id,
      total: Number(order.total),
      storeName: tenant?.name ?? 'Store',
      customerName: customer?.name ?? 'Customer',
      items: order.items.map((i) => ({
        productName: i.productName,
        size: i.size,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
      })),
    }

    // Customer.email is nullable — skip, don't throw, if the customer has no email on file.
    if (customer?.email) {
      await sendOrderConfirmation(customer.email, summary)
    }

    // Tenant.notifyEmailOnOrder already exists in the schema and defaults to
    // true — this is the real opt-out gate, not an invented field.
    if (tenant?.notifyEmailOnOrder && tenant.ownerId) {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const { data: ownerData } = await createAdminClient().auth.admin.getUserById(tenant.ownerId)
      if (ownerData?.user?.email) {
        await sendNewOrderAlert(ownerData.user.email, summary)
      }
    }
  } catch (err) {
    console.error('[after] post-payment email/tracking failed:', err)
  }
})
```
Add `import { sendOrderConfirmation, sendNewOrderAlert, type OrderEmailSummary } from '@/lib/email'`. Confirm `lib/supabase/admin.ts` (a `createAdminClient` using `SUPABASE_SERVICE_ROLE_KEY`) exists from an earlier phase before relying on it — if it does not exist yet, this dynamic import is the one new dependency this step introduces and should be flagged to whoever executes this task.

- [ ] **Step 7: Manual smoke test and commit — REQUIRES PHASE 3**

Once Phase 3 is live: complete a test order via UPI Manual, mark it paid (or simulate the Instamojo/Razorpay webhook), confirm the customer receives an order-confirmation email (if `Customer.email` is set) and the store owner receives a new-order alert (if `notifyEmailOnOrder` is true).

```bash
git add app/api/webhooks/instamojo/route.ts app/api/webhooks/razorpay/route.ts
git commit -m "feat: wire order confirmation and owner alert emails into payment webhooks"
```

---

### Task 4: OG Images for WhatsApp/Social Sharing (Data)

**Files:**
- Create: `app/store/og/route.tsx`
- Modify: `app/store/page.tsx` (add `generateMetadata` — only if this file already exists from an earlier phase; verify before editing)

**Interfaces:**
- Produces: `GET /og?title=...&subtitle=...&image=...&color=...` → 1200×630 PNG via `@vercel/og`, edge runtime
- Produces: `openGraph`/`twitter` metadata on the store home page pointing at that route with tenant-specific params

No Paper artboard exists for OG card layout (OG images aren't a rendered app screen — they're a social-preview asset, outside every one of the 6 Paper pages' scope by definition). This is downgraded to "matches existing design-token conventions (tenant `brandColor`, `logoUrl`), zero console/network errors," per the required methodology for gap cases.

- [ ] **Step 1: Install `@vercel/og`**

```bash
npm install @vercel/og
```

- [ ] **Step 2: Create the OG image route**

Create `app/store/og/route.tsx`:
```tsx
import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title') ?? 'Welcome'
  const subtitle = searchParams.get('subtitle') ?? ''
  const imageUrl = searchParams.get('image') ?? ''
  const color = searchParams.get('color') ?? '#4F3FF0' // falls back to --color-brand-primary

  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '1200px', height: '630px', backgroundColor: '#ffffff', fontFamily: 'sans-serif' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '60px',
            width: imageUrl ? '55%' : '100%',
            backgroundColor: color,
          }}
        >
          <div style={{ fontSize: '52px', fontWeight: 700, color: '#ffffff', lineHeight: 1.1 }}>{title}</div>
          {subtitle && <div style={{ fontSize: '28px', color: 'rgba(255,255,255,0.85)', marginTop: '16px' }}>{subtitle}</div>}
          <div style={{ fontSize: '20px', color: 'rgba(255,255,255,0.6)', marginTop: '32px' }}>Powered by Talam</div>
        </div>
        {imageUrl && (
          <div style={{ display: 'flex', width: '45%', overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
```

- [ ] **Step 3: Verify the route renders**

Start the dev server, visit `http://localhost:3000/store/og?title=Meena+Silks&subtitle=Shop+Now&color=%23E8577E` directly in a browser — confirm a 1200×630 image renders with the pink background and white text, zero console errors in the terminal running the dev server (edge routes don't produce browser console output for a direct image request, so check server logs instead).

- [ ] **Step 4: Commit the OG route**

```bash
git add app/store/og/route.tsx
git commit -m "feat: add @vercel/og social card route for WhatsApp/social sharing"
```

- [ ] **Step 5: Wire OG metadata into the store home page**

Check whether `app/store/page.tsx` already exists (it should, from an earlier storefront phase per the git log's "add store home page with hero banner and product grid" commit) before editing. Read it first. Add a `generateMetadata` export that reads the tenant (`x-tenant-id` header, same pattern as every other tenant-scoped page in this codebase) and builds:
```typescript
import type { Metadata } from 'next'
import { headers } from 'next/headers'

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  const subdomain = headersList.get('x-subdomain') ?? ''
  if (!tenantId) return {}

  // Reuse whatever tenant-fetch function this page already calls for its own
  // rendering (do not add a second Prisma query for the same tenant row) —
  // read the file's existing data-fetch call before adding this.
  const tenant = await getTenantStorefront(tenantId) // name matches whatever this file already imports

  if (!tenant) return {}

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'mytalam.com'
  const storeUrl = `https://${subdomain}.${rootDomain}`
  const ogUrl = `${storeUrl}/store/og?title=${encodeURIComponent(tenant.name)}&subtitle=${encodeURIComponent(tenant.tagline ?? 'Shop Now')}&color=${encodeURIComponent(tenant.brandColor ?? '#4F3FF0')}${tenant.logoUrl ? `&image=${encodeURIComponent(tenant.logoUrl)}` : ''}`

  return {
    title: tenant.name,
    description: tenant.tagline ?? `Shop ${tenant.name} — quality products delivered to your door.`,
    openGraph: { title: tenant.name, url: storeUrl, images: [{ url: ogUrl, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', images: [ogUrl] },
  }
}
```
`Tenant.tagline`, `Tenant.brandColor`, `Tenant.logoUrl` all already exist in the schema (verified directly) — no invented fields.

- [ ] **Step 6: Verify and commit**

Start the dev server, view page source on the store home route, confirm `<meta property="og:image">` points at the `/store/og` route with the real tenant name/color. Confirm zero console/network errors.

```bash
git add app/store/page.tsx
git commit -m "feat: add OG image metadata to store home page using tenant brand color and logo"
```

---

### Task 5: `/join` Tenant-Signup Landing Page — Referrer Data Wiring (Data)

**Files:**
- Create: `lib/data/referrer.ts`
- Create: `lib/data/referrer.test.ts`
- Modify: `app/join/page.tsx` (built by the UI-track sibling — replaces its hardcoded `referrerName` constant)

**Interfaces:**
- Produces: `getReferrerTenant(slug: string): Promise<{ name: string } | null>`

This task wires the real referrer lookup into `app/join/page.tsx`, the page the UI-track sibling (`2026-07-06-talam-phase-7-growth-ui.md`, Task 5) already built and committed with a hardcoded `referrerName` constant. Do not change the JSX structure, Tailwind classes, or copy the UI track shipped — only the data source.

- [ ] **Step 1: Write failing test for `getReferrerTenant`**

Create `lib/data/referrer.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    tenant: {
      findUnique: vi.fn().mockResolvedValue({ name: 'Meena Silks' }),
    },
  },
}))

import { getReferrerTenant } from './referrer'

describe('getReferrerTenant', () => {
  it('returns the tenant name for a slug that exists', async () => {
    const referrer = await getReferrerTenant('silk')
    expect(referrer?.name).toBe('Meena Silks')
  })

  it('returns null for an empty slug without querying', async () => {
    const { prisma } = await import('@/lib/prisma')
    const referrer = await getReferrerTenant('')
    expect(referrer).toBeNull()
    expect(prisma.tenant.findUnique).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

Run: `npm run test:run -- lib/data/referrer.test.ts`
Expected: FAIL with "Cannot find module './referrer'"

- [ ] **Step 3: Implement `getReferrerTenant`**

Create `lib/data/referrer.ts`:
```typescript
import { prisma } from '@/lib/prisma'

// Cross-tenant by design, like Phase 6's platform-admin queries — this looks
// up an arbitrary tenant by slug for a public marketing page, not scoped to
// any single tenant's RLS context, so the bare `prisma` client is correct
// here (not `withTenant`).
export async function getReferrerTenant(slug: string): Promise<{ name: string } | null> {
  if (!slug) return null
  return prisma.tenant.findUnique({ where: { slug }, select: { name: true } })
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `npm run test:run -- lib/data/referrer.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Wire the real referrer lookup into the page**

Modify `app/join/page.tsx` (the file the UI-track sibling built) — replace the hardcoded `referrerName` with a real lookup driven by the `utm_campaign` search param:
```tsx
import Link from 'next/link'
import { getReferrerTenant } from '@/lib/data/referrer'

export const dynamic = 'force-dynamic'

const STATS = [
  { value: '14 min', label: 'to go live' },
  { value: '0%', label: 'platform fee' },
  { value: '₹499/mo', label: 'after 14-day trial' },
]

type Props = { searchParams: Promise<{ utm_campaign?: string }> }

export default async function JoinPage({ searchParams }: Props) {
  const { utm_campaign: slug = '' } = await searchParams
  const referrer = await getReferrerTenant(slug)

  return (
    <main className="mx-auto max-w-md space-y-8 px-4 py-16">
      <div className="space-y-3 text-center">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-fg">
          Start selling online today
        </h1>
        <p className="font-body text-muted">
          Your own store at <strong className="text-fg">yourname.mytalam.com</strong> — live in 14 minutes.
          No GST registration. No credit card required.
        </p>
      </div>

      {referrer && (
        <div className="rounded-lg border border-brand-primary/20 bg-brand-primary/5 px-4 py-3 text-center font-body text-sm text-fg">
          You found us via <span className="font-semibold">{referrer.name}</span>.
        </div>
      )}

      <div className="space-y-3">
        <Link
          href="/admin/onboarding"
          className="block w-full rounded-lg bg-brand-primary py-3 text-center font-body font-semibold text-surface"
        >
          Start free — 14-day trial
        </Link>
        <p className="text-center font-body text-xs text-muted">No credit card required. Cancel anytime.</p>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        {STATS.map((stat) => (
          <div key={stat.label}>
            <p className="font-body text-2xl font-bold text-fg">{stat.value}</p>
            <p className="mt-1 font-body text-xs text-muted">{stat.label}</p>
          </div>
        ))}
      </div>
    </main>
  )
}
```
Note: the "Start free" button links to `/admin/onboarding`, which is Phase 5's tenant-owner onboarding wizard route (per Phase 6's Global Constraints, the Onboarding Paper page — `6-0`, 11 artboards — is the tenant-owner Store→Brand→Product→Payment→Go Live flow). This plan does not build that destination; it only links to it, matching whatever route Phase 5 lands at. If Phase 5's onboarding route differs from `/admin/onboarding` by the time this task executes, update the `href` to match — verify rather than assume.

Start the dev server, visit `/join?utm_campaign=silk` (assuming a `silk` tenant is seeded, per the local dev routing gotcha), confirm the referrer banner shows "Meena Silks" (or whatever the seeded tenant's real name is); visit `/join` with no query param, confirm the banner is absent; visit `/join?utm_campaign=doesnotexist`, confirm the banner is absent (no error thrown for an unmatched slug).

- [ ] **Step 6: Commit the data wiring**

```bash
git add app/join/page.tsx lib/data/referrer.ts lib/data/referrer.test.ts
git commit -m "feat: wire /join referral banner to real tenant slug lookup via utm_campaign"
```

---

## Phase 7 Verification

```bash
npm run test:run
```
Expected: all tests pass, including this phase's new test files: `lib/rate-limit.test.ts`, `lib/analytics.test.ts`, `lib/email.test.ts`, `lib/data/referrer.test.ts`.

```bash
npm run build
```
Expected: no TypeScript errors (note: `app/store/og/route.tsx` is `edge` runtime — confirm the build doesn't warn about edge/Node API incompatibilities).

```bash
npm run lint
```
Expected: zero errors introduced by this phase's files.

Manual smoke test (Tasks 1, 4, 5 — no Phase 3/4 dependency):
- [ ] Submit the OTP form 5 times for the same phone number — the 6th attempt is blocked with a 429 and the rate-limit message; a normal under-limit send still works and still delivers via MSG91 SMS (not email).
- [ ] Visit `/store/og?title=Test+Store&color=%23E8577E` directly — returns a 1200×630 image with the given title and background color.
- [ ] View source on the store home page — `og:image` meta tag points at `/store/og` with the real tenant's name/brand color/logo.
- [ ] Visit `/join` with and without `?utm_campaign={real-seeded-slug}` — banner appears only when the slug matches a real tenant; page renders cleanly at 390px and 1440px with zero console errors.

Manual smoke test (Tasks 2, 3 — deferred until Phase 3/4 land):
- [ ] Place a test order → PostHog Live Events shows `order_placed` within ~30s.
- [ ] Pay via a simulated webhook → PostHog shows `order_paid`; customer with an email on file receives an order-confirmation email; store owner receives a new-order alert email (if `Tenant.notifyEmailOnOrder` is true).
- [ ] Confirm a customer with no email on file does not cause the webhook handler to throw (Task 3, Step 6's `if (customer?.email)` guard).

Re-confirm before executing Task 5: no `/join`-equivalent Paper artboard has been added to the "Marketing" page since this plan was written — if one now exists, treat Task 5's UI (built by the UI-track sibling) as needing a fresh pixel-match pass rather than assuming this plan's freehand layout is final.

---

## Self-Review

- **Spec coverage:** All 5 original Phase 7 tasks accounted for: Tasks 1–4 (rate limiting, PostHog, Resend, OG images) carry every original TDD step, `REQUIRES PHASE 3` gating callout, and commit verbatim — none of that content was UI-bearing, so none of it moved to the sibling. Task 5 carries only the data-layer steps (`getReferrerTenant` TDD cycle, wiring into `app/join/page.tsx`) — its mock-UI steps live in the UI-track sibling.
- **Placeholder scan:** No `<name>`-style unresolved placeholders. The `REQUIRES PHASE 3` gates on Task 2 Steps 10–12 and Task 3 Step 6 are preserved verbatim as load-bearing warnings, not decoration — they are the exact precondition checks from the original plan.
- **Type consistency:** `getReferrerTenant(slug): Promise<{ name: string } | null>` matches the `.name` access the UI-track sibling's `referrerName` mock stood in for, so the wiring step in this file is a data-source swap inside JSX the UI track already shipped, not a rewrite.
- **Track discipline:** Every Prisma call, Server Action reference, API route, `after()` block, and `REQUIRES PHASE 3` gate from the original plan lands in this file. The one JSX-touching step (Task 5, Step 5) explicitly reuses the UI track's exact markup/Tailwind classes, swapping only the `referrerName` constant for a real `getReferrerTenant` call and adding `searchParams` — no new visual elements are introduced.
