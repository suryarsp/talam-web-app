# Talam Implementation Plans

Restructured 2026-07-06 into a **two-track, design-first sequence**:

1. **UI track (do this entirely first, across all 8 phases):** every screen in the app is built against the *live* Paper file (not the written design doc, which drifts) with typed mock data, screenshot-verified pixel-for-pixel at 390px/1440px, and committed on its own. Backend-only phases/tasks (rate limiting, payment abstraction, platform billing, etc.) have no UI file content — they're listed as one-line pointers so task numbering stays aligned with their Data-track sibling.
2. **Data track (only after every UI track above is done):** the same components/pages get wired to real Prisma queries and Server Actions via TDD (failing test → implementation → passing test), swapping each mock fixture for a real data source, verified again, and committed separately.

Where no live Paper artboard exists for a task (verified, not assumed — several phases confirmed this by walking the design file), the plan says so explicitly and downgrades the verify step instead of fabricating a citation.

## UI track — build every screen first, in this order

| # | Plan | Covers | Key notes |
|---|------|--------|-----------|
| 1 | [phase-1-foundation-ui.md](2026-07-06-talam-phase-1-foundation-ui.md) | Marketing home rebuild | Only new UI surface from Phase 1 — everything else was backend and already shipped. |
| 2 | [phase-2-storefront-ui.md](2026-07-06-talam-phase-2-storefront-ui.md) | Shop page, product detail, reviews UI, `/about`, category pages | The original complaint (shop filter UI diverges from Paper) lives here — start here. |
| 3 | [phase-3-commerce-ui.md](2026-07-06-talam-phase-3-commerce-ui.md) | Cart page, checkout flow UI | Payment abstraction/orders-data/webhooks are backend-only — pointers only. |
| 4 | [phase-4-customer-ui.md](2026-07-06-talam-phase-4-customer-ui.md) | Orders list/detail, account, wishlist UI | Auth-gated pages render with a mocked logged-in state, no real guard yet. |
| 5 | [phase-5-tenant-admin-ui.md](2026-07-06-talam-phase-5-tenant-admin-ui.md) | `/admin` dashboard, products, orders, settings UI | Live Paper has only 4 admin sections (no "Customers" page). Mocked owner state, no real guard yet. |
| 6 | [phase-6-platform-ui.md](2026-07-06-talam-phase-6-platform-ui.md) | `/super-admin` tenant list/detail, platform stats UI | **No Paper artboard exists for platform admin at all** — verify step downgraded accordingly. |
| 7 | [phase-7-growth-ui.md](2026-07-06-talam-phase-7-growth-ui.md) | `/join` landing page UI | Only UI-bearing task in Phase 7; no Paper artboard exists for it either (verified). |
| 8 | [phase-8-launch-ui.md](2026-07-06-talam-phase-8-launch-ui.md) | Header/footer Paper re-verification | Last UI-track plan. Confirms header/footer already match Paper; the WhatsApp FAB bug fix itself is a Data-track item (touches a schema field). |

## Data track — only after all 8 UI plans above are complete

| # | Plan | Covers | Key notes |
|---|------|--------|-----------|
| 1 | [phase-1-foundation-data.md](2026-07-06-talam-phase-1-foundation-data.md) | Marketing home highlights (conditional) | No-op unless the UI track's Paper pull found real dynamic content. |
| 2 | [phase-2-storefront-data.md](2026-07-06-talam-phase-2-storefront-data.md) | Shop/product/reviews/about/category data wiring | Reviews task carries the full TDD data-layer build. |
| 3 | [phase-3-commerce-data.md](2026-07-06-talam-phase-3-commerce-data.md) | Payment abstraction, orders data layer, webhooks, cart/checkout wiring | Flags `/orders/[id]` as a Phase 4 dependency; `DiscountCode` has no `Order` relation yet. |
| 4 | [phase-4-customer-data.md](2026-07-06-talam-phase-4-customer-data.md) | Auth guard, orders/account/wishlist data wiring | Satisfies Phase 3's `/orders/[id]` dependency. |
| 5 | [phase-5-tenant-admin-data.md](2026-07-06-talam-phase-5-tenant-admin-data.md) | Owner guard, dashboard/product/order/settings data + Server Actions | No Cloudinary upload pipeline yet — manual URL stopgap. |
| 6 | [phase-6-platform-data.md](2026-07-06-talam-phase-6-platform-data.md) | Super-admin guard, platform stats/tenant data, tier override | No tenant-approval workflow or real billing schema; MRR is an estimate. |
| 7 | [phase-7-growth-data.md](2026-07-06-talam-phase-7-growth-data.md) | Rate limiting, PostHog, Resend, OG images, `/join` data wiring | Order-event wiring explicitly gated on Phases 3/4 being implemented first. OTP stays SMS-only via MSG91. |
| 8 | [phase-8-launch-data.md](2026-07-06-talam-phase-8-launch-data.md) | WhatsApp FAB fix, SEO, performance, launch checklist | One real bug found: footer FAB ignores `Tenant.showWhatsappButton`. |

## Execution order

Work straight down the UI track table (1 → 8), then straight down the Data track table (1 → 8). Within the UI track, Phase 2 is the natural starting point since it's the original shop-page complaint and nothing else blocks on it.
