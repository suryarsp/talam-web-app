# Shiprocket Integration — Minimal Proof of Concept

Status: **superseded (2026-08-21)** — implemented, then replaced by per-tenant accounts
("Model A"). Kept for the API-shape and error-handling detail, which still hold.

What changed: the platform-level account described below never went live. Each tenant now
connects their own Shiprocket account (Settings → Shipping, or via Talam support), so the
shop is the shipper of record — their KYC, bank, COD remittance and RTO liability. The
`SHIPROCKET_EMAIL`/`PASSWORD`/`PICKUP_LOCATION`/`WEBHOOK_TOKEN` env vars below are gone;
credentials live encrypted in `shipping_credentials`, and the webhook token is per-tenant
(a single shared one would have let any shop mark another shop's order delivered).

Original status: approved for implementation (2026-08-19)

## Goal

Prove the Shiprocket shipping flow end-to-end on one real test order: admin
pushes a confirmed order to Shiprocket, gets a real AWB (tracking number),
Shiprocket's own notifications reach the customer as the shipment moves, and
a webhook flips our order to `delivered` when Shiprocket says so.

This is explicitly the platform-level PoC, not the full per-tenant
production shape described in [[project-talam-shiprocket-recommendation]].
Per-tenant Shiprocket accounts (needed for COD remittance) are deferred.

## Prerequisite (owner-side, not code)

Shiprocket has no separate sandbox environment — a real, KYC-verified
account with at least one pickup location and wallet balance is required
before `orders/create/adhoc` + `courier/assign/awb` will succeed. **This
must be done in the Shiprocket dashboard before the ship action can be
tested** — sign up at shiprocket.in, add a pickup location, fund the wallet.
The pickup location's nickname becomes `SHIPROCKET_PICKUP_LOCATION`.

Webhook testing target: a deployed Vercel preview URL (not local dev — not
publicly reachable). The webhook URL + a shared-secret header value are
configured in Shiprocket's dashboard (Settings → API → Webhook) once a
preview URL exists.

## Architecture

Mirrors the existing `lib/payments/razorpay.ts` pattern: a plain-`fetch`
client module, platform-level credentials via env vars, HMAC-free webhook
verified by a static shared secret (Shiprocket has no HMAC option, only a
configurable header value echoed back verbatim).

No schema migration. `Order.trackingId` already exists and holds the AWB —
same reuse as `Order.paymentId` already holding the Razorpay order id.

## Components

**`lib/shipping/shiprocket.ts`**
- `getShiprocketToken()` — POST `/v1/external/auth/login` with
  `SHIPROCKET_EMAIL` / `SHIPROCKET_PASSWORD`; cache the bearer token
  in-memory, refetch after ~9 days (Shiprocket tokens last 10).
- `createShiprocketShipment(order)` — maps our order to Shiprocket's
  `orders/create/adhoc` payload (billing address from
  `order.shippingAddress`, items from `OrderItem[]`, `payment_method`
  from `order.paymentProvider === 'cod' ? 'COD' : 'Prepaid'`), then
  `courier/assign/awb` (courier auto-selected — no `courier_id` passed).
  Returns `{ awbCode, courierName }`.
  - `ponytail:` package weight/dimensions are hardcoded
    (`0.5kg / 10x10x10cm`) — nothing in the schema tracks per-product
    weight. Upgrade path: add `Product.weight`, sum per order.
- `getShipmentTracking(awb)` — GET `courier/track/awb/:awb`, used only to
  build a link to Shiprocket's public tracking page; no polling UI.

**`app/admin/orders/actions.ts`**
- `shipViaShiprocketAction(orderId)` — `requireOwnerTenant`, guard
  `order.status === 'confirmed'`, call `createShiprocketShipment`, then
  reuse the existing `updateOrderStatus(tenantId, orderId, 'shipped',
  awbCode)` (already enforces the transition guard and writes the
  `OrderStatusEvent` row — no changes needed there).

**UI** (`order-action-sheet.tsx`, `order-details-modal.tsx`)
- One additional button next to the existing manual "Tracking number"
  input in the Ship Order confirm step: "Ship via Shiprocket" — calls the
  new action directly, skips manual AWB entry, same `onUpdated` callback
  the manual path already uses.
- Once `trackingId` is set, render it as a link to
  `https://shiprocket.co/tracking/<awb>`.

**`app/api/webhooks/shiprocket/route.ts`**
- Verify a static shared-secret header against `SHIPROCKET_WEBHOOK_TOKEN`.
- Payload gives `awb` + `current_status`. Look up the order by
  `trackingId` directly via `prisma.order.findFirst` — not tenant-scoped
  via `withTenant`, same reasoning as the Razorpay webhook (Shiprocket has
  no concept of tenant).
- Only `current_status === 'Delivered'` maps to anything —
  `updateOrderStatus(order.tenantId, order.id, 'delivered')`. Every other
  status is a 200 no-op. (Our `OrderStatus` enum has no
  "out for delivery"/RTO states, and `shipped → delivered` is the only
  transition currently possible from `shipped`, so nothing else needs a
  mapping for this PoC.)

## Data flow

Checkout → order `confirmed` (existing flow, unchanged) → admin clicks
"Ship via Shiprocket" → Shiprocket order + AWB created → order flips to
`shipped` with the real AWB → Shiprocket sends its own SMS/WhatsApp/email
to the customer as the shipment moves (per
[[project-talam-shiprocket-recommendation]], relying on Shiprocket's
bundled notifications rather than building our own) → Shiprocket webhook
hits us on delivery → order flips to `delivered`.

## Error handling

- `createShiprocketShipment` throws on any non-2xx from Shiprocket (missing
  wallet balance, invalid pickup location, serviceability failure for the
  pincode) — surfaced as `{ error }` from the server action, same pattern
  every other admin order action already uses. No retry logic; the admin
  can just click the button again.
- Webhook: missing/invalid secret → 401. Unknown AWB (order not found) →
  200 no-op with a `console.info`, same idempotent-log pattern the
  Razorpay webhook uses, since Shiprocket retries failed webhook
  deliveries.

## Testing

- Unit: none for the webhook/action themselves beyond what already exists
  for `updateOrderStatus` — this PoC is deliberately end-to-end-verified,
  not unit-tested, since the whole point is proving the real API
  integration works.
- Manual E2E (the actual deliverable): place a real order on the seeded
  `silk` tenant storefront → confirm it in admin → click "Ship via
  Shiprocket" → verify a real AWB appears and the tracking link resolves →
  verify Shiprocket's notification reaches the test customer's
  phone/email → (once a Vercel preview + webhook are wired) mark it
  delivered on Shiprocket's side and verify our order flips to
  `delivered`.

## Explicitly out of scope

- Per-tenant Shiprocket accounts / COD remittance.
- Serviceability/pincode pre-check before shipping.
- Return/RTO handling.
- Custom (non-Shiprocket) shipment notifications.
- Any admin UI for configuring Shiprocket credentials — env vars only.
