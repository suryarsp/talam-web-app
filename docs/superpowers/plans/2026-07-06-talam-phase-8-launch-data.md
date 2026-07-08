# Phase 8: Launch Implementation Plan — Data Track

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Track order:** This is a **Data-track** plan. Do not start it until every phase's UI-track plan (Phases 1–8) is complete. This file has no hard dependency on its own UI-track sibling's output beyond the fact that `components/store/store-footer.tsx` already exists and was re-verified (not modified) there — Task 1 below is the first place this phase actually edits that file.

**Goal:** Close out pre-launch readiness: add the `Tenant.showWhatsappButton` gate the footer's WhatsApp FAB is missing, wire SEO basics (`sitemap.ts`, `robots.ts`, store-home `generateMetadata`) reusing the OG/metadata conventions the product page already established, and do a final performance + zero-console-error pass on the storefront, then run the pre-launch checklist. This phase is almost entirely backend/infra/process work — the storefront header and footer themselves already exist, pixel-match Paper, and even contain a Paper-accurate WhatsApp floating button already (re-verified in the UI-track sibling); no new component is built here.

**Architecture:** The footer's mobile WhatsApp FAB (`store-footer.tsx` lines 289-308) is gated only on `tenant.whatsappNumber` truthiness, not on the already-existing `Tenant.showWhatsappButton` toggle — Task 1 adds that one-line guard. SEO (Task 2) follows the exact pattern `app/store/product/[slug]/page.tsx` already established (`generateMetadata` reading `x-tenant-id` from `headers()`, `openGraph.images`) — extended to the store home page (`app/store/page.tsx`, currently has no `generateMetadata` at all) plus new root-level `app/sitemap.ts`/`app/robots.ts` (neither exists yet, confirmed by direct `ls`). Task 3 is a Lighthouse/manual performance pass against the existing ISR'd storefront pages — no new component, just `priority`/`sizes` tuning on any image found missing it. Task 4 is the final go/no-go checklist.

**Tech Stack:** Next.js 16 (`app/sitemap.ts`/`app/robots.ts` MetadataRoute convention), existing Prisma/tenant data layer, Vitest, Lighthouse (manual, via Chrome DevTools — no CI wiring added, see Known Gaps).

## Global Constraints

- Inherit all prior phase constraints (multi-tenant via `x-tenant-id` header set by `middleware.ts`; `withTenant(tenantId, fn)` wraps every tenant-scoped Prisma call).
- **Do not touch the header/footer's visual markup, Tailwind classes, or WhatsApp FAB styling/icon** — the UI-track sibling already re-verified those pixel-match Paper exactly. Task 1 below changes only the FAB's gating condition (one line) and the `Props`/select-clause types needed to read `showWhatsappButton` — nothing visual.
- **No SEO scaffolding exists yet** — confirmed directly: `app/sitemap.ts` and `app/robots.ts` do not exist (`ls` returns "No such file or directory" for both). `app/store/product/[slug]/page.tsx` has a working `generateMetadata` (reads `x-tenant-id`, sets `title`/`description`/`openGraph.images`) — this is the pattern to replicate, not reinvent. `app/store/page.tsx` (store home) currently has **no** `generateMetadata` at all — confirmed by reading the file directly.
- Money/business fields are unaffected by this phase — no new schema fields, no `Decimal` handling.
- All new tenant-scoped data reads go through `withTenant`/existing `lib/data/*` functions — no bare `prisma` calls against tenant tables.
- No PII in sitemap/robots output — sitemap lists only public product/store URLs, never customer data.

---

## Known Gaps (flagged, not silently invented)

