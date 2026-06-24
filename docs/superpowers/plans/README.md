# Talam — Implementation Plan Index

**Target launch:** August 18, 2026 (8 weeks from June 23, 2026)  
**Store #1:** D'Mystique Boutique at `silk.{YOUR_DOMAIN}`

---

## Phase Map

| Phase | File | Week | Status | Deliverable |
|---|---|---|---|---|
| Config Setup | [`../2026-06-23-talam-config-checklist.md`](../2026-06-23-talam-config-checklist.md) | Pre-week 1 | ☐ | All services configured, env vars set |
| **Phase 1** | [`2026-06-23-talam-phase-1-foundation.md`](2026-06-23-talam-phase-1-foundation.md) | Week 1 | ☐ | Next.js + Prisma + Supabase auth working |
| **Phase 2** | [`2026-06-23-talam-phase-2-storefront.md`](2026-06-23-talam-phase-2-storefront.md) | Week 2 | ☐ | Home, shop, product detail with ISR |
| **Phase 3** | [`2026-06-23-talam-phase-3-commerce.md`](2026-06-23-talam-phase-3-commerce.md) | Week 3 | ☐ | Cart, checkout, UPI + Instamojo payments |
| **Phase 4** | [`2026-06-23-talam-phase-4-customer.md`](2026-06-23-talam-phase-4-customer.md) | Week 4 | ☐ | Orders, account, wishlist |
| **Phase 5** | [`2026-06-23-talam-phase-5-tenant-admin.md`](2026-06-23-talam-phase-5-tenant-admin.md) | Week 5 | ☐ | Full tenant admin panel |
| **Phase 6** | [`2026-06-23-talam-phase-6-platform.md`](2026-06-23-talam-phase-6-platform.md) | Week 6 | ☐ | Super admin, onboarding, billing |
| **Phase 7** | [`2026-06-23-talam-phase-7-growth.md`](2026-06-23-talam-phase-7-growth.md) | Week 7 | ☐ | OG cards, emails, analytics, rate limiting |
| **Phase 8** | [`2026-06-23-talam-phase-8-launch.md`](2026-06-23-talam-phase-8-launch.md) | Week 8 | ☐ | D'Mystique live, QA, go-live |

---

## Execution Flow

```
Config Checklist (§0–§12)
        ↓
Phase 1: Foundation
  └─ Task 1: Project init (Next.js 15, Vitest, shadcn)
  └─ Task 2: Prisma schema + migrations + RLS
  └─ Task 3: Supabase clients (browser / server / admin)
  └─ Task 4: Multi-tenant middleware
  └─ Task 5: Auth flow (OTP + Google + MSG91 Edge Function)
  └─ Task 6: Root layout + marketing home
        ↓
Phase 2: Storefront
  └─ Task 1: Product data layer
  └─ Task 2: Store home page (ISR 1hr)
  └─ Task 3: Shop page + filters (ISR 30min)
  └─ Task 4: Product detail + cart store (ISR on-demand)
        ↓
Phase 3: Commerce
  └─ Task 1: Payment provider abstraction (UPI Manual + Instamojo)
  └─ Task 2: Cart page
  └─ Task 3: Checkout + order creation
  └─ Task 4: Payment webhooks
        ↓
Phase 4: Customer Features
  └─ Task 1: Auth guard utilities
  └─ Task 2: Orders list + detail
  └─ Task 3: Account page
  └─ Task 4: Wishlist (Starter/Pro only)
        ↓
Phase 5: Tenant Admin
  └─ Task 1: Admin auth guard + layout
  └─ Task 2: Dashboard stats
  └─ Task 3: Products CRUD + Cloudinary upload
  └─ Task 4: Orders management
  └─ Task 5: Customers list + Settings
        ↓
Phase 6: Platform Admin & Billing
  └─ Task 1: Super admin guard + layout
  └─ Task 2: Platform dashboard + tenant list
  └─ Task 3: Onboarding wizard
  └─ Task 4: Razorpay subscription webhook + billing page
        ↓
Phase 7: Growth Features
  └─ Task 1: Upstash Redis OTP rate limiting
  └─ Task 2: PostHog analytics (server + client)
  └─ Task 3: Resend order emails
  └─ Task 4: @vercel/og social cards
        ↓
Phase 8: Launch
  └─ Task 1: Storefront header + cart badge
  └─ Task 2: WhatsApp floating button
  └─ Task 3: "Powered by Talam" badge
  └─ Task 4: D'Mystique seed data
  └─ Task 5: Performance audit (Lighthouse)
  └─ Task 6: Security hardening
  └─ Task 7: Go-live QA checklist
```

---

## Key Technical Decisions

| Decision | Choice | Reason |
|---|---|---|
| Multi-tenancy routing | Middleware URL rewrite to `/store/*`, `/super-admin/*` | Clean URLs, no route conflicts in App Router |
| Auth | Supabase Auth + `@supabase/ssr` HttpOnly cookies | Session refresh in middleware, works in RSC |
| Tenant isolation | Prisma `withTenant()` sets `app.tenant_id` + Supabase RLS | Defense in depth: app layer + DB layer |
| Payment | Provider abstraction (`PaymentProvider` interface) | Swap providers without touching checkout logic |
| Image upload | Cloudinary unsigned preset, client-side | No server proxy needed, Cloudinary handles CDN |
| Post-payment effects | Next.js `after()` | Non-blocking, doesn't delay checkout response |
| ISR strategy | Home=1hr, Shop=30min, Product=on-demand | Balance freshness vs. server load |
| Testing | Vitest + jsdom, mocked Prisma/Supabase | Fast unit tests, no test DB required |

---

## Domain Status

> **`talam.app` is taken.** Recommended domain: `mytalam.com`  
> See [`../2026-06-23-talam-config-checklist.md`](../2026-06-23-talam-config-checklist.md) §0 for full options.

---

## Running a Phase

Each phase plan is self-contained. To execute:

1. Open the phase plan file
2. Invoke `superpowers:subagent-driven-development` skill
3. Work through tasks in order — each task ends with a commit
4. Run `npm test -- --run` and `npm run build` at the end of each phase

To resume mid-phase, check which tasks have all their checkboxes marked.
