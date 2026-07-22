# Resend Onboarding Emails — Design Spec

**Date:** 2026-07-22
**Status:** Approved
**Author:** Surya Prakash (via Claude)

## Context

`resend` is already an installed dependency and `RESEND_API_KEY` is already present in `.env` / `.env.example`, but nothing in the codebase uses it yet (confirmed: zero references outside `package.json`). A sibling Phase 7 growth-data plan reserves Resend for order-confirmation and new-order-alert emails only, and explicitly scopes "nurture-sequence cron" out — this spec fills that gap for the onboarding funnel specifically.

Three emails, three trigger points:
1. **Welcome** — sent once, right after a brand-new owner starts onboarding.
2. **Reminder** — sent up to 3 times to owners who started onboarding but haven't finished.
3. **Completion** — sent once, when onboarding finishes (Go Live).

### Key constraint: phone OTP has no email

Phone OTP is the primary login method (`components/auth/otp-form.tsx`), and it is 100% client-side — `supabase.auth.verifyOtp()` runs in the browser with no server-side hook, and Supabase never captures an email for a phone-only identity. The **only** place an email exists before onboarding's Contact step is:
- `User.email` / the Supabase session's `user.email`, populated only for Google sign-in (`app/auth/callback/route.ts` upserts it there).
- `Tenant.contactEmail`, captured at onboarding's Contact step (step 2 of 7) — mandatory, always set by the time onboarding completes.

Consequence (documented, not solved here): a phone-OTP owner who signs up and drops off before finishing the Contact step is **unreachable by any of these three emails**. The welcome email can only reach Google sign-ups. The reminder and completion emails rely on `contactEmail`, so they only fire once an owner has gotten that far.

## Architecture

| Email | Trigger | Recipient | Fires from |
|---|---|---|---|
| Welcome | First-ever `Tenant` row created | Supabase session `user.email` (skip silently if null — phone OTP) | `saveStoreStep()` in `app/admin/onboarding/actions.ts`, only on the create path |
| Reminder (1 of 3) | Daily cron, `ageDays >= 1`, `onboardingReminderCount == 0` | `Tenant.contactEmail` | new `GET /api/cron/onboarding-reminders` |
| Reminder (2 of 3) | Daily cron, `ageDays >= 3`, `onboardingReminderCount == 1` | `Tenant.contactEmail` | same route |
| Reminder (3 of 3) | Daily cron, `ageDays >= 7`, `onboardingReminderCount == 2` | `Tenant.contactEmail` | same route |
| Completion | `completeOnboarding()` sets `isOnboarded = true` | `Tenant.contactEmail` (always set by this point) | `completeOnboarding()` in `app/admin/onboarding/actions.ts` |

`ageDays = floor((now - Tenant.createdAt) / 1 day)`. The reminder cron is idempotent per run: it only ever advances a tenant from count N to N+1 once `ageDays` crosses `[1, 3, 7][N]`, so re-running the cron the same day is a no-op for tenants already caught up.

### Reminder link needs no token

The reminder/welcome links point at the plain root-domain `/admin/onboarding` route (`https://{ROOT_DOMAIN}/admin/onboarding` in prod, `http://localhost:3000/admin/onboarding` in dev — this route resolves on the root host per `proxy.ts`'s `isRootHost` check, not a tenant subdomain). `requireOwnerSession()` already redirects an unauthenticated visit to `/auth?next=/admin/onboarding`, and the wizard already resumes at `Tenant.onboardingStep` server-side (`onboarding-wizard.tsx`'s `useState(initialTenant?.onboardingStep ?? 0)`). So: click link → log in if needed → land exactly where they left off, with no magic-link/JWT machinery required.

### Auto-login on the link — Google sign-ups only

Requested: clicking the link shouldn't require a manual login step. Two real constraints shape this (see "why not a magic link" below), so the actual behavior is:

