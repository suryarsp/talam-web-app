# Mobile API Migration — Task Queue

Living checklist consumed by the `mobile-api-migration` cloud routine. Each 5-hour firing:

1. Reads this file, finds the **first unchecked task** it's allowed to attempt (see gating rule below).
2. Branches off latest `main` as `mobile-api/<task-slug>`.
3. Implements it using the **extract-shared-lib pattern**: pull the core logic into a plain function under `lib/`, make the existing Server Action a thin wrapper around it (zero behavior change), add a new `app/api/v1/**/route.ts` that wraps the same function with bearer-token auth. Never delete or rewrite the existing Server Action's behavior.
4. Adds/updates tests for the new route (auth: valid/missing/expired token; tenant isolation: a token for tenant A must never read/write tenant B's data), runs `typecheck`, `lint`, and the relevant test suite.
5. Commits, pushes the branch, opens a PR against `main` (does **not** merge).
6. Checks the box below for that task with a link to the PR, and commits that checklist update **directly to `main`** (small, low-risk doc-only commit — this is how later firings know the task is claimed, independent of review speed).
7. Stops. One task per firing.

**Gating rule (read before picking a task):** Grep `lib/auth-guard.ts` for bearer-token support (an `Authorization: Bearer` handling path). If it is not there yet:
- If any Phase 0 task below is unchecked, work on the next unchecked **Phase 0** task only.
- If all 4 Phase 0 tasks are checked but the bearer-token path still isn't on `main` (i.e. still waiting on PR review), **do nothing this run** — leave a one-line comment in this file's "Status" section below and stop. Do not start Phase 1+ work against an unmerged foundation.

Once bearer-token support is confirmed on `main`, proceed through phases in order. Within a phase, task order doesn't matter — pick the first unchecked one.

**Checkout tasks (Phase 3) are payment-critical.** Use only the sandbox/test Razorpay keys already configured in the repo's env — never touch live credentials. Every Phase 3 PR description must open with `⚠ Payment-critical — manual QA in Razorpay sandbox required before merge`.

## Status
_(automation appends a one-line note here if it has to stall — e.g. "waiting on Phase 0 PRs #41–44 to merge")_

---

## Phase 0 — Foundation (blocks everything below)
- [x] Bearer-token auth path in `lib/auth-guard.ts` / `lib/admin-guard.ts` (accept `Authorization: Bearer <supabase-jwt>` alongside the existing cookie session) — [PR #25](https://github.com/suryatalamsevai/talam-web-app/pull/25)
- [x] Explicit tenant resolution helper (port `proxy.ts`'s host/subdomain logic into a callable function usable when there's no proxy — mobile sends tenant id/slug directly) — [PR #26](https://github.com/suryatalamsevai/talam-web-app/pull/26)
- [ ] `app/api/v1/` versioning convention + shared JSON response/error envelope
- [ ] Verify Prisma/Supabase pgbouncer connection pooling holds under added serverless concurrency (spike test, not a code change if already fine)

## Phase 1 — Catalog & storefront read
- [ ] Convert `app/store/actions.ts → searchProductsAction` to `GET /api/v1/store/search`
- [ ] Net-new: product list + detail → `GET /api/v1/store/products`, `GET /api/v1/store/products/{slug}` (currently RSC-only, no action layer — extract query logic from the page first)
- [ ] Net-new: category listing → `GET /api/v1/store/categories`
- [ ] Net-new: occasions/offers listing → `GET /api/v1/store/occasions`
- [ ] Net-new: store config/theme/banners → `GET /api/v1/store/config`

## Phase 2 — Cart, wishlist & account
- [ ] Convert `store/cart/actions.ts → getEmptyCartSuggestions` to `GET /api/v1/store/cart/suggestions`
- [ ] Convert `store/wishlist/actions.ts → toggleWishlistAction` to `POST /api/v1/store/wishlist`
- [ ] Convert `store/orders/actions.ts → reportOrderProblemAction` to `POST /api/v1/store/orders/{id}/report`
- [ ] Convert `account/addresses/actions.ts → createAddress` to `POST /api/v1/store/addresses`
- [ ] Convert `account/profile/actions.ts → updateCustomerProfile` to `PATCH /api/v1/store/profile`
- [ ] Convert `onboarding/actions.ts → saveOnboardingAction` to `POST /api/v1/store/onboarding`
- [ ] Net-new: cart / addresses / profile reads (currently RSC) → matching `GET` routes

## Phase 3 — Checkout & payments (payment-critical, see banner rule above)
- [ ] Convert `getQuoteAction` to `POST /api/v1/checkout/quote`
- [ ] Convert `getAvailableCouponsAction` to `GET /api/v1/checkout/coupons`
- [ ] Convert `validateCouponAction` to `POST /api/v1/checkout/coupons/validate`
- [ ] Convert `getUpiQrAction` to `POST /api/v1/checkout/upi-qr`
- [ ] Convert `uploadPaymentProofAction` to `POST /api/v1/checkout/payment-proof`
- [ ] Convert `placeOrderAction` to `POST /api/v1/checkout/orders`
- [ ] Convert `createRazorpayOrderAction` to `POST /api/v1/checkout/razorpay/order`
- [ ] Convert `verifyRazorpayPaymentAction` to `POST /api/v1/checkout/razorpay/verify`

## Phase 4 — Orders & tracking
- [ ] Net-new: order history (currently RSC) → `GET /api/v1/store/orders`
- [ ] Net-new: order detail/invoice (currently RSC) → `GET /api/v1/store/orders/{id}`
- [ ] Net-new: delivery tracking, wrapping existing `lib/shipping/shiprocket-client.ts` → `GET /api/v1/store/orders/{id}/tracking`