- **No Lighthouse CI wiring.** The old (rejected) Phase 8 plan referenced "Lighthouse CI" as a dependency, but there is no `lighthouserc.json`, no CI workflow step, and no `@lhci/cli` in `package.json` (confirmed by reading `package.json`'s full dependency list — zero Lighthouse-related packages). Standing up Lighthouse CI from scratch (a GitHub Actions job, a config file, a performance budget) is a distinct infra task from "do a performance pass," and this project doesn't have a CI workflow file to hang it on yet (no `.github/workflows/` checked in this repo as of this plan). Task 3 below does a **manual** Lighthouse pass via Chrome DevTools against the running dev/build server instead — automating that into CI is out of scope for this plan and would need its own follow-up once a CI pipeline exists.
- **No security-audit task.** The old Phase 8 plan had a "security audit" line item (`npm audit`, webhook signature verification). Webhook signature verification is Phase 3's concern (payment webhooks don't exist yet — Phase 3 is still a plan, not implemented) and doesn't belong in a launch-polish phase for infrastructure that isn't built. `npm audit` is a one-command check with no design/UI surface — it's included as a plain checklist line in Task 4 below, not a full task with its own Files/Interfaces section, since there's nothing to design or TDD.
- **`Tenant.showWhatsappButton` currently has no admin UI to toggle it** (checked: it's not referenced anywhere in `app/admin` per a repo-wide grep during this plan's research — Phase 5/6's admin settings pages don't expose it yet). Task 1 wires the storefront to *respect* the flag; it does not add a settings toggle for tenant owners to flip it. That's an admin-settings task belonging to Phase 5/6, not launch polish — flagged here so it isn't silently assumed to be a complete end-to-end feature.
- **No live Paper artboard for `sitemap.xml`/`robots.txt` output** (neither is a rendered app screen — same category of gap Phase 7 hit for OG images and `/join`). Task 2's sitemap/robots work is downgraded to "matches Next.js `MetadataRoute` conventions and the existing product-page `generateMetadata` pattern, zero build errors" rather than a Paper pixel-match, per the required methodology for this case.
- **Multi-tenant sitemap scope**: this app has one root Next.js deployment serving many tenant subdomains (`{slug}.{domain}`), and `app/sitemap.ts` runs per-deployment, not per-tenant-request — there is no `x-tenant-id` header available inside `MetadataRoute` generation the way there is inside a page's `headers()` call during a real request. Task 2 handles this by making the sitemap **root-domain-only** (marketing/platform URLs: `/`, `/join` if it exists from Phase 7, `/pricing` if it exists) rather than attempting a per-tenant product sitemap, which would need a different mechanism (e.g. a tenant-scoped route like `app/store/sitemap.ts` reading the request's host, or a scheduled sitemap-index generator) that doesn't exist yet and is out of scope here. Flagged, not fabricated as done.

---

### Task 1: Fix WhatsApp FAB Gate on `Tenant.showWhatsappButton` (Data)