- **Owner is already logged in (same browser/session that signed up):** already works today, no change — `requireOwnerSession()` finds the session and renders onboarding directly.
- **Owner signed up via Google and isn't currently logged in:** the link routes through `/auth?next=/admin/onboarding&auto=google`. The `/auth` page, on seeing `auto=google` with no active session, auto-triggers `supabase.auth.signInWithOAuth({ provider: 'google' })` on page load (no button click) via a new `autoTrigger` prop on the existing `GoogleButton` component. If the browser already has an active Google session and has previously consented, Google skips its account picker/consent screen and redirects straight back — effectively zero-click. If not, the owner sees Google's normal chooser once.
- **Owner signed up via phone OTP and isn't currently logged in:** falls back to today's behavior — the normal `/auth` screen (OTP + Google buttons), no `auto` param. There is no Google identity to redirect to for these owners; forcing one would either fail to match or create a disconnected account. This is the one case where "click link → immediately in" isn't achievable without building a whole separate magic-link auth path (rejected — see below).

**Why not a real magic link (embed an auth code in the URL) for everyone:** rejected for two reasons — (1) a code generated at send-time would frequently be expired by click-time for the 3-day/7-day reminders, so it can't actually guarantee "no login prompt" either; (2) a login credential riding in an email body is a real trust-boundary change (forwarded mail, link-scanning proxies, mail server logs) that shouldn't be a silent default. The Google-OAuth-redirect approach above sidesteps both — it carries no credential in the URL at all, just a UX shortcut through a flow the browser may already be authenticated for.

**Determining "did this owner sign up via Google" per email:**
- **Welcome email:** trivial — it's already gated on `user.email` being present (`saveStoreStep`'s create path), and in this app's current provider set (Phone OTP, Google) only Google populates `user.email`. So welcome links always pass `autoGoogle: true` when the email exists at all.
- **Reminder emails:** `Tenant.contactEmail` (what gates whether a reminder fires) is typed manually at the Contact step regardless of login provider, so its presence does *not* imply Google. The cron route looks up the owner's actual provider via `createAdminClient().auth.admin.getUserById(tenant.ownerId)` and checks `app_metadata.provider === 'google'` before setting `autoGoogle: true` — one extra Supabase Admin API call per reminder-eligible tenant per day, acceptable at this volume.
- **Completion email:** no auto-login concern — the owner is already mid-session when this fires.

`lib/tenant-url.ts` gains `getOnboardingUrl(autoGoogle: boolean): string`, returning `/auth?next=/admin/onboarding&auto=google` (absolute, root-domain) when `autoGoogle` is true, else the plain `/admin/onboarding` absolute URL.

### Cron mechanism

