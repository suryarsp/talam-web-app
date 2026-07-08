# Phase 6: Platform Admin & Billing Implementation Plan — UI Track

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Track order:** This is a **UI-track** plan — part of the front-end-first pass across all 8 phases. Do not start any phase's **Data-track** plan until every phase's UI-track plan is complete. See the sibling `2026-07-06-talam-phase-6-platform-data.md` for the `requireSuperAdmin` auth guard (`lib/super-admin-guard.ts`, env-var allow-list), the Prisma data layers (`lib/data/platform-stats.ts`, `lib/data/platform-tenants.ts`), the tier-override Server Action, and the real-data + guard wiring that follow this file.

**Goal:** Build the platform-level admin panel UI at the `/super-admin` route space — Talam's own internal team view for tenant oversight (list/detail, tier override, trial status) and a platform-wide stats dashboard (total tenants, active vs. trial-expired, GMV) — as mock-wired UI, served from `admin.{ROOT_DOMAIN}` via the existing middleware rewrite. This is the **platform** admin (Talam staff managing all tenants), NOT the tenant-owner `/admin` panel built in Phase 5 (one store owner managing their own store) — the two are separate route spaces, separate guards, and separate audiences. Auth guarding, Prisma queries, and the tier-override Server Action are out of scope for this file — see the Data-track sibling.

**Architecture:** `middleware.ts` already rewrites `admin.{ROOT_DOMAIN}` requests to `app/super-admin/*` (see Global Constraints — this rewrite exists today, pre-dating this plan). Every task in this file follows Design → Mock UI → Verify → Commit: build against typed mock data, verify visually, commit. **These are platform-staff-gated screens, but the UI track builds them WITHOUT the real `requireSuperAdmin` guard** (same convention Phase 4/5 used for their auth-gated pages): the layout and every super-admin page render an inline mocked platform-staff state — the `MOCK_*` fixtures below stand in for the logged-in staff member's cross-tenant view — so every screen can be verified on the dev server without a session or allow-list check. The Data-track sibling adds `requireSuperAdmin()` to the layout and pages when it swaps mocks for Prisma data.

**Tech Stack:** Next.js App Router (SSR), `components/ui/*` (shadcn/ui), Tailwind v4 with project tokens (`app/globals.css`), `lucide-react` icons. Reuses `--font-admin` and the brand/neutral token set Phase 5 wires into `app/globals.css` (no new tokens needed).

## Global Constraints

