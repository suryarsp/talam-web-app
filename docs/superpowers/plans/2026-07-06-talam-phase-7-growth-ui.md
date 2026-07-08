# Phase 7: Growth Infrastructure Implementation Plan — UI Track

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Track order:** This is a **UI-track** plan — part of the front-end-first pass across all 8 phases. Do not start any phase's **Data-track** plan until every phase's UI-track plan is complete. See the sibling `2026-07-06-talam-phase-7-growth-data.md` for the full backend/integration work: OTP rate limiting (Upstash Redis), PostHog analytics (server + client), Resend transactional emails, `@vercel/og` social cards, and the `/join` page's real referrer-lookup data wiring.

**Goal:** Phase 7 is almost entirely backend/integration plumbing (OTP rate limiting, PostHog, Resend, OG images) — this file covers the **one** UI surface the phase has: the public `/join` tenant-signup landing page, built as mock-wired UI against a hardcoded referrer banner. There is no live Paper artboard for `/join` or any marketing page (see Known Gaps pointer below) — its Design → Mock UI → Verify step is downgraded accordingly. The other four tasks (rate limiting, PostHog, Resend, OG images) have no UI screen at all and are listed below only as numbering placeholders — their full implementation lives in the Data-track sibling.

**Architecture:** `/join` is a plain marketing page with UTM-based referral attribution, built without a Paper reference since none exists. This file builds it against a hardcoded `referrerName` constant for visual verification only; the Data-track sibling replaces that constant with a real `getReferrerTenant(slug)` lookup keyed off `?utm_campaign=`.

**Tech Stack:** Next.js App Router, Tailwind v4 with project tokens (`app/globals.css`).

## Global Constraints

- Inherit all prior phase constraints as context, but do not write any Prisma, Server Action, API-route, rate-limiting, analytics, or email code in this file — that is the Data-track's job.
- **No live Paper artboard exists for `/join` (or any marketing/landing page).** Verified directly: the "Marketing" page (`8-0`) in the live "Talam Design" Paper file has 0 artboards, and a text search for `*join*` across the Store Front page's 27 artboards returned zero matches. This is a hard gap, not a lookup miss. `/join`'s Design → Mock UI → Verify step is downgraded from "pixel-match Paper" to "matches existing design-token conventions (`--font-heading`, `--font-body`, `--color-brand-primary` from `app/globals.css`), zero console/network errors," per the required methodology for gap cases.
- Tasks 1–4 (OTP rate limiting, PostHog, Resend, OG images) are entirely backend/infrastructure with no visible markup — they do not belong in a UI track at all and are not built in this file. They are listed below only to keep task numbering aligned with the original combined plan.

---

## Known Gaps

See the sibling `2026-07-06-talam-phase-7-growth-data.md` for the full "Known Gaps" section (no referral-credit schema, no nurture-drip emails, no `discount_code` in PostHog events, the hard Paper gap for `/join` and its methodology note). Task 5 below builds around the Paper gap; it does not invent a referral-credit mechanic.

---

### Task 1: OTP Rate Limiting — backend-only, see Data track

### Task 2: PostHog Analytics (Client Pageviews + Server Events) — backend-only, see Data track

### Task 3: Resend Transactional Emails (Order Confirmation + Owner Alert) — backend-only, see Data track

### Task 4: OG Images for WhatsApp/Social Sharing — backend-only, see Data track

---

### Task 5: `/join` Tenant-Signup Landing Page (UI)

**Files:**
- Create: `app/join/page.tsx`

**Interfaces:**
- Produces: `/join` page — public marketing page, no auth guard, renders a mock referrer banner for this track's verification only

