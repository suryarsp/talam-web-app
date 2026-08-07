# Managed Onboarding, License/Razorpay Tracking & Manual-Pay Escalations — Design

## Goal

Reposition Talam as a fully managed, end-to-end onboarding service: Talam
gets the tenant licensed with Razorpay, connects payments, and sets up the
store — the tenant does nothing beyond handing over a few basic details.
This changes the marketing pitch and adds internal tracking for the stages
of that managed process, plus closes gaps in the existing manual-payment
paths (UPI, and a new Pay-on-Delivery option) that the new positioning
puts more weight on.

## Background

Today's positioning is self-serve speed ("launch in 14 minutes from your
phone"). The Razorpay Route onboarding design
(`docs/superpowers/specs/2026-07-21-razorpay-route-onboarding-design.md`)
already models a tenant-driven KYC flow via Razorpay's hosted form. That
flow is being replaced for tenants who need a license: **Talam ops now
drives the license application and Razorpay KYC entirely outside the app**
(docs/calls, not an API integration), and the app's job shrinks to tracking
and displaying progress, not collecting documents.

`getMissingStoreConfig` (`lib/data/tenant.ts:58`) and `Tenant.paymentConfig`
(`prisma/schema.prisma:81`) are the existing hooks this design builds on.
`app/super-admin/` currently only has a stub `page.tsx` — this design is
the first real feature built there.

## Scope

**In scope:**
1. Marketing positioning rewrite (single-track "we do it all" pitch)
2. Ops-mediated onboarding stage tracking (Business Setup → License →
   Razorpay → Store Live), with a super-admin panel to update it and a
   read-only tenant-facing stepper
3. Pay-on-Delivery order type (interim manual-fulfillment version, ahead
   of any future Shiprocket integration)
4. Manual-UPI payment verification gap fix (currently unverified)
5. Dispute/escalation flow for manual-pay orders (report + store
   suspension)

**Out of scope (explicitly deferred):**
- Shiprocket integration / automated COD remittance — no code exists for
  this today; Pay-on-Delivery here is a manual-fulfillment stopgap only,
  not blocked on it, but doesn't replace it later.
- Any Razorpay KYC/license API integration — ops does this outside the
  app entirely.
- A second payment gateway (e.g. Cashfree) — researched, savings vs.
  Razorpay are marginal (1.6–1.95% vs 2%) and don't justify a new
  integration when zero-fee manual UPI is already available for
  fee-sensitive sellers.
- In-app messaging between ops and sellers, or between Talam and
  customers — escalation "contact" steps happen over phone/WhatsApp
  outside the app, same as today's doc collection.

## 1. Marketing Positioning

Single-track pitch: Talam handles everything end-to-end. No self-serve
"launch in 14 minutes" framing, and no mention of licensing or the
no-license path in the hero — that lives only in the FAQ.

- `components/marketing/hero.tsx`: headline/subhead rewritten around
  "we handle everything, you just sell" — exact copy to be finalized
  during implementation, but must not reference self-serve speed or
  licensing.
- `components/marketing/how-it-works.tsx`: reframed as a concierge
  journey (talk to us → we get you set up → your store goes live)
  instead of a self-serve wizard walkthrough.
- `components/marketing/faq.tsx`: new entries —
  - *"Do I need anything special to accept payments?"* → "No. We support
    small businesses that don't need a license at all — you can accept
    UPI payments directly with zero fees, no setup required."
  - *"How do I know a manual UPI payment is real?"* → explains the
    reference-number cross-check (see §4).

## 2. Onboarding Stage Tracking

**Data model** — two new columns on `Tenant`:

```prisma
enum OnboardingStage {
  business_setup
  license
  razorpay
  store_live
}

enum OnboardingStageStatus {
  not_started
  in_progress
  blocked
  done
}

model Tenant {
  // ...existing fields
  onboardingStage       OnboardingStage?       @default(business_setup) @map("onboarding_stage")
  onboardingStageStatus OnboardingStageStatus? @default(not_started) @map("onboarding_stage_status")
}
```

The `razorpay` stage does not get its own manual status — it derives from
the existing `Tenant.paymentConfig.status` (`pending` /
`needs_clarification` / `activated` / `rejected`), which the existing
webhook (`app/api/webhooks/razorpay/route.ts`) already updates. When that
status becomes `activated`, the same webhook handler additionally sets
`onboardingStage = store_live`, `onboardingStageStatus = done`.

