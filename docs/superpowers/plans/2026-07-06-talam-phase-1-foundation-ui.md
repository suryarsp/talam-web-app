# Phase 1: Foundation — UI Track

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Track order:** This is a **UI-track** plan — part of the front-end-first pass across all 8 phases. Do not start any phase's **Data track** plan until every phase's UI track is complete. See `README.md` for the full two-track execution order.

**Goal:** Confirm Phase 1's non-visual foundation work (Next.js scaffold, Prisma schema, Supabase auth, multi-tenant middleware, OTP + Google login) is complete, then rebuild the one visual surface it produced — the root marketing layout and home page — against the live Paper artboard using mock/static data only.

**Architecture:** No new subsystems. This plan audits Phase 1's existing code against the original plan, records what shipped and where, then runs a single design-parity task on `app/layout.tsx` + `app/page.tsx`. No backend/data wiring happens in this file — see the sibling `2026-07-06-talam-phase-1-foundation-data.md` for that (likely a no-op, see Known Gaps).

**Tech Stack:** Next.js 16.2.10 (App Router), TypeScript, Tailwind CSS 4, Prisma 7.8 (`@prisma/adapter-pg`), Supabase (`@supabase/ssr` 0.12), Vitest 4.

## Global Constraints

- Do not re-implement anything listed as done in Task 0 below — this plan only adds new verification work.
- Paper is ground truth for any UI change, not `docs/2026-06-23-talam-design.md`.
- Any UI diff found in Task 1 must be pixel-matched at 390px and 1440px against the live Paper artboard before being considered fixed.
- Zero console/network errors on the page under test, checked via dev-server preview before committing.
- This plan produces exactly one commit (the UI change). No data/API work happens here.

---

### Task 0: Phase 1 Status — Already Complete

No steps. This is a record of what the original plan (`git show 8acc628:docs/superpowers/plans/2026-06-23-talam-phase-1-foundation.md`) asked for and what exists in the repo today, confirmed by reading the files directly on 2026-07-06.

| # | Original task | Status | Where it lives |
|---|---|---|---|
| 1 | Project Initialization | Done | `package.json` (Next 16.2.10, React 19.2.4, Tailwind 4, Vitest 4), `next.config.ts`, `vitest.config.ts`, `.env.example` |
| 2 | Prisma Schema & Database | Done | `prisma/schema.prisma` (276 lines: `Tier`, `PaymentProvider`, `OrderStatus`, `PaymentStatus`, `DiscountType` enums plus tenant/product/order models), `prisma/migrations/`, `lib/prisma.ts` (`withTenant()` helper sets `app.tenant_id` via `SET_CONFIG` for RLS, `lib/prisma.test.ts`) |
| 3 | Supabase Clients | Done | `lib/supabase/client.ts` (8 lines, browser client), `lib/supabase/server.ts` (27 lines, server client with cookie handling), `lib/supabase/admin.ts` (17 lines, service-role client used by `lib/tenant.ts`), `lib/supabase/middleware.ts` (32 lines, `updateSession()`), `lib/supabase/client.test.ts` |
| 4 | Multi-Tenant Middleware | Done | `middleware.ts` (53 lines) — strips port from `host`, calls `updateSession()`, rewrites `admin.<ROOT_DOMAIN>` to `/super-admin/*`, resolves subdomain via `lib/tenant.ts:getTenantBySlug()` and rewrites to `/store/*` with `x-tenant-id`/`x-tenant-tier` headers, 404s unknown tenants; `lib/tenant.ts`, `lib/tenant.test.ts` |
| 5 | Auth Flow (OTP + Google) | Done | `app/store/auth/page.tsx` (45 lines: `OtpForm`, `GoogleButton`, `BackButton`, `Logo` components), `app/store/auth/callback/route.ts` (OAuth callback handler); MSG91 SMS hook Edge Function code exists but deploy is credential-gated (needs `supabase login`/`link` — not scriptable headlessly) |
| 6 | Root Layout & Marketing Home | Done, but placeholder content | `app/layout.tsx` (46 lines: Geist/Playfair/DM Sans fonts, metadata, html/body shell), `app/page.tsx` (11 lines: centered "Talam — Coming soon" placeholder), `app/not-found.tsx` |

**Deviations from the original plan** (already recorded in project memory `project-talam-plans.md`, restated here for anyone reading only this file):
- **Prisma 7.8, not 5.x**: datasource `url`/`directUrl` moved out of `schema.prisma` into `prisma.config.ts` (`defineConfig({ datasource: { url: env('DATABASE_URL') } })`), which requires `import 'dotenv/config'` at the top or `env()` throws `PrismaConfigEnvError`. `lib/prisma.ts` also now uses `@prisma/adapter-pg`'s `PrismaPg` adapter rather than a bare connection string.
- **Vitest 4 mock style**: `PrismaClient` mocks must be a `class`, not `vi.fn(() => ({...}))`, or `new PrismaClient(...)` throws "is not a constructor."
- **`postinstall: prisma generate`** was added to `package.json` to stop `tsc` failing with "no exported member 'PrismaClient'" after a fresh `node_modules` wipe.
- **Next.js 16.2, not 15.1**: `middleware.ts` still works but prints a deprecation warning at boot pointing to the `proxy.ts` convention — harmless today, worth a rename pass before Next drops the fallback.
- **Tailwind 4, not 3.x** — utility classes in `app/store/auth/page.tsx` (e.g. `bg-surface`, `text-muted-warm`, `font-heading`) already assume Tailwind 4 theme tokens wired in `app/globals.css`.

