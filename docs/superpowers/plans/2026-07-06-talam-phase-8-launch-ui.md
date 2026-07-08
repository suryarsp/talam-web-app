# Phase 8: Launch Implementation Plan — UI Track

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Track order:** This is a **UI-track** plan — the **last** of the 8 phases' UI-track plans in the front-end-first pass. Do not start any phase's **Data-track** plan until every phase's UI-track plan (Phases 1–8) is complete. See the sibling `2026-07-06-talam-phase-8-launch-data.md` for the full backend/infra work: the `Tenant.showWhatsappButton` gate fix, SEO (`sitemap.ts`, `robots.ts`, `generateMetadata`), the performance pass, and the pre-launch checklist.

**Goal:** Phase 8 is almost entirely re-verification and backend/infra polish, not greenfield UI. This file covers the **one** UI-shaped surface the phase has: re-verifying the already-built storefront header and footer against the live Paper artboards (visual confirmation only — no code fix). The other three tasks (SEO, performance pass, pre-launch checklist) have no UI screen to build and are listed below only as numbering placeholders — their full implementation lives in the Data-track sibling. The WhatsApp FAB's functional bug (footer ignoring `Tenant.showWhatsappButton`) is a one-line code fix touching a real schema field, not a UI-building step — it's a pointer to the Data track below.

**Architecture:** `components/store/store-header.tsx` and `components/store/store-footer.tsx` (built in commit `2a03d84`, wired into `app/store/layout.tsx`) are re-verified node-by-node against the live "Store Front" page's `Home — Mobile` (`1-0`) and `Home — Desktop` (`2-0`) artboards using `get_computed_styles`/`get_jsx`, not rebuilt. This file confirms the existing pixel-match holds; it modifies no files. The one confirmed functional gap — the footer's WhatsApp FAB ignoring `Tenant.showWhatsappButton` — is not a visual defect (the FAB itself is already pixel-accurate against Paper), so its fix lives entirely in the Data-track sibling.

**Tech Stack:** Next.js 16, existing Tailwind design tokens, Chrome DevTools MCP (`get_computed_styles`) for the re-verification pass.

## Global Constraints

- Inherit all prior phase constraints as context, but do not write any Prisma, Server Action, API-route, sitemap/robots, or performance-tuning code in this file — that is the Data-track's job.
- **The storefront header and footer are NOT greenfield.** `components/store/store-header.tsx` and `components/store/store-footer.tsx` already exist, are already wired into `app/store/layout.tsx`, and were verified directly against the live Paper file during this plan's research — computed styles for the mobile header (`18px`/`700`/Playfair Display/`#18181B`, `12px`/`16px` padding, `1px` `#E8E8E8` border) and desktop header (`24px`/`700`/Playfair Display, `16px`/`48px` padding) match `store-header.tsx`'s Tailwind classes exactly. This task is a targeted re-verification pass, not a new-component task — it should modify no files unless drift from Paper is actually found.
- **The footer's mobile WhatsApp button already exists and is pixel-accurate.** Verified directly: Paper's mobile footer artboard (`Home — Mobile`, node `8NF-0`) contains a 48×48 `rounded-full` frame with `background-color: #25D366`, `box-shadow: #25D36666 0px 4px 12px`, and an inline SVG whose path data is byte-for-byte identical to the WhatsApp icon already in `store-footer.tsx` lines 297-306. **There is no separate always-visible/scroll-persistent floating WhatsApp button anywhere in the live Paper file** — checked directly across the whole "Store Front" page's 27 artboards. **Conclusion: do not build a new standalone `WhatsAppButton` component** — the requirement is already met visually by the existing footer FAB. The only real gap is functional, not visual (it ignores `Tenant.showWhatsappButton`) — that fix is entirely out of this file's scope; see Task 1 pointer below.
- **Seeded tenant branding is already correct — no reconciliation needed.** `prisma/seed.ts` seeds the `silk` tenant with the real brand name "Meena Silks" — Paper's global nav-bar wordmark reads "talam." (fictional platform-name flavor text per the established project convention), which `store-header.tsx` already correctly ignores in favor of `tenant.name`/`tenant.logoUrl`. No action needed here beyond confirming it during re-verification.
- Money/business fields are unaffected by this task — no schema reads beyond what the existing header/footer already do.

---

## Known Gaps

See the sibling `2026-07-06-talam-phase-8-launch-data.md` for the full "Known Gaps" section (no Lighthouse CI wiring, no security-audit task beyond `npm audit`, no admin UI for `Tenant.showWhatsappButton`, no live Paper artboard for sitemap/robots output, multi-tenant sitemap scope limits). None of those gaps affect this file's re-verification task.

---

### Task 1: Re-verify Storefront Header & Footer Against Live Paper (UI)

