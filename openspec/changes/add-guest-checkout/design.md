## Context

See proposal.md - Why/What Changes for motivation. Relevant existing shape:

- `placeOrderAction` (`app/checkout/actions.ts`) currently starts with `const user = await requireAuth('/checkout')` and uses `user.id` directly as `Order.customerId`.
- `Customer.id` (`prisma/schema.prisma`) is a **single-column primary key**, not composite with `tenantId`, and is always set equal to the Supabase `auth.users.id`. `requireAuth` (`lib/auth-guard.ts`) already upserts `Customer` by `id` alone (`update: {}` on conflict) — today, whichever tenant a Supabase identity signs into *first* owns that identity's `Customer` row; a second tenant's sign-in silently reuses (not duplicates) that same row. This is a pre-existing constraint of the schema, not something introduced here.
- `Customer.email` / `Customer.phone` have no unique constraint, per-tenant or global.
- `lib/supabase/admin.ts` already exposes a service-role client (`createAdminClient()`), currently unused for user creation.
- OTP sign-in (`components/auth/otp-form.tsx`) is the only existing passwordless entry point; both `signInWithOtp`/`verifyOtp` re-verify the email/phone on every sign-in attempt regardless of the account's stored confirmation state.

## Goals / Non-Goals

**Goals:**
- Let checkout succeed with zero Supabase session, gated only by valid email + phone.
- Avoid creating duplicate `Customer` rows or duplicate Supabase auth accounts for a shopper checking out repeatedly with the same email/phone on the same tenant.
- Fail loudly and specifically (not with a generic 500) when the global `Customer.id` PK constraint described above would be violated, rather than silently misattributing an order.

**Non-Goals:**
- Changing `Customer.id` to a composite key or otherwise letting one Supabase identity belong to multiple tenants. Out of scope; pre-existing constraint.
- Building any new sign-in method. Guests use the existing OTP form to claim their account later.
- Verifying email/phone ownership at checkout time (no OTP is sent during guest checkout — see Decision below).

## Decisions

### 1. Resolve-or-create runs against Supabase auth (global), not just the tenant's `Customer` table
Because `Customer.id` mirrors a globally-unique Supabase `auth.users` id, "does this email/phone already have an account" is a global question, even though the visible symptom (a `Customer` row) is tenant-scoped. Guest resolution therefore does two lookups when no session exists:

1. `db.customer.findFirst({ where: { tenantId, OR: [{ email }, { phone }] } })` — is this shopper already a customer *of this tenant*? If found, reuse it; done.
2. If not found, check Supabase auth for an existing account with that email or phone (via the admin client, e.g. `admin.auth.admin.listUsers` filtered, or attempting `createUser` and inspecting the "already registered" error). If Supabase already has an account for that email/phone (necessarily attached to a *different* tenant's `Customer` row, since step 1 found none here), do **not** create a second `Customer` row with that id — it would violate the PK. Return a checkout error instead (e.g. "An account already exists for this email/phone — sign in to continue.") rather than silently creating an order under the wrong identity or crashing on a DB constraint error.
3. Otherwise, create a new Supabase auth user (admin client) and a new `Customer` row for this tenant with matching id, email, and phone.

Alternative considered: skip the global Supabase check and let `admin.createUser` fail, catching the error generically. Rejected — the resulting error is indistinguishable from a real infrastructure failure, and the shopper gets a confusing "something went wrong" instead of an actionable message.

### 2. Match precedence when email and phone point at two different existing customers
`OR: [{ email }, { phone }]` can match more than one row. Precedence: prefer the email match (email is the more stable identifier for support/lookup); if only phone matches, use that. This mirrors `Customer.email`/`Customer.phone` both being nullable free-text today — no stronger correctness is available without adding uniqueness constraints, which is out of scope.

### 3. New Supabase accounts are created via the admin client, unconfirmed-by-verification but usable
`createAdminClient().auth.admin.createUser({ email, phone, email_confirm: true, phone_confirm: true, user_metadata: { created_via: 'guest_checkout' } })`, no password. Marking `email_confirm`/`phone_confirm` true only sets `auth.users` metadata timestamps; it does not bypass the OTP re-verification that `signInWithOtp`/`verifyOtp` already performs on every sign-in attempt (see Context). So a guest account created this way is exactly as safe to sign into later as one created through the existing OTP flow — ownership is proven at sign-in time, not at creation time.

### 4. Guest checkout does not call `requireAuth`
`placeOrderAction` branches: if `supabase.auth.getUser()` returns a user, behavior is unchanged (existing `Customer`, per today's code). If not, it runs the resolve-or-create flow above instead of redirecting. `requireTenant()` is still required either way — tenant resolution is unrelated to shopper auth.

## Risks / Trade-offs

- **[Risk]** A shopper who is already a customer of Tenant A tries to guest-checkout at Tenant B with the same email → checkout error per Decision 1, step 2, instead of a purchase. → **Mitigation**: the error message tells them to sign in (existing OTP flow), which is the only way the current schema supports a stable answer; documented as a known limitation inherited from the existing single-tenant `Customer.id` design, not solved here.
- **[Risk]** Unverified email/phone at checkout means a guest could type someone else's email/phone by mistake or maliciously, attaching an order (and a newly created account) to it. → **Mitigation**: no change in exposure versus today's manual entry of shipping email in some flows; the created account cannot be signed into without completing OTP against the real inbox/phone, so it grants no access to the real owner's other data.
- **[Trade-off]** Two round-trips to Supabase auth (listUsers/createUser) added to the checkout critical path. → Acceptable; already a synchronous multi-query flow (`priceCart`, stock re-check, order create).

## Migration Plan

No data migration. This is additive: existing signed-in checkout path is untouched; the guest path is new. No feature flag — ships as the new default checkout behavior for unauthenticated visitors once deployed. Rollback is a plain revert (no schema change to unwind).
