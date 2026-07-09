# Phase 2 Storefront Re-Plan (Shop Rebuild + About + Reviews) — Data Track

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Track order:** This is a **Data-track** plan. Do not start it until every phase's UI-track plan (Phases 1–8) is complete — see `README.md`. This file specifically depends on `2026-07-06-talam-phase-2-storefront-ui.md` having been executed first.

**Goal:** Wire every mock-wired storefront page/component from the Phase 2 UI-track (home at `/`, product detail page, reviews, `/about`, category SEO pages) to real Prisma-backed data, following TDD where a new data-layer function is introduced (failing test → implementation → passing test), then swapping each page's mock import for the real call and verifying no regressions on localhost root routes before any tenant-domain or proxy work.

**Tech Stack:** Next.js 16 App Router, ISR (`revalidate`), Prisma 7 + `withTenant` (`lib/prisma.ts`), Vitest for data-layer TDD, Claude Preview MCP for the verification step.

## Global Constraints

- `lib/data/tenant.ts` and `lib/data/products.ts` are DONE — do not modify their contracts in this plan. `getProducts(tenantId, filters?)` returns `(Product & { category: {name} | null, reviewCount: number, averageRating: number | null, isNew: boolean })[]`. `getCategories(tenantId)` returns `{ id, name, slug }[]`. `getTenantStorefront(tenantId)` returns `TenantStorefront` (see `lib/data/tenant.ts:3-28`, includes nested `about` and `branch`). Only the reviews data layer (`lib/data/reviews.ts`) is new work in this file.
- Every mock fixture referenced below (`shop-mock-data.ts`, `product-detail-mock.ts`, `reviews-mock-data.ts`, `about-mock-data.ts`, all under `components/store/__mocks__/`) was left in place by the UI-track deliberately — this plan's job is to delete the import, not the component that consumes it.
- TDD required wherever a new `lib/data/*.ts` function is introduced: failing test → implementation → passing test, before any page is wired to it.
- Verification step for every data-wiring task: `npm run build` (no TS errors), `preview_start` + `preview_resize` (390px, then 1440px) + `preview_screenshot`, `preview_console_logs({ level: "error" })` must be empty, `preview_network({ filter: "failed" })` must be empty.
- Use the existing dev-tenant fallback to verify these pages on localhost root routes first. Do not block this plan on purchased-domain setup, wildcard subdomain middleware hardening, or preview-host proxy work.
- Restart (not reload) the dev server after any Prisma/data-layer change, per this project's Preview Tool Glitches convention.

---

### Task 1: Rebuild Shop Page to Match Paper (Data)

> **Amendment (design doc v1.5, 2026-07-09):** `/shop` no longer exists as a route — its content was merged into `app/store/page.tsx` (the `/` route), which is now the tenant default/home. `app/store/shop/page.tsx` references below mean `app/store/page.tsx`.

**Files:**
- Modify: `app/store/page.tsx` (swap `MOCK_PRODUCTS`/`MOCK_CATEGORIES` for real calls)
- Delete (once unused): `components/store/__mocks__/shop-mock-data.ts`

**Interfaces:**
- Consumes: `getProducts(tenantId, filters)` (existing, `lib/data/products.ts`), `getCategories(tenantId)` (existing) — no new data-layer functions, no TDD needed here, this is a pure mock→real swap.

- [ ] **Step 1: Wire real tenant-scoped data into the shop page**

Replace the mock imports/usage in `app/store/shop/page.tsx` (built in the UI-track's Task 1 Step 7) with the real data calls: `headers()` → `x-tenant-id` → `notFound()` guard if missing, `getCategories(tenantId)`, and `getProducts(tenantId, { categoryId, size, minPrice, maxPrice, sort })` derived from `searchParams`. Add `export const revalidate = 1800` (30 min ISR, per the original plan's ISR schedule). Remove the `MOCK_PRODUCTS`/`MOCK_CATEGORIES` import entirely — `ProductGrid`, `FilterBar`, `FilterSheet`, and `ShopMobileControls` all already accept the real return shapes (they were typed against them from the start), so no component prop changes are needed, only the page's data source.