**Files:** none — this is a read-only re-verification pass. If drift from Paper is found, flag it as a new gap rather than silently patching it here (a real fix would need its own task/plan).

**Interfaces:** none new.

This is a **re-verification task**, not new UI. Confirmed via direct Paper inspection (see Global Constraints) that `store-header.tsx` and `store-footer.tsx` already match the live artboards pixel-for-pixel on every property checked (padding, font, color, border, WhatsApp FAB styling/icon path). The footer's functional gate on `Tenant.showWhatsappButton` is a one-line code fix, not a visual concern — it's out of scope here; see the pointer below.

- [ ] **Step 1: Re-verify the header at both breakpoints**

Start the dev server, load the seeded `silk` storefront at 390px and 1440px. Confirm the header's wordmark uses `tenant.name`/`tenant.logoUrl` (not "talam."), is sticky, and its padding/font/border match the computed styles already pulled from Paper (`18px`/`700`/Playfair Display/`#18181B`, `12px`/`16px` padding, `1px` `#E8E8E8` border on mobile; `24px`/`700`/Playfair Display, `16px`/`48px` padding on desktop). This is a confirmation step — the match was already verified during planning; only re-confirm it hasn't drifted.

- [ ] **Step 2: Re-verify the footer and WhatsApp FAB styling at both breakpoints**

At the same two breakpoints, confirm the footer layout matches Paper and the mobile WhatsApp FAB renders with the correct 48×48 `rounded-full` frame, `#25D366` background, matching box-shadow, and icon. Do **not** attempt to verify the `showWhatsappButton` toggle here — that logic doesn't exist in the codebase yet at this point in track order (it's built in the Data-track sibling, which runs after every phase's UI track); today the FAB shows whenever `tenant.whatsappNumber` is set, which is expected pre-fix behavior.

- [ ] **Step 3: Confirm zero console/network errors**

At both breakpoints, confirm no console or network errors on the storefront home page.

- [ ] **Step 4: No commit expected**

This task modifies no files. If Steps 1–3 found genuine drift from Paper (not the known WhatsApp-gate gap, which is intentionally deferred to the Data track), stop and flag it rather than fixing it inline — a real visual fix is out of scope for a re-verification pass and needs its own task.

---

### Task 1b: WhatsApp FAB Gate on `Tenant.showWhatsappButton` — backend-only, see Data track

The footer's mobile WhatsApp FAB is gated only on `tenant.whatsappNumber` truthiness, not on the already-existing `Tenant.showWhatsappButton` toggle. This is a one-line code change plus a test, touching a real schema field — not a UI-building step. Full fix (schema select, test, code change, commit) lives in `2026-07-06-talam-phase-8-launch-data.md`, Task 1.

### Task 2: SEO — Sitemap, Robots, Store Home Metadata — backend-only, see Data track

### Task 3: Performance Pass (Manual Lighthouse, No CI) — backend/infra-only, see Data track

### Task 4: Pre-Launch Checklist — process-only, see Data track

---

## Phase 8 Verification (UI Track)

Manual smoke test:
- [ ] Storefront header and footer at 390px and 1440px match the live Paper artboards (wordmark, padding, font, border, WhatsApp FAB visual styling) with zero console/network errors.
- [ ] Confirm no Prisma, Server Action, API-route, sitemap/robots, or performance-tuning code exists yet from this track — that is the Data-track sibling's scope.

Re-confirm before executing Task 1: no drift has crept into the header/footer since this plan was written — if the live Paper file has changed, treat this as needing a fresh pixel-match pass rather than assuming the original research still holds.

---

## Self-Review

- **Spec coverage:** The original Phase 8's only UI-shaped task (Task 1) carries its re-verification steps (header, footer, WhatsApp FAB visual styling, zero-error check) in full. The WhatsApp FAB's functional gate — a one-line code fix touching `Tenant.showWhatsappButton` — is a one-line pointer to the Data track (Task 1b) rather than being built here, since it's a real bug fix on a schema field, not UI construction. Tasks 2–4 (SEO, performance, checklist) are entirely backend/infra/process with no visible markup — they are one-line numbering pointers to the Data-track sibling.
- **Placeholder scan:** No `<name>`-style unresolved placeholders. No mock data is introduced in this file since it builds nothing new — it only re-confirms existing, already-shipped UI.
- **Type consistency:** N/A — this file introduces no new types or interfaces.
- **Track discipline:** No Prisma imports, Server Actions, API routes, sitemap/robots files, or performance-tuning edits appear anywhere in this file. Step 4 explicitly declines to fix the `showWhatsappButton` gate inline, deferring that one-line change to the Data-track sibling's Task 1 — mirroring how Phase 7's UI track left its backend wiring untouched.