`vercel.json` gets a `crons` entry:
```json
{
  "regions": ["bom1"],
  "crons": [{ "path": "/api/cron/onboarding-reminders", "schedule": "0 3 * * *" }]
}
```
(03:00 UTC daily ≈ 08:30 IST.) The route itself checks `Authorization: Bearer ${CRON_SECRET}` (Vercel's standard convention for authenticating its own cron invocations) and returns 401 otherwise. New env var `CRON_SECRET`, added to `.env.example` and `.env` (generated the same way as `SUPABASE_HOOK_SECRET` / `REVALIDATE_SECRET` — 32-byte hex).

## Data model

One new column on `Tenant`:
```prisma
onboardingReminderCount Int @default(0) @map("onboarding_reminder_count")
```
Migration applied via the session-mode pooler (port 5432), per this project's existing DB-migration convention — never `migrate reset` (pre-existing schema drift).

## Sending mechanism

`lib/resend.ts` — a thin wrapper matching the pattern the Phase 7 plan already established for order emails (inline HTML template functions, no React Email, no Resend-dashboard-authored templates — avoids a new dependency and keeps templates in version control, testable by mocking the `resend` package):

```ts
import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendOnboardingWelcomeEmail(to: string, params: { onboardingUrl: string }): Promise<void>
export async function sendOnboardingReminderEmail(to: string, params: { onboardingUrl: string; reminderNumber: 1 | 2 | 3 }): Promise<void>
export async function sendOnboardingCompleteEmail(to: string, params: { storeName: string; storeUrl: string; adminUrl: string }): Promise<void>
```

Each function wraps its `resend.emails.send()` call in try/catch, logs `console.error('[Resend] send<Name> failed:', err)` on failure, and never throws — an email outage must never block onboarding progress or the cron loop. (Matches the non-throwing contract the Phase 7 plan already specified for order emails.)

## Template content

### 1. Welcome
**Subject:** "You're in! 3 minutes to a live store"
**Body:**
> Hi there,
>
> Thanks for signing up for Talam. You're just a few steps away from a store customers can actually buy from — logo, first product, and how you want to get paid.
>
> **[Finish setup]** → `{onboardingUrl}`
>
> See you on the other side,
> The Talam Team

### 2. Reminder (escalating copy per send)

**Reminder 1 of 3** (day 1)
**Subject:** "Finish setting up your store"
**Body:** "You started setting up your Talam store but haven't finished yet. It only takes a few more minutes." **[Resume setup]** → `{onboardingUrl}`

**Reminder 2 of 3** (day 3)
**Subject:** "Your store is one step away"
**Body:** "Your store is almost ready to go live — just a couple of steps left. Don't let it sit unfinished." **[Resume setup]** → `{onboardingUrl}`

**Reminder 3 of 3** (day 7, final)
**Subject:** "Last reminder — your store setup is waiting"
**Body:** "This is your final reminder. Your Talam store setup is still incomplete. Pick up right where you left off — it won't take long." **[Resume setup]** → `{onboardingUrl}`

### 3. Completion
**Subject:** "Your store is ready — here's what's next"
**Body:**
> Congrats — **{storeName}** is live on Talam!
>
> Here's what to do next:
> 1. Share your store link with customers
> 2. Add a few more products to fill out your catalog
> 3. Check Settings to make sure your payment details are correct
>
> **[View your store]** → `{storeUrl}`
> **[Go to admin]** → `{adminUrl}`

## Error handling

- Every `lib/resend.ts` function swallows its own errors (logs, never throws) — callers (`saveStoreStep`, `completeOnboarding`, the cron route) call them fire-and-forget-safe, no try/catch needed at call sites.
- The cron route's per-tenant loop increments `onboardingReminderCount` only after the send call returns (whether it succeeded or silently failed) — a persistent Resend outage means reminders silently stop advancing for everyone that day, self-heals the next run. No dead-letter/retry queue — out of scope for this volume.
- Missing `CRON_SECRET` env var → the route always 401s (fail closed, not open).

## Testing plan

- `lib/resend.test.ts` — mocks the `resend` package (same style as the Phase 7 plan's existing TDD approach for order emails): each send function calls `resend.emails.send()` with the right `to`/`subject`, and a rejected send resolves (doesn't throw) with an error logged.
- `app/admin/onboarding/actions.test.ts` — extend:
  - `saveStoreStep` sends the welcome email when creating a new tenant and the session has an email; does not send on the update path (returning owner); does not throw when the session has no email (phone OTP).
  - `completeOnboarding` sends the completion email using `contactEmail`.
- New `app/api/cron/onboarding-reminders/route.test.ts`:
  - 401s without the correct `Authorization` header.
  - Sends reminder N and increments the counter once `ageDays` crosses threshold N.
  - Skips tenants with `onboardingReminderCount >= 3`.
  - Skips tenants with no `contactEmail`.
  - Does not re-send within the same day once already caught up to the correct count for their age.
  - Passes `autoGoogle: true` when `auth.admin.getUserById` reports `app_metadata.provider === 'google'`, `false` otherwise.
- `components/auth/google-button.test.tsx` — extend: with `autoTrigger`, `signInWithOAuth` fires on mount without a click; without it, behavior is unchanged (click-triggered only).
- `app/auth/page.test.ts` — extend `resolveSignedInDestination`-adjacent coverage: `auto=google` with no session renders the auto-triggering `GoogleButton`; `auto=google` with an active session is unaffected (still redirects to `resolveSignedInDestination`, same as today); no `auto` param renders the normal form unchanged.

## Known limitations (explicitly out of scope)

- No retroactive welcome email if a phone-OTP owner later adds an email via Contact step — welcome is a single fire-once-at-creation event, not re-attempted.
- No unsubscribe/opt-out link — V1 transactional-style onboarding nudges only, not marketing broadcast; revisit if this expands into the broader nurture sequence design doc §10 already describes.
- No admin-facing visibility into reminder send history — logs only.