**No live Paper artboard exists for this page** — verified directly (see Known Gaps: Marketing page has 0 artboards, no "join" text anywhere on Store Front's 27 artboards). Per the required methodology for this case, the Design → Mock UI → Verify step below is downgraded to "matches existing design-token conventions (`--font-heading`, `--font-body`, `--color-brand-primary` from `app/globals.css`), zero console errors" rather than a Paper pixel-match. The Data-track sibling's Task 5 replaces the hardcoded `referrerName` below with a real `getReferrerTenant(slug)` lookup driven by `?utm_campaign=` — it modifies this same file, keeping the JSX unchanged.

- [ ] **Step 1: Build the join page against a hardcoded referrer banner**

Create `app/join/page.tsx`:
```tsx
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const STATS = [
  { value: '14 min', label: 'to go live' },
  { value: '0%', label: 'platform fee' },
  { value: '₹499/mo', label: 'after 14-day trial' },
]

export default function JoinPage() {
  // Mock referrer banner for this step's visual verification only — the
  // Data-track sibling's Task 5 replaces this with a real lookup keyed off
  // ?utm_campaign=.
  const referrerName: string | null = 'Meena Silks'

  return (
    <main className="mx-auto max-w-md space-y-8 px-4 py-16">
      <div className="space-y-3 text-center">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-fg">
          Start selling online today
        </h1>
        <p className="font-body text-muted">
          Your own store at <strong className="text-fg">yourname.mytalam.com</strong> — live in 14 minutes.
          No GST registration. No credit card required.
        </p>
      </div>

      {referrerName && (
        <div className="rounded-lg border border-brand-primary/20 bg-brand-primary/5 px-4 py-3 text-center font-body text-sm text-fg">
          You found us via <span className="font-semibold">{referrerName}</span>.
        </div>
      )}

      <div className="space-y-3">
        <Link
          href="/admin/onboarding"
          className="block w-full rounded-lg bg-brand-primary py-3 text-center font-body font-semibold text-surface"
        >
          Start free — 14-day trial
        </Link>
        <p className="text-center font-body text-xs text-muted">No credit card required. Cancel anytime.</p>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        {STATS.map((stat) => (
          <div key={stat.label}>
            <p className="font-body text-2xl font-bold text-fg">{stat.value}</p>
            <p className="mt-1 font-body text-xs text-muted">{stat.label}</p>
          </div>
        ))}
      </div>
    </main>
  )
}
```

Note: the "Start free" button links to `/admin/onboarding`, which is Phase 5's tenant-owner onboarding wizard route (per Phase 6's Global Constraints, the Onboarding Paper page — `6-0`, 11 artboards — is the tenant-owner Store→Brand→Product→Payment→Go Live flow). This plan does not build that destination; it only links to it, matching whatever route Phase 5 lands at. If Phase 5's onboarding route differs from `/admin/onboarding` by the time this task executes, update the `href` to match — verify rather than assume.

- [ ] **Step 2: Verify at 390px and 1440px against design-token conventions**

Start the dev server, visit `/join`, confirm at both 390px and 1440px viewport widths: the page uses only existing `app/globals.css` tokens (`font-heading`, `font-body`, `text-fg`, `text-muted`, `bg-brand-primary`, `text-surface`) with no invented hex values, layout doesn't overflow or clip at either width, zero console/network errors. This is not a Paper pixel-match (none exists) — it's a token-consistency check per the Known Gaps downgrade.

- [ ] **Step 3: Commit the mock UI**

```bash
git add app/join/page.tsx
git commit -m "feat: add /join landing page UI (no Paper reference exists for marketing pages)"
```

---

## Phase 7 Verification (UI Track)

Manual smoke test:
- [ ] Visit `/join` — the hardcoded referrer banner ("You found us via Meena Silks") renders; page renders cleanly at 390px and 1440px with zero console errors.
- [ ] Confirm no Prisma, Server Action, rate-limiting, PostHog, Resend, or `@vercel/og` code exists yet from this track — that is the Data-track sibling's scope.

Re-confirm before executing Task 5: no `/join`-equivalent Paper artboard has been added to the "Marketing" page since this plan was written — if one now exists, treat Task 5's UI as needing a fresh pixel-match pass rather than assuming this plan's freehand layout is final.

---

## Self-Review

- **Spec coverage:** The original Phase 7's only UI-bearing task (Task 5, `/join`) carries its Design → Mock UI → Verify → Commit steps verbatim, including the "no Paper artboard" framing carried over exactly as the original stated it. Tasks 1–4 (rate limiting, PostHog, Resend, OG images) are entirely backend/infrastructure with no visible markup — they are listed as one-line numbering pointers to the Data-track sibling rather than duplicated or fabricated here.
- **Placeholder scan:** No `<name>`-style unresolved placeholders. The hardcoded `referrerName` constant is an explicitly flagged mock-verification stand-in (matching the original plan's own framing), not an accidental stub.
- **Type consistency:** The mock `referrerName: string | null` matches the shape the Data-track sibling's `getReferrerTenant(slug): Promise<{ name: string } | null>` resolves to (`.name`), so the mock→real swap in the sibling is a data-source replacement inside the same JSX, not a rewrite.
- **Track discipline:** No Prisma imports, Server Actions, API routes, rate-limiting, PostHog, Resend, or `@vercel/og` code appear anywhere in this file. `app/join/page.tsx` ships with a hardcoded referrer banner and no `getReferrerTenant` import — the Data-track sibling's Task 5 is where the real lookup and `searchParams` wiring land, mirroring exactly how Phase 6's UI track omitted `requireSuperAdmin`.
