# Talam architecture audit — 2026-07-28

Read-only review of the codebase's structure on its own merits (not against the design doc).
199 source files, ~19.3k lines. Findings are ranked by what they cost you if left alone.
Nothing here has been changed.

---

## A1 — Tenant isolation has no working enforcement layer

**Severity: critical. Files: `lib/prisma.ts:21-31`, `prisma/migrations/*`**

`withTenant()` wraps every query in a transaction that runs
`SELECT set_config('app.tenant_id', …, true)`, and the RLS policies that read that setting
do exist on 12 tables — verified live:

```
RLS ON : customers, discount_codes, order_items, orders, product_categories,
         product_reviews, products, review_reports, store_about, store_branches,
         tenants, wishlists
policy  : tenant_id = current_setting('app.tenant_id')::uuid   (×12)
```

Two things break it:

1. **The app connects as `postgres`, which has `rolbypassrls = true`.** Every policy above is
   skipped for every application query. Confirmed live:
   `SELECT current_user, rolbypassrls → { u: 'postgres', byp: true }`.
2. **No migration creates any of it.** `grep -r "CREATE POLICY\|ROW LEVEL SECURITY"
   prisma/migrations/` returns nothing — the policies were applied out-of-band. A fresh
   database (CI, a new environment, `prisma migrate deploy` from zero) gets **no policies at
   all**, silently. The e2e suite runs against exactly such an ephemeral Postgres.

So tenant isolation rests entirely on remembering `where: { tenantId }` in application code,
while the code reads as though a database backstop exists. To the codebase's credit the
discipline is currently good — the check-then-mutate pattern in `deleteOccasion`
(`app/admin/occasions/actions.ts:67-83`) is correct, and I found no live cross-tenant leak.
But it is one forgotten clause away, with nothing to catch it.

**Fix:** connect as a non-`BYPASSRLS` role, and check the policies into a migration so every
environment gets them. Then `withTenant` becomes the real control it already looks like.

---

## A2 — 8 tenant-scoped tables have no RLS at all

**Severity: high. File: `prisma/schema.prisma`**

Even once A1 is fixed, these carry a `tenant_id` but have RLS switched off entirely:

```
addresses, notifications, product_tags, product_tag_assignments,
publish_logs, store_banners, store_promotions, store_promotion_products
```

`addresses` is the one that matters most — it holds customer names, phone numbers and home
addresses. Fix A1 and this set stays unprotected unless it is fixed with it.

---

## A3 — Connection pool of 1 turns every `Promise.all` into a queue

**Severity: high. Files: `lib/prisma.ts:9`, `app/store/layout.tsx:21-26`**

Production runs `max: 1`, and `withTenant` makes every read a *transaction*, which holds that
single connection for its whole duration. Concurrent reads therefore cannot overlap.

`app/store/layout.tsx` does:

```ts
await Promise.all([getTenantStorefront(tenantId), getCategories(tenantId),
                   headers(), getMissingStoreConfig(tenantId)])
```

That reads as three parallel queries. In production it is three transactions serialised on one
connection — the `Promise.all` buys nothing. This repeats wherever the data layer fans out
(`lib/data/products.ts` has 13 `withTenant` call sites).

**Fix:** raise the pool, or stop wrapping pure reads in transactions (they only need the
transaction because of the `set_config` in A1 — which is currently inert anyway).

---

## A4 — Every storefront page pays for a query whose result is discarded

**Severity: high (pure waste, trivial fix). File: `app/store/layout.tsx:25,30-39`**

`getMissingStoreConfig(tenantId)` runs on every storefront request. It costs a transaction with
a `tenant.findUnique` plus a `product.count`. Its only consumer — the "Coming soon" gate — is
commented out at lines 30-39, so the result is thrown away. ESLint already flags it
(`'missingConfig' is assigned a value but never used`).

Worse, the layout is uncached while the pages beneath it use `cacheForTenant`, so this cost is
paid even on cache hits. Either restore the gate or delete the call.

---

## A5 — The 1,311-line settings page is one client component

**Severity: medium-high. File: `app/admin/settings/page.tsx`**

A single `'use client'` file holding 17+ components and 9 `useEffect` hooks, each firing its own
action after hydration (`getAboutAction`, `getStoreSettingsAction`, `getCategoriesAction`,
`getAlertsAction`, `getPaymentsSettingsAction`, `getSubscriptionAction`). Consequences:

- No server-rendered data. Every tab is an empty shell until its fetch resolves.
- Six independent client waterfalls where a server component could have fetched in one pass.
- The whole file ships to the browser to render any one tab.

It also defines a local `Input` (line 48) wrapping a raw `<input>`, shadowing the shadcn
primitive — directly against the project's own convention that form fields use shadcn
`Input`/`Textarea`/`Select`. Since it is a same-named local shadow, nothing flags it.

**Fix:** split per tab, fetch in a server component, drop the local `Input`.

---

## A6 — Prisma row types are the UI's prop types