- [ ] **Step 2: Verify full shop page against Paper at both breakpoints with real data (Checkpoint — final)**

```bash
npm run build
```
Expected: no TypeScript errors.

Start the dev server via `preview_start`, navigate to `/` on localhost using the seeded `silk` dev tenant fallback, then:
1. `preview_resize` to `{ width: 1440, height: 900 }`, `preview_screenshot` — confirm the header row, sidebar, and grid render with real seeded products/categories (counts and copy will differ from the mock fixture — that's expected).
2. `preview_resize` to `{ width: 390, height: 900 }`, `preview_screenshot` — confirm the mobile "Filter & Sort" pill and sheet still work against real category data.
3. `preview_console_logs({ level: "error" })` — expect empty array.
4. `preview_network({ filter: "failed" })` — expect empty array.
5. Manually test each filter (category checkbox, size pill, price range, sort) actually narrows/reorders the real product list — this is the first point at which filtering logic can be verified end-to-end, since the mock array in the UI-track never actually filtered.

Delete the scratch mock file now that nothing imports it:

```bash
rm components/store/__mocks__/shop-mock-data.ts 2>/dev/null || true
```

(Task 5 below also references this file for its own mock-wired category page — confirm Task 5's swap lands in the same commit series, or delete only after Task 5's swap is done, to avoid a broken import mid-task.)

- [ ] **Step 3: Commit**

```bash
git add app/store/page.tsx
git commit -m "feat: wire storefront home page to real getProducts/getCategories data"
```

---

### Task 2: Verify and Fix Product Detail Page Against Paper (Data)

**Files:**
- Modify: `app/store/product/[slug]/page.tsx` (swap `MOCK_PRODUCT_DETAIL`/`MOCK_TENANT_STOREFRONT_SLICE` for real calls)
- Delete (once unused, after Task 3 also stops needing it): `components/store/__mocks__/product-detail-mock.ts`

**Interfaces:**
- Consumes: `getProductBySlug(tenantId, slug)` (existing, unchanged), `getTenantStorefront(tenantId)` (existing — `.returnWindowDays` / `.freeDeliveryAbove` / `.sizeGuideUrl` / `.deliveryEstimateText` fields already present on `TenantStorefront`). No new data-layer functions in this task — Task 3 adds the reviews aggregate this page also needs, so this task's real-data swap and Task 3's are wired together in one pass (see Task 3 Step 6).

- [ ] **Step 1: Wire real product + tenant data into the product detail page**

Replace the mock imports in `app/store/product/[slug]/page.tsx` (built in the UI-track's Task 2 Step 2) with `getProductBySlug(tenantId, slug)` and `getTenantStorefront(tenantId)`, fetched via `Promise.all` after resolving `tenantId` from `headers()` and `slug` from `params`. Add `notFound()` guards for missing `tenantId`/`product`/`tenant`. Add `generateMetadata` using `product.name`/`product.description`/`product.images[0]` for SEO, and `export const revalidate = false` (on-demand only, per the original plan). Leave the rating-summary JSX block as-is for now — it stays wired to a placeholder until Task 3 Step 6 supplies the real `getAverageRating` call, since both belong in the same `Promise.all`.

- [ ] **Step 2: Verify against Paper at both breakpoints with real product data (Checkpoint)**

```bash
npm run build
```
Expected: no TypeScript errors.

`preview_start`, navigate to `/product/<a-seeded-slug>`. `preview_resize` to 1440px and 390px, `preview_screenshot` each — confirm gallery, price, trust banner, and size guide link render correctly against real seeded product data (stock-by-size, compare price, description). `preview_console_logs({ level: "error" })` and `preview_network({ filter: "failed" })` must both be empty.

- [ ] **Step 3: Commit**

```bash
git add app/store/product/
git commit -m "feat: wire product detail page to real getProductBySlug/getTenantStorefront data"
```

---

### Task 3: Product Reviews (Data)

**Files:**
- Create: `lib/data/reviews.ts`
- Create: `lib/data/reviews.test.ts`
- Create: `app/store/product/[slug]/actions.ts`
- Modify: `components/store/reviews-section.tsx` (only the caller wiring — the component's internal `onSubmitReview` prop contract from the UI-track stays unchanged)
- Modify: `app/store/product/[slug]/page.tsx` (swap `MOCK_REVIEWS`/`MOCK_SUMMARY` and the `submitReviewStub` for real calls)
- Delete (once unused): `components/store/__mocks__/reviews-mock-data.ts`, `components/store/__mocks__/product-detail-mock.ts`

**Interfaces:**
- Produces: `getProductReviews(tenantId, productId)` → `ProductReviewSummary[]` (`{ id, rating, comment, isVerifiedPurchase, createdAt, customer: { name } }[]`), matching the UI-track's `MockReview` shape field-for-field so the swap in Step 6 is a drop-in replacement.
- Produces: `getAverageRating(tenantId, productId)` → `{ averageRating: number | null, count: number }`.
- Produces: `submitReview(productId, rating, comment)` Server Action.
- Produces: `reportReview(reviewId, reason)` Server Action (Paper doesn't surface a report-UI trigger yet, but the schema/interface exists — keep it minimal, no UI wiring needed since nothing in the UI-track calls it).
- Consumes: Prisma models `ProductReview`, `ReviewReport` (from `prisma/schema.prisma:244-276`). `requireAuth`/`requireTenant` from `lib/auth-guard.ts` does not exist yet in this codebase (confirmed — only referenced in plan files, not in `lib/`) — check `app/store/auth/page.tsx` and `app/store/auth/callback/route.ts` for the actual session-reading pattern used and adapt `submitReview`/`reportReview` to call that instead of inventing a new auth mechanism.

- [ ] **Step 1: Write failing tests for reviews data layer**

Create `lib/data/reviews.test.ts` mocking `withTenant` from `@/lib/prisma` to return a `productReview` client stub with `findMany` (returns one review shaped `{ id, rating, comment, isVerifiedPurchase, createdAt, customer: { name } }`) and `aggregate` (returns `{ _avg: { rating: 4.8 }, _count: 248 }`). Assert `getProductReviews('tenant-1', 'product-1')` returns the review with `rating`, `isVerifiedPurchase`, and `customer.name` intact, and `getAverageRating('tenant-1', 'product-1')` returns `{ averageRating: 4.8, count: 248 }`.

- [ ] **Step 2: Run test — verify it fails**

```bash
npm test -- --run lib/data/reviews.test.ts
```
Expected: FAIL — `Cannot find module './reviews'`.

- [ ] **Step 3: Implement `lib/data/reviews.ts`**

```typescript
import { withTenant } from '@/lib/prisma'

export type ProductReviewSummary = {
  id: string
  rating: number
  comment: string | null
  isVerifiedPurchase: boolean
  createdAt: Date
  customer: { name: string | null }
}

export async function getProductReviews(tenantId: string, productId: string): Promise<ProductReviewSummary[]> {
  return withTenant(tenantId, (db) =>
    db.productReview.findMany({
      where: { tenantId, productId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        rating: true,
        comment: true,
        isVerifiedPurchase: true,
        createdAt: true,
        customer: { select: { name: true } },
      },
    })
  )
}

export async function getAverageRating(
  tenantId: string,
  productId: string
): Promise<{ averageRating: number | null; count: number }> {
  const result = await withTenant(tenantId, (db) =>
    db.productReview.aggregate({
      where: { tenantId, productId, isDeleted: false },
      _avg: { rating: true },
      _count: true,
    })
  )
  return { averageRating: result._avg.rating, count: result._count }
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npm test -- --run lib/data/reviews.test.ts
```
Expected: PASS — 2 tests pass.

- [ ] **Step 5: Create Server Actions for submit/report**

Create `app/store/product/[slug]/actions.ts` with `'use server'` — `submitReview(productId, rating, comment)` resolves `tenantId` from `headers()`, resolves the current customer via the codebase's actual auth pattern (check `app/store/auth/page.tsx` / `app/store/auth/callback/route.ts` first — do not invent a new mechanism if `lib/auth-guard.ts` doesn't exist), checks `hasPurchased` via `db.orderItem.findFirst` scoped to the customer + product + `paymentStatus: 'paid'`, then `db.productReview.upsert` keyed on `tenantId_productId_customerId`, and calls `revalidatePath` on the product route. `reportReview(reviewId, reason)` follows the same tenant/auth resolution and upserts `db.reviewReport` keyed on `tenantId_reviewId_reporterId`.

- [ ] **Step 6: Wire `ReviewsSection` into the real product detail page with real data**

Modify `app/store/product/[slug]/page.tsx` (continuing from Task 2 Step 1's real `getProductBySlug`/`getTenantStorefront` wiring): once `product.id` is known, run a second `Promise.all` for `getProductReviews(tenantId, product.id)` and `getAverageRating(tenantId, product.id)`. Replace the rating-summary JSX placeholder with the real `ratingSummary.count`/`ratingSummary.averageRating` values. Replace the `MOCK_REVIEWS`/`MOCK_SUMMARY` import and the `submitReviewStub` client stub with the real `reviews`/`ratingSummary` data and a server action reference — pass `submitReview` (bound to `product.id`) as the `onSubmitReview` prop `ReviewsSection` already expects from the UI-track, so no changes to `reviews-section.tsx` itself beyond removing its dependency on the `MockReview` scratch type in favor of `ProductReviewSummary` from `lib/data/reviews.ts` (the two are structurally identical, so this is a type-import swap only).

- [ ] **Step 7: Build check and final verification**

```bash
npm run build
```
Expected: no TypeScript errors.

`preview_start`, navigate to a seeded product page, `preview_screenshot` at 1440px and 390px confirming the rating summary line now shows real (zero-state, since seed data has no reviews yet) counts gracefully, and the reviews section renders the empty state ("No reviews yet…"). Submit a test review through the UI and confirm it persists after a reload. `preview_console_logs({ level: "error" })` and `preview_network({ filter: "failed" })` must both be empty. Delete the scratch mock files now unused by this page:

```bash
rm components/store/__mocks__/reviews-mock-data.ts components/store/__mocks__/product-detail-mock.ts 2>/dev/null || true
```

- [ ] **Step 8: Run full test suite**

```bash
npm test -- --run
```
Expected: all tests pass including the new `lib/data/reviews.test.ts`.

- [ ] **Step 9: Commit**

```bash
git add lib/data/reviews.ts lib/data/reviews.test.ts app/store/product/[slug]/actions.ts app/store/product/[slug]/page.tsx components/store/reviews-section.tsx
git commit -m "feat: wire product reviews to real Prisma data with submit/report server actions"
```

---

### Task 4: `/about` Storefront Page (Data)

**Files:**
- Modify: `app/store/about/page.tsx` (swap `MOCK_ABOUT_TENANT`/`MOCK_BRANCHES` for real calls)
- Delete (once unused): `components/store/__mocks__/about-mock-data.ts`

**Interfaces:**
- Consumes: `getTenantStorefront(tenantId)` (existing — already returns `about: { storyTitle, description, instagramUrl, facebookUrl, youtubeUrl } | null`, per `lib/data/tenant.ts:20-27`). Note: `TenantStorefront.branch` is only the **first** branch (`take: 1` in `lib/data/tenant.ts:62`) — for the "Visit Us" section showing multiple branches, this task queries `db.storeBranch.findMany` directly via `withTenant`, matching the pattern already used elsewhere in the codebase (`lib/data/tenant.ts` imports `withTenant` the same way). No new `lib/data/*.ts` file is needed — this is an inline query in the page, consistent with how `app/store/layout.tsx` already calls `getCategories`/`getTenantStorefront` directly in a Server Component.
- The GMV/Customers/Rated stats bar in `AboutHero` is a **permanent hardcode** (ponytail-flagged in the UI-track, `components/store/about-hero.tsx`) — no data work item exists or is needed for it here.

- [ ] **Step 1: Wire real tenant + branch data into the `/about` page**

Replace the mock imports in `app/store/about/page.tsx` (built in the UI-track's Task 4 Step 5) with `getTenantStorefront(tenantId)` and an inline `withTenant(tenantId, (db) => db.storeBranch.findMany({ where: { tenantId }, orderBy: { sortOrder: 'asc' }, select: { id, name, address, city, phone, mapsUrl } }))`, run via `Promise.all` after resolving `tenantId` from `headers()`. Add `notFound()` guard if `tenantId` or `tenant` is missing. Add `export const revalidate = 3600` (1 hour ISR, per the original plan).

- [ ] **Step 2: Build check and final verification against Paper on the real route**

```bash
npm run build
```
Expected: no TypeScript errors.

`preview_start`, navigate to `/about` on localhost using the seeded `silk` dev tenant fallback. `preview_resize` to 1440px and 390px, `preview_screenshot` each, confirm layout matches Paper structurally (real seeded copy will differ from "Meena Patel"/"Meena Silks" demo text — expected per the Paper Demo Content Mismatch memory; verify layout/spacing/typography and that real branch data renders, not mock branches). `preview_console_logs({ level: "error" })` and `preview_network({ filter: "failed" })` must both be empty. Delete the scratch mock file:

```bash
rm components/store/__mocks__/about-mock-data.ts 2>/dev/null || true
```

- [ ] **Step 3: Commit**

```bash
git add app/store/about/page.tsx
git commit -m "feat: wire /about page to real tenant storefront and branch data"
```

---

### Task 5: Category SEO Pages (`/category/[categorySlug]`) (Data)

> **Amendment (design doc v1.5, 2026-07-09):** route moved from `/shop/[categorySlug]` to `/category/[categorySlug]` — see UI-track sibling task for why.

**Files:**
- Modify: `app/store/category/[categorySlug]/page.tsx` (swap `MOCK_CATEGORIES`/`MOCK_PRODUCTS` for real calls)

**Interfaces:**
- Consumes: `getCategories(tenantId)` (existing), `getProducts(tenantId, { categoryId })` (existing).

This task's data-wiring is close to trivial: the UI-track's mock-wired page already has the exact shape the real page needs (find category by slug, filter products by category, render `ProductGrid`) — it just swaps two mock arrays for two existing function calls that Task 1 already imports into the sibling shop page. No new data-layer function, no TDD step, since `getCategories`/`getProducts` are pre-existing and already covered by their own tests elsewhere.

- [ ] **Step 1: Wire real category + product data into the category slug page**

Replace the mock imports in `app/store/category/[categorySlug]/page.tsx` with `headers()` → `x-tenant-id` → `notFound()` guard, `getCategories(tenantId)` to resolve the category by `categorySlug` (→ `notFound()` if no match), and `getProducts(tenantId, { categoryId: category.id })`. Add `generateMetadata` using `category.name` as the page title (already present in the UI-track's route shape, just needs real data). Add `export const revalidate = 1800` (30 min ISR, matching the storefront home schedule since this is the same data at a different URL).

- [ ] **Step 2: Build check**

```bash
npm run build
```
Expected: no TypeScript errors.

- [ ] **Step 3: Verify against a live category and check for console/network errors**

`preview_start`, navigate to `/category/<a-seeded-category-slug>` (e.g. `/category/sarees` if the `silk` tenant seed has a "Sarees" category). `preview_screenshot` at 1440px and 390px — confirm it renders the same product-card styling as the real `/` storefront page (Task 1), now with real seeded products filtered to just that category. `preview_console_logs({ level: "error" })` and `preview_network({ filter: "failed" })` must both be empty.

- [ ] **Step 4: Commit**

```bash
git add app/store/category/
git commit -m "feat: wire /category/[categorySlug] SEO pages to real getCategories/getProducts data"
```

---

## Phase 2 Data Track Verification

```bash
npm test -- --run
```
Expected: all tests pass, including `lib/data/reviews.test.ts`.

```bash
npm run build
```
Expected: no errors.

Manual smoke test on localhost using the seeded `silk` dev tenant fallback:
- [ ] `/` at both breakpoints: filters actually narrow the real product list, sort actually reorders it
- [ ] `/product/<slug>` at both breakpoints: real rating summary line (zero-state until reviews exist), real trust banner driven by `tenant.freeDeliveryAbove`/`returnWindowDays`, reviews section shows real (empty) state, submitting a review persists it
- [ ] `/about` at both breakpoints: real tenant name/story/social links, real branch cards (not "Meena Silks"/"Main Store" mock data)
- [ ] `/category/<category-slug>` at both breakpoints: same styling as `/`, real product count, crawlable metadata title
- [ ] Zero console errors and zero failed network requests on all routes at both breakpoints
- [ ] All `components/store/__mocks__/*.ts` scratch files have been deleted
- [ ] `git log --oneline -6` shows 5 new commits: storefront home data wiring, product detail data wiring, reviews data + actions, about page data wiring, category SEO data wiring

## Self-Review

- **Spec coverage:** Every data-wiring step from the original combined file (1921 lines) is represented here. Task 3 (Reviews) carries all of the original's TDD steps (failing test, `lib/data/reviews.ts` implementation, passing test, Server Actions, real page wiring) — the only task with genuinely new backend code. Tasks 1, 2, 4, and 5 carry the original's "swap mock for real call" steps that the UI-track deliberately deferred (the UI-track built every page against local mocks instead of wiring real calls inline, unlike the original combined plan) — each of those swaps is reconstructed here as its own step even though the original interleaved them into the same step as the UI build.
- **Placeholder scan:** No `<name>`-style unresolved placeholders. The About page's GMV/Customers/Rated stats are correctly *not* treated as a data task — they're a permanent ponytail-flagged hardcode per the UI-track's own note, and inventing a real aggregate for them here would be scope creep the original plan never asked for.
- **Type consistency:** `ProductReviewSummary` (this file, `lib/data/reviews.ts`) matches the UI-track's `MockReview` type in `components/store/__mocks__/reviews-mock-data.ts` field-for-field (`id`, `rating`, `comment`, `isVerifiedPurchase`, `createdAt`, `customer.name`), so Task 3 Step 6's swap is a drop-in type replacement, not a component rewrite. Likewise `getProducts`/`getCategories`/`getTenantStorefront`'s real return shapes match what the UI-track typed its mocks against (`MockProduct`, `MOCK_CATEGORIES`, `Pick<TenantStorefront, 'name' | 'tagline' | 'about'>`), so Tasks 1, 4, and 5's swaps require no prop changes to `ProductGrid`, `FilterBar`, `FilterSheet`, `ShopMobileControls`, `AboutHero`, or `VisitUs`.
- **Track discipline:** No component markup, Tailwind classes, or new visual elements are introduced anywhere in this file — every step either writes a `lib/data/*.ts` function, a Server Action, or replaces a mock import with a real function call inside an existing page file. No `paper-desktop` MCP calls appear here (that's UI-track-only, already done). Screenshot verification steps exist only to confirm the swap didn't visually regress anything — not to check new layout.