**Super-admin panel** (`app/super-admin/`): tenant list + detail view.
Ops can set `onboardingStage`/`onboardingStageStatus` manually for the
`business_setup` and `license` stages only — the `razorpay` stage is
read-only there (driven by the webhook) to avoid the UI and the webhook
disagreeing about state.

**Tenant-facing stepper**: a read-only 4-step progress component on the
tenant admin dashboard, sourced from the same two fields plus
`paymentConfig.status` for the Razorpay step. No polling — refetched on
page load, consistent with how the existing Payments tab already shows
Razorpay status.

## 3. Pay-on-Delivery (manual, pre-Shiprocket)

- `PaymentProvider` enum (`prisma/schema.prisma:26`) gains `cod`.
- `Tenant.paymentConfig` gains a `codEnabled: boolean` flag, set from a
  new toggle on the Settings → Payments tab, alongside existing
  UPI/Razorpay config.
- Checkout (`app/checkout/checkout-client.tsx`) offers "Pay on Delivery"
  only when `codEnabled` is true. Selecting it skips the payment step —
  `placeOrderAction` (`app/checkout/actions.ts:202`) creates the order
  with `paymentProvider: 'cod'`, `paymentStatus: 'pending'` (existing
  enum value — no schema change needed there).
- `ponytail:` comment at the COD branch noting Shiprocket's automated
  COD remittance is the future upgrade path, not required for this to
  work — fulfillment is manual (owner delivers, then marks paid).

## 4. Manual-UPI Verification Gap

Currently `placeOrderAction` only regex-validates the UTR as 12 digits
(`app/checkout/actions.ts:212`) — it is never checked against a real
transaction, and nothing ever transitions `paymentStatus` away from
`pending`. A customer can enter a fabricated UTR and the seller has no
in-app signal to catch it.

Fix: a new `markOrderPaidAction` in `app/admin/orders/actions.ts`,
surfaced on orders where `paymentProvider` is `upi_manual` or `cod` and
`paymentStatus` is `pending`. The order list/detail shows the entered UTR
so the owner can cross-check it against their own UPI app or bank SMS
before confirming. This is a manual human check, not automated
verification — automated UTR verification would require a bank/UPI API
integration that's out of scope here.

## 5. Dispute / Escalation Flow

Talam never holds funds for `upi_manual`/`cod` orders (direct
customer-to-owner transfer), so it has no custody-based remedy — its only
levers are evidence (the order record + UTR) and account-level
consequences.

**Data model:**
```prisma
model Order {
  // ...existing fields
  disputeFlaggedAt DateTime? @map("dispute_flagged_at")
  disputeReason    String?   @map("dispute_reason")
}

model Tenant {
  // ...existing fields
  suspendedAt DateTime? @map("suspended_at")
}
```

**Customer side** (`app/store/orders/[id]/page.tsx`): a "Report a
problem" action appears once an order has been `status: pending` for 3+
days with `paymentProvider` `upi_manual` or `cod`. Submitting it sets
`disputeFlaggedAt`/`disputeReason` via a new action. No in-app messaging
— this only creates a flag for ops to act on.

**Ops side** (`app/super-admin/`): a "Flagged Orders" queue listing
tenant, order, amount, UTR, and days pending. Ops contacts the seller
outside the app (phone/WhatsApp, same as doc collection today) and, for
confirmed non-delivery/fraud, uses a "Suspend store" action that sets
`Tenant.suspendedAt`.

**Suspension enforcement**: `getTenantStorefront`
(`lib/data/tenant.ts:150`) returns `null` when `suspendedAt` is set.
Every storefront route already treats a `null` result as 404, so no new
enforcement point is needed. The tenant's own admin dashboard stays
reachable so the owner can still see and resolve orders while suspended.

## Testing

- Unit: `onboardingStage` auto-advance to `store_live` on Razorpay
  webhook activation.
- Unit: `markOrderPaidAction` (upi_manual and cod paths, rejects when
  already paid or provider is razorpay).
- Unit: checkout's conditional COD option rendering (`codEnabled` on/off).
- Unit: dispute-flag action (threshold gating, idempotency if flagged
  twice).
- Unit: `getTenantStorefront` returns `null` when `suspendedAt` is set.
- No e2e for the ops-mediated stage fields — they're plain DB writes from
  a form, no external API to mock.
