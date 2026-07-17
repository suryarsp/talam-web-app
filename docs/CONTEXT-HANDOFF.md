# Talam Web App — Context Handoff

Compiled 2026-07-17 from this machine's Claude Code project memory
(`~/.claude/projects/.../memory/*.md`) so a fresh Claude Code session on
another PC has the same background. This is a snapshot, not live state —
verify anything code-specific against the actual repo before acting on it.

## How to use this on the new PC

1. Copy/clone this repo to the new machine (this file travels with it).
2. Open a Claude Code session in the repo root and say: "Read
   `docs/CONTEXT-HANDOFF.md` for project context before we start."
3. Optional but recommended: also copy the memory directory itself so future
   sessions on the new machine keep the same auto-memory —
   `~/.claude/projects/F--Product-Talam-Web-App-Source-talam-web-app/memory/`
   → same relative path under the new machine's `~/.claude/projects/<encoded-cwd>/memory/`.
4. This snapshot does **not** include uncommitted git changes or raw chat
   transcripts — only distilled project memory. If you also need those, ask
   for them separately.

---

## Project

Talam — multi-tenant e-commerce SaaS for Indian small businesses. Target
launch **2026-08-18**.

- Stack: Next.js 16.2, Prisma 7.8, Supabase (Postgres + Auth), Tailwind 4,
  shadcn (base-nova style). Deviates from the original phase-plan docs
  (which assumed Next 15 / Prisma 5) — see deviations below.
- Multi-tenancy: `middleware.ts` rewrites `/store/*` and `/super-admin/*` by
  subdomain. Tenant DB isolation via `withTenant()` setting `app.tenant_id`
  + Supabase RLS.
- Auth: Supabase Auth + MSG91 SMS Edge Function for OTP (phone OTP is
  **SMS-only**, deliberately — see Decisions below). Google OAuth also
  supported.
- Payments: `PaymentProvider` interface — UPI Manual + Instamojo in V1.
- Testing: Vitest + jsdom, external deps mocked.

### Plan docs (master index)
- `docs/superpowers/plans/README.md` — master index, phase map, key decisions
- `docs/2026-06-23-talam-config-checklist.md` — service setup (§0–§12)
- Phases 1–8: `docs/superpowers/plans/2026-06-23-talam-phase-{1..8}-*.md`
  (foundation, storefront, commerce, customer, tenant-admin, platform,
  growth, launch)
- Design doc: `docs/design/2026-06-23-talam-oss-design.md` (versioned
  changelog at top, v1.1 → v1.9+; small confirmed design decisions get
  appended here as new changelog entries rather than new spec files)

### Status as of last session (2026-07-17)
- **Phase 1 (Foundation): all 6 coding tasks done.** Remaining loose ends
  (MSG91 Edge Function deploy, live auth smoke test) are credential-gated —
  need the user's real Supabase/MSG91 credentials, can't be done headlessly.
- **Owner onboarding is now wired end to end** (was the biggest gap as of
  2026-07-16): post-login routing (`app/auth/callback/route.ts`) sends a
  signed-in user to `/admin/onboarding` (no/incomplete tenant) or their own
  dashboard (onboarded). The wizard grew from 5 to **7 steps** and persists
  every step immediately via owner-scoped Server Actions, keyed by
  `Tenant.ownerId` — resumable, not write-at-the-end. Go Live sets
  `Tenant.isOnboarded = true`. See `docs/2026-06-23-talam-design.md` v1.9
  and `docs/superpowers/specs/2026-07-17-onboarding-v2-design.md`.
- **New `/welcome` hub + state-aware marketing CTAs** shipped same day: nav
  avatar, hero, CTA band, and pricing all read one shared `useOwnerCta()`
  hook and route signed-in owners to `/welcome` instead of a static
  "Start free". See `docs/2026-06-23-talam-design.md` v1.10.
