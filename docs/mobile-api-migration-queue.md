# Mobile API Migration — Task Queue

Living checklist consumed by the `mobile-api-migration` cloud routine. Each 5-hour firing:

1. Reads this file, finds the **first unchecked task** it's allowed to attempt (see gating rule below).
2. Branches off the current **integration base** (see gating rule — this is `main` once Phase 0 is merged, or `mobile-api/phase-0-foundation` while it still isn't) as `mobile-api/<task-slug>`.
3. Implements it using the **extract-shared-lib pattern**: pull the core logic into a plain function under `lib/`, make the existing Server Action a thin wrapper around it (zero behavior change), add a new `app/api/v1/**/route.ts` that wraps the same function with bearer-token auth. Never delete or rewrite the existing Server Action's behavior.
4. Adds/updates tests for the new route (auth: valid/missing/expired token; tenant isolation: a token for tenant A must never read/write tenant B's data), runs `typecheck`, `lint`, and the relevant test suite.
5. Commits, pushes the branch, opens a PR against the current **integration base** (does **not** merge).
6. Checks the box below for that task with a link to the PR, and commits that checklist update **directly to `main`** (small, low-risk doc-only commit, regardless of which branch the task's own PR targets — this is how later firings know the task is claimed, independent of review speed).
7. Stops. One task per firing.

**Gating rule (read before picking a task):** Grep `lib/auth-guard.ts` for bearer-token support (an `Authorization: Bearer` handling path) **on `main`**.

- **If it's on `main`:** the integration base is `main`. Proceed through phases in order, targeting `main` as usual.
- **If it's not on `main` yet:** check whether a consolidated Phase 0 branch exists with an open PR against `main` that already has the bearer-token path (currently: `mobile-api/phase-0-foundation`, [PR #28](https://github.com/suryatalamsevai/talam-web-app/pull/28)).
  - **If such a branch/PR exists:** it is the integration base. Branch new Phase 1+ work off it and open PRs against it (not `main`) so downstream work isn't stuck waiting on human review of the foundation PR. This applies even if the Phase 0 pgbouncer spike-test checkbox below is still unchecked — that task is an infra verification, not a code dependency, and doesn't block Phase 1+ once bearer-token support exists on the integration base. Keep working off that base branch across firings until it merges to `main`; when it does, GitHub auto-retargets any PRs still pointed at it to `main`, so no manual re-pointing is needed — just resume treating `main` as the integration base on the next firing.
  - **If no such branch/PR exists:** fall back to the original rule — if any Phase 0 task below is unchecked, work the next unchecked **Phase 0** task only, off `main`. If all 4 Phase 0 tasks are checked but bearer-token support still isn't on `main` or on an open consolidated branch, **do nothing this run** — leave a one-line comment in this file's "Status" section below and stop.

Within a phase, task order doesn't matter — pick the first unchecked one.

**Checkout tasks (Phase 3) are payment-critical.** Use only the sandbox/test Razorpay keys already configured in the repo's env — never touch live credentials. Every Phase 3 PR description must open with `⚠ Payment-critical — manual QA in Razorpay sandbox required before merge`.

## Status
_(automation appends a one-line note here if it has to stall — e.g. "waiting on Phase 0 PRs #41–44 to merge")_
- 2026-08-27: still stalled, no change — PRs #25/#26/#27 remain open/unreviewed and `lib/auth-guard.ts` on `main` still has no bearer-token path; this container still has no `DATABASE_URL`/`DIRECT_URL` and the Supabase MCP connector still requires interactive authorization this session can't complete, so the pgbouncer spike test still can't run here. This is now 5 consecutive stalled firings since 2026-08-26 — needs a human to merge #25/#26/#27 and/or provision DB creds/authorize Supabase MCP, or run the spike test manually.
- 2026-08-27 (later): still stalled, no change — PRs #25/#26/#27 are now over 40 hours old with no reviews, merges, or new commits (last activity 2026-08-25); `lib/auth-guard.ts` on `main` still has no bearer-token path, and this container still has no `DATABASE_URL`/`DIRECT_URL`/authorized Supabase MCP, so the pgbouncer spike test still can't run here. This is now 6 consecutive stalled firings since 2026-08-26 — same asks as before: merge #25/#26/#27 and/or provision DB creds/authorize Supabase MCP, or run the spike test manually.
- 2026-08-27 (still later): still stalled, no change — confirmed directly via GitHub API that PRs #25/#26/#27 are all still open with zero reviews/approvals and no commits since 2026-08-25; `lib/auth-guard.ts` on `main` confirmed to still have no `Bearer` handling. This container still has no `DATABASE_URL`/`DIRECT_URL` (only `.env.example`) and the Supabase MCP connector still requires interactive authorization this session can't complete, so the pgbouncer spike test still can't run here. This is now 7 consecutive stalled firings since 2026-08-26 with no human action on any blocker — needs a human to merge #25/#26/#27 and/or provision DB creds/authorize Supabase MCP, or run the spike test manually.
- 2026-08-27 (8th firing): PRs #25/#26/#27 confirmed still open, no new commits since 2026-08-25 — `lib/auth-guard.ts` on `main` still has no bearer-token path. New this run: the Supabase MCP connector is now authorized (`list_projects`/`execute_sql` succeed against the project), so the "MCP needs interactive auth" blocker from firings 1-7 is gone. But the spike test still can't run: `DATABASE_URL`/`DIRECT_URL` (the app's actual pgbouncer transaction-pooler connection string Prisma uses via `lib/prisma.ts`'s `@prisma/adapter-pg`) are still absent from this container's env, and `execute_sql` calls were confirmed (via `pg_backend_pid`/timestamps) to run serialized one-at-a-time through the Management API, not concurrently — so even with MCP DB access there's no way from here to open real concurrent connections through the app's specific pooler path. Reconnaissance done instead: `max_connections=60`, ~13 baseline connections; `lib/prisma.ts` already uses `max: 1` pg-adapter connections in production (one per serverless instance, the standard safe pattern for a transaction-mode pooler) and scopes tenant `set_config` inside a `$transaction` (required so it lands on the same pooled connection as the query it guards). Code review suggests the config is already sound, but that's not a substitute for the actual load test this task asks for. This is the 8th consecutive stalled firing since 2026-08-26 — needs a human to merge #25/#26/#27, and/or provision `DATABASE_URL`/`DIRECT_URL` to this environment (Supabase MCP access alone isn't sufficient), or run the concurrency spike test manually.
- 2026-08-27 (unblocked): #25/#26/#27 had sat unreviewed 40+ hours with zero human action, so on request an interactive session consolidated all three into one integration branch `mobile-api/phase-0-foundation`, merged cleanly (`git merge --no-ff`, no conflicts), validated (`tsc --noEmit`, `eslint`, full `vitest run` — 615/615 passing), and opened [PR #28](https://github.com/suryatalamsevai/talam-web-app/pull/28) against `main`. #28's CI is green and it is mergeable; #25/#26/#27 were then closed as superseded (their commits are fully contained in #28, so GitHub rejected even retargeting them — zero remaining diff). **Gating rule updated above**: while #28 is open, Phase 1+ work targets `mobile-api/phase-0-foundation` as the integration base instead of stalling on human review, since that branch already has the bearer-token path. Remaining blockers: (1) #28 itself still needs human review/merge to `main` — nothing currently blocks that, it's just waiting; (2) the Phase 0 pgbouncer spike test is still unresolved (same `DATABASE_URL`/`DIRECT_URL` gap as firing 8) but per the updated gating rule this no longer blocks Phase 1+.
- 2026-08-26: stalled on the Phase 0 pgbouncer spike-test task — this container has Supabase project access via MCP but no `DATABASE_URL`/`DIRECT_URL` in its env, so it can't open real concurrent Postgres connections through the pooler to run the load test; needs those secrets provisioned to this environment, or a human to run the spike test manually and check the box.
- 2026-08-26 (10:39 UTC): still stalled, no change since the last check — same missing DB creds block the pgbouncer spike test, and none of PRs #25/#26/#27 (the other 3 Phase 0 tasks) have been merged yet either, so `lib/auth-guard.ts` on `main` still has no bearer-token path; Phase 1+ work stays blocked until a human merges those PRs and/or provisions `DATABASE_URL`/`DIRECT_URL` (or runs the spike test manually).
- 2026-08-26 (15:41 UTC): still stalled, no change — PRs #25/#26/#27 remain open/unreviewed and `lib/auth-guard.ts` on `main` still has no bearer-token path; `DATABASE_URL`/`DIRECT_URL` are still absent from this container's env and the Supabase MCP connection doesn't expose them either, so the pgbouncer spike test still can't run here. Needs a human to merge #25/#26/#27 and/or provision DB creds to this environment, or run the spike test manually.
- 2026-08-26 (20:38 UTC): still stalled, no change — PRs #25/#26/#27 are still open/unreviewed and `lib/auth-guard.ts` on `main` has no bearer-token path; this container still has no `DATABASE_URL`/`DIRECT_URL` (only `.env.example` is present, no `.env`) and the Supabase MCP connector still requires interactive authorization this session can't complete, so the pgbouncer spike test still can't run here. Same blockers as the last 3 firings — needs a human to merge #25/#26/#27 and/or provision DB creds/authorize Supabase MCP, or run the spike test manually.

---

## Phase 0 — Foundation (blocks everything below)
- [x] Bearer-token auth path in `lib/auth-guard.ts` / `lib/admin-guard.ts` (accept `Authorization: Bearer <supabase-jwt>` alongside the existing cookie session) — was [PR #25](https://github.com/suryatalamsevai/talam-web-app/pull/25) (closed, superseded), now consolidated into [PR #28](https://github.com/suryatalamsevai/talam-web-app/pull/28)
- [x] Explicit tenant resolution helper (port `proxy.ts`'s host/subdomain logic into a callable function usable when there's no proxy — mobile sends tenant id/slug directly) — was [PR #26](https://github.com/suryatalamsevai/talam-web-app/pull/26) (closed, superseded), now consolidated into [PR #28](https://github.com/suryatalamsevai/talam-web-app/pull/28)
- [x] `app/api/v1/` versioning convention + shared JSON response/error envelope — was [PR #27](https://github.com/suryatalamsevai/talam-web-app/pull/27) (closed, superseded), now consolidated into [PR #28](https://github.com/suryatalamsevai/talam-web-app/pull/28)
- [ ] Verify Prisma/Supabase pgbouncer connection pooling holds under added serverless concurrency (spike test, not a code change if already fine) — still blocked, see Status log; does not block Phase 1+ under the gating rule above

## Phase 1 — Catalog & storefront read
- [x] Convert `app/store/actions.ts → searchProductsAction` to `GET /api/v1/store/search` — [PR #30](https://github.com/suryatalamsevai/talam-web-app/pull/30) (open, targets `mobile-api/phase-0-foundation` per gating rule)
- [x] Net-new: product list + detail → `GET /api/v1/store/products`, `GET /api/v1/store/products/{slug}` — [PR #31](https://github.com/suryatalamsevai/talam-web-app/pull/31) (open, targets `mobile-api/phase-0-foundation` per gating rule)
- [x] Net-new: category listing → `GET /api/v1/store/categories` — [PR #32](https://github.com/suryatalamsevai/talam-web-app/pull/32) (open, targets `mobile-api/phase-0-foundation` per gating rule)
- [x] Net-new: occasions/offers listing → `GET /api/v1/store/occasions` — [PR #35](https://github.com/suryatalamsevai/talam-web-app/pull/35) (open, targets `mobile-api/phase-0-foundation` per gating rule)
- [x] Net-new: store config/theme/banners → `GET /api/v1/store/config` — [PR #36](https://github.com/suryatalamsevai/talam-web-app/pull/36) (open, targets `mobile-api/phase-0-foundation` per gating rule)

## Phase 2 — Cart, wishlist & account
- [x] Convert `store/cart/actions.ts → getEmptyCartSuggestions` to `GET /api/v1/store/cart/suggestions` — [PR #37](https://github.com/suryatalamsevai/talam-web-app/pull/37) (open, targets `mobile-api/phase-0-foundation` per gating rule)
- [x] Convert `store/wishlist/actions.ts → toggleWishlistAction` to `POST /api/v1/store/wishlist` — [PR #38](https://github.com/suryatalamsevai/talam-web-app/pull/38) (open, targets `mobile-api/phase-0-foundation` per gating rule)
- [x] Convert `store/orders/actions.ts → reportOrderProblemAction` to `POST /api/v1/store/orders/{id}/report` — [PR #39](https://github.com/suryatalamsevai/talam-web-app/pull/39) (open, targets `mobile-api/phase-0-foundation` per gating rule)
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