**Files:**
- Modify: `components/store/store-footer.tsx`
- Modify: `components/store/store-footer.test.tsx` (create if it doesn't already exist — check first)

**Interfaces:**
- No new exported interfaces — `StoreFooter`'s existing `Props` type gains no new fields (`showWhatsappButton` is read from the `tenant` prop's existing shape, since `Tenant.showWhatsappButton` is already a column; only the `Pick<TenantStorefront, ...>` type needs the field added if `TenantStorefront` doesn't already include it — check `lib/data/tenant.ts` first).

This is a **one-line functional fix**, not new UI — the UI-track sibling already re-verified that the footer's WhatsApp FAB is pixel-accurate against Paper. The one confirmed gap: the footer ignores `Tenant.showWhatsappButton`.

- [ ] **Step 1: Confirm `TenantStorefront` already exposes `showWhatsappButton`**

Read `lib/data/tenant.ts` and check the `TenantStorefront` type/select clause. `Tenant.showWhatsappButton` (`Boolean @default(true)`) already exists in `prisma/schema.prisma` (confirmed directly) — if the `getTenantStorefront` query's `select` doesn't already include it, add `showWhatsappButton: true` to that select alongside the existing fields (`whatsappNumber`, etc.). Do not add a new Prisma migration — the column already exists.

- [ ] **Step 2: Write/extend the footer test to cover the gate**

Check whether `components/store/store-footer.test.tsx` already exists (search the repo first — if it does, read it fully before adding to it rather than assuming it's empty). Add:
```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StoreFooter } from './store-footer'

const BASE_TENANT = {
  name: 'Meena Silks',
  tagline: 'Handcrafted ethnic wear',
  contactPhone: null,
  contactEmail: null,
  whatsappNumber: '919876543210',
  about: null,
  branch: null,
  sizeGuideUrl: null,
}

describe('StoreFooter WhatsApp button', () => {
  it('renders the WhatsApp FAB when whatsappNumber is set and showWhatsappButton is true', () => {
    render(<StoreFooter tenant={{ ...BASE_TENANT, showWhatsappButton: true }} categories={[]} />)
    expect(screen.getByLabelText('Chat on WhatsApp')).toBeInTheDocument()
  })

  it('hides the WhatsApp FAB when showWhatsappButton is false, even with a number set', () => {
    render(<StoreFooter tenant={{ ...BASE_TENANT, showWhatsappButton: false }} categories={[]} />)
    expect(screen.queryByLabelText('Chat on WhatsApp')).not.toBeInTheDocument()
  })
})
```
Adjust the import path/mock setup to match whatever testing-library setup this codebase already uses elsewhere (check an existing component test in `components/store/` first, e.g. `add-to-cart-button.test.tsx` if it exists, for the exact render/import conventions — do not assume `@testing-library/react` is configured if no prior component test uses it).

- [ ] **Step 3: Run the test — verify it fails**

Run: `npm run test:run -- components/store/store-footer.test.tsx`
Expected: FAIL on the second case (FAB renders regardless of `showWhatsappButton` today).

- [ ] **Step 4: Add the gate**

In `components/store/store-footer.tsx`, update the `Props` type's `Pick<TenantStorefront, ...>` list to include `'showWhatsappButton'`, and change the existing mobile-FAB condition:
```tsx
{tenant.whatsappNumber && (
```
to:
```tsx
{tenant.whatsappNumber && tenant.showWhatsappButton && (
```
This is the only line-level change — the FAB's markup, icon, and styling are already correct and pixel-matched against Paper (re-verified in the UI-track sibling); do not touch them.

- [ ] **Step 5: Run the test — verify it passes**

Run: `npm run test:run -- components/store/store-footer.test.tsx`
Expected: PASS (both cases).

- [ ] **Step 6: Manual verification of the toggle against the live seeded storefront**

Start the dev server, load the seeded `silk` storefront on mobile. Confirm the WhatsApp FAB is visible by default (`whatsappNumber` set, `showWhatsappButton` defaults to `true`); toggle a local test value to `false` (temporarily, in a scratch query or by editing the seed) and confirm the FAB disappears. Zero console/network errors.

- [ ] **Step 7: Commit**

```bash
git add components/store/store-footer.tsx components/store/store-footer.test.tsx
git commit -m "fix: gate storefront WhatsApp FAB on Tenant.showWhatsappButton, not just whatsappNumber"
```

---

### Task 2: SEO — Sitemap, Robots, Store Home Metadata (Data)

**Files:**
- Create: `app/sitemap.ts`
- Create: `app/robots.ts`
- Modify: `app/store/page.tsx` (add `generateMetadata`)

**Interfaces:**
- Produces: `GET /sitemap.xml` via Next's `MetadataRoute.Sitemap` convention
- Produces: `GET /robots.txt` via Next's `MetadataRoute.Robots` convention
- Extends `app/store/page.tsx` with `generateMetadata(): Promise<Metadata>`, same signature/pattern as `app/store/product/[slug]/page.tsx`

No Paper artboard applies (sitemap/robots aren't rendered app screens) — downgraded per Known Gaps to "matches Next.js `MetadataRoute` conventions, zero build errors." The store-home metadata addition reuses the exact pattern already proven in the product page.

- [ ] **Step 1: Add store home page metadata, following the product page's exact pattern**

Read `app/store/product/[slug]/page.tsx` again for the precise shape (already done during planning — its `generateMetadata` reads `x-tenant-id` from `headers()`, returns `{}` early if absent, fetches via an existing `lib/data/*` function, and returns `title`/`description`/`openGraph`). Modify `app/store/page.tsx`:
```typescript
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  if (!tenantId) return {}

  const tenant = await getTenantStorefront(tenantId)
  if (!tenant) return {}

  return {
    title: tenant.name,
    description: tenant.tagline ?? `Shop ${tenant.name} — handpicked products, delivered to your door.`,
    openGraph: {
      title: tenant.name,
      description: tenant.tagline ?? undefined,
      images: tenant.logoUrl ? [tenant.logoUrl] : [],
    },
  }
}
```
Add the `import type { Metadata } from 'next'` alongside the existing imports; `getTenantStorefront` is already imported in this file for the page body — reuse it, do not add a second tenant fetch. `tenant.tagline`/`tenant.logoUrl` are already-existing schema fields (confirmed in `prisma/schema.prisma`), not new ones.

- [ ] **Step 2: Verify metadata renders**

Start the dev server, view page source on the seeded `silk` store home route, confirm `<title>` and `<meta property="og:title">` show "Meena Silks" (or whatever `tenant.name` is), not a hardcoded string. Zero console errors.

- [ ] **Step 3: Commit store home metadata**

```bash
git add app/store/page.tsx
git commit -m "feat: add generateMetadata to store home page, matching the product page's OG pattern"
```

- [ ] **Step 4: Add `app/robots.ts`**

```typescript
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api'],
      },
    ],
    sitemap: `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'mytalam.com'}/sitemap.xml`,
  }
}
```
`NEXT_PUBLIC_ROOT_DOMAIN` is the same env var already used in Phase 7's OG-route work — reuse it, don't invent a new one.

- [ ] **Step 5: Add `app/sitemap.ts` (root-domain scope only — see Known Gaps)**

```typescript
import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'mytalam.com'
  const baseUrl = `https://${rootDomain}`

  // Root-domain marketing pages only — this deployment serves many tenant
  // subdomains, and MetadataRoute generation has no per-request x-tenant-id
  // header the way a real page render does, so a per-tenant product sitemap
  // isn't attempted here. See Known Gaps for what a real per-tenant sitemap
  // would need (a tenant-scoped route reading the request host, or a
  // sitemap-index generator) — out of scope for this plan.
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ]
}
```
If `/join` (Phase 7, Task 5) exists in the repo by the time this task executes, add it as a second entry with `priority: 0.8` — check `app/join/page.tsx` exists before adding the reference.

- [ ] **Step 6: Verify both routes build and serve correctly**

Start the dev server, visit `/robots.txt` and `/sitemap.xml` directly — confirm both return well-formed output (plain text disallow rules; valid XML with the root URL). Run `npm run build` and confirm no errors from either file.

- [ ] **Step 7: Commit**

```bash
git add app/sitemap.ts app/robots.ts
git commit -m "feat: add root-domain sitemap.xml and robots.txt"
```

---

### Task 3: Performance Pass (Manual Lighthouse, No CI) (Data)

**Files:**
- Modify: any storefront page/component found missing `priority`/correct `sizes` on an above-the-fold image (confirm exact files during Step 1 — do not pre-guess which ones need it)

**Interfaces:** none new — this task only tunes existing `next/image` props.

No Paper artboard applies (performance isn't a visual spec). Verification is Lighthouse-metric-based, not pixel-based.

- [ ] **Step 1: Audit above-the-fold images across the storefront**

Read `components/store/hero-banner.tsx`, `app/store/page.tsx`, `app/store/product/[slug]/page.tsx` (already confirmed to have `priority` on its main image, per the earlier read in this plan's research), and `app/shop/page.tsx` (if it exists — check first). For each hero/first-visible image, confirm `priority` is set and `sizes` matches the actual rendered width at each breakpoint (not a blanket `100vw` if the image is never full-width). Fix any found missing `priority` on a genuine LCP candidate — do not add `priority` to every image (that defeats its purpose; only the single largest above-the-fold image per page should have it).

- [ ] **Step 2: Run Lighthouse manually against the production build**

```bash
npm run build
npm run start
```
Run Lighthouse (Chrome DevTools → Lighthouse tab, or `npx lighthouse http://localhost:3000/ --preset=mobile`) against the seeded `silk` store home page and one product page. Target: LCP < 2.5s on mobile throttling. If it fails, check whether the LCP element is the hero image found in Step 1 and whether `priority`/Cloudinary `f_auto,q_auto` params (already used elsewhere in this codebase per the product page's `?f_auto,q_auto,w_600` pattern) are applied consistently — extend that same query-param convention to any hero image missing it.