- **Still open:** the storefront-side "not onboarded yet" gate/interstitial
  (`Tenant.isOnboarded` exists but nothing blocks `{store}.talam4shop.com`
  on it yet — Notion: "Onboarding completion gate…", Phase 6); logo/product
  -photo upload (no Cloudinary pipeline); admin dashboard/products/orders
  pages still read `MOCK_*` fixtures, not real Prisma queries.
- Design verification against live Paper file: Admin Dashboard, Checkout,
  and the *original 5-step* Onboarding Wizard were re-verified and code
  gaps fixed as of 2026-07-11 — the wizard has since grown to 7 steps
  in code and has **not** been re-verified against updated Paper artboards
  (flagged stale in `docs/design/2026-06-23-talam-oss-design.md` §4.7).
  Still unverified from the original pass: design doc §4.1–4.4, §4.6,
  §4.9–4.14. No Paper artboard exists yet for `/welcome` or the state-aware
  marketing CTAs.
- `docs/2026-06-28-PAPER-DESIGN-INVENTORY.md` referenced by the design doc's
  intro does **not** exist in the repo — don't cite it until recreated.

---

## Known plan/environment deviations (don't re-derive, apply directly)

**Prisma 7.8** (phase-plan snippets assume 5.x):
- No inline `url`/`directUrl` in `schema.prisma` — datasource config moved
  to `prisma.config.ts` via `defineConfig({ datasource: { url: env(...) } })`.
  Must `import 'dotenv/config'` at the top of `prisma.config.ts`.
- Mock `PrismaClient` as a `class` in tests, not `vi.fn(() => ({...}))` —
  Vitest 4 throws "is not a constructor" otherwise.
- `node_modules/.prisma/client` isn't auto-regenerated on `npm install` —
  fixed via `"postinstall": "prisma generate"` in `package.json` (already
  in this repo; re-add if `package.json` is ever regenerated from scratch).

**Next.js 16.2:**
- `middleware.ts` is deprecated in favor of `proxy.ts` (still works, prints
  a deprecation warning at dev boot). Worth renaming later.

**Supabase connection:**
- DB (project ref `egxsukuswespiicezxoz`, region `ap-south-1`) must be
  reached via the **connection pooler**, not the direct host —
  `db.egxsukuswespiicezxoz.supabase.co:5432` only has an IPv6 (AAAA) record,
  unreachable without an IPv6 route. Use
  `aws-1-ap-south-1.pooler.supabase.com:5432` (session mode) instead.

**Local dev routing:**
- `localhost:3000/store/*` 404s by design — `middleware.ts` only rewrites
  `/store/*` for tenant *subdomains*, and the `host === 'localhost'` branch
  returns early so the root domain serves the marketing site.
- To view storefront pages locally: use a tenant subdomain, e.g.
  `http://silk.localhost:3000`. A `silk` tenant ("Silk Test Store") is fully
  seeded — run `npx tsx prisma/seed.ts` (not `npx prisma db seed`, no seed
  command is wired into `prisma.config.ts`). Seeds 3 categories, 4 products,
  `Tenant.contactPhone/contactEmail/whatsappNumber`, a `StoreAbout` row, and
  a `StoreBranch` row — all fictional "Meena Silks" demo content.
- Don't confuse the seed's "Meena Silks" content with the Paper design
  file's own separate placeholder content (also fictional, e.g. "talam."
  wordmark, different fake business details) — they're unrelated fake data
  from two different sources, neither is a literal string to reproduce
  per-tenant.

**Design tokens** (`app/globals.css`):
- Paper's 44-token design system is only partially wired — add tokens only
  when a screen actually needs them, don't front-load speculatively.
- `--color-muted` naming collision: shadcn reserves it as a *background*
  token (`bg-muted`). Paper's muted role (warm-gray text) is namespaced
  `--color-muted-warm` instead.
- `--font-display` in Tailwind 4's `@theme` silently generates no utility
  class (collides with the CSS `font-display` descriptor) — the marketing
  display font (Fraunces) is namespaced `--font-marketing` instead.
