# Versions Page Redesign — Design Spec

**Date:** 2026-07-26
**Status:** Approved
**Author:** Surya Prakash + Claude
**Scope:** Redesign `/admin/versions` to match the established admin visual language, add a date-range filter, and let an owner expand a publish to see which items changed.

**Builds on:** `docs/superpowers/specs/2026-07-18-profile-menu-and-publish-workflow-design.md`, which introduced the draft/publish workflow, `PublishLog`, and this page as a bare list. §9 of that spec explicitly left "publish history beyond the list on `/welcome`" and "per-item publish/discard" out of scope — this spec adds read-only per-item *viewing* on the dedicated `/admin/versions` page that already exists, which is a narrower ask than what was deferred.

**Out of scope (deferred, separate future projects):** Rollback to a prior version — needs full state snapshots captured at publish time and a decision on what's restorable, which is a project in its own right, not a page feature. Per-item publish/discard remains out of scope per the original spec.

## 1. Current state

`app/admin/versions/page.tsx` is a server component reading `listPublishLogs(tenantId)` (`lib/data/publish-logs.ts`) and rendering a bare desktop `<table>` / mobile card list. It already uses the real design tokens (`font-marketing`, `text-muted-warm`, `bg-surface`) but has none of the row treatment, section labeling, filtering, or interactivity established elsewhere in admin (`app/admin/dashboard/page.tsx`, `app/admin/orders/page.tsx`).

`PublishLog` (`prisma/schema.prisma`) stores only `publishedAt`, `itemCount`, and a coarse `summary` string (e.g. "3 products, store info, 1 occasion") — no record of *which* products or occasions changed. `publishChangesAction` (`app/admin/actions.ts`) builds that summary from bulk `updateMany` row counts; it never reads the draft rows' names before flipping their status.

## 2. Visual redesign

Match `admin-dashboard/page.tsx`'s established row conventions instead of the current bare table:

- Section label: `text-2xs font-medium uppercase tracking-[0.06em] text-muted-warm` reading "Publish History", replacing the current plain `<h1>`/subtitle pair (subtitle copy "Every publish is saved here — what changed, and when." stays, moved under the label).
- Each row gets a leading type icon reflecting its dominant change type — `Package` (products), `Store` (store info only), `PartyPopper` (occasions) — chosen from the row's `items` array (first item's type, since a row is one publish event that may mix types; picking the first keeps this simple rather than inventing a "mixed" icon).
- Rows become clickable (they expand — see §4) and get `hover:bg-bg` / `active:bg-bg` states, `cursor-pointer`, matching Orders' row treatment.
- Desktop keeps the table structure, mobile keeps cards — same responsive split as today (`hidden sm:block` / `sm:hidden`), just with the above treatment applied to both.
- Empty state gets an icon (`History`, matching the nav icon already used for this page in `admin-nav-shell.tsx`) above the existing "No versions published yet" copy, centered, matching the visual weight of empty states elsewhere (no other admin empty state exists yet to copy exactly, so this sets the pattern: icon in a muted circle + message).

## 3. Filtering

Preset pills — `All / This Week / This Month / Last 3 Months` — directly reusing Dashboard's time-filter pattern (`TABS` array + pill button styling: `rounded-full px-3 py-[5px] text-2xs font-semibold`, active = `bg-fg text-surface`). Filtering happens client-side against the already-fetched log list (the data set is small — publish events, not orders — so no server round-trip per filter click). No raw date-range inputs; this keeps the one filtering idiom the app already has rather than introducing a second one.

## 4. Item-level detail (expand a row)

Clicking a row toggles an expanded state showing the actual item list for that publish, e.g.:
```
• Cotton Kurta Set (product)
• Silk Banarasi Saree (product)
• Store info
• Diwali Sale (occasion)
```
Rendered as a simple indented list under the row, `text-xs text-muted-warm`, no new components — a conditionally-rendered block, matching how Dashboard/Orders handle inline expansion-style state today (local `useState`, no dialog/modal for this since it's low-stakes read-only info).

## 5. Data model

Add to `PublishLog` (`prisma/schema.prisma`):
```prisma
items Json @default("[]") @map("items")
```
Value shape: `{ type: 'product' | 'store_info' | 'occasion', name: string }[]`.

Chose a JSON column over a child table (`PublishLogItem`) — this data is read-only display content for one page, never queried or joined on individually, so a relational table would be unused flexibility. Existing rows get `[]` (migration default), so old publishes just show no expandable detail — acceptable since there's no way to reconstruct that history retroactively.

## 6. `publishChangesAction` change

Before the `$transaction([...updateMany calls...])` runs (which is when `status: draft` rows become unrecoverable as "the ones that just published"), fetch the draft rows' identifying info:
```ts
const [draftProducts, draftAbout, draftOccasions] = await withTenant(tenantId, (db) =>
  Promise.all([
    db.product.findMany({ where: { tenantId, status: 'draft' }, select: { name: true } }),
    db.storeAbout.findFirst({ where: { tenantId, status: 'draft' } }),
    db.productTag.findMany({ where: { tenantId, status: 'draft' }, select: { name: true } }),
  ])
)
```
Build `items` from these (products → `{ type: 'product', name }`, `draftAbout` truthy → single `{ type: 'store_info', name: 'Store info' }`, occasions → `{ type: 'occasion', name }`), pass alongside `summary`/`itemCount` into `PublishLog.create`. The existing conflict pre-check and `force` flow are unchanged; this only adds a read before the existing writes.

## 7. Interactivity — page becomes a client component

`app/admin/versions/page.tsx` converts to `'use client'`, matching `app/admin/dashboard/page.tsx` and `app/admin/orders/page.tsx`'s existing pattern. It fetches logs via a new server action (`getPublishLogsAction`, colocated in `app/admin/versions/actions.ts`, wrapping the existing `listPublishLogs`) on mount, and holds filter-pill and expanded-row-id state locally with `useState`. No URL search params, no page reloads — consistent with how the two other real-interaction admin pages already work.

## 8. Testing

`publishChangesAction`'s new item-capture logic gets a unit test (mocking Prisma) confirming the `items` JSON shape matches the draft rows present at publish time — this touches the same money/data-integrity-adjacent path the original spec already required tests for. No test for the page's pill-filtering or row-expand UI — pure display logic, matching this project's convention of testing money/security/auth-adjacent logic only.

## 9. Migration

New Prisma migration adding `items Json @default("[]")` to `publish_logs`. Per project convention (`[[DB Migration Gotchas]]`), run via the session-mode pooler; never `migrate reset` given pre-existing schema drift.
