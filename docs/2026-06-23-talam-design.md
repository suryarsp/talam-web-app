# Talam — Full Product Design Spec

**Date:** 2026-06-23  
**Last updated:** 2026-07-18  
**Status:** Approved — v1.13  
**Author:** Surya Prakash  
**Version:** 1.13 (Product↔occasion linking moves to Products page; batch product operations; soft-delete)

**Changelog v1.13 (2026-07-18)**
- **Product↔occasion assignment moves from the Occasion panel to the Products page.** The v1.11 "Occasion settings" panel (admin `/admin/settings` → Occasions tab) drops its Products section entirely — occasions are now configured there for *display only* (name, theme, layout), never product membership. Occasion rows also become compact, content-sized cards (a `flex-wrap` of chips) instead of full-width stretchy bars, since a name + emoji + count no longer needs a full-width row now that the products list is gone.
- **New batch-selection system on `/admin/products`**, product-centric rather than occasion-centric: a checkbox per row (desktop table + mobile list), a header "select all visible" checkbox, and a "Select by category" dropdown that selects every product in a chosen category in one click. Selecting ≥1 product surfaces a floating action bar ("{n} selected" + actions).
- **Batch actions are an explicitly extensible registry** (`app/admin/products/batch-actions.ts` — a plain array of `{id, label, variant, confirm?, run}`), not one bespoke UI per action, so adding a new batch action later is a one-line addition, not a toolbar redesign. V1 ships four actions:
  - **Assign to Occasion** — opens a dialog listing existing occasions; picking one calls `assignProductsToOccasion(occasionId, productIds)`, which *adds* the selection to that occasion additively (skips products already in it, appends at the end of that occasion's order). A product can belong to multiple occasions at once — unchanged from the existing `ProductTagAssignment` many-to-many.
  - **Bulk edit** — scoped narrowly to fields that are meaningfully uniform across a multi-product selection: **category reassignment** and **active/inactive status** only. Name, price, images, and description are never bulk-edited — those stay per-product, edited individually via the existing Product Editor.
  - **Bulk delete** — see soft-delete note below; this is what actually performs the soft delete on the selection.
  - **Reset to default** — clears a product's occasion *and* offer associations (`ProductTagAssignment` + `StorePromotionProduct` rows deleted in one transaction) without touching any other field. Confirmation-gated like delete, since it's a destructive-to-associations action.
- **New schema field: `products.deleted_at timestamptz`, nullable — soft delete, mirroring the existing `tenants.deleted_at` pattern (§6).** A hard delete was rejected: `order_items.product_id` has a FK to `products`, and past orders must keep referencing the product row they were placed against (the row itself, not just the `order_items.product_name` snapshot — e.g. for admin drill-through from an order back to the product). Storefront queries (`getProducts`, `getProductBySlug`, category/occasion listings) and the admin product list all gain a `deletedAt: null` filter. "Delete" in the admin UI is therefore always reversible at the DB level (no UI to un-delete yet — that's a V2 gap, not blocking this pass).
- **Product Editor (Add/Edit dialog) gains an Occasions field** — a checkbox list of existing occasions, pre-checked to whatever the product is currently assigned to when editing. Saved via `updateProductOccasions(productId, occasionIds)`, which diffs against current assignments (add newly-checked, remove unchecked) after the product itself is created/updated. This is the per-product, one-at-a-time complement to the Products-page batch "Assign to Occasion" action — both write through the same `ProductTagAssignment` table.
- **CSV bulk import explicitly deferred to its own spec**, not built in this pass. Scoping note for that future spec: reuse `createProduct` row-by-row (not a separate bulk-SQL write path, to keep slug generation and stock-shape validation in one place); a 3-step upload → preview/validate → confirm modal serves as the "guided tour" rather than pulling in a tour/onboarding library for one modal. Added to §12 V2 backlog.

**Changelog v1.12 (2026-07-18)**
- **Error/crash capture added: Sentry (`@sentry/nextjs`).** `instrumentation.ts` (server + edge) and `instrumentation-client.ts` (browser) initialize Sentry; `next.config.ts` wraps with `withSentryConfig`. Crash/error alerting to the founder is Sentry's own Issue Alert rule (email), configured in the Sentry dashboard — not app code, since Sentry already does this and building a parallel notification pipeline would duplicate it. Requires `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN`/`SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_AUTH_TOKEN` (added to `.env.example`) to be filled in with a real Sentry project before it captures anything — account creation is a manual step for the store owner, not something built here.
- **"Publishers are added" maps to the existing `PublishLog` model**, not a new concept: the sibling 2026-07-18 draft/publish-workflow plan (`docs/superpowers/plans/2026-07-18-profile-menu-and-publish-workflow-implementation.md`) already records one `PublishLog` row per publish action (`itemCount`, `summary`) across `Product`/`StoreAbout`/`ProductTag`. This changelog does not duplicate that table.
- **New gap identified and scoped: no audit trail for transactions (`Order`) yet.** Unlike publish events, an order's lifecycle (`pending → confirmed → shipped → delivered`, `paymentStatus` flips) today only overwrites the `Order` row in place — no history of *when* or *why* it changed. New `OrderEvent` table scoped in `docs/superpowers/plans/2026-07-18-observability-and-order-audit-log-data.md`, written at the same two hook points Phase 3/5 already define (`updateOrderPayment` webhook handler, `updateOrderStatus` admin Server Action) — **explicitly gated on those Phase 3/5 functions existing first**, same dependency Phase 7 growth-data already declares for order-event wiring. Not built yet; this is a scoping/plan entry only.
- **"Heavy usage" alerting confirmed as a real gap, not scoped further today:** no traffic-threshold or rate-of-error infra exists (`@vercel/analytics` is a passive dashboard, not an alerting API on the free tier). Left as a V2 backlog item (§12) rather than inventing bespoke monitoring — Sentry's error-rate alerts (from the same Issue Alert rule above) are the nearest existing coverage for "the app is failing more than usual."
- Order-paid email alert to the store owner ("New order ₹X from {name}" via Resend) was already scoped in §3.4 — unaffected by this changelog, and not re-scoped here.

**Changelog v1.11 (2026-07-18)**
- **Occasions gain per-occasion display settings**, designed in Paper (Talam Design file, "Store Settings / Occasions / Desktop" and "Occasion — Desktop" artboards) before implementation. Today's admin UI (`app/admin/settings/page.tsx` OccasionsTab) only lets an owner assign products to an occasion — no control over how the occasion's own storefront page looks. Adds:
  - **`ProductTag.layout` enum** (`grid` | `carousel`, default `grid`) — how the storefront occasion page (`/store/occasion/[occasionSlug]`) renders its products.
  - **`ProductTagAssignment.sortOrder` int** (default 0) — manual product order, editable via drag-to-reorder in the admin picker, drives both grid and carousel display order.
  - **Theme picker**, not image upload: a curated set of gradient presets extending `lib/occasion-themes.ts`'s `OCCASION_THEMES` (today only Diwali/Pongal are defined). No Cloudinary pipeline exists yet (confirmed gap, unchanged from v1.9), so custom occasions pick from platform-curated gradients rather than uploading a banner image.
  - Admin's existing "Manage products" row-expansion becomes a full "Occasion settings" panel: Theme swatches → Layout toggle (Grid/Carousel) → Products (existing checkbox picker + reorder), in that order.
  - Storefront occasion page keeps its existing hero (theme gradient + emoji + headline) unchanged; only the products section below switches between the existing `ProductGrid` and a new horizontal-scroll `ProductCarousel`, per the occasion's `layout`.
- Not yet implemented — Paper design only at this point; schema migration and the two UI surfaces above are still pending.

**Changelog v1.10 (2026-07-17)**
- **New `/welcome` hub route**, added to §3.2's storefront/marketing route lists: the single destination for every signed-in-owner CTA (nav avatar, hero, CTA band, pricing) — never a direct link to `/admin/onboarding` or the live store. Shows "Continue setup" (routes to `/admin/onboarding`) while `Tenant.isOnboarded` is false, or "View My Store" + "View Admin" (subdomain-aware URLs, see §5.1) once true. Backed by `getOwnerCtaState()` (`signed-out | in-progress | onboarded`), re-derived server-side from the Supabase session + `Tenant.isOnboarded` on every call — never trusts a client-supplied id, same convention as `requireOwnerSession`/`requireSuperAdmin`.
- **Marketing CTAs are now state-aware**, not just a static "Start free" everywhere: the nav bar, hero, CTA band, and pricing plan cards all read the same `useOwnerCta()` client hook. Signed-out visitors see unchanged copy ("Start free" / "Start free trial"). Signed-in owners see "Finish Setting Up" (mid-onboarding, subtext "Pick up where you left off") or "View My Store" (onboarded, subtext "Takes you to your store & admin") — both linking to `/welcome`. The nav's avatar (photo or initial) replaces the CTA button for signed-in users and also links to `/welcome`; the old Account Menu dropdown and its `handleSignOut` were removed since sign-out now lives on the `/welcome` page itself.
- **`lib/tenant-url.ts` added** as the one shared source for building a tenant's store/admin URL (`getStoreUrl`/`getAdminUrl`) — dev-proxy path (`/dev/store/{slug}[/admin]`) locally, real subdomain URL (`https://{slug}.talam4shop.com[/admin]`) in production. Both the onboarding-redirect logic in §5.1 and the new `/welcome` page consume this instead of each re-deriving the dev/prod branch inline.
- **`requireOwnerSession` gains an optional redirect-target param** (default unchanged, `/admin/onboarding`) so `/welcome` can pass its own path (`requireOwnerSession('/welcome')`) and get `?next=/welcome` on the `/auth` redirect instead of always bouncing back to onboarding.
- Confirmed still not built (unchanged from v1.9): logo/product-photo upload (no Cloudinary pipeline), and the storefront-side "not onboarded yet" interstitial from §5.1 step 7 — `/welcome` and the state-aware CTAs solve *owner-facing* routing, not the public storefront gate, which remains a separate open item.

**Changelog v1.9 (2026-07-17)**
- **Onboarding is now per-step, not "write everything at the end":** §5.1 step 4 previously said the wizard "writes the `Tenant` row" as a single event on final submit. Revised: the `Tenant` row is created as soon as Step 1 (Store name/slug/category) is submitted — those are exactly the fields the schema requires as non-null — and each subsequent step (Brand, Product, Payment) persists immediately via its own Server Action, keyed by the signed-in user's id (`Tenant.ownerId`), not by anything the client supplies. Leaving mid-wizard and returning resumes at the last completed step instead of restarting.
- **New schema fields on `tenants`:** `owner_id` is now `UNIQUE` (one store per owner in V1 — matches §5.1's "owns a Tenant already" check, which assumes a single tenant per owner). `onboarding_step int DEFAULT 0` records the furthest completed wizard step, so a returning owner resumes instead of restarting from Step 1. `is_onboarded boolean DEFAULT false` (already specified in v1.8) is what actually flips at Go Live now that a real wizard writes it, rather than being an unwired placeholder.
- **Post-login redirect is now a single shared resolver**, used by both login methods (§5 lists Phone OTP and Google as the two built providers): no `Tenant` row for this owner → `/admin/onboarding`; a `Tenant` row exists but `is_onboarded` is false → `/admin/onboarding` (resumes at `onboarding_step`); `is_onboarded` true → that tenant's own admin dashboard. Previously only the Google callback redirected anywhere; OTP verify had no post-login navigation at all.
- **Redirect target is subdomain-aware:** because a tenant's admin panel is served from `{slug}.talam4shop.com/admin` in production (§3.1) but the onboarding wizard itself runs on the root domain (no subdomain exists until Step 1 creates the `Tenant`), the resolver builds an absolute cross-subdomain URL in production and the `/dev/store/{slug}/admin/...` local-preview path in dev (matching the existing dev-only proxy alias) — never a bare relative `/admin/dashboard`, which would resolve on the root domain and find no tenant context.
- **Confirmed gap, still not built:** logo upload (Brand step) and product photo upload (Product step) are not persisted — there is no Cloudinary upload pipeline in code yet (confirmed: no Cloudinary SDK usage anywhere but `next.config.ts` image remote patterns). Those two fields stay client-only placeholders until an upload pipeline exists; every other onboarding field now persists for real.
- **Confirmed gap, now fixed as a prerequisite:** `app/admin/layout.tsx` (the tenant-admin dashboard chrome — sidebar + header) unconditionally wrapped every route under `/admin/*`, including `/admin/onboarding`, which has its own full-screen wizard header/sidebar. Since this changelog is what makes `/admin/onboarding` reachable by a real signed-in owner for the first time, the layout now skips the dashboard chrome for that one route.

**Changelog v1.8 (2026-07-17)**
- **Owner onboarding & storefront-access flow formalized:** The end-to-end journey from marketing landing page through to a live, browsable storefront was previously implicit (scattered across §3.2's route list and §5's OTP diagram) rather than stated as a single sequence. See new §5.1 below for the explicit flow: Marketing → "Start free" → OTP sign-in → **post-login routing** (no tenant → onboarding, has tenant → dashboard) → onboarding wizard writes the `Tenant` row → admin dashboard → mandatory settings → storefront unlocked. Any owner who accesses the storefront before mandatory settings are done sees an interstitial with a link back to `/admin/settings`, instead of the live store.
- **New schema field:** `tenants.is_onboarded boolean DEFAULT false` (§6) — a single fact ("has this owner finished mandatory setup"), not derivable from existing fields, so it gets a real column rather than being computed or hardcoded. Gates storefront access per §5.1.
- **Confirmed gap, not yet built:** as of this changelog entry, none of §5.1's flow exists in code — OTP verify has no post-login redirect, the onboarding wizard UI has no backend wiring (no tenant row is ever created), and there is no `is_onboarded` gate or interstitial. Tracked as two Notion tracker rows ("Post-login routing…", Phase 1; "Onboarding completion gate…", Phase 6) and in `docs/superpowers/plans/2026-07-06-talam-phase-6-platform-data.md`'s Known Gaps section.

**Changelog v1.7 (2026-07-11)**
- **Production domain updated:** `talam4shop.com` is now the production root domain. Root and `www` render the marketing site, `{store}.talam4shop.com` renders the tenant storefront, `{store}.talam4shop.com/admin/*` renders tenant admin, and `admin.talam4shop.com` renders super admin.
- **Local route bypass added:** `localhost:3000` renders marketing; tenant storefront previews use `/dev/store/silk`, tenant admin previews use `/dev/store/silk/admin/*`, and super admin previews use `/dev/super-admin`. `silk.localhost:3000` remains an optional production-like preview.

**Changelog v1.6 (2026-07-11)**
- **Profile editing split out of Settings:** The 2026-07-04 decision that folded everything (profile + settings) into a single `/account` page is superseded. Editing your name/phone/email is now a **separate "Edit Profile" screen**, reached only via the "Profile" row in the Account Menu dropdown — not via the Settings page. Phone number is **read-only** on Edit Profile (locked field with a lock icon + "Phone number cannot be changed" caption) since phone is the OTP login identity and isn't meant to be self-service editable.
- **`/account` becomes a dedicated Settings page:** No more Personal Information card. Content is now three accordion sections — **Addresses**, **Payment Methods**, **Notifications** — plus the existing Account (Log Out / Delete Account) block. Mobile bottom nav's "Account" tab is renamed **"Settings"** (icon swapped from a person glyph to a gear) to match; it still points at the same route.
- **Addresses & Payment Methods are now real UI, not dead links:** Both were previously placeholder rows (`href="/"`, no destination). They're now expandable sections showing actual address/card entries — Default badge, Edit/Delete, "Set as Default" for non-default entries, and a "+ Add" action (opens as a modal/bottom-sheet, not a separate page). Addresses carries a hint: *"One default address is required to place orders."*
- **"My Orders" removed from Settings:** It was a redundant entry point — Orders already has its own route and its own bottom-nav/menu presence — so the row was cut to reduce duplication.
- **Notification toggles unified:** Previously two independent, out-of-sync toggle sets existed — mobile had 2 toggles (Order Notifications, WhatsApp Updates) in one `--color-store-primary`/`#25D366` mix, desktop had 3 differently-labeled toggles (Order Updates, WhatsApp Alerts, Promotions & Offers) with a third toggle in a different color entirely. Now there's one consistent 3-toggle set — **Deals / Order Updates / Promotions** — using a single color (`--color-success`) for the "on" state everywhere. Still schema-less/inert (no backing DB field) — see the `product_categories`-adjacent gap noted in §12; wiring these to a real preference field is unscoped.
- **Account Menu dropdown gains an Orders row (mobile only):** The mobile "Account Menu (Signed In)" dropdown is now Identity header → **Profile → Orders → Settings** → Log Out (4 action rows instead of 2). The **desktop** dropdown intentionally stays at 2 action rows (Profile, Settings) — Orders is reachable from the header's own Orders/cart affordance on desktop, so no Orders row was added there. This mobile/desktop asymmetry is deliberate, not an oversight.
- Route/nav updates to §3.2 below.
- **Implementation order changed to storefront-first:** complete the tenant-facing storefront through the local `/dev/store/silk` preview routes first — `/`, `/category/[categorySlug]`, `/product/[slug]`, `/about`, `/cart`, `/checkout`, `/wishlist`, `/account`, `/auth` — using the seeded dev-tenant fallback already noted below. Do not block storefront delivery on wildcard subdomain routing, custom-domain purchase, or proxy setup.
- **Tenant domain + proxy work explicitly deferred:** wildcard DNS and final production cutover remain launch-phase tasks, but host-aware proxy routing and local preview aliases are now implemented for development and pre-production verification.

**Changelog v1.5 (2026-07-09)**
- **`/shop` is now the tenant default/home route — literally, not via redirect:** The hero-driven storefront home (`HeroBanner`, `CategoryPills`, `FestivalEdit`, `OurStory` components) was retired; that Paper design no longer exists. `/shop`'s content (hero carousel, flash sale bar, occasion/new-arrivals sections, filter sidebar + product grid) now lives at `app/store/page.tsx` (the `/` route) instead of a separate `/shop` path — there is no `/shop` route left in the app, and nothing redirects to one. Category SEO pages move to `/category/[categorySlug]` (not `/shop/[categorySlug]`) — namespaced to avoid a category slug colliding with a static top-level route like `/about` or `/cart`.
- **Header nav wired to real filters, not `href="#"`:** Desktop `StoreHeader` nav (`components/store/store-header.tsx`) now links Festive → `/?occasion=Festive` and New Arrivals → `/?sort=newest`, both read by the home page via `useSearchParams` on mount. "Shop" was dropped from the nav (Home now serves that role — a self-referencing link would be redundant). Women/Men currently link home unfiltered — there's no gender field on `products` yet, so real filtering for those two is deferred until the schema supports it.
- **Local dev preview without subdomain middleware:** No subdomain-resolution middleware exists yet (§3.1's wildcard routing was never implemented — confirmed no `middleware.ts` in the repo). `lib/data/tenant.ts` now exports `getDevTenantId()`, a dev-only (`NODE_ENV === 'development'`) fallback that resolves a seeded tenant by slug (`TALAM_DEV_TENANT_SLUG`, default `silk`) when `x-tenant-id` is absent, so `app/store/layout.tsx` renders locally at `localhost:3000/store` without simulating a subdomain. This is a stopgap, not a substitute for the real middleware §3.1 still requires before production launch.

**Changelog v1.4 (2026-07-04)**
- **OTP stays SMS-only, DLT fee now budgeted:** Considered switching Phone OTP delivery to WhatsApp (via Supabase + Twilio) to dodge MSG91's ₹5,900 one-time DLT Principal Entity registration fee. Confirmed the fee is a TRAI regulatory requirement that applies to *any* SMS gateway sending OTPs to Indian numbers (Twilio, Fast2SMS, 2Factor, etc. all require it) — switching providers doesn't avoid it. Also, ~25% of Indian smartphone users don't have WhatsApp, so it can't be the sole phone-based login channel without a fallback. **Decision: keep §5 Phone OTP as SMS-only via MSG91, treat the ₹5,900 DLT fee as a one-time setup cost** (in addition to the ₹1,890/mo recurring infra cost in §4).
- **WhatsApp scoped to alerts, not auth:** The "(V1.5) MSG91 WhatsApp: order alert to store owner" line in §3.4 is now a defined flow: before sending, run a WhatsApp Business API contact-check on the number; if the number isn't on WhatsApp, **fall back to email (Resend)** — not SMS. SMS-as-alert-fallback is deferred to V2 (see §12) since it adds per-message cost the email fallback avoids. Because MSG91 offers both SMS and WhatsApp Business API under one account, no second vendor is needed for this.

**Changelog v1.3 (2026-07-04)**
- **`/auth` finalized in Paper:** Single unified screen serves both login and signup — mobile number field (+91 prefix) → "Continue" → OTP (OTP-entry step not yet designed) → session, with "Continue with Google" as a secondary option below a divider. No separate signup screen exists; the OTP flow doesn't distinguish new vs. returning users until the number is verified, so one screen covers both. Email/password (§5 priority 3) remains unbuilt in the UI — Phone OTP and Google are the only two options designed so far.
- **`/account` header entry point defined:** Clicking the profile icon in the storefront header opens an `Account Menu` dropdown. Logged-out: single "Log in / Sign up" row → `/auth`. Logged-in: profile icon becomes an initial avatar; dropdown shows name + phone, then Profile / Settings / Log Out (Log Out styled in the danger colour). This is the header-level entry point that complements the full `/account` page.
- **Settings folded into `/account` (decided 2026-07-04):** no separate `/account/settings` route. "Settings" in the Account Menu deep-links to a settings section within the same `/account` page (Paper already designs it this way — the `Account & Settings — Mobile` / `Settings — Desktop` artboards are one combined page, not two).
- **Storefront `/about` desktop parity:** `/about` now has a designed desktop layout (two-column: profile/stats + story/branches), matching the rest of the desktop storefront. Previously mobile-only.
- **`/wishlist` desktop parity:** Desktop wishlist now includes the same filter controls (In Stock / Price / On Sale) and a Share action that were previously mobile-only.
- **Product detail delivery estimate cut:** The pincode "Check Delivery Date" widget on `/product/[slug]` (distinct from the `/checkout` pincode auto-fill in §3.2, which is unaffected) was removed from the mobile design — it was never built for desktop, so the two are now aligned. If delivery-estimate-on-PDP is still wanted, it needs to be re-scoped and re-designed, not just re-added as-is.
- See `docs/design/2026-06-23-talam-oss-design.md` §4.1b for full Account Menu / Auth design detail, and `docs/2026-06-28-PAPER-DESIGN-INVENTORY.md` for per-screen build status.

**Changelog v1.2 (2026-06-30)**
- **Admin nav restructure:** Customers promoted from a Settings sub-route to a top-level nav item. Bottom nav (mobile) is now 5 items: Dashboard, Orders, Products, Customers, Settings — not 4. Desktop drops the top header nav in favor of a fixed left sidebar (icon-only, expandable), with Settings subsections nested under it. See `docs/superpowers/specs/2026-06-27-admin-dashboard-design.md` for full spec.
- **Trial banner:** Removed from the admin dashboard UI spec (the read-only-on-expiry *behavior* in §2 is unchanged — only the dashboard banner component was cut).
- **Settings hub:** Now 12 routes nested under Settings (Customers moved out; see above).

**Changelog v1.1 Final (2026-06-25)**
- **Domain:** Changed from `talam.app` (unavailable) to `talam4shop.com`
- **Product categories:** Added `product_categories` table — dynamic, per-tenant, ordered categories
- **Store identity:** Added `/about` storefront route + `/admin/about` admin route for store story, social links, branch locations
- **Product reviews:** Added 5-star review system with verified purchase badges, moderation, and report mechanism. New tables: `product_reviews`, `review_reports`
- **Delivery & trust:** Added trust badges (free delivery, return window, custom trust text), pincode delivery check, size guide upload
- **Admin restructure:** Settings becomes a hub with sub-navigation (13 routes nested under Settings). Bottom nav reduced to 4 items: Dashboard, Products, Orders, Settings
- **Onboarding:** Reduced to 5 steps (Store → Brand → Product → Payment → Go Live), with categories moved to post-onboarding `/admin/categories`
- **Database:** Added 4 new tables (store_about, store_branches, product_reviews, review_reports) + 13 new columns on tenants table
- **Payment providers:** Confirmed V1 scope = UPI Manual + Instamojo + Razorpay only (PhonePe moved to V2)
- **GTM:** Expanded ICP definition, referral attribution, email nurture sequences, pricing page
- **Timeline:** Adjusted to 9 weeks (accounts for reviews, about page, delivery/trust features)

---

## 1. Product Overview

**Name:** Talam (தளம் — Tamil for "platform/ground")  
**Domain:** `talam4shop.com`  
**Tagline:** "Your platform. Your business."  
**Type:** Multi-tenant SaaS e-commerce platform

### What It Is
A Myntra-quality online store builder for any Indian small business — ethnic wear, bakeries, salons, tutors, handicrafts. Non-technical owners sign up, configure in 14 minutes, and start selling via UPI/cards with no GST or MSME registration required.

### What It Is Not
- Not a competitor to Shopify at scale — it is the Indian-first, individual-seller-friendly alternative
- Not a template to download — it is a hosted SaaS platform
- Not multi-currency — India-only at launch

### Store #1
D'Mystique Boutique (`silk.talam4shop.com`) — the owner's own ethnic wear boutique. Used as proof-of-concept, marketing demo, and first viral referral source.

---

## 2. Business Model

| | Trial | Starter | Pro |
|---|---|---|---|
| **Price** | Free (14 days) | ₹499/mo | ₹1,499/mo |
| **Products** | 25 | 100 | Unlimited |
| **OTP logins/mo** | 100 | 500 | 2,000 |
| **Subdomain** | Yes | Yes | Yes |
| **Custom domain** | No | No | V2 |
| **Payments** | Yes | Yes | Yes |
| **WhatsApp button** | No | Yes | Yes |
| **Discount codes** | No | Yes | Yes |
| **Wishlist** | No | Yes | Yes |
| **Analytics** | No | Basic | Advanced |
| **"Powered by" badge** | Shown | Hidden | Hidden |
| **Support** | Docs | Email | Priority |

**On trial expiry:** Store goes read-only (customers can browse, cannot checkout). Banner shown to store owner to subscribe.

**Product count limit enforcement:** Enforced server-side on `createProduct` Server Action — returns a user-visible error before writing to the DB.

**Referral program:** A store owner who refers a new subscriber earns 1 free month. Tracked via `utm_source=badge&utm_medium=store&utm_campaign={slug}` on the "Powered by Talam" badge link → `/join` landing page on `talam4shop.com` captures the referral source.

**Talam subscription billing:** Via Talam's own Razorpay account (separate from tenant payments).

**Break-even:** 4 paying Starter tenants (₹1,996 revenue vs ₹1,890/mo infra cost).

---

## 3. Architecture

### 3.1 Multi-Tenancy Model
- **Routing:** Wildcard subdomain `*.talam4shop.com` — Vercel middleware extracts subdomain → resolves `tenant_id` → injects into request context via `x-tenant-id` / `x-tenant-tier` headers
- **Database:** Shared PostgreSQL, every table has `tenant_id` UUID foreign key
- **Isolation:** Supabase Row Level Security (RLS) enforces tenant boundaries at DB level; Prisma `withTenant()` sets `app.tenant_id` session variable before every query
- **Image isolation:** Cloudinary folder per tenant `/talam/{tenantId}/`
- **Admin split:** Tenant admin at `{store}.talam4shop.com/admin`, Super admin at `admin.talam4shop.com`

### 3.2 App Structure

```
talam4shop.com/                       → Marketing landing page + pricing page
{store}.talam4shop.com/               → Tenant storefront
{store}.talam4shop.com/admin          → Tenant admin panel
admin.talam4shop.com/                 → Super admin (platform owner)
```

**Storefront routes:**
```
/                         Home — IS the product listing (hero carousel, flash sale, filters/sort, grid).
                          No separate hero/collections home design — the old home was retired (v1.5)
                          and /shop was merged into / instead of / redirecting to /shop.
/about                    Store about page — owner story, social links, trust stats, branch locations
/category/[categorySlug]  Category-specific listing — SEO-indexable, pre-rendered (ISR 30 min).
                          Namespaced under /category (not bare /[slug]) to avoid a category named
                          e.g. "about" or "cart" colliding with the static top-level routes below.
/product/[slug]           Product detail — images, size picker, reviews, trust badges, add to cart
/cart                     Shopping cart (Zustand + localStorage)
/checkout                 Address + payment gateway (pincode auto-fill, delivery estimate)
/orders                   Order history + tracking
/orders/[id]              Single order detail + status
/wishlist                 Saved products
/account                  Settings — Addresses, Payment Methods, Notifications (accordion sections) + Log Out / Delete Account.
                          Renamed "Settings" in the mobile bottom nav and Account Menu (was "Account" through v1.5).
/account/profile          Edit Profile — full name, email (editable), phone number (read-only). Reached only from
                          the Account Menu's "Profile" row, not from the Settings page itself (v1.6, see changelog).
/auth                     OTP / Google / Email login
/welcome                  Signed-in owner hub — "Continue setup" or "View My Store"/"View Admin"
                          depending on Tenant.isOnboarded. Every signed-in marketing CTA routes
                          here, never directly to /admin/onboarding or the storefront (v1.10).
```

**Tenant admin routes:**
```
/admin/dashboard     Sales stats (Revenue, Orders, Customers, Avg Order Value), notifications bell; desktop sidebar nav label: "Overview"
/admin/products      Add / edit / delete products, low stock badges
/admin/orders        Order list, status updates, tracking ID entry, search filter
/admin/customers     Customer list, contact details, order history per customer (top-level nav item — not under Settings)
/admin/settings      Hub page linking to:
  ├── /admin/settings/store       Store name, tagline, contact phone/email
  ├── /admin/settings/brand       Logo, primary color
  ├── /admin/settings/payment     Payment gateway config
  ├── /admin/settings/whatsapp    Phone, toggle button visibility
  ├── /admin/settings/delivery    Free delivery above, shipping fee, delivery estimate, return window, trust badges, size guide
  ├── /admin/settings/notifications  Email & order alerts
  ├── /admin/about                Store story, social links, branch locations
  ├── /admin/reviews              Product reviews moderation (all + reported)
  ├── /admin/categories           Create / reorder / delete product categories
  ├── /admin/promotions           Discount codes, sale banners
  ├── /admin/payouts              Settlement history from payment gateway
  ├── /admin/billing              Subscription plan, upgrade, payment history
  └── Danger Zone                 Delete store (soft-delete)
/admin/onboarding    First-run setup wizard (7 steps: Store → Brand → Contact & Address →
                     Your Story → Product → Payment → Go Live; grew from the originally
                     scoped 5 steps, see Changelog v1.9/v1.10 and
                     docs/superpowers/specs/2026-07-17-onboarding-v2-design.md)

Mobile bottom nav (5 items): Dashboard, Products, Orders, Customers, Settings.
Desktop: fixed left sidebar nav (icon-only, expandable), not a top header nav — see `docs/superpowers/specs/2026-06-27-admin-dashboard-design.md`.
```

**Super admin routes:**
```
/dashboard           Platform metrics — GMV, active stores, MRR
/tenants             All stores — tier, status, last order date
/tenants/[id]        Individual store details, tier override
/billing             Subscription payments, failed renewals
```

**Marketing site routes:**
```
talam4shop.com/         Landing page — hero, features, social proof
talam4shop.com/pricing  Plan comparison — Trial / Starter / Pro feature table + CTA
talam4shop.com/join     Referral landing page — captures utm_campaign={slug} for attribution
```

### 3.3 Rendering Strategy

| Page | Strategy | Revalidation |
|---|---|---|
| Storefront home | ISR | 1 hour |
| `/about` | ISR | 1 hour (on-demand on admin save) |
| Shop / filters | ISR | 30 minutes |
| Shop / [categorySlug] | ISR + generateStaticParams | 30 minutes |
| Product detail | ISR + on-demand | On admin product edit OR new review via `/api/revalidate` |
| Cart | Client (Zustand) | — |
| Checkout | SSR dynamic | Every request |
| Orders | SSR dynamic | Every request |
| Admin all pages | SSR dynamic | Every request |
| Marketing (pricing, join) | Static | On deploy |

### 3.4 Post-Checkout Flow (Non-blocking)

```
Payment webhook received → verify signature → mark order PAID
→ Vercel after() fires:
    ├── Resend: order confirmation email to customer
    ├── Resend: "New order ₹X from {name}" to store owner (fetched via Supabase admin)
    ├── PostHog: order_paid event tracked (user_id, tenant_id, amount — no PII)
    └── (V1.5) WhatsApp order alert to store owner via MSG91 WhatsApp Business API
        — contact-check first; if number isn't on WhatsApp, fall back to Resend email (not SMS — see §12)
```

---

## 4. Tech Stack

| Layer | Choice | Version | Cost |
|---|---|---|---|
| Framework | Next.js App Router | 15.1 | Free |
| Language | TypeScript | 5.x | Free |
| Styling | Tailwind CSS | 3.x | Free |
| UI Components | shadcn/ui (mobile-first) | Latest | Free |
| State | Zustand | 4.x | Free |
| Client fetch | SWR | 2.x | Free |
| Animations | Framer Motion | 11.x | Free |
| Icons | Lucide React | Latest | Free |
| ORM | Prisma (non-superuser role) | 5.x | Free |
| Database | Supabase PostgreSQL | — | Free (500MB) |
| Auth | Supabase Auth | — | Free (50K MAU) |
| OTP delivery | MSG91 via Supabase SMS Hook (SMS only — no WhatsApp OTP) | — | ₹0.12/SMS + ₹5,900 one-time DLT registration |
| Order/owner alerts (V1.5) | MSG91 WhatsApp Business API, contact-check + email fallback | — | ~₹0.30–0.50/alert (WhatsApp), else free via Resend |
| Image storage | Cloudinary | — | Free (25GB) |
| Email | Resend | — | Free (3K/mo) |
| Background jobs | Vercel `after()` | Next.js 15.1 | Free |
| Rate limiting | Upstash Redis | — | Free (10K/day) |
| OG cards | @vercel/og | — | Free |
| Analytics | PostHog | — | Free (1M events) |
| Hosting | Vercel Pro | — | $20/mo (~₹1,700) |
| Domain | talam4shop.com via Cloudflare | — | ~$10/yr (~₹850) |
| DNS | Vercel nameservers | — | Free |

**Total infra cost before first tenant: ₹1,890/mo**

**Dev vs. production DB:** The current Supabase project (`egxsukuswespiicezxoz`) is a **dev/QA instance only**. A separate Supabase project — with its own `DATABASE_URL` / `DATABASE_URL_SERVICE_ROLE` and Prisma migrations replayed fresh — must be provisioned for production once testing & QA are complete, ahead of the Week 9 go-live (see §11 Timeline). Do not point production traffic at the dev project ref.

---

## 5. Authentication

**Providers (in priority order):**
1. **Phone OTP** — primary, matches Myntra/Flipkart UX, via Supabase Auth + SMS Hook + MSG91. **SMS only** — WhatsApp is not used as a login channel (see Changelog v1.4); the ₹5,900 one-time MSG91 DLT registration fee is a required regulatory cost, not MSG91-specific.
2. **Google Sign-In** — one-tap alternative
3. **Email + Password** — fallback

**OTP flow:**
```
User enters phone → rate limit check (Upstash Redis: 5/10 min per phone)
→ Supabase Auth generates OTP
→ SMS Hook fires → Supabase Edge Function (msg91-sms-hook)
→ MSG91 API delivers OTP to phone (₹0.12)
→ User enters OTP → Supabase verifies
→ JWT issued → RLS identity bound → session created
```

**Session management:** Supabase Auth handles JWT issuance, refresh, and expiry. HttpOnly cookies via `@supabase/ssr`. Session refreshed on every request in middleware.

### 5.1 Owner Onboarding & Storefront Access Gate

The full owner journey, marketing landing page to a live storefront:

```
1. Marketing page (talam4shop.com) → "Start free" → /auth
2. Phone OTP or Google sign-in (§5 above)
3. Post-login routing (one shared resolver, both login methods):
     no Tenant row owned by this user       → /admin/onboarding
     Tenant row exists, is_onboarded=false  → /admin/onboarding, resumes at onboarding_step
     is_onboarded=true                      → that tenant's own /admin/dashboard
                                               (subdomain-aware URL — see Changelog v1.9)
4. Onboarding wizard (7 steps: Store → Brand → Contact & Address → Your Story →
   Product → Payment → Go Live — grew from the originally scoped 5, see Changelog v1.9/v1.10)
     → Step 1 (Store name/slug/category) submit creates the Tenant row
       (owner_id = authenticated user, onboarding_step = 1)
     → each later step persists immediately via its own action, bumping onboarding_step
     → Go Live sets is_onboarded = true, redirects to the tenant's /admin/dashboard
5. Owner configures mandatory settings (Store, Brand, Payment at minimum —
   the same fields captured in onboarding, editable again under /admin/settings)
6. Once `tenants.is_onboarded = true`, {store}.talam4shop.com serves the real storefront
7. Before that: any request to the storefront shows an interstitial —
   "Your store isn't ready yet" — with a link to /admin/settings, instead of
   the live store. The admin panel itself is never blocked by this gate;
   only the public-facing storefront is.
```

This formalizes what was previously implicit across §3.2's route list and §5's OTP diagram. See Changelog v1.9 for the per-step persistence model and Changelog v1.8 for the `is_onboarded` schema field this was originally scoped against.

---

## 6. Database Schema (Key Tables)

```sql
tenants
  id uuid PK
  owner_id uuid UNIQUE FK → auth.users  -- Supabase Auth user who created the store;
                                 -- UNIQUE = one store per owner in V1 (see §5.1, Changelog v1.9)
  onboarding_step int DEFAULT 0  -- furthest completed onboarding wizard step; lets a returning
                                 -- owner resume instead of restarting (Changelog v1.9)
  slug text UNIQUE               -- "silk" in silk.talam4shop.com
  name text
  tier enum('trial','starter','pro')
  trial_ends_at timestamptz
  tagline text                   -- "Handpicked Indian Fashion for Every Occasion"
  brand_color text               -- CSS hex
  logo_url text                  -- Cloudinary URL
  whatsapp_number text
  contact_phone text             -- public store phone (separate from whatsapp_number)
  contact_email text             -- public store email; shown on /about only
  show_whatsapp_button boolean DEFAULT true
  notify_email_on_order boolean DEFAULT true
  payment_provider enum('upi_manual','instamojo','razorpay')  -- V1: PhonePe in V2
  payment_config jsonb           -- encrypted gateway keys
  store_type text                -- 'ethnic_wear' | 'bakery' | 'salon' | 'handicrafts' | 'other'
                                 -- captured at onboarding, used for PostHog segmentation
  is_onboarded boolean DEFAULT false  -- true once mandatory onboarding/settings are complete;
                                 -- gates public storefront access, see §5.1
  free_delivery_above numeric    -- NULL = shipping_fee always applies
  shipping_fee numeric DEFAULT 0 -- flat fee when order doesn't qualify
  delivery_estimate_text text    -- "5–7 business days"
  return_window_days int         -- NULL = no return policy shown
  trust_badge_text text          -- custom line e.g. "100% authentic, handpicked by Meena"
  size_guide_url text            -- Cloudinary URL; NULL = platform fallback chart
  deleted_at timestamptz         -- soft delete; NULL = active; hard-delete after 30 days
  created_at timestamptz

product_categories
  id uuid PK
  tenant_id uuid FK → tenants
  name text                      -- "Cakes", "Kurtis", "Haircuts" — owner-defined
  slug text                      -- URL-safe, e.g. "cakes" → /category/cakes
  sort_order int                 -- controls display order in filter UI and home category strips
  created_at timestamptz
  ── UNIQUE(tenant_id, slug)

products
  id uuid PK
  tenant_id uuid FK → tenants
  name text
  slug text
  description text
  price numeric
  compare_price numeric          -- for sale display (strikethrough)
  category_id uuid FK → product_categories  -- nullable (product may have no category)
  sizes text[]                   -- ['XS','S','M','L','XL','XXL'] — empty array = no size
  images text[]                  -- Cloudinary URLs
  stock_by_size jsonb            -- {"M": 5, "L": 3} — empty if no sizes
  is_active boolean
  created_at timestamptz
  ── UNIQUE(tenant_id, slug)

customers
  id uuid FK → auth.users        -- Supabase Auth user
  tenant_id uuid FK → tenants
  name text
  phone text
  email text
  created_at timestamptz

orders
  id uuid PK
  tenant_id uuid FK → tenants
  customer_id uuid FK → customers
  status enum('pending','confirmed','shipped','delivered','cancelled','returned')
  total numeric
  payment_provider text
  payment_id text                -- gateway transaction ID
  payment_status enum('pending','paid','failed','refunded')
  shipping_address jsonb
  tracking_id text
  created_at timestamptz

order_items
  id uuid PK
  order_id uuid FK → orders
  tenant_id uuid FK → tenants
  product_id uuid FK → products
  product_name text              -- snapshot at time of order
  size text
  quantity int
  unit_price numeric

wishlists
  id uuid PK
  tenant_id uuid FK → tenants
  customer_id uuid FK → customers
  product_id uuid FK → products
  ── UNIQUE(tenant_id, customer_id, product_id)

discount_codes
  id uuid PK
  tenant_id uuid FK → tenants
  code text
  type enum('percent','fixed')
  value numeric
  min_order numeric
  uses_limit int
  uses_count int
  expires_at timestamptz
  is_active boolean
  ── UNIQUE(tenant_id, code)

store_about
  id uuid PK
  tenant_id uuid FK → tenants UNIQUE   -- one row per store
  story_title text                     -- "Our Story", "About D'Mystique"
  description text                     -- long-form markdown / plain text
  owner_photo_url text                 -- Cloudinary URL, nullable
  instagram_url text
  facebook_url text
  youtube_url text
  google_business_url text
  created_at timestamptz
  updated_at timestamptz

store_branches
  id uuid PK
  tenant_id uuid FK → tenants
  name text                            -- "Main Store", "Anna Nagar Branch"
  address text
  city text
  phone text
  maps_url text                        -- Google Maps link
  sort_order int
  created_at timestamptz

product_reviews
  id uuid PK
  tenant_id uuid FK → tenants
  product_id uuid FK → products
  customer_id uuid FK → customers
  rating int NOT NULL                  -- 1–5
  comment text                         -- nullable
  is_verified_purchase boolean         -- set at write time: check order_items
  is_deleted boolean DEFAULT false     -- soft delete by owner
  created_at timestamptz
  ── UNIQUE(tenant_id, product_id, customer_id)

review_reports
  id uuid PK
  tenant_id uuid FK → tenants
  review_id uuid FK → product_reviews
  reporter_id uuid FK → customers
  reason enum('spam','inappropriate','fake','other')
  created_at timestamptz
  ── UNIQUE(tenant_id, review_id, reporter_id)   -- one report per person per review
```

**RLS policy pattern (applied to every table including `product_categories`):**
```sql
CREATE POLICY "tenant_isolation"
ON {table_name}
USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

---

## 7. Payment Architecture

### Payment Provider Abstraction
```typescript
interface PaymentProvider {
  name: string
  createOrder(amount: number, orderId: string): Promise<{ checkoutData: CheckoutData }>
  verifyWebhook(payload: unknown, headers: Headers): Promise<WebhookVerifyResult>
}

type CheckoutData = {
  paymentUrl?: string      // UPI deep link or Instamojo redirect URL
  qrCode?: string          // UPI QR code image URL
}

// V1 Implementations
class UpiManualProvider implements PaymentProvider { ... }
class InstamojoProvider implements PaymentProvider { ... }
class RazorpayProvider implements PaymentProvider { ... }

// V2+
class PhonePeProvider implements PaymentProvider { ... }  // V2
```

### Payment Options for Tenants (V1)

| Provider | KYC Required | Fee | Best For |
|---|---|---|---|
| UPI Manual | UPI ID only | 0% | Anyone, manual confirm |
| Instamojo ← Recommended | PAN + savings account | 2% + ₹3 | Individual sellers |
| Razorpay | Existing account | 2% | Already registered businesses |

**V2 additions:** PhonePe (0% UPI, ~2% cards) — requires current account

### Money Flow
```
Customer pays → tenant's payment gateway account
→ Money direct to tenant's bank (T+2 or instant for UPI)
→ Talam never touches transaction money
→ Talam charges subscription separately via own Razorpay
```

**Razorpay Route (V2):** Once Talam has 50+ stores and qualifies for FLDG, migrate to central collection with automated platform fee deduction.

---

## 8. Security

### Critical Controls (Blockers — must implement first)

**1. Prisma non-superuser role:**
```sql
CREATE ROLE talam_app_user WITH LOGIN PASSWORD '...';
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO talam_app_user;
```
```typescript
// withTenant() injects tenant context before every query
await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`
```

**2. Supabase client split:**
```
NEXT_PUBLIC_SUPABASE_ANON_KEY    → browser/client components (safe)
SUPABASE_SERVICE_ROLE_KEY        → server-only, never NEXT_PUBLIC_ prefix
```
ESLint rule blocks accidental `NEXT_PUBLIC_` prefix on any secret key.

**3. MSG91 via SMS Hook (not direct):**
Supabase generates OTP → SMS Hook → Edge Function → MSG91 API → customer phone.
Supabase session management unbroken. Hook signature verified with HMAC-SHA256.

### Additional Security
- All Server Actions verify Supabase session before any DB mutation
- Admin routes verify `tenant.owner_id === auth.uid()`
- Super admin routes verify `user.app_metadata.role === 'super_admin'`
- Webhook endpoints verify provider signature before any order status update
- Rate limiting on OTP endpoint: 5 attempts per phone per 10 min (Upstash Redis)
- Payment gateway keys stored in `tenant.payment_config` JSONB (encrypted at rest by Supabase)
- Security headers on all responses via middleware: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`

---

## 9. Infrastructure

### DNS Setup
```
Domain registrar: Cloudflare (at-cost pricing, no markup)
Domain: talam4shop.com
Nameservers: ns1.vercel-dns.com + ns2.vercel-dns.com (required for wildcard SSL)
Vercel project: Add talam4shop.com + *.talam4shop.com wildcard domain
Email subdomain: mail.talam4shop.com (Resend SPF/DKIM DNS records added via Vercel DNS)
SSL: Auto-provisioned by Vercel via Let's Encrypt (wildcard cert requires Vercel nameservers)
```

### Environment Variables
```bash
# ─── PUBLIC (browser-safe) ───────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_ROOT_DOMAIN=talam4shop.com     # used in middleware, OG cards, badge links

# ─── SERVER ONLY (never add NEXT_PUBLIC_ prefix) ─────────────────────────────
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=                            # talam_app_user role (Prisma runtime)
DATABASE_URL_SERVICE_ROLE=               # postgres superuser (migrations only)
MSG91_AUTH_KEY=
MSG91_TEMPLATE_ID=
SUPABASE_HOOK_SECRET=                    # 32-byte hex — HMAC secret for SMS Hook
RESEND_API_KEY=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
TALAM_RAZORPAY_KEY_ID=                  # Talam's own subscription billing account
TALAM_RAZORPAY_KEY_SECRET=
RAZORPAY_STARTER_PLAN_ID=               # plan_XXXX from Razorpay dashboard
RAZORPAY_PRO_PLAN_ID=                   # plan_YYYY from Razorpay dashboard
REVALIDATE_SECRET=                       # 32-byte hex — guards /api/revalidate endpoint
DMYSTIQUE_OWNER_ID=                      # Supabase auth.users UUID for D'Mystique owner (seed only)
```

---

## 10. GTM Strategy

### Ideal Customer Profile (ICP)

**Primary ICP — V1 focus:**
Women-owned ethnic wear, handicrafts, or homemade food businesses in Tier 1–2 Indian cities. Selling today via Instagram DMs and WhatsApp forwards. No website. 0–3 years old. 20–200 orders/month at ₹500–₹5,000 AOV. Phone-first: browses Instagram on phone, manages orders on WhatsApp at night.

**Why this ICP first:** D'Mystique is this exact profile. The first 5 referrals target the same category — not bakeries or salons (different UX needs, lower price tolerance). Once ethnic wear is proven, adjacent categories are fast follows.

**ICP captured at onboarding:** Wizard step 1 asks "What kind of products do you sell?" → maps to `tenant.store_type` → drives PostHog segmentation (`store_type` property on all events).

### GTM Motion

| | |
|---|---|
| **Primary motion** | Community-led — WhatsApp forwards + Instagram Reels |
| **Store #1** | D'Mystique live → real order screenshots → WhatsApp forward to peer sellers |
| **Viral loop** | "Powered by Talam" badge → `/join?utm_campaign={slug}` → signup → referrer gets 1 free month |
| **WhatsApp preview** | `@vercel/og` generates 1200×630 card when store link shared — brand color + product image |
| **Paid (Month 2)** | Instagram Reels ads, ₹5–10K/mo, Tamil Nadu women business owners 25–45 |
| **SEO** | Per-tenant category pages (`silk.talam4shop.com/category/sarees`) — indexable, shareable URLs |
| **Pricing page** | `talam4shop.com/pricing` — public plan comparison with "Start free" CTA, no credit card required |

### Referral Attribution
- "Powered by Talam" badge on trial stores links to `talam4shop.com/join?utm_source=badge&utm_medium=store&utm_campaign={slug}`
- `/join` page reads `utm_campaign`, shows: *"You found us via {store name}. They get 1 free month when you subscribe."*
- On successful subscription, referrer's `trial_ends_at` extended by 30 days (super admin action or Razorpay webhook)

### Owner Email Nurture Sequence (Resend)
Triggered by Vercel Cron — checks tenant state daily:

| Trigger | Delay | Email |
|---|---|---|
| Tenant created | Day 0 | "Welcome to Talam — add your first product in 5 minutes" |
| No products added | Day 2 | "Need a hand? Here's how to set up your store" |
| Products added, no orders | Day 7 | "Your store is live — share this link to get your first order" |
| Trial ends in 1 day | Day 13 | "Your trial ends tomorrow — subscribe to keep selling" |
| Trial expired, not subscribed | Day 15 | "Your store is paused — reactivate in 1 click" |

### Targets

| Metric | Month 1 | Month 3 |
|---|---|---|
| Paying stores | 5 | 25 |
| MRR | ₹2,495 | ₹12,475 |
| Active stores (≥1 order/30d) | 4 | 20 |

**North Star Metric:** Active stores with ≥1 order in last 30 days.

---

## 11. Timeline

| Week | Focus |
|---|---|
| 1 | Project init, Supabase setup, Prisma schema (incl. `product_categories`, `store_about`, `store_branches`, `product_reviews`, `review_reports`), auth flow (OTP + Google) |
| 2 | Storefront — home, category pages, product detail pages + reviews section |
| 3 | Cart, checkout (with pincode auto-fill + delivery estimate), payment gateway integration (UPI Manual + Instamojo + Razorpay) |
| 4 | Orders, account, wishlist, `/about` storefront page with trust stats + branches |
| 5 | Tenant admin — dashboard (notifications, trends), products CRUD, orders management, customers tab, categories CRUD |
| 6 | Admin settings hub (Store Details, Brand, Payment, WhatsApp, Delivery & Trust, Notifications, Danger Zone), `/admin/about` (story, social, branches), `/admin/reviews` moderation |
| 7 | Onboarding wizard (7 steps: Store → Brand → Contact & Address → Your Story → Product → Payment → Go Live), trust badges, size guide, review reporting, OG cards |
| 8 | Super admin, PostHog analytics, Resend emails + nurture sequences, rate limiting |
| 9 | D'Mystique goes live as Store #1, QA, Lighthouse performance audit, security headers, go-live |

**Target launch: September 1, 2026** (9 weeks from June 23, 2026)

> D'Mystique launches as Store #1 at Week 9, completing both the Talam platform and the boutique's online presence simultaneously.

---

## 12. Open Questions / V2 Backlog

**V2 Features:**
- **Payment:** PhonePe PG integration (0% UPI, ~2% cards), Razorpay Route for automated platform fee deduction (requires 50+ stores for FLDG)
- **Reviews:** Review response by store owner, review helpfulness voting ("Was this helpful?")
- **Store:** Tamil language UI toggle, referral dashboard for store owners (track how many stores they've referred)
- **Inventory:** Drag-to-reorder categories in admin (sort_order already in schema — just needs UI), multi-image upload with drag-drop reorder on product form, returned stock restoration (prompt to restock when order marked Returned)
- **Logistics:** COD (cash on delivery) support, international shipping / currency, real-time courier serviceability check
- **Admin:** PostHog analytics dashboard page (`/admin/analytics` — beyond dashboard stat cards), GST-compliant invoice PDF generation for registered sellers
- **Integrations:** SMS fallback for owner/customer alerts when WhatsApp contact-check fails (V1 fallback is email-only, see §3.4/§4/Changelog v1.4), Vyapar CSV export for accounting sync, custom domain per Pro tenant (Vercel Domains API)
- **Observability:** Heavy-usage / traffic-spike alerting (no threshold-alert infra exists yet — see Changelog v1.12), a super-admin-facing view of `OrderEvent` audit history across tenants (today's super-admin scope per Phase 6 data is tier/GMV stats only, not per-order history)
- **CSV bulk product import:** deferred from Changelog v1.13's batch-operations pass — a dedicated 3-step (template/upload → validate/preview → confirm) modal on `/admin/products`, reusing `createProduct` per row rather than a separate write path. Not scoped in detail yet.

**Resolved questions (moved from backlog):**
- ~~Domain `talam.app`~~ → **`talam4shop.com`** (registered) — v1.1
- ~~Free-text category field~~ → **`product_categories` FK table** (v1.1)
- ~~No referral tracking~~ → **UTM + `/join` page** (v1.1)
- ~~No social proof / reviews~~ → **Product reviews + verified purchase badges** (v1.1)
- ~~No store identity~~ → **Store About page + owner photo + social links + branch locations** (v1.1)
- ~~No delivery/trust signals~~ → **Trust badges + delivery estimate + return window** (v1.1)
