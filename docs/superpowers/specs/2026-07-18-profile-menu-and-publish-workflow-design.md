# Profile Dropdown, Tenant Home Page & Draft/Publish Workflow — Design Spec

**Date:** 2026-07-18
**Status:** Approved
**Author:** Surya Prakash + Claude
**Scope:** Turn the marketing nav's profile icon into a dropdown, repurpose `/welcome` into a real tenant home page with a change log, and introduce a draft/publish workflow so content edits in admin no longer go live instantly.

**Supersedes:** §6 of `docs/superpowers/specs/2026-07-17-welcome-page-and-cta-state-design.md` — that spec deleted the nav's `AccountMenu` dropdown in favor of a plain `Link` to `/welcome`. This spec reintroduces a dropdown on the same avatar, but with different content (see §1) than the old `AccountMenu` (name/email + sign-out). It also supersedes §5's visual design for `/welcome` (dark, marketing-styled centered cards) — see §2.

## 1. Profile dropdown

`components/marketing/nav.tsx`'s `Avatar` (currently a plain `<Link href="/welcome">`, lines 91-99) becomes a click-toggle dropdown, following the existing pattern in `components/store/account-menu.tsx` (local `open` state, outside-click-closes via a ref + `mousedown` listener — no new dependency; no dropdown-menu package is installed in this repo).

Two items:
- **"Go to Home Page"** → `/welcome`
- **"Log Out"** → same Supabase sign-out call already used in `app/welcome/sign-out-button.tsx`

The mobile avatar link (`nav.tsx` lines 79-86) gets the same treatment for consistency.

## 2. `/welcome` becomes the tenant home page — redesigned in the admin's visual language

No new route — `app/welcome/page.tsx` keeps its existing guard (`requireOwnerSession`), tenant lookup, and state logic (onboarded vs. in-progress, from the 2026-07-17 spec). What changes is the visual design and structure.