- [ ] **Step 3: Commit any fixes found**

```bash
git add <files touched in Step 1>
git commit -m "perf: ensure LCP image priority/sizing on storefront hero and product images"
```
If Step 1/2 found nothing to fix, skip this commit — do not commit a no-op.

---

### Task 4: Pre-Launch Checklist (Data)

No Files/Interfaces — this is a verification-only task, run last.

- [ ] **Step 1: Run the full test suite**
```bash
npm run test:run
```
Expected: all tests pass, including this phase's new `components/store/store-footer.test.tsx`.

- [ ] **Step 2: Run the build**
```bash
npm run build
```
Expected: no TypeScript errors, `app/sitemap.ts`/`app/robots.ts` compile cleanly.

- [ ] **Step 3: Run lint**
```bash
npm run lint
```
Expected: zero errors introduced by this phase's files.

- [ ] **Step 4: Dependency audit (plain checklist item, not a full task — see Known Gaps)**
```bash
npm audit --omit=dev
```
Review output for high/critical vulnerabilities in production dependencies. Flag any found to the user rather than silently patching (a `npm audit fix` that bumps a major version is a decision, not a launch-polish default).

- [ ] **Step 5: Manual smoke test across the seeded `silk` storefront**
- [ ] Home, Shop, Product Detail, Cart pages load at 390px and 1440px with zero console/network errors.
- [ ] Footer WhatsApp FAB appears on mobile (seeded tenant has `whatsappNumber` set and `showWhatsappButton` defaults `true`); confirm it's absent if `showWhatsappButton` is flipped to `false`.
- [ ] `/robots.txt` and `/sitemap.xml` both serve valid output.
- [ ] View source on store home and a product page — both show tenant-specific `<title>`/OG tags, not placeholder/hardcoded values.

