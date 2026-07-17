# Talam Implementation Plans

**2026-07-17 — DONE:** [2026-07-17-talam-onboarding-persistence.md](2026-07-17-talam-onboarding-persistence.md) — post-login routing (Google + OTP) + per-step onboarding persistence, keyed by owner id, resumable across sessions. Shipped as commits `8473b1b`, `c72baee` plus the fuller [2026-07-17-onboarding-v2-implementation.md](2026-07-17-onboarding-v2-implementation.md) (schema flags, 7-step wizard, Go Live wiring — commits `814a178`..`785940c`). Not part of the storefront-first sequence below — was picked up independently of where that track stood.

**2026-07-17 — DONE:** [2026-07-17-welcome-page-and-cta-state.md](2026-07-17-welcome-page-and-cta-state.md) — `/welcome` hub page + state-aware marketing CTAs (nav/hero/CTA-band/pricing) for signed-in owners. Depends on the onboarding persistence work above (`Tenant.isOnboarded`). Shipped as commits `eaad135`..`e04a9d3`, `a2f5ae0`. See `docs/2026-06-23-talam-design.md` Changelog v1.10.

Revised 2026-07-09 into a **storefront-first execution sequence**:

1. **Storefront routes first, on local root routes:** finish the tenant-facing storefront experience at `http://localhost:3000/` and its related routes (`/category/[categorySlug]`, `/product/[slug]`, `/about`, `/cart`, `/checkout`, `/wishlist`, `/account`, `/auth`) using the seeded dev-tenant fallback. Treat these routes as the primary delivery surface until the storefront is complete and stable.
2. **Admin/platform and supporting backend work second:** continue with the remaining UI/data plans after the storefront routes are loading cleanly and the customer journey works end-to-end on localhost.
3. **Tenant domain, middleware, and proxy work last:** wildcard-domain routing, tenant host resolution, preview aliasing, and production proxy/cutover stay deferred until the real domain is purchased and we're ready to validate production-style tenancy.

Paper remains the visual source of truth, and real data wiring still follows the UI build where the per-phase plans call for it. The change here is execution order: we are no longer treating tenant-domain infrastructure as a prerequisite for finishing storefront behavior.

## Immediate route priority

Work this route set to completion before returning to domain or proxy tasks:

- `/` — storefront home/product listing
- `/category/[categorySlug]` — category landing pages
- `/product/[slug]` — product detail
- `/about` — store story and branches
- `/cart`
- `/checkout`
- `/wishlist`
- `/account`
- `/auth`

Use the existing dev-tenant fallback on localhost while building and verifying these pages. Do not block this route set on subdomain middleware, wildcard DNS, or purchased-domain setup.

## UI/data plan order — build in this order

| # | Plan | Covers | Key notes |
|---|------|--------|-----------|
| 1 | [phase-2-storefront-ui.md](2026-07-06-talam-phase-2-storefront-ui.md) | `/`, category pages, product detail, reviews UI, `/about` | Start here. This is now the primary storefront-first plan. |
| 2 | [phase-3-commerce-ui.md](2026-07-06-talam-phase-3-commerce-ui.md) | `/cart`, `/checkout` UI | Continue the shopper flow before admin or platform work. |
| 3 | [phase-4-customer-ui.md](2026-07-06-talam-phase-4-customer-ui.md) | `/orders`, `/account`, `/wishlist` UI | Finish customer-facing routes while still on localhost storefront flow. |
| 4 | [phase-1-foundation-ui.md](2026-07-06-talam-phase-1-foundation-ui.md) | Marketing home rebuild | Lower priority than storefront unless marketing changes are needed to unblock launch work. |
| 5 | [phase-5-tenant-admin-ui.md](2026-07-06-talam-phase-5-tenant-admin-ui.md) | `/admin` dashboard, products, orders, settings UI | Live Paper has only 4 admin sections (no "Customers" page). Mocked owner state, no real guard yet. |
| 6 | [phase-6-platform-ui.md](2026-07-06-talam-phase-6-platform-ui.md) | `/super-admin` tenant list/detail, platform stats UI | **No Paper artboard exists for platform admin at all** — verify step downgraded accordingly. |
| 7 | [phase-7-growth-ui.md](2026-07-06-talam-phase-7-growth-ui.md) | `/join` landing page UI | Only UI-bearing task in Phase 7; no Paper artboard exists for it either (verified). |
| 8 | [phase-8-launch-ui.md](2026-07-06-talam-phase-8-launch-ui.md) | Header/footer Paper re-verification | Last UI-track plan. Confirms header/footer already match Paper; the WhatsApp FAB bug fix itself is a Data-track item (touches a schema field). |

## Data track — wire the same storefront-first order

| # | Plan | Covers | Key notes |
|---|------|--------|-----------|
| 1 | [phase-2-storefront-data.md](2026-07-06-talam-phase-2-storefront-data.md) | `/`, category/product/about/reviews data wiring | First real-data pass for the storefront routes. |
| 2 | [phase-3-commerce-data.md](2026-07-06-talam-phase-3-commerce-data.md) | Cart/checkout wiring, payment abstraction, orders data layer, webhooks | Continues the storefront customer journey. |
| 3 | [phase-4-customer-data.md](2026-07-06-talam-phase-4-customer-data.md) | Auth guard, orders/account/wishlist data wiring | Finishes customer-owned surfaces after the shopper flow. |
| 4 | [phase-1-foundation-data.md](2026-07-06-talam-phase-1-foundation-data.md) | Marketing home highlights (conditional) | Still optional and not a storefront blocker. |
| 5 | [phase-5-tenant-admin-data.md](2026-07-06-talam-phase-5-tenant-admin-data.md) | Owner guard, dashboard/product/order/settings data + Server Actions | No Cloudinary upload pipeline yet — manual URL stopgap. |
| 6 | [phase-6-platform-data.md](2026-07-06-talam-phase-6-platform-data.md) | Super-admin guard, platform stats/tenant data, tier override | No tenant-approval workflow or real billing schema; MRR is an estimate. |
| 7 | [phase-7-growth-data.md](2026-07-06-talam-phase-7-growth-data.md) | Rate limiting, PostHog, Resend, OG images, `/join` data wiring | Order-event wiring explicitly gated on Phases 3/4 being implemented first. OTP stays SMS-only via MSG91. |
| 8 | [phase-8-launch-data.md](2026-07-06-talam-phase-8-launch-data.md) | WhatsApp FAB fix, SEO, performance, launch checklist, post-purchase domain/proxy cutover | Includes the delayed tenancy-infrastructure finish once a real domain exists. |

## Execution order

Work straight down the UI/data tables above, not the old phase-number order. The immediate path is:

1. `phase-2-storefront-ui`
2. `phase-3-commerce-ui`
3. `phase-4-customer-ui`
4. `phase-2-storefront-data`
5. `phase-3-commerce-data`
6. `phase-4-customer-data`

Only after the storefront route set is stable on localhost should we move on to admin/platform work, and only after the domain is purchased should we pick up wildcard-domain, middleware-hardening, preview alias, and production proxy/cutover tasks.