**Severity: medium. Files: `components/store/product-card.tsx:4`, `product-grid.tsx:1`, `product-carousel.tsx:1`, `occasion-hero-carousel.tsx:4`**

These take `product: Product & {…}` imported straight from `@prisma/client`. The database row
shape *is* the component contract, so every component receives `Decimal` price fields it must
defensively `Number(...)`, plus columns it has no business seeing (`deletedAt`, `stockBySize`,
`tenantId`). A column rename becomes a UI change.

Note the codebase already has the right answer elsewhere — `lib/data/*.ts` defines clean view
types (`AdminProduct`, `CustomerOrder`, `WishlistProduct`) that these four components bypass.

---

## A7 — Decimal→Number conversion is scattered across 12 files

**Severity: medium. 45 call sites**

`Number(x.price)`, `Number(x.total)`, `Number(x.comparePrice)` appear across
`lib/data/{orders,products,customers,dashboard,search,wishlist,storefront-orders,customer-account}.ts`,
`app/checkout/actions.ts`, and two page components. This is money handling with no single
conversion point, so precision and rounding rules are per-site conventions rather than a policy.

Related, and already visible: `computeQuote` had to round coupon discounts to whole rupees
specifically because a fractional total leaked into `toLocaleString('en-IN')` and rendered as
`₹1,889.1`. That fix lives in one function; the other 45 sites have no equivalent guard.

---

## A8 — Two return conventions for server actions

**Severity: medium**

Admin actions return `Promise<{ error?: string }>` — success is an empty object (11 actions).
Checkout actions return `Promise<Result | { error: string }>` — a discriminated union (6
actions). Both are defensible; having both means every caller must know which family it is in,
and the `{ error?: string }` form makes it easy to ignore a failure by not checking.

Pick one. The union is the safer of the two, since TypeScript forces the check.

---

## A9 — `'use server'` files are a loaded footgun, undocumented

**Severity: medium. File: `app/admin/notifications/actions.ts`**

A `'use server'` module may only export async functions. `export type Foo = {…}` (inline
declaration) is erased and safe — 18 such exports exist and are fine. But `export type { Foo }`
(re-exporting an imported type) gets compiled by Turbopack into a *runtime* re-export that
throws `ReferenceError` at module load, taking down **every action in that module and any page
importing it**.

This exact bug shipped in the last commit and 500'd every admin server action, including
`getOrdersAction` — which is why `/admin/orders` rendered "0 orders" against a database holding
two. It is fixed, but nothing prevents a recurrence: the two forms look identical at a glance
and neither `tsc` nor ESLint flags it.

**Fix:** an ESLint rule banning `export ... from` and `export type { }` in `'use server'` files.

---

## A10 — Checkout pricing actions are unauthenticated

**Severity: low-medium. File: `app/checkout/actions.ts:136,142,153`**

`getQuoteAction`, `validateCouponAction` and `getUpiQrAction` call only `requireTenant()`, not
`requireAuth()`. Pricing a cart without being signed in is intentional and correct, but two
side effects fall out:

- `getUpiQrAction` returns the store's UPI VPA to any unauthenticated caller.
- `validateCouponAction` is an unauthenticated, unthrottled coupon-code oracle — it
  distinguishes "not valid" from "expired" from "below minimum", so codes can be enumerated.

The VPA is shown to every customer at checkout anyway, so this is disclosure, not a breach. The
coupon oracle is the more real one; `@upstash/ratelimit` is already a dependency and unused here.

---

## A11 — E2E auth mock diverges from the real user shape

**Severity: low. File: `lib/supabase/e2e-mock.ts`**

The mock returned a user with no `user_metadata`, so any component reading
`user.user_metadata.full_name` (e.g. `components/marketing/profile-menu.tsx:44`) crashed under
`E2E_MOCK=1` while working in production. Patched with `user_metadata: {}` during this session,
but the general problem stands: the mock is a hand-written partial of `User` cast through
`as never`, so it will drift again silently.

---

## A12 — `lib/data/` has no consistent access convention

**Severity: low. Files: `lib/data/tenant.ts:116,125,225`, `app/checkout/actions.ts:329,333`**

Most of `lib/data/` goes through `withTenant`. Five sites use the bare `prisma` client instead.
Some are legitimate (`getDevTenantId` resolves a tenant *by slug* before any tenant context
exists; `notifyIfReadyToGoLive` runs from a cron with no request). But nothing marks the
distinction, so "which client do I use here" is answered by copying whatever is nearby. Once A1
is fixed and RLS actually bites, every one of these five becomes a behaviour change.

---

## Suggested order

1. **A1 + A2** — the security model currently does not do the thing it looks like it does, and
   it is invisible in the repo. Everything else is cost; this one is risk.
2. **A4, A3** — cheapest latency wins available. A4 is a deletion.
3. **A9** — one lint rule, prevents a repeat of an outage that already happened once.
4. **A5, A6, A7** — structural cleanups, best done when next touching those areas.
5. **A8, A10, A11, A12** — consistency and hardening.