- Inherit all prior phase constraints as context, but do not write any Prisma, Server Action, API-route, or auth-guard code in this file — that is the Data-track's job. If a task needs a data shape that doesn't exist yet, mock it locally typed like the real shape and leave the real wiring to the Data-track sibling.
- All super-admin pages: `export const dynamic = 'force-dynamic'`.
- **No `requireSuperAdmin` calls in this track.** Platform-admin pages are staff-gated in the finished product, but in this file the layout and each page render mock fixture data — an inline mocked platform-staff state — so they render without a session. The Data-track sibling adds the guard and the `/auth?next={path}` / `/` redirect behavior. Do not add redirects, session reads, or `lib/super-admin-guard.ts` imports here.
- `middleware.ts` (present in the repo today, lines 26–30) already rewrites `admin.{ROOT_DOMAIN}` → `/super-admin/*`. This plan does not touch `middleware.ts` — it only builds what that rewrite points at. Verify this route still resolves correctly (Task 1, Step 2) rather than re-deriving it.
- **No live Paper artboard exists for platform admin.** Verified directly against the live file (team `Surya's Team`, file `Talam Design` id `01KVZYTDJNREHBACTQMT2D9HR9`): the file has exactly 6 pages — Store Front (`1-0`), Marketing (`8-0`, empty, 0 artboards), Checkout Flow (`7-0`), Design Library (`5-0`), Admin Dashboard (`4-0`, 22 artboards — this is entirely Phase 5's tenant-owner `/admin`), and Onboarding (`6-0`, 11 artboards — this is the **tenant** store-owner onboarding wizard, not a platform-staff flow). None of the 6 pages contains a tenant-list, platform-stats, billing, or platform-onboarding artboard. This is a hard gap, not a lookup miss — see Known Gaps for how this plan proceeds without it. Because there is nothing to pixel-match, **the verify step in every task below is "visually consistent with Phase 5's admin shell conventions (dark sidebar, `font-admin`, brand-primary accent, stat-card/table patterns), zero console/network errors"** rather than a Paper comparison.
- Design tokens reused as-is from Phase 5 (already documented in `app/globals.css` once Phase 5 lands): `--font-admin: system-ui, sans-serif`, `--color-brand-primary: #4F3FF0`, `--color-fg: #18181B`, `--color-muted: #8B7D7A`, `--color-border: #E8E8E8`, `--color-surface: #FFFFFF`, `--color-bg: #F9F9F9`, `--color-amber: #F59E0B`, `--color-danger: #EF4444`, `--color-success: #10B981`. No new tokens are introduced by this phase.
- `app/super-admin/layout.tsx` and `app/super-admin/page.tsx` already exist in the repo as bare stubs (`layout.tsx` is a passthrough `<>{children}</>`, `page.tsx` is a static `<h1>Super Admin</h1>`) — this plan **replaces both**, it does not scaffold from zero.
- **This plan assumes Phase 5 has landed** (its admin shell conventions are referenced throughout) but Phase 5 itself is plan-only as of this writing. If this track is executed before Phase 5's UI track, Task 1 below still stands on its own, but the visual parity with "Phase 5's admin shell" in Task 2 means: match whatever Phase 5 actually ships, re-verify visually rather than trusting this doc's prose description if drift has occurred.
- **Desktop-only, no mobile spec.** Since there is no Paper artboard at all (mobile or desktop), and platform admin is an internal ops tool typically used at a desk, this plan builds **desktop-only** (1440px). A basic responsive fallback (content reflows, no fixed-width overflow) is still expected via Tailwind's default responsive text/flex wrapping, but no dedicated mobile layout/nav is built.

---

## Known Gaps

See the sibling `2026-07-06-talam-phase-6-platform-data.md` for the full "Known Gaps" section (no live Paper artboard methodology note, no platform-staff role model in the schema, no billing/subscription schema — including the hardcoded `TIER_PRICES` map used for the "Est. MRR" stat card, no tenant onboarding/approval workflow, and the boundary of platform-wide analytics built here). Everything below builds around those gaps rather than inventing schema or workflows to fill them.

---

### Task 1: Super Admin Auth Guard and Layout Shell (UI)

**Files:**
- Modify: `app/super-admin/layout.tsx` (replace stub)

**Interfaces:**
- Produces: super admin layout — desktop dark sidebar nav (Overview / Tenants), reusing Phase 5's sidebar visual pattern

The `requireSuperAdmin` guard (`lib/super-admin-guard.ts` + Vitest test, plus the `SUPER_ADMIN_EMAILS` env var) is backend — all its steps live in `2026-07-06-talam-phase-6-platform-data.md` Task 1, which also wires `await requireSuperAdmin()` into this layout. **In this track the layout renders with an inline mocked platform-staff state — no guard call, no session read** — so the chrome can be verified without auth.

- [ ] **Step 1: Build the layout shell (no Paper reference — reuse Phase 5's sidebar pattern)**

Since no Paper artboard exists for this route space, this reuses Phase 5's already-verified admin sidebar structure (dark `#1F2937`, `font-admin`, brand-primary active state) with a 2-item nav instead of 4: Overview, Tenants.

Create `app/super-admin/layout.tsx` — **note: no `requireSuperAdmin` import or call; the layout renders as if platform staff is logged in (mocked state). The Data-track sibling's Task 1 adds `await requireSuperAdmin()` as the first line of this component.**
```tsx
import Link from 'next/link'
import { LayoutDashboard, Store } from 'lucide-react'

export const dynamic = 'force-dynamic'

const NAV = [
  { href: '/super-admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/super-admin/tenants', label: 'Tenants', icon: Store },
]

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-admin flex min-h-screen bg-bg">
      <aside className="flex h-screen w-[280px] shrink-0 flex-col items-start gap-2 bg-[#1F2937] pt-4 pl-4">
        <div className="mb-2 flex size-12 shrink-0 items-center justify-center rounded-lg bg-brand-primary">
          <span className="font-admin text-xl font-bold text-surface">●</span>
        </div>
        <p className="mb-1 px-4 text-2xs font-semibold uppercase tracking-wide text-[#6B7280]">Talam Platform</p>
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex w-[calc(100%-32px)] items-center gap-3 rounded-lg px-4 py-3 font-medium text-[#9CA3AF] hover:bg-[#4F3FF01A] hover:text-brand-primary"
          >
            <Icon className="size-6" strokeWidth={1.8} />
            <span className="text-md">{label}</span>
          </Link>
        ))}
      </aside>
      <div className="flex-1">
        <header className="flex h-[72px] items-center justify-between border-b border-[#E5E7EB] bg-surface px-8">
          <span className="text-[24px] font-bold text-[#111827]">talam. <span className="text-sm font-normal text-muted">platform</span></span>
        </header>
        <main className="p-8">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify the route resolves and the layout renders at 1440px**

Start dev server (`npm run dev`). The existing `middleware.ts` rewrites `admin.{ROOT_DOMAIN}` to `/super-admin/*` (confirm by reading `middleware.ts` lines 26–30 — this is pre-existing, not built by this task). For local dev without wildcard DNS, hit the route directly at `http://localhost:3000/super-admin` (the page still renders correctly since `app/super-admin/layout.tsx`/`page.tsx` are ordinary Next.js routes independent of the middleware rewrite — the rewrite only matters for the `admin.` subdomain in production/staging). Confirm the sidebar + header render with zero console errors at 1440px viewport width — visually consistent with Phase 5's admin shell conventions.

- [ ] **Step 3: Commit**

```bash
git add app/super-admin/layout.tsx
git commit -m "feat: add super admin layout shell with mock platform-staff state"
```

---

### Task 2: Platform Overview Dashboard (UI)

**Files:**
- Modify: `app/super-admin/page.tsx` (replace stub)

**Interfaces:**
- Produces: `/super-admin` page rendering a 5-card stat grid from typed mock data. The `MockStat` shape mirrors what the Data-track's `getPlatformStats` (`lib/data/platform-stats.ts`) will return, so the mock→real swap is a data-source replacement, not a rewrite.

- [ ] **Step 1: Build the overview page against mock data**

No Paper artboard exists for this screen (see Known Gaps) — this reuses Phase 5's dashboard stat-card visual pattern (`rounded-lg border border-border p-[14px]`, big value + label) applied to platform-wide numbers instead of per-tenant numbers, in a 3-column grid at desktop width.

Create `app/super-admin/page.tsx`:
```tsx
export const dynamic = 'force-dynamic'

type MockStat = { label: string; value: string; sub?: string }

const MOCK_STATS: MockStat[] = [
  { label: 'Total Stores', value: '18' },
  { label: 'Trial', value: '11', sub: '3 expired' },
  { label: 'Paid (Starter/Pro)', value: '7' },
  { label: 'Est. MRR', value: '₹6,986', sub: 'starter ₹499 · pro ₹1,499' },
  { label: 'GMV (30d, all stores)', value: '₹4,82,300' },
]

export default function SuperAdminOverviewPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-fg">Platform Overview</h1>
      <div className="grid grid-cols-3 gap-4">
        {MOCK_STATS.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border bg-surface p-[14px]">
            <p className="mb-1 text-xs text-muted">{stat.label}</p>
            <p className="text-2xl font-bold text-fg">{stat.value}</p>
            {stat.sub && <p className="mt-1 text-[11px] text-muted">{stat.sub}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify at 1440px**

Start dev server, navigate to `/super-admin`, confirm the 5-card grid renders cleanly with zero console/network errors — visually consistent with Phase 5's admin shell conventions. No mobile check needed (desktop-only per Known Gaps).

- [ ] **Step 3: Commit the mock UI**

```bash
git add app/super-admin/page.tsx
git commit -m "feat: add super admin overview UI with mock data (no Paper reference exists)"
```

---

### Task 3: Tenant List (UI)

**Files:**
- Create: `app/super-admin/tenants/page.tsx`

**Interfaces:**
- Produces: `/super-admin/tenants` page rendering a tenant table from typed mock data. The `MockTenant` shape mirrors what the Data-track's `getAllTenants` (`lib/data/platform-tenants.ts`) will return, so the mock→real swap is a data-source replacement, not a rewrite.

- [ ] **Step 1: Build the tenant list page against mock data**

No Paper artboard exists for this screen. This reuses Phase 5's admin list-row visual pattern (border-separated rows, `rounded-full` status pills) applied to a tenant table instead of a product/order list.

Create `app/super-admin/tenants/page.tsx`:
```tsx
export const dynamic = 'force-dynamic'

type MockTenant = { id: string; slug: string; name: string; tier: string; status: string; statusColor: string; createdAt: string }

const MOCK_TENANTS: MockTenant[] = [
  { id: 't1', slug: 'silk', name: 'Meena Silks', tier: 'trial', status: 'Trial (12 days left)', statusColor: 'bg-[#FB923C1A] text-[#92400E]', createdAt: '2 Jul 2026' },
  { id: 't2', slug: 'craftco', name: 'CraftCo Handicrafts', tier: 'starter', status: 'Starter', statusColor: 'bg-success-bg text-[#065F46]', createdAt: '18 Jun 2026' },
  { id: 't3', slug: 'oldstore', name: 'Old Store', tier: 'trial', status: 'Trial expired', statusColor: 'bg-[#FEF2F2] text-[#991B1B]', createdAt: '1 May 2026' },
]

export default function SuperAdminTenantsPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-fg">All Stores ({MOCK_TENANTS.length})</h1>
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-b border-border bg-bg px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">
          <span>Store</span>
          <span>Tier</span>
          <span>Status</span>
          <span>Created</span>
        </div>
        {MOCK_TENANTS.map((tenant) => (
          <a
            key={tenant.id}
            href={`/super-admin/tenants/${tenant.id}`}
            className="grid grid-cols-[2fr_1fr_1fr_1fr] items-center gap-4 border-b border-border px-4 py-4 last:border-b-0 hover:bg-bg"
          >
            <div>
              <p className="text-md font-semibold text-fg">{tenant.name}</p>
              <p className="text-xs text-muted">{tenant.slug}</p>
            </div>
            <span className="text-sm capitalize text-fg">{tenant.tier}</span>
            <span className={`w-fit rounded-full px-[10px] py-1 text-2xs font-semibold ${tenant.statusColor}`}>{tenant.status}</span>
            <span className="text-sm text-muted">{tenant.createdAt}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify at 1440px**

Start dev server, navigate to `/super-admin/tenants`, confirm the table header + rows render with correct status pill colors, zero console/network errors — visually consistent with Phase 5's admin shell conventions.

- [ ] **Step 3: Commit the mock UI**

```bash
git add app/super-admin/tenants/page.tsx
git commit -m "feat: add super admin tenant list UI with mock data (no Paper reference exists)"
```

---

### Task 4: Tenant Detail + Tier Override (UI)

**Files:**
- Create: `app/super-admin/tenants/[id]/page.tsx`

**Interfaces:**
- Produces: `/super-admin/tenants/[id]` page rendering a read-only facts panel + a tier-override select/button (inert in this track) from typed mock data. The `MOCK_TENANT` shape mirrors what the Data-track's real `prisma.tenant.findUnique` result will provide, and the field names line up with the Server Action's `overrideTier(tenantId, tier)` signature so the mock→real swap is a data-source + Server Action wiring, not a rewrite.

- [ ] **Step 1: Build the tenant detail page against mock data**

No Paper artboard exists for this screen. Reuses Phase 5's settings-page label/value row pattern for the read-only tenant facts, plus a simple select + button for the tier override (no schema-backed billing action exists beyond changing the `tier` enum itself). **In this track the "Apply" button is inert (no `onClick`/Server Action wiring)** — the Data-track sibling's Task 4 makes it interactive via `useTransition` + the `overrideTier` Server Action.

Create `app/super-admin/tenants/[id]/page.tsx`:
```tsx
export const dynamic = 'force-dynamic'

const MOCK_TENANT = {
  name: 'Meena Silks',
  slug: 'silk',
  tier: 'trial',
  trialEndsAt: '18 Jul 2026',
  createdAt: '2 Jul 2026',
}

export default function SuperAdminTenantDetailPage() {
  return (
    <div className="max-w-xl">
      <h1 className="mb-1 text-2xl font-bold text-fg">{MOCK_TENANT.name}</h1>
      <p className="mb-6 text-sm text-muted">{MOCK_TENANT.slug}.mytalam.com</p>

      <div className="mb-6 flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
        <div className="flex justify-between px-4 py-3">
          <span className="text-sm text-muted">Tier</span>
          <span className="text-sm font-semibold capitalize text-fg">{MOCK_TENANT.tier}</span>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="text-sm text-muted">Trial ends</span>
          <span className="text-sm font-semibold text-fg">{MOCK_TENANT.trialEndsAt}</span>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="text-sm text-muted">Created</span>
          <span className="text-sm font-semibold text-fg">{MOCK_TENANT.createdAt}</span>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="mb-3 text-sm font-semibold text-fg">Override Tier</p>
        <div className="flex gap-3">
          <select defaultValue={MOCK_TENANT.tier} className="rounded-lg border border-border px-3 py-2 text-sm">
            <option value="trial">Trial</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
          </select>
          <button className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-surface">Apply</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify at 1440px**

Start dev server, navigate to `/super-admin/tenants/anything` (mock data ignores the id at this stage), confirm the facts panel + override control render, zero console/network errors — visually consistent with Phase 5's admin shell conventions.

- [ ] **Step 3: Commit the mock UI**

```bash
git add app/super-admin/tenants/[id]/page.tsx
git commit -m "feat: add super admin tenant detail UI with mock data (no Paper reference exists)"
```

---

## Post-Plan Verification

- [ ] Run `npm run lint` — expect zero errors introduced by this track's files.
- [ ] Manually click through `/super-admin` (Overview) → `/super-admin/tenants` (list) → `/super-admin/tenants/{id}` (detail) at 1440px — all mock-rendered, no login required. Zero console/network errors on every page.
- [ ] Confirm no `lib/super-admin-guard.ts`, Prisma, or Server Action code exists yet from this track — that is the Data-track sibling's scope.

---

## Self-Review

- **Spec coverage:** All 4 original Phase 6 tasks accounted for: each carries its Design → Mock UI → Verify → Commit steps verbatim (mock fixtures, JSX/Tailwind, the "no Paper artboard" framing carried over exactly as the original stated it, not fabricated). The guard-build steps and the real-data wiring steps (Step B in the original's Tasks 2–4, and the guard/env-var steps of the original's Task 1) are pointed at the Data-track sibling rather than duplicated here.
- **Placeholder scan:** No `<name>`-style unresolved placeholders. The inert tier-override "Apply" button and the guard-free layout are explicitly flagged design decisions (mocked platform-staff state, matching the Phase 4/5 convention), not stubs.
- **Type consistency:** Each `Mock*` fixture mirrors the real shape its Data-track counterpart returns (`MockStat` ↔ `PlatformStats`, `MockTenant` ↔ `PlatformTenantListItem`, `MOCK_TENANT` ↔ the real `prisma.tenant.findUnique` result) so every mock→real swap in the sibling is a data-source replacement inside the same JSX, not a rewrite.
- **Track discipline:** No Prisma imports, Server Actions, API routes, `lib/data/*.ts` writes, or `lib/super-admin-guard.ts` imports appear anywhere in this file. The one structural deviation from the original combined plan is deliberate and stated: `app/super-admin/layout.tsx` ships without `await requireSuperAdmin()` (mocked platform-staff state) so every super-admin screen can be verified without auth — the Data-track sibling's Task 1 adds the guard call, mirroring exactly how Phase 5's UI track omitted `requireOwner()`.
