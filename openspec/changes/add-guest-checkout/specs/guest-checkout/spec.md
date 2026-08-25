## Purpose

Lets a shopper place an order without first completing sign-in, while still guaranteeing every order has a reachable email and phone number and a durable customer record behind it.

## ADDED Requirements

### Requirement: Checkout does not require an authenticated session
The system SHALL allow order placement without a signed-in Supabase session. An unauthenticated visitor SHALL be able to complete checkout end-to-end (quote, payment, order confirmation) without being redirected to the sign-in page.

#### Scenario: Unauthenticated visitor places an order
- **WHEN** a visitor with no Supabase session submits the checkout form with a valid cart, address, email, and phone
- **THEN** the order is created and the visitor is not redirected to `/auth`

#### Scenario: Signed-in shopper checkout is unchanged
- **WHEN** a shopper with an active Supabase session submits the checkout form
- **THEN** the order is attached to their existing `Customer` record, exactly as before this change

### Requirement: Email and phone are mandatory at checkout
The system SHALL require a valid email address and a valid phone number on every checkout submission, regardless of sign-in state. The system SHALL reject submission with a field-level error when either is missing or fails format validation, before any order is created.

#### Scenario: Missing email is rejected
- **WHEN** a checkout submission omits the email field
- **THEN** the system returns a validation error and does not create an order

#### Scenario: Missing phone is rejected
- **WHEN** a checkout submission omits the phone field
- **THEN** the system returns a validation error and does not create an order

#### Scenario: Malformed email or phone is rejected
- **WHEN** a checkout submission includes an email or phone that fails format validation
- **THEN** the system returns a validation error and does not create an order

### Requirement: Guest order placement resolves or creates a customer account
When no session is present, the system SHALL resolve the checkout email/phone to a `Customer` record on the current tenant, using this order:
1. An existing `Customer` on this tenant matching the submitted email or phone SHALL be reused, and the order attached to it.
2. If no match exists, the system SHALL create a new Supabase `auth.users` account and a matching `Customer` record for this tenant, and attach the order to it.

The system SHALL NOT create a duplicate `Customer` or duplicate Supabase auth account for an email/phone that already resolves to one on the same tenant.

#### Scenario: Guest email matches an existing customer
- **WHEN** a guest checks out with an email that already belongs to a `Customer` on this tenant
- **THEN** the new order is attached to that existing `Customer` and no new account is created

#### Scenario: Guest phone matches an existing customer
- **WHEN** a guest checks out with a phone number that already belongs to a `Customer` on this tenant, using a different email than that customer's
- **THEN** the new order is attached to that existing `Customer` and no new account is created

#### Scenario: Guest email and phone match no existing customer
- **WHEN** a guest checks out with an email and phone that match no `Customer` on this tenant
- **THEN** a new Supabase auth account and a new `Customer` record are created for this tenant, and the order is attached to it

### Requirement: Guest accounts are created without an active session
Creating a Supabase account for a guest order SHALL NOT sign that browser session in. The guest SHALL remain unauthenticated after checkout completes, and SHALL be able to access their order and account later only by completing the existing phone or email OTP sign-in with the same email/phone used at checkout.

#### Scenario: Guest is not signed in after placing an order
- **WHEN** a guest order finishes creating a new account
- **THEN** the browser that placed the order has no authenticated Supabase session immediately afterward

#### Scenario: Guest can sign in later with the same email or phone
- **WHEN** a guest who placed an order later completes phone or email OTP sign-in using the same email or phone from checkout
- **THEN** they are signed into the `Customer` account that owns their guest order