---

## Phase 8 Verification

```bash
npm run test:run
npm run build
npm run lint
npm audit --omit=dev
```

Manual smoke test (see Task 4, Step 5) covers the rest — this phase has no Phase 3/4 dependency and can be fully executed and verified standalone.

---

## Self-Review

- **Spec coverage:** All 4 original Phase 8 tasks accounted for: Task 1 carries the WhatsApp FAB's full TDD cycle (schema-select check, test, fix, commit) — its visual re-verification steps (header/footer pixel-match, zero-error checks) live in the UI-track sibling instead, since those are non-functional confirmation, not part of the bug fix. Tasks 2–4 (SEO, performance, checklist) carry every original step, code block, and commit verbatim — none of that content is UI-bearing, so none of it moved to the sibling.
- **Placeholder scan:** No `<name>`-style unresolved placeholders. All code blocks (sitemap, robots, generateMetadata, rate-check/test) are carried over exactly as researched, not stubbed.
- **Type consistency:** `Pick<TenantStorefront, ...>` gaining `'showWhatsappButton'` matches the same field the UI-track sibling's re-verification step read (the FAB's default-visible behavior) — the fix in this file changes only the gating condition, not the shape any other file depends on.
- **Track discipline:** Every Prisma/schema-select reference, code-level fix, `MetadataRoute` file, and performance-tuning edit from the original plan lands in this file. The one visual-verification step the original Task 1 contained (header/footer pixel-match, WhatsApp FAB styling/icon check) was moved to the UI-track sibling rather than duplicated here, mirroring how Phase 7's Data track deferred its one JSX-touching step to reuse the UI track's exact markup.