---

### Task 1: Rebuild Root Layout & Marketing Home against the live Paper artboard (mock/static data only)

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx` (only if fonts/metadata need to change to match the artboard)
- Test: manual dev-server screenshot comparison (no automated test — this is static marketing markup with no logic branch to unit test)

**Interfaces:**
- Consumes: existing font variables from `app/layout.tsx` (`--font-geist-sans`, `--font-geist-mono`, `--font-playfair`, `--font-dm-sans`), existing Tailwind theme tokens in `app/globals.css`
- Produces: marketing home markup matching Paper; no new exports, this is a leaf page

- [ ] **Step 1: Pull the live Paper artboard for the marketing home screen**

Use the `paper-desktop` MCP tools in this order:
1. `get_guide({ topic: "paper-mcp-instructions" })` — load once this session.
2. `get_basic_info()` — find the artboard(s) for the marketing home / landing screen (look for a frame named something like "Marketing Home" or "Landing" at 390px and 1440px).
3. `find_nodes()` scoped to that artboard to confirm you have the right one.
4. `get_screenshot()` on both the 390px and 1440px versions of the artboard — save these as the visual ground truth for comparison.
5. `get_jsx()` and `get_computed_styles()` on the artboard's key nodes (hero text, CTA, spacing) to get exact copy, font sizes, colors, and spacing values.
6. `get_variables()` to confirm which design tokens (colors, spacing) the artboard uses, and cross-check them against what's already defined in `app/globals.css`.

Do not proceed to Step 2 until you have: two screenshots (390px, 1440px), the exact copy text, and the exact spacing/color/type values from Paper. If no marketing-home artboard exists in the current Paper file, stop and flag this to the user — do not invent a design.

- [ ] **Step 2: Compare Paper artboard to the current `app/page.tsx` output**

Current `app/page.tsx` is:

```tsx
export default function MarketingHome() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Talam</h1>
        <p className="text-muted-foreground text-lg">Your platform. Your business.</p>
        <p className="text-sm text-muted-foreground">Coming soon.</p>
      </div>
    </main>
  )
}
```

This is a placeholder, not a designed screen — it does not use the `font-heading`/`font-body` token classes or `bg-surface`/`text-fg` color tokens that `app/store/auth/page.tsx` already uses elsewhere in the codebase. Write down every concrete diff between the Paper screenshots and this markup: copy text, font family, font size/line-height, color tokens, spacing, and any missing sections (e.g. a hero image, nav, CTA button, footer that Paper has but this placeholder doesn't).

- [ ] **Step 3: Rebuild `app/page.tsx` to match Paper, using only inline/typed placeholder data for anything dynamic**

Apply the exact copy, type scale, color tokens, and spacing found in Step 1. If the artboard has any dynamic-looking content (e.g. featured tenant names, product counts), inline it as typed placeholder data in the component, not from a fetch — that data source, if real, is out of scope for this UI-track file (see the Data-track sibling plan). Example shape (replace with the real Paper values once pulled):

```tsx
type MarketingHighlight = {
  label: string
  value: string
}

const highlights: MarketingHighlight[] = [
  { label: "Tenants", value: "50+" },
  { label: "Orders shipped", value: "10k+" },
]

export default function MarketingHome() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center min-h-screen bg-surface">
      <div className="text-center space-y-4">
        <h1 className="font-heading font-bold text-fg text-4xl tracking-tight">Talam</h1>
        <p className="font-body text-muted-warm text-lg">Your platform. Your business.</p>
      </div>
    </main>
  )
}
```

(This is illustrative only — the actual JSX, copy, and tokens must come from Step 1's Paper pull, not from this example.)

- [ ] **Step 4: Verify at 390px and 1440px with zero console/network errors**

1. Start the dev server: `mcp__Claude_Preview__preview_start` with the `dev` config from `.claude/launch.json` (create the config first if it doesn't exist, per that tool's schema, pointing at `npm run dev` on port 3000).
2. `mcp__Claude_Preview__preview_resize` to `width: 390` and take a screenshot; compare side-by-side against the Paper 390px screenshot from Step 1.
3. `mcp__Claude_Preview__preview_resize` to `width: 1440` and take a screenshot; compare side-by-side against the Paper 1440px screenshot from Step 1.
4. `mcp__Claude_Preview__preview_console_logs({ level: "error" })` — must return empty.
5. `mcp__Claude_Preview__preview_network({ filter: "failed" })` — must return empty.
6. If any pixel diff remains (spacing off, wrong color token, wrong font weight), go back to Step 3 and fix, then re-run this step.

- [ ] **Step 5: Commit the UI change**

```bash
git add app/page.tsx app/layout.tsx
git commit -m "fix: match marketing home to live Paper artboard (390px/1440px)"
```

---

## Self-Review

- **Spec coverage:** All 6 original Phase 1 tasks accounted for in Task 0's table with file citations. The one net-new requirement — re-verify the visual surface against Paper — is Task 1, fully stepped Pull → Compare → Build → Verify → Commit.
- **Placeholder scan:** Task 1's illustrative JSX is explicitly marked as illustrative pending the real Paper pull in Step 1.
- **Type consistency:** `MarketingHighlight` type introduced and used consistently within Task 1 only.
- **Track discipline:** No Prisma/Supabase data-fetch code appears in this file. Anything the Paper pull reveals as needing real backing data is deferred to the Data-track sibling plan.
