## Why

Checkout currently requires a signed-in customer (`requireAuth('/checkout')` redirects to `/auth` and blocks order placement). Requiring sign-in before purchase is friction that costs conversions — shoppers should be able to buy without first completing an OTP flow. We still need a way to reach every buyer for order updates, so email and phone become mandatory checkout fields instead of an auth gate.

## What Changes

- Checkout no longer requires an authenticated session. `placeOrderAction` accepts a guest path that does not call `requireAuth`.
- Email and phone number become mandatory fields on the checkout form (currently phone lives on the address, email does not exist as a checkout field at all) for both guest and signed-in flows.
- On order placement, the system resolves a `Customer` (and matching Supabase `auth.users` row) by email or phone:
  - If a Supabase auth user already exists for that email/phone, the order is attached to that existing customer (no duplicate account, no duplicate `Customer` row).
  - Otherwise a new passwordless Supabase auth user is created via the service-role admin client (`lib/supabase/admin.ts`), together with a matching `Customer` row, and the order is attached to it.
- A signed-in shopper's checkout behavior is unchanged (their existing session is used as today); the new resolution path only applies when no session is present.
- Guests are not signed into the created account automatically — they can access order history later via the existing phone/email OTP sign-in (`components/auth/otp-form.tsx`), which already supports both methods.

### Out of scope

- Any change to the OTP sign-in UI/flow itself.
- Merging or de-duplicating pre-existing `Customer` rows that already diverge across email vs. phone for the same person.

## Capabilities

### New Capabilities
- `guest-checkout`: Placing an order without an authenticated session, using mandatory email + phone to resolve or create the underlying Supabase account and `Customer` record.

### Modified Capabilities
(none — no existing capability spec covers checkout today; this is the first spec written for it)

## Impact

- `app/checkout/actions.ts` — `placeOrderAction` (and the `PlaceOrderInput` type) drop the hard `requireAuth` call for the guest path and gain email/phone-based customer resolution.
- `app/checkout/checkout-client.tsx`, `components/checkout/*` — checkout form gains a mandatory email field (phone already collected as part of the address).
- `lib/auth-guard.ts` — checkout stops depending on `requireAuth`; a new guest-safe tenant-scoped helper is likely needed.
- `lib/supabase/admin.ts` — used to create Supabase auth users from server actions (new usage; today only imported for admin/service-role needs elsewhere).
- `prisma/schema.prisma` — `Customer` has no unique constraint on `(tenantId, email)` / `(tenantId, phone)` today; lookup-or-create logic must handle this explicitly (see design.md).
