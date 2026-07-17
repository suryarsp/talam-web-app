# Phase 6: Platform Admin & Billing Implementation Plan — Data Track

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Track order:** This is a **Data-track** plan. Do not start it until every phase's UI-track plan (Phases 1–8) is complete. This file specifically depends on `2026-07-06-talam-phase-6-platform-ui.md` having been executed first (it builds `app/super-admin/layout.tsx`, `app/super-admin/page.tsx`, `app/super-admin/tenants/page.tsx`, and `app/super-admin/tenants/[id]/page.tsx` as mock-wired, guard-free surfaces, which Tasks 1–4 below wire to the real `requireSuperAdmin` guard, real cross-tenant Prisma data, and the tier-override Server Action).

**Goal:** Build the `requireSuperAdmin` platform-staff guard utility (env-var allow-list), the Prisma data layers for platform-wide stats and the tenant list, the tier-override Server Action, and swap the UI-track's mock fixtures for real data — adding the guard to the super-admin layout and every super-admin page the UI track built.

**Architecture:** A layout-level guard (`requireSuperAdmin`, `lib/super-admin-guard.ts`) checks the logged-in Supabase user's id against a static allow-list read from an env var — there is no `PlatformStaff`/role model in the schema, and unlike Phase 5's tenant-owner check (which compares against `Tenant.ownerId`), platform staff aren't tenants at all, so an allow-list is the only mechanism available without a schema migration (flagged in Known Gaps, not silently invented as a fake role table). Data reads use the bare `prisma` client directly (not `withTenant`) since platform admin intentionally queries **across** tenants — this is the one place in the codebase where cross-tenant queries are correct rather than a bug. Tier override is a Server Action gated by the same guard. Every data task follows the TDD cycle (failing test → implement → pass) then a wiring step that replaces the page's `MOCK_*` fixture with the real query and prepends `requireSuperAdmin` — the JSX built by the UI track is reused unchanged, only the data source and the guard change.

**Tech Stack:** Next.js App Router (SSR + Server Actions), Prisma (`lib/prisma.ts` — direct `prisma` export, not `withTenant`, for cross-tenant reads), `@supabase/ssr` session (`lib/supabase/server.ts`), Vitest.

## Global Constraints

