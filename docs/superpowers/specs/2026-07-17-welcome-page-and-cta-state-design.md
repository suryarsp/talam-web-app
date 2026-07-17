# Welcome Page & State-Aware Marketing CTAs — Design Spec

**Date:** 2026-07-17
**Status:** Approved
**Author:** Surya Prakash + Claude
**Scope:** Give a signed-in owner a single hub page to reach their store or admin panel, and make every marketing-page CTA reflect whether they're signed out, mid-onboarding, or fully live.

**Supersedes:** the "Continue setup"/"Dashboard" nav-menu-item approach sketched in `docs/superpowers/plans/2026-07-17-talam-onboarding-persistence.md` Task 8, and the deferred Tasks 2–4 (subdomain URL helper, post-login redirect resolver) — those tasks' *mechanism* (subdomain-aware URLs, `isOnboarded` check) is reused here, but the *destination* is a new `/welcome` page instead of a dropdown link or direct redirect.

## 1. Problem

Today, `components/marketing/nav.tsx`'s `AccountMenu` shows a signed-in owner their name/email and a sign-out button — nothing else. There is no link back into onboarding or to the live storefront/admin from the marketing site. Separately, every primary CTA on the marketing page ("Start free" in the nav, hero, CTA band, and pricing page) always points to `/auth`, even for a visitor who is already signed in and already has a store.

## 2. Decision

Add a new page, `/welcome`, as the single destination for every signed-in-facing CTA on the marketing site. Compute three states from the Supabase session + `Tenant.isOnboarded`, and drive both the `/welcome` page content and every marketing CTA's label/href/subtext from the same state.

### States

| State | Condition | CTA label | CTA href | CTA subtext (where a slot exists) |
|---|---|---|---|---|
| Signed out | no session | "Start free" (unchanged) | `/auth` | unchanged per-component copy |
| In progress | session exists, no `Tenant` row or `isOnboarded === false` | "Finish Setting Up" | `/welcome` | "Pick up where you left off" |
| Onboarded | session exists, `Tenant.isOnboarded === true` | "View My Store" | `/welcome` | "Takes you to your store & admin" |

Every signed-in state routes to `/welcome`, never straight to `/admin/onboarding` or the storefront — `/welcome` is what decides what to show next.

## 3. Shared state logic

**`app/actions/owner-cta.ts`** (`'use server'`):
```typescript
export type OwnerCtaState = 'signed-out' | 'in-progress' | 'onboarded'
export async function getOwnerCtaState(): Promise<OwnerCtaState>
```
Re-derives the user server-side via `createServerClient()` (never trusts a client-supplied id). No user → `'signed-out'`. Otherwise `prisma.tenant.findUnique({ where: { ownerId: user.id }, select: { isOnboarded: true } })` — no row or `isOnboarded === false` → `'in-progress'`; `isOnboarded === true` → `'onboarded'`.

**`components/marketing/use-owner-cta.ts`** (client hook): reuses the existing `supabase.auth.getUser()` / `onAuthStateChange` subscription pattern already in `nav.tsx`. Once a user resolves (including `null`), calls `getOwnerCtaState()` once and returns `{ label, href, subtext }` looked up from a `CTA_COPY` table keyed by state. Returns `null` while auth is still resolving (mirrors `nav.tsx`'s existing `user === undefined` loading state) so callers can render their current unauthenticated-looking default until it resolves.

`nav.tsx`, `hero.tsx`, `cta-band.tsx`, and `pricing.tsx` all consume this one hook instead of each re-implementing the auth/tenant fetch — the only point of duplication avoided here, not a general-purpose abstraction.

## 4. `lib/tenant-url.ts`

Pure helpers, extracted from the inline logic already duplicated once in `app/admin/onboarding/page.tsx:22-25` and needed again here:

```typescript
export function getAdminUrl(slug: string, isLocalDev: boolean): string
export function getStoreUrl(slug: string, isLocalDev: boolean): string
```
- Dev: `/dev/store/${slug}/admin`, `/dev/store/${slug}`
- Prod: `https://${slug}.${ROOT_DOMAIN}/admin`, `https://${slug}.${ROOT_DOMAIN}` where `ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'talam4shop.com'` (same fallback `proxy.ts` and the onboarding page already use).
- `isLocalDev` is caller-supplied (from the request `host` header on the server, `window.location.hostname` on the client) — kept pure and testable, not inferred internally.

`app/admin/onboarding/page.tsx` is updated to call `getStoreUrl()` instead of its inline dev/prod branch, removing that duplication.

## 5. `/welcome` page

`app/welcome/page.tsx` — async Server Component:
1. `requireOwnerSession()` (existing guard) — no session → redirects to `/auth?next=/welcome`.
2. `prisma.tenant.findUnique({ where: { ownerId } })`.
3. Minimal, marketing-styled layout (dark `bg-bg-dark`, same `Logo`/type scale as `nav.tsx`), centered card:
   - Name/email header (from the Supabase user), sign-out button below the cards (moved out of the old nav dropdown, which is deleted — see §6).
   - **Onboarded:** two large link cards — "View My Store" → `getStoreUrl(tenant.slug, isLocalDev)`, "View Admin" → `getAdminUrl(tenant.slug, isLocalDev)`.
   - **In progress** (no tenant row, or `isOnboarded === false`): one card, "Continue setup" → `/admin/onboarding` (resumes at the tenant's saved `onboardingStep` automatically — existing behavior, no new param needed).

Sign-out is the only interactive element, so it's a small inline `'use client'` island; the rest of the page is server-rendered.

## 6. Nav change

`components/marketing/nav.tsx`: `AccountMenu`'s `<details>` dropdown (name/email/sign-out) is deleted entirely. The avatar becomes a plain `<Link href="/welcome">` wrapping the same avatar markup. The nav's "Start free" pill is replaced with `{label}` linking to `{href}` from `useOwnerCta()` — no subtext (button is compact; the label itself communicates the destination, per the earlier design decision that the nav doesn't need a subtext slot).

## 7. Hero, CTA band, pricing changes

- **`hero.tsx`**: primary button (currently hardcoded "Start free" → `/auth`) uses `useOwnerCta()`'s label/href. A subtext line appears beneath the button row only when signed in (new — hero has no subtext today). The secondary "See a live store →" button is unchanged and state-independent.
- **`cta-band.tsx`**: primary button uses the hook; the existing subtext line ("14-day free trial · No credit card · No GST needed") swaps to the state's subtext when signed in, unchanged when signed out.
- **`pricing.tsx`**: both plan cards' "Start free trial" button uses the hook (same label/href for both — they're duplicate CTAs, not per-plan state); the banner line above the cards ("Start free for 14 days...") swaps the same way.

## 8. Out of scope

- Editing account settings from `/welcome` (that's `/admin/settings`, unchanged).
- Multi-tenant-per-owner support (still one `Tenant` per `ownerId`, per existing constraint).
- Real-time state updates if onboarding status changes in another tab — `useOwnerCta()` fetches once per mount/auth-change, matching `nav.tsx`'s existing `AccountMenu` behavior (no polling).

## 9. Testing

- `lib/tenant-url.test.ts` — dev/prod × admin/store (4 cases), pure function.
- `app/actions/owner-cta.test.ts` — three states (mock `@/lib/supabase/server` and `@/lib/prisma`).
- No automated test for `/welcome`'s page, the hook, or the four CTA component wirings — pure UI/layout around already-tested logic, matching this project's convention of testing money/security/auth-adjacent logic only.