- Global `text-sm/xl/2xl`, `leading-*`, and `radius-*` scales are
  deliberately left at Tailwind/shadcn defaults, not overridden — use
  scoped arbitrary-value classes per-component instead until a full audit
  justifies a global change.
- Known unrelated bug, not yet fixed: `--font-heading: var(--font-sans)`
  was circular (`--font-sans: var(--font-sans)`) — Geist Sans loads via
  `next/font` but was never wired into the global `font-sans` utility, so
  the app likely renders in browser-fallback serif outside
  `font-heading`/`font-body`.

---

## Product decisions (settled, don't re-litigate)

- **Phone OTP login stays SMS-only via MSG91.** The ₹5,900 one-time DLT
  (TRAI) registration fee is unavoidable regulatory overhead on *any* SMS
  gateway for Indian numbers, not an MSG91-specific cost — switching
  providers doesn't avoid it. ~25% of Indian smartphone users lack
  WhatsApp, so it can't be the sole login channel either.
- **WhatsApp is for order/owner alerts only, not auth.** Contact-check via
  WhatsApp Business API before sending; fall back to email (Resend) if not
  on WhatsApp — not SMS (SMS-as-fallback deferred to V2). One MSG91 account
  covers both SMS OTP and WhatsApp alerts.
- **Shiprocket** (exploratory, not yet in the design doc): courier
  aggregator sitting next to the Payment Architecture, not inside it —
  prepaid money still flows customer → tenant's Razorpay/Instamojo
  directly. Mirror `PaymentProvider` with a `ShippingProvider` interface.
  Each tenant needs their **own** Shiprocket account (not shared), because
  COD cash gets remitted to whoever placed the shipment. Rely on
  Shiprocket's bundled customer SMS/WhatsApp notifications rather than
  building custom ones.

---

## How this project likes to be worked

- **Design source of truth is the live Paper file**, not just the written
  design doc — the doc explicitly disclaims itself as unverified in places.
  Pull `get_jsx`/`get_screenshot`/`get_tree_summary` from Paper MCP and diff
  against actual code, don't stop at prose.
- Extract brand marks/icons from Paper into reusable `components/icons/`
  (or `components/` root) rather than inlining raw SVG per-component.
- Paper desktop is the **only** tool for UI prototypes — don't substitute
  HTML/SVG mockups.
- When screenshotting Paper artboards, always show the full design —
  expand artboard height as needed rather than cropping.
- If a page has whole missing sections vs. the design (not just spacing/
  color), stop and ask how to scope it before doing a full rebuild.
- If a design element maps to a single concrete per-tenant fact (phone,
  hours, about text), add a small nullable schema field + migration rather
  than hardcoding. If it needs real aggregation (GMV, review counts),
  hardcode with a `ponytail:` comment naming the real fix.
- Small, focused design decisions that refine an already-approved section
  of the master design doc get appended as a new versioned changelog entry
  in that same doc — not a new spec file under `docs/superpowers/specs/`.
- Notion task tracker ("Talam Tasks" DB) gets its `Notes` + `Status`
  updated **per task**, immediately after that task's checkboxes are done
  and committed — not batched at phase end. Notes are terse: deviations,
  root-cause fixes, commit hashes.

## Tooling gotchas (preview/dev server)

- If `preview_start`/`preview_list` desync (server registers but then
  "disappears"), a stray process is likely still bound to the port — find
  and kill it, then retry.
- After `prisma generate`/`migrate dev`, a running dev server has the old
  Prisma client loaded in memory — restart the server process, a page
  reload alone won't pick up the regenerated client.

---

## Reference locations

- **Notion tracker**: "Talam — Project Tracker" page holds the phase
  timeline and links to the "Talam Tasks" database. Query with
  `notion-query-data-sources` (SQL mode) filtering on `Phase`. Update with
  `notion-update-page`. `Status` is a fixed-option field:
  `Not started` / `In progress` / `Done`.
- **Paper design file**: "Talam Design" (paper.design) — 6 pages: Store
  Front, Marketing, Checkout Flow, Design Library, Admin Dashboard,
  Onboarding.
