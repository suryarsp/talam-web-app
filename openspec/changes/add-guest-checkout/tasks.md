## 1. Customer resolution helper

- [ ] 1.1 Add `resolveOrCreateGuestCustomer(tenantId, { email, phone })` in `lib/checkout-customer.ts` (or similar) implementing design.md Decision 1: tenant-scoped `Customer` lookup by email/phone, then global Supabase auth lookup, then create; verify with a unit test covering all three branches plus the "already registered elsewhere" error branch
- [ ] 1.2 Add a `GuestAccountConflictError` (or equivalent) thrown when Supabase auth already has an account for the email/phone but this tenant has no matching `Customer` row; verify a test asserts the specific error type, not a generic throw

## 2. Checkout action changes

- [ ] 2.1 Update `PlaceOrderInput`/`placeOrderAction` in `app/checkout/actions.ts` to accept mandatory `email` and `phone`, branch on `supabase.auth.getUser()` instead of `requireAuth('/checkout')`, and call `resolveOrCreateGuestCustomer` on the guest path; verify with a test that a guest submission with no session creates an order without redirecting
- [ ] 2.2 Map `GuestAccountConflictError` to the checkout error shape already used by `placeOrderAction` (e.g. `{ error: '...' }`) with the sign-in-instead message from design.md; verify with a test
- [ ] 2.3 Keep the signed-in path's behavior byte-for-byte equivalent (existing `Customer` reuse via session `user.id`); verify existing checkout action tests still pass unmodified

## 3. Checkout form

- [ ] 3.1 Add a mandatory email field to the checkout form (`app/checkout/checkout-client.tsx` / `components/checkout/*`), pre-filled from session email when signed in, editable when a guest; verify a checkout attempt with the field empty shows a validation error and does not submit
- [ ] 3.2 Ensure the existing address phone field is treated as the mandatory checkout phone (or add a dedicated phone field if address entry can be skipped); verify a checkout attempt with no phone shows a validation error and does not submit
- [ ] 3.3 Remove/relax any client-side gate that currently blocks an unauthenticated visitor from reaching `/checkout`; verify an unauthenticated visitor can load checkout and reach payment

## 4. Verification

- [ ] 4.1 Add an integration/e2e-style test placing a guest order end-to-end (quote → address → email/phone → payment → order created) and asserting no Supabase session exists afterward, per spec scenario "Guest is not signed in after placing an order"
- [ ] 4.2 Add a test for the repeat-guest scenario: same email placing two orders on the same tenant results in one `Customer` row and one Supabase auth account, not two
- [ ] 4.3 Add a test that a guest can later sign in via the existing OTP form using the checkout email/phone and see their guest order under their account
- [ ] 4.4 Run the full test suite and typecheck/lint; verify all pass before marking this change ready to archive
