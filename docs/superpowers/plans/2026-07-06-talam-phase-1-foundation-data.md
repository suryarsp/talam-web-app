# Phase 1: Foundation — Data Track

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.
>
> **Track order:** This is a **Data-track** plan. Do not start it until every phase's UI-track plan (Phases 1–8) is complete — see `README.md`. This file specifically depends on `2026-07-06-talam-phase-1-foundation-ui.md` Task 1 having been executed first, since Step 1 below only applies if that task's Paper pull revealed real dynamic content.

**Goal:** Wire any real data source the Phase 1 UI-track's Paper pull revealed for the marketing home. All other Phase 1 subsystems (Prisma schema, Supabase auth, middleware) are backend-only and were already implemented as part of the original Phase 1 build — see Task 0 of the UI-track plan for the file-by-file confirmation. There is no separate data work for them here; they are not UI screens and don't fit the UI/Data split.

**Tech Stack:** Next.js 16.2.10 (App Router), Prisma 7.8 (`@prisma/adapter-pg`), Vitest 4.

## Global Constraints

- Only proceed with Step 1 below if `2026-07-06-talam-phase-1-foundation-ui.md` Task 1 Step 1 (the live Paper pull) found real dynamic content (e.g. live tenant/order counts) on the marketing home artboard. If that artboard was static marketing copy only (the expected case for a "coming soon"-style page), this entire plan is a no-op — record that finding and stop.
- TDD required: write a failing test before implementation.

---

### Task 1: Wire marketing home highlights to real data (conditional)

**Files:**
- Create: `lib/data/<name>.ts` (name depends on what Paper actually showed, e.g. `lib/data/platform-highlights.ts`)
- Create: `lib/data/<name>.test.ts`
- Modify: `app/page.tsx` (swap the inline placeholder array from the UI-track plan for the real call)

**Interfaces:**
- Consumes: `lib/prisma.ts` (`withTenant` or a direct un-scoped query if this is platform-wide, not tenant-scoped — marketing home has no tenant context, so this must NOT use `withTenant`; use a direct `prisma.tenant.count()`/`prisma.order.count()` style aggregate instead)
- Produces: a typed function matching the `MarketingHighlight[]` shape defined in the UI-track plan's Step 3

- [ ] **Step 1: Confirm this task is needed**

Re-read the UI-track plan's Step 1 findings. If the artboard was static copy only, stop here — do not invent a data requirement.

- [ ] **Step 2: Write a failing test for the highlights fetch function**

```ts
// lib/data/<name>.test.ts
import { describe, it, expect, vi } from 'vitest'
import { getMarketingHighlights } from './<name>'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    tenant: { count: vi.fn().mockResolvedValue(52) },
    order: { count: vi.fn().mockResolvedValue(10432) },
  },
}))

describe('getMarketingHighlights', () => {
  it('returns tenant and order counts as highlight rows', async () => {
    const result = await getMarketingHighlights()
    expect(result).toEqual([
      { label: 'Tenants', value: '52+' },
      { label: 'Orders shipped', value: '10,432+' },
    ])
  })
})
```

Run `npx vitest run lib/data/<name>.test.ts` — confirm it fails (function doesn't exist yet).

- [ ] **Step 3: Implement `lib/data/<name>.ts`**

```ts
import { prisma } from '@/lib/prisma'

export type MarketingHighlight = {
  label: string
  value: string
}

export async function getMarketingHighlights(): Promise<MarketingHighlight[]> {
  const [tenantCount, orderCount] = await Promise.all([
    prisma.tenant.count(),
    prisma.order.count(),
  ])
  return [
    { label: 'Tenants', value: `${tenantCount}+` },
    { label: 'Orders shipped', value: `${orderCount.toLocaleString('en-IN')}+` },
  ]
}
```

- [ ] **Step 4: Run the test — confirm it passes**

`npx vitest run lib/data/<name>.test.ts`

- [ ] **Step 5: Wire the real call into `app/page.tsx`**

Replace the inline `highlights` array from the UI-track plan with `const highlights = await getMarketingHighlights()` (this makes `MarketingHome` an async server component, which it already is not — convert it).

- [ ] **Step 6: Build check and final verification**

`npx tsc --noEmit`. Restart the dev server (not just reload, per this project's Preview Tool Glitches convention after any data-layer change) and re-check the marketing home renders with real counts, zero console/network errors.

- [ ] **Step 7: Commit**

```bash
git add lib/data/<name>.ts lib/data/<name>.test.ts app/page.tsx
git commit -m "feat: wire marketing home highlights to live tenant/order counts"
```

---

## Self-Review

- **Spec coverage:** Single conditional task, gated correctly on the UI-track's findings — this plan does not fabricate a data requirement if none exists.
- **Placeholder scan:** `<name>` is a deliberate naming placeholder to be resolved once the UI-track's Paper pull names the actual content shown (a real implementer replaces it before writing files) — this is the only intentional placeholder, and it's flagged as such rather than left silent.
- **Type consistency:** `MarketingHighlight` type matches the UI-track plan's Step 3 shape exactly, so the swap in Step 5 is a drop-in replacement.