- Inherit all prior phase constraints (multi-tenant via `x-tenant-id` header; `withTenant(tenantId, fn)` wraps every **tenant-scoped** Prisma call — but this phase's platform-wide queries are explicitly cross-tenant and use bare `prisma` instead, since there is no single tenant to scope to).
- All super-admin pages: `export const dynamic = 'force-dynamic'` (already set by the UI track; do not remove it while wiring).
- Auth/role guard: `requireSuperAdmin()` redirects unauthenticated users to `/auth?next={path}` and non-allow-listed users to `/` (mirrors Phase 5's silent-redirect convention for `requireOwner` — no "access denied" screen exists anywhere else in this codebase, so none is invented here either). The UI track deliberately shipped the super-admin layout and pages guard-free (mocked platform-staff state) so they could be verified without auth — this file's Task 1 and wiring steps are where the guard lands.
- Do not change the JSX structure, Tailwind classes, or copy the UI track shipped — each wiring step swaps the data source (`MOCK_*` fixture → real query result mapped into the same shapes), sets the real Server Action, and prepends the guard, nothing visual.
- `middleware.ts` (present in the repo today, lines 26–30) already rewrites `admin.{ROOT_DOMAIN}` → `/super-admin/*`. This plan does not touch `middleware.ts`.
- **No live Paper artboard exists for platform admin** (verified page-by-page against the live "Talam Design" file — see the UI-track sibling's Global Constraints for the full 6-page breakdown). No Paper lookups are needed in this track; all of that verification was done in the UI track.
- Money fields (`Order.total`) are Prisma `Decimal` — narrow to `number` via `Number(...)` before returning, matching every prior phase's convention.
- Schema reality check (`prisma/schema.prisma`, read directly): `Tenant` has `tier` (enum `trial | starter | pro`, default `trial`) and `trialEndsAt` (`DateTime?`) — both already present, no migration needed for tier display/override or trial-expiry detection. `Tenant` has **no** `billingStatus`, **no** `mrr`/subscription-amount field, and **no** relation to a `Subscription`/`Invoice`/`Payment` model — there is no billing-transaction history anywhere in the schema. `Order.paymentStatus` exists but is scoped to a tenant's own customer orders (storefront sales), not platform-to-tenant subscription billing — these are unrelated payment flows.
- Payment Provider Abstraction from Phase 3 (`lib/payments/{types,factory,razorpay}.ts` — `PaymentProvider` interface with `createOrder`/`verifyWebhook`, keyed off `tenant.paymentProvider`/`tenant.paymentConfig`) is **not reusable for platform subscription billing** even though both use Razorpay: Phase 3's abstraction is deliberately tenant-configured (a tenant's own customers pay the tenant), while platform billing would be Talam charging the *tenant* on a recurring schedule via Razorpay Subscriptions (a different Razorpay product, different API surface, different keypair — `TALAM_RAZORPAY_KEY_ID`/`TALAM_RAZORPAY_KEY_SECRET` already exist in `.env.example` for exactly this, distinct from any per-tenant `paymentConfig`). Actual recurring billing/webhook implementation is out of scope for this plan — see Known Gaps.
- Restart (not reload) the dev server after any Prisma/data-layer change, per this project's Preview Tool Glitches convention.

---

## Known Gaps (flagged, not silently invented)

- **No live Paper artboard for platform admin exists at all** (see Global Constraints for the pointer to the full page-by-page verification, done in the UI-track sibling). This breaks the "verify against live Paper pixel-for-pixel" methodology used by every other phase — there is nothing to pixel-match. The UI track's screens are instead built by reusing Phase 5's already-verified admin shell conventions applied to new content that has no Paper reference. If a Platform Admin Paper page is added later, the UI track's screens should be re-verified against it and adjusted.
- **Desktop-only, no mobile spec.** Since there is no Paper artboard at all (mobile or desktop), and platform admin is an internal ops tool typically used at a desk, this plan builds **desktop-only** (1440px), consistent with the instruction to not force a mobile spec where none exists. A basic responsive fallback (content reflows, no fixed-width overflow) is still expected via Tailwind's default responsive text/flex wrapping, but no dedicated mobile layout/nav is built.
- **No platform-staff role model in the schema.** There is no `PlatformStaff`, no `role` column on any user-like table, and no custom Supabase JWT claim configured anywhere in the repo (the old deleted plan assumed a `user.app_metadata.role === 'super_admin'` custom claim, but nothing in this repo sets that claim — no Supabase Auth Hook, no admin script). This plan uses a **static env-var allow-list** (`SUPER_ADMIN_EMAILS`, comma-separated) checked against the logged-in Supabase user's email — the simplest mechanism that requires no schema migration and no Supabase dashboard configuration outside `.env`. A real `PlatformStaff` table with roles/permissions is flagged as a future upgrade, not built here.
- **No billing/subscription schema.** `Tenant.tier` and `Tenant.trialEndsAt` exist (enough to *display* tier and detect trial expiry), but there is no subscription/invoice/payment-history model, no `Tenant.billingStatus`, and no MRR-relevant amount field anywhere. The old deleted plan hardcoded `TIER_PRICES = { starter: 499, pro: 1499 }` as a client-side constant to fake an MRR number — this plan does the same **only** for a "Est. MRR" stat card, explicitly labeled "Est." and computed from the hardcoded tier price map (see Task 2), not silently presented as a real billing figure. Actual Razorpay Subscriptions integration (recurring charge creation, webhook-driven tier upgrades, invoice history) is **not built** in this plan — it requires a schema migration (a `subscriptionId`/`billingStatus` field on `Tenant` at minimum) and is flagged here as the natural Phase 6.5/7 follow-up rather than half-built.
- **Tenant onboarding/approval:** the task brief mentions "tenant onboarding/approval" as platform-admin scope, but there is no `Tenant.status` field (e.g. `pending_approval | approved`) in the schema — every tenant created today is immediately live (Phase 1's tenant-creation flow, if/when it exists, has no approval gate to begin with). This plan does not invent an approval workflow or a status field; it exposes tier override and trial-status visibility (real schema fields) but not an approve/reject action, since there is nothing in the schema to approve or reject. Flagged as a gap rather than a fabricated workflow.
- **Confirmed (2026-07-17), traced through the owner signup flow end to end — RESOLVED same day:** this bullet originally found the tenant-creation flow missing entirely (no `prisma.tenant.create` anywhere, no post-OTP-verify redirect, no `isOnboarded` flag). As of commits `8473b1b`/`c72baee` (post-login routing) and `814a178`..`785940c` (onboarding v2 — schema flags, 7-step wizard with per-step Server Action persistence, Go Live wiring `is_onboarded=true`), the tenant-creation flow now exists end to end: `app/auth/callback/route.ts` routes a verified user to `/admin/onboarding` (no tenant / not onboarded) or their dashboard (onboarded); the wizard creates the `Tenant` row on Step 1 and persists every later step immediately, keyed by `ownerId`. The Notion row "Post-login routing…" (Phase 1) is now `Done`. **Still open:** the "Onboarding completion gate — mandatory settings check before storefront access" row (Phase 6) — `Tenant.isOnboarded` exists and gates nothing on the storefront side yet; no interstitial exists at `{store}.talam4shop.com` for an unfinished tenant. See `docs/2026-06-23-talam-design.md` §5.1 step 7.
- **Platform-wide analytics beyond tenant count / trial status / Est. MRR / 30-day GMV are not built.** Deeper analytics (cohort retention, churn, per-tenant revenue trends) would need either new aggregation queries against `Order` across all tenants (feasible today) or historical snapshots (not feasible without a new table) — this plan builds the four stats above (all computable from existing `Tenant`/`Order` fields today) and stops there, rather than inventing charts with no backing data.

---

### Task 1: Super Admin Auth Guard (Data)

**Files:**
- Create: `lib/super-admin-guard.ts`
- Create: `lib/super-admin-guard.test.ts`
- Modify: `.env.example` (add `SUPER_ADMIN_EMAILS`)
- Modify: `app/super-admin/layout.tsx` (add the guard call the UI track deliberately omitted)

**Interfaces:**
- Produces: `requireSuperAdmin(nextPath?: string)` → `Promise<{ email: string }>` or redirects

Not a UI task — no Paper step required. (The layout shell itself is the UI track's Task 1.)

- [ ] **Step 1: Add the env var**

Modify `.env.example` — add under the `SERVER ONLY` section, near the other Razorpay platform keys:
```
SUPER_ADMIN_EMAILS=
```
(Comma-separated list of Talam staff emails, e.g. `founder@talam.app,ops@talam.app`. Server-only — never prefixed `NEXT_PUBLIC_`, since leaking this list client-side would disclose who has platform access.)

- [ ] **Step 2: Write failing test for `requireSuperAdmin`**

Create `lib/super-admin-guard.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'staff-uuid', email: 'ops@talam.app' } },
        error: null,
      }),
    },
  })),
}))

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

import { requireSuperAdmin } from './super-admin-guard'

describe('requireSuperAdmin', () => {
  beforeEach(() => {
    vi.stubEnv('SUPER_ADMIN_EMAILS', 'ops@talam.app,founder@talam.app')
  })

  it('returns the email when it is on the allow-list', async () => {
    const result = await requireSuperAdmin()
    expect(result.email).toBe('ops@talam.app')
  })

  it('redirects when the allow-list env var is unset', async () => {
    vi.stubEnv('SUPER_ADMIN_EMAILS', '')
    const { redirect } = await import('next/navigation')
    await requireSuperAdmin()
    expect(redirect).toHaveBeenCalledWith('/')
  })
})
```

- [ ] **Step 3: Run test — verify it fails**

Run: `npm run test:run -- lib/super-admin-guard.test.ts`
Expected: FAIL with "Cannot find module './super-admin-guard'"

- [ ] **Step 4: Implement the guard**

Create `lib/super-admin-guard.ts`:
```typescript
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

function getAllowList(): string[] {
  return (process.env.SUPER_ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

// ponytail: static env-var allow-list rather than a PlatformStaff table + role
// column — there's no schema support for platform roles yet, and an allow-list
// is the smallest thing that works for a small internal team. Revisit if the
// Talam team grows past "everyone's email fits in one env var."
export async function requireSuperAdmin(nextPath?: string): Promise<{ email: string }> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    const suffix = nextPath ? `?next=${encodeURIComponent(nextPath)}` : ''
    redirect(`/auth${suffix}`)
  }

  const allowList = getAllowList()
  const email = user.email.toLowerCase()

  if (allowList.length === 0 || !allowList.includes(email)) {
    redirect('/')
  }

  return { email }
}
```

- [ ] **Step 5: Run test — verify it passes**

Run: `npm run test:run -- lib/super-admin-guard.test.ts`
Expected: PASS

- [ ] **Step 6: Wire the guard into the super-admin layout**

Modify `app/super-admin/layout.tsx` (built guard-free by the UI track with a mocked platform-staff state): make the component `async`, add
```tsx
import { requireSuperAdmin } from '@/lib/super-admin-guard'
```
and `await requireSuperAdmin()` as the first line of the component body. No JSX changes.

Start the dev server, verify that logged-out access to any `/super-admin/*` path redirects to `/auth?next=...`, a logged-in user not on `SUPER_ADMIN_EMAILS` is redirected to `/`, and an allow-listed user still sees the layout chrome unchanged.

- [ ] **Step 7: Commit**

```bash
git add app/super-admin/layout.tsx lib/super-admin-guard.ts lib/super-admin-guard.test.ts .env.example
git commit -m "feat: add super admin auth guard (email allow-list) and wire it into the layout"
```

---

### Task 2: Platform Overview Dashboard (Data)

**Files:**
- Create: `lib/data/platform-stats.ts`
- Create: `lib/data/platform-stats.test.ts`
- Modify: `app/super-admin/page.tsx` (built by the UI track — swap mocks for real data)

**Interfaces:**
- Consumes: `requireSuperAdmin`
- Produces: `getPlatformStats(): Promise<PlatformStats>` where:
  ```typescript
  type PlatformStats = {
    totalTenants: number
    trialTenants: number
    expiredTrialTenants: number
    paidTenants: number
    estMrr: number   // hardcoded tier-price map × paid tenant count — see Known Gaps
    gmv30d: number   // sum of Order.total across all tenants, last 30 days
  }
  ```

- [ ] **Step 1: Write failing test for `getPlatformStats`**

Create `lib/data/platform-stats.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    tenant: {
      findMany: vi.fn().mockResolvedValue([
        { tier: 'trial', trialEndsAt: new Date(Date.now() + 86400000) }, // active trial
        { tier: 'trial', trialEndsAt: new Date(Date.now() - 86400000) }, // expired trial
        { tier: 'starter', trialEndsAt: null },
        { tier: 'pro', trialEndsAt: null },
      ]),
    },
    order: {
      aggregate: vi.fn().mockResolvedValue({ _sum: { total: '48230.00' } }),
    },
  },
}))

import { getPlatformStats } from './platform-stats'

describe('getPlatformStats', () => {
  it('categorizes tenants by tier and trial status', async () => {
    const stats = await getPlatformStats()
    expect(stats.totalTenants).toBe(4)
    expect(stats.trialTenants).toBe(2)
    expect(stats.expiredTrialTenants).toBe(1)
    expect(stats.paidTenants).toBe(2)
  })

  it('computes estimated MRR from the hardcoded tier price map', async () => {
    const stats = await getPlatformStats()
    expect(stats.estMrr).toBe(499 + 1499)
  })

  it('sums 30-day GMV across all tenants', async () => {
    const stats = await getPlatformStats()
    expect(stats.gmv30d).toBe(48230)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

Run: `npm run test:run -- lib/data/platform-stats.test.ts`
Expected: FAIL with "Cannot find module './platform-stats'"

- [ ] **Step 3: Implement `getPlatformStats`**

Create `lib/data/platform-stats.ts`:
```typescript
import { prisma } from '@/lib/prisma'

export type PlatformStats = {
  totalTenants: number
  trialTenants: number
  expiredTrialTenants: number
  paidTenants: number
  estMrr: number
  gmv30d: number
}

// ponytail: hardcoded tier price map — there is no billing/subscription schema
// yet (see Known Gaps), so this is a stand-in "Est." figure, not real invoiced
// revenue. Replace with a real query once a subscription table exists.
const TIER_PRICES: Record<string, number> = { starter: 499, pro: 1499 }

export async function getPlatformStats(): Promise<PlatformStats> {
  const since = new Date()
  since.setDate(since.getDate() - 30)

  // Cross-tenant by design — this is platform admin, not a tenant-scoped
  // query, so it intentionally uses the bare `prisma` client rather than
  // `withTenant` (which would restrict to a single tenant's RLS scope).
  const [tenants, gmvAgg] = await Promise.all([
    prisma.tenant.findMany({ select: { tier: true, trialEndsAt: true } }),
    prisma.order.aggregate({ where: { createdAt: { gte: since } }, _sum: { total: true } }),
  ])

  const now = new Date()
  const trialTenants = tenants.filter((t) => t.tier === 'trial')
  const expiredTrialTenants = trialTenants.filter((t) => t.trialEndsAt && t.trialEndsAt < now)
  const paidTenants = tenants.filter((t) => t.tier !== 'trial')

  const estMrr = paidTenants.reduce((sum, t) => sum + (TIER_PRICES[t.tier] ?? 0), 0)

  return {
    totalTenants: tenants.length,
    trialTenants: trialTenants.length,
    expiredTrialTenants: expiredTrialTenants.length,
    paidTenants: paidTenants.length,
    estMrr,
    gmv30d: Number(gmvAgg._sum.total ?? 0),
  }
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `npm run test:run -- lib/data/platform-stats.test.ts`
Expected: PASS

- [ ] **Step 5: Wire real data into the page**

Modify `app/super-admin/page.tsx` (built by the UI track with `MOCK_STATS`):
```tsx
import { requireSuperAdmin } from '@/lib/super-admin-guard'
import { getPlatformStats } from '@/lib/data/platform-stats'

export const dynamic = 'force-dynamic'

export default async function SuperAdminOverviewPage() {
  await requireSuperAdmin('/super-admin')
  const stats = await getPlatformStats()

  const cards = [
    { label: 'Total Stores', value: String(stats.totalTenants) },
    { label: 'Trial', value: String(stats.trialTenants), sub: `${stats.expiredTrialTenants} expired` },
    { label: 'Paid (Starter/Pro)', value: String(stats.paidTenants) },
    { label: 'Est. MRR', value: `₹${stats.estMrr.toLocaleString('en-IN')}`, sub: 'starter ₹499 · pro ₹1,499' },
    { label: 'GMV (30d, all stores)', value: `₹${stats.gmv30d.toLocaleString('en-IN')}` },
  ]

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-fg">Platform Overview</h1>
      <div className="grid grid-cols-3 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border border-border bg-surface p-[14px]">
            <p className="mb-1 text-xs text-muted">{card.label}</p>
            <p className="text-2xl font-bold text-fg">{card.value}</p>
            {card.sub && <p className="mt-1 text-[11px] text-muted">{card.sub}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
```

Start the dev server, verify `/super-admin` renders real stats from the seeded `silk` tenant (and any others), verify a non-allow-listed or logged-out user is redirected.

- [ ] **Step 6: Commit the data wiring**

```bash
git add app/super-admin/page.tsx lib/data/platform-stats.ts lib/data/platform-stats.test.ts
git commit -m "feat: wire super admin overview to real cross-tenant Prisma stats"
```

---

### Task 3: Tenant List (Data)

**Files:**
- Create: `lib/data/platform-tenants.ts`
- Create: `lib/data/platform-tenants.test.ts`
- Modify: `app/super-admin/tenants/page.tsx` (built by the UI track — swap mocks for real data)

**Interfaces:**
- Consumes: `requireSuperAdmin`
- Produces: `getAllTenants(): Promise<PlatformTenantListItem[]>` where:
  ```typescript
  type PlatformTenantListItem = {
    id: string
    slug: string
    name: string
    tier: string
    trialEndsAt: Date | null
    isTrialExpired: boolean
    createdAt: Date
  }
  ```

- [ ] **Step 1: Write failing test for `getAllTenants`**

Create `lib/data/platform-tenants.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    tenant: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 't1',
          slug: 'silk',
          name: 'Meena Silks',
          tier: 'trial',
          trialEndsAt: new Date(Date.now() - 86400000),
          createdAt: new Date('2026-05-01'),
        },
      ]),
    },
  },
}))

import { getAllTenants } from './platform-tenants'

describe('getAllTenants', () => {
  it('flags expired trials', async () => {
    const tenants = await getAllTenants()
    expect(tenants[0].isTrialExpired).toBe(true)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

Run: `npm run test:run -- lib/data/platform-tenants.test.ts`
Expected: FAIL with "Cannot find module './platform-tenants'"

- [ ] **Step 3: Implement `getAllTenants`**

Create `lib/data/platform-tenants.ts`:
```typescript
import { prisma } from '@/lib/prisma'

export type PlatformTenantListItem = {
  id: string
  slug: string
  name: string
  tier: string
  trialEndsAt: Date | null
  isTrialExpired: boolean
  createdAt: Date
}

export async function getAllTenants(): Promise<PlatformTenantListItem[]> {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, slug: true, name: true, tier: true, trialEndsAt: true, createdAt: true },
  })

  const now = new Date()
  return tenants.map((t) => ({
    ...t,
    isTrialExpired: t.tier === 'trial' && !!t.trialEndsAt && t.trialEndsAt < now,
  }))
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `npm run test:run -- lib/data/platform-tenants.test.ts`
Expected: PASS

- [ ] **Step 5: Wire real data into the page**

Modify `app/super-admin/tenants/page.tsx` (the UI track's mock-wired page) — add `requireSuperAdmin()`, call `getAllTenants()`, derive each row's status pill from `tier`/`isTrialExpired`/`trialEndsAt` (reusing the same three-state logic as the mock: `isTrialExpired` → "Trial expired" / danger; `tier === 'trial'` and not expired → "Trial (N days left)" computed from `trialEndsAt - now` / amber; otherwise → capitalized tier / success), keep the same JSX/Tailwind structure the UI track shipped.

Start the dev server, verify `/super-admin/tenants` lists real seeded tenants with correct computed status.

- [ ] **Step 6: Commit the data wiring**

```bash
git add app/super-admin/tenants/page.tsx lib/data/platform-tenants.ts lib/data/platform-tenants.test.ts
git commit -m "feat: wire super admin tenant list to real cross-tenant Prisma data"
```

---

### Task 4: Tenant Detail + Tier Override (Data)

**Files:**
- Create: `app/super-admin/tenants/[id]/tier-override.tsx`
- Create: `app/super-admin/tenants/[id]/actions.ts`
- Create: `app/super-admin/tenants/[id]/actions.test.ts`
- Modify: `app/super-admin/tenants/[id]/page.tsx` (built by the UI track — swap mocks for real data + the Server Action)

**Interfaces:**
- Consumes: `requireSuperAdmin`
- Produces: Server Action `overrideTier(tenantId: string, tier: 'trial' | 'starter' | 'pro')` — gated by `requireSuperAdmin()`, updates `Tenant.tier` directly via bare `prisma` (cross-tenant operation, not `withTenant`), `revalidatePath`s both the detail and list pages.

- [ ] **Step 1: Write failing test for `overrideTier`**

Create `app/super-admin/tenants/[id]/actions.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/super-admin-guard', () => ({
  requireSuperAdmin: vi.fn(async () => ({ email: 'ops@talam.app' })),
}))

const updateMock = vi.fn().mockResolvedValue({})
vi.mock('@/lib/prisma', () => ({
  prisma: { tenant: { update: updateMock } },
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { overrideTier } from './actions'

describe('overrideTier', () => {
  it('updates the tenant tier', async () => {
    await overrideTier('tenant-1', 'pro')
    expect(updateMock).toHaveBeenCalledWith({ where: { id: 'tenant-1' }, data: { tier: 'pro' } })
  })

  it('rejects an invalid tier value', async () => {
    await expect(overrideTier('tenant-1', 'enterprise' as never)).rejects.toThrow('Invalid tier')
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

Run: `npm run test:run -- app/super-admin/tenants/[id]/actions.test.ts`
Expected: FAIL with "Cannot find module './actions'"

- [ ] **Step 3: Implement `overrideTier`**

Create `app/super-admin/tenants/[id]/actions.ts`:
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { requireSuperAdmin } from '@/lib/super-admin-guard'
import { prisma } from '@/lib/prisma'

const VALID_TIERS = new Set(['trial', 'starter', 'pro'])

export async function overrideTier(tenantId: string, tier: 'trial' | 'starter' | 'pro') {
  await requireSuperAdmin()

  if (!VALID_TIERS.has(tier)) throw new Error(`Invalid tier: ${tier}`)

  // Cross-tenant by design — platform admin overriding any tenant's tier,
  // not scoped to a single tenant's RLS context, so bare `prisma` is correct
  // here (not `withTenant`).
  await prisma.tenant.update({ where: { id: tenantId }, data: { tier } })

  revalidatePath(`/super-admin/tenants/${tenantId}`)
  revalidatePath('/super-admin/tenants')
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `npm run test:run -- app/super-admin/tenants/[id]/actions.test.ts`
Expected: PASS

- [ ] **Step 5: Wire real data + the Server Action into the page**

Create `app/super-admin/tenants/[id]/tier-override.tsx` (client component so the select can be controlled and the button can show a pending state — this replaces the UI track's inert select + button):
```tsx
'use client'

import { useState, useTransition } from 'react'
import { overrideTier } from './actions'

export function TierOverride({ tenantId, currentTier }: { tenantId: string; currentTier: string }) {
  const [tier, setTier] = useState(currentTier)
  const [isPending, startTransition] = useTransition()

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="mb-3 text-sm font-semibold text-fg">Override Tier</p>
      <div className="flex gap-3">
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value)}
          className="rounded-lg border border-border px-3 py-2 text-sm"
        >
          <option value="trial">Trial</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
        </select>
        <button
          onClick={() => startTransition(() => overrideTier(tenantId, tier as 'trial' | 'starter' | 'pro'))}
          disabled={isPending}
          className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-surface disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Apply'}
        </button>
      </div>
    </div>
  )
}
```

Modify `app/super-admin/tenants/[id]/page.tsx` (the UI track's mock-wired page):
```tsx
import { notFound } from 'next/navigation'
import { requireSuperAdmin } from '@/lib/super-admin-guard'
import { prisma } from '@/lib/prisma'
import { TierOverride } from './tier-override'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export default async function SuperAdminTenantDetailPage({ params }: Props) {
  await requireSuperAdmin()
  const { id } = await params

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    select: { id: true, slug: true, name: true, tier: true, trialEndsAt: true, createdAt: true },
  })
  if (!tenant) notFound()

  return (
    <div className="max-w-xl">
      <h1 className="mb-1 text-2xl font-bold text-fg">{tenant.name}</h1>
      <p className="mb-6 text-sm text-muted">{tenant.slug}.mytalam.com</p>

      <div className="mb-6 flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
        <div className="flex justify-between px-4 py-3">
          <span className="text-sm text-muted">Tier</span>
          <span className="text-sm font-semibold capitalize text-fg">{tenant.tier}</span>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="text-sm text-muted">Trial ends</span>
          <span className="text-sm font-semibold text-fg">
            {tenant.trialEndsAt ? tenant.trialEndsAt.toLocaleDateString('en-IN') : '—'}
          </span>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="text-sm text-muted">Created</span>
          <span className="text-sm font-semibold text-fg">{tenant.createdAt.toLocaleDateString('en-IN')}</span>
        </div>
      </div>

      <TierOverride tenantId={tenant.id} currentTier={tenant.tier} />
    </div>
  )
}
```

Start the dev server, verify `/super-admin/tenants/{real-seeded-tenant-id}` shows real facts, verify applying a tier override actually persists (reload confirms) and reflects on the `/super-admin/tenants` list.

- [ ] **Step 6: Commit the data wiring**

```bash
git add app/super-admin/tenants/[id]/
git commit -m "feat: wire super admin tenant detail to real data with tier-override Server Action"
```

---

## Post-Plan Verification

- [ ] Run the full test suite: `npm run test:run` — expect all tests (including this phase's 5 new test files) to pass.
- [ ] Run `npm run lint` — expect zero errors introduced by this phase's files.
- [ ] Manually click through `/super-admin` (Overview) → `/super-admin/tenants` (list) → `/super-admin/tenants/{id}` (detail, apply a tier override, confirm it reflects on reload and on the list). Confirm a non-allow-listed or logged-out user is redirected away from every `/super-admin/*` route.
- [ ] Confirm `SUPER_ADMIN_EMAILS` is set in the local `.env` (not just `.env.example`) before manual testing, with the tester's own Supabase-auth email included.
- [ ] Re-confirm no Platform Admin Paper page has been added since this plan was written — if one now exists, treat the UI track's screens as needing a fresh pixel-match pass rather than assuming its freehand layout is final.

---

## Self-Review

- **Spec coverage:** All 4 original Phase 6 tasks accounted for: Task 1 carries the full `requireSuperAdmin` TDD cycle (env var, test, implementation) plus a new explicit step wiring the guard into the layout the UI track shipped guard-free; Tasks 2–4 carry every data-layer TDD step, the Server Action, and the mock→real wiring step from the original verbatim. The original's Known Gaps section lives here in full.
- **Placeholder scan:** No `<name>`-style unresolved placeholders. Steps that say "keep the same JSX/Tailwind structure the UI track shipped" deliberately reference the sibling file's markup rather than duplicating it — that is the split's intent, not a stub; the exact markup lives in the UI-track file's Task steps. The hardcoded `TIER_PRICES` map and the absent billing/role/approval schema are flagged Known Gaps, not stubs.
- **Type consistency:** `PlatformStats`, `PlatformTenantListItem`, and the real `prisma.tenant.findUnique` shape match the `Mock*`/`MOCK_TENANT` fixtures the UI track shipped, and the `overrideTier(tenantId, tier)` Server Action signature matches the select/button field names in the UI track's inert control — so each wiring step is a data-source swap plus a guard/action prepend inside unchanged JSX.
- **Track discipline:** No new component markup, Tailwind classes, Paper lookups, or visual elements are introduced anywhere in this file — every wiring step reuses the exact JSX the UI track shipped, changing only the data source, the guard, and the Server Action. `app/super-admin/tenants/[id]/tier-override.tsx` is the one new component file, and it swaps in for the UI track's inert inline select/button with identical markup, only adding `useState`/`useTransition`/the real `overrideTier` call. Every other step writes `lib/super-admin-guard.ts`, `lib/data/*`, or a Server Action with a Vitest TDD cycle.