**Why:** the marketing site (dark `bg-bg-dark`, centered card, `nav.tsx`'s styling) is for *visitors* — it shouldn't carry tenant-specific operational content. `/welcome` is where a signed-in tenant lands to do something (check recent activity, jump into admin or the store), and that's structurally the same job as `app/admin/dashboard/page.tsx` — a light, section-based, card-driven layout that's easy to extend with more sections later. So `/welcome` adopts that visual language instead of the marketing one: `font-admin`, light `bg-bg` page background, sections built from `bg-surface rounded-lg` cards, the same type-scale conventions (`text-2xs uppercase tracking-[0.06em] text-muted-warm` section labels, `font-marketing` for large numerals/headings) already established in `admin-dashboard/page.tsx`.

**Not reused:** `AdminNavShell`'s sidebar/bottom-tab-bar chrome. `/welcome` is a landing/dispatch page a tenant sees *before* entering `/admin` — it isn't itself a page within the admin nav, so it keeps its own simple header (logo + user name/avatar, no sidebar, no nav links) rather than being wrapped in the full admin shell.

**Structure** (server component, same as today, `SignOutButton` still the only client island):
1. Simple header bar: logo + signed-in user's name/avatar (light, not the dark marketing logo treatment).
2. **"Recent publishes"** card section (§8) — same list-row pattern as `admin-dashboard/page.tsx`'s "Recent Orders" section (`bg-surface rounded-lg`, row-per-item, relative timestamps).
3. Store/admin navigation, restyled as card-style action rows (matching the admin dashboard's list-row visual treatment) instead of the marketing page's large dark pill buttons — same **View My Store** / **View Admin** (or **Continue setup**, if not yet onboarded) destinations as today, unchanged.
4. Sign out, kept as a plain text action near the header, not a large button.

## 3. Draft/publish workflow — scope

Admin content edits become drafts; a **Publish** button applies all pending drafts for a tenant at once and logs the event.

**In scope** (content, with an actual admin write path today): `Product`, `StoreAbout`, `ProductTag` (the "Occasion" model — `themeKey`/`layout`/name/emoji/product assignments, edited via `app/admin/settings/occasions`).

**Out of scope:** `StoreBanner` and `StorePromotion` — no admin screen writes to these after onboarding (only `prisma/seed.ts` and the onboarding wizard do), so there's no draft to create; revisit when an admin screen for them exists. `Tenant`'s own fields (`paymentProvider`, `paymentConfig`, `shippingFee`, `notifyEmailOnOrder`, `contactPhone`, etc.) — read by checkout/order-notification code paths, staging them adds risk without benefit. `Order` status changes (transactional, not content). Onboarding (`app/admin/onboarding`) — pre-launch wizard, store isn't live yet.

## 4. Data model

```prisma
enum PublishStatus {
  draft
  published
}
```

Added to `Product`, `StoreAbout`, `ProductTag`:
```prisma
status PublishStatus @default(published)
```
Default is `published` (not `draft`) so the migration is non-disruptive — every existing row in the DB is already "live" and the storefront looks identical the moment this ships. Only new edits made after this ships start as `draft`.

New model for the publish log shown on `/welcome`:
```prisma
model PublishLog {
  id          String   @id @default(uuid()) @db.Uuid
  tenantId    String   @map("tenant_id") @db.Uuid
  publishedAt DateTime @default(now()) @map("published_at") @db.Timestamptz
  itemCount   Int      @map("item_count")
  summary     String   // e.g. "3 products, 1 banner"

  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@map("publish_logs")
}
```

Storefront reads add `status: 'published'` to their existing `where` filters: `lib/data/products.ts` (`getProducts`, `getOfferProducts`, `getProductBySlug`), `lib/data/tenant.ts` (`getTenantStorefront`'s `about` selection only returns published `StoreAbout`), and `lib/data/storefront.ts` (`getProductTags`). Admin reads (`app/admin/products`, `app/admin/settings`, occasions picker) are unfiltered — owners need to see and edit their own drafts.

## 5. Admin write paths become draft writes

`app/admin/products/actions.ts`, `app/admin/settings/actions.ts`, `app/admin/settings/occasions/actions.ts`: creates/updates that touch the three in-scope models write `status: 'draft'` instead of leaving `status` at its default. (A brand-new row created via one of these actions starts as `draft`, not `published` — the schema default of `published` only exists to keep pre-existing rows live through the migration.)

## 6. Publish action

`publishChangesAction(input?: { force: boolean })` — new server action, colocated with the other admin actions (e.g. `app/admin/actions.ts`, shared across sections):

1. **Conflict pre-check** (skipped if `force: true`): find `Product` rows with `status: draft` for the tenant; for each, check for `OrderItem` rows referencing it whose parent `Order.status IN (pending, confirmed, shipped)`. If any exist, return `{ conflicts: [{ productName, openOrderCount }] }` **without publishing anything**.
2. **Publish**, in a single transaction: bulk-update `status: draft → published` across all three content tables for the tenant; count affected rows; insert one `PublishLog` row with a human-readable `summary` (e.g. "3 products, 1 occasion").
3. `revalidatePath` the admin pages and the storefront root so both reflect the change immediately.

No conflict → publishes directly (step 1 finds nothing, proceeds to step 2 in the same call).

## 7. Order-conflict confirmation UI

Triggered by *any* draft change to a product that has open orders — not just price changes, since a customer's order references the product as it existed at order time regardless of which field changed.

Flow: owner clicks **Publish** → `publishChangesAction()` (no `force`) → if `conflicts` comes back non-empty, show a confirmation dialog (reusing the existing `components/ui/dialog.tsx` primitive) listing the affected products and their open-order counts, with copy explaining that publishing may create a mismatch between what customers already ordered and the live listing. The owner must explicitly click **"Publish anyway"** to proceed — that re-invokes `publishChangesAction({ force: true })`, which publishes everything (not just the flagged products; this stays a single all-or-nothing publish, not per-item gating). Cancelling leaves everything in `draft`, unchanged.

Delivered/cancelled/returned orders never trigger this — only `pending`/`confirmed`/`shipped` count as "open."

## 8. UI wiring

A **Publish** button lives in `components/admin/admin-nav-shell.tsx` (shared admin chrome, visible from every admin page), showing a pending-count badge from `SELECT count(*)` across the three tables `WHERE status = 'draft' AND tenantId = ...`. Disabled when the count is 0.

`/welcome`'s new "Recent publishes" section queries the 5 most recent `PublishLog` rows for the tenant (`summary` + relative timestamp, e.g. "3 products, 1 banner — 2 hours ago").

## 9. Out of scope

- Per-item publish/discard (reverting a single draft field back to its published value before publishing). Drafts are edited in place; the only way to discard is to edit again.
- Scheduled/future-dated publishing.
- Publish history beyond the list on `/welcome` (no dedicated `/admin/publish-history` page).
- Multi-user conflict handling (two admins editing the same tenant's drafts simultaneously) — out of scope, matches this project's existing single-owner-per-tenant assumption.

## 10. Testing

- `publishChangesAction` — unit-test the conflict pre-check (open vs. settled orders) and the bulk-status-flip transaction, mocking Prisma. This is a money/data-integrity-adjacent path (order/product state), so it gets real test coverage per this project's convention.
- Storefront query filters (`status: 'published'`) — covered by existing `lib/data/*` tests if present; otherwise a small addition confirming draft rows are excluded.
- No automated test for the profile dropdown or the `/welcome` publishes list — pure UI/layout, matching this project's convention of testing money/security/auth-adjacent logic only.
