# Observability: Error Capture + Order Audit Log — Implementation Plan (Data Track)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Track order:** Task 1 (Sentry) is already shipped and needs no further code — only owner-side account setup. Task 2 (`OrderEvent` schema) can land any time. Task 3 (wiring the writes) is **blocked** on `docs/superpowers/plans/2026-07-06-talam-phase-3-commerce-data.md`'s `updateOrderPayment` and `docs/superpowers/plans/2026-07-06-talam-phase-5-tenant-admin-data.md`'s `updateOrderStatus` existing in the repo first — neither function exists yet as of this writing (both are still plan-only). Do not start Task 3 until those two land.

**Goal:** Give the app three things it was missing for debugging and trust: (1) automatic error/crash capture with owner-configurable email alerts, (2) a durable audit trail of what happened to an order and when, (3) an honest accounting of what "heavy usage" alerting would need that isn't built.

**Why this scope and not more:** The original ask bundled "transactions, publishers added, errors" into one "analytics + alerting" system. Two of those three already have a home in this codebase:
- **Errors/crashes** → Sentry (this plan's Task 1, already done).
- **"Publishers added"** → this is the existing draft/publish workflow's `PublishLog` model (`docs/superpowers/plans/2026-07-18-profile-menu-and-publish-workflow-implementation.md`), which already records one row per publish action. Nothing new needed here — flagged so it isn't accidentally rebuilt.
- **Transactions** → genuinely missing. `Order` rows are overwritten in place with no history. That's the real gap this plan closes (Task 2/3).

**Architecture:** `@sentry/nextjs` for error capture (already wired at the instrumentation layer, catches everything automatically — no per-route code needed). A new `OrderEvent` table, written at the two places an order's state already changes (payment webhook, admin status-update action) — an append-only log, never mutated, one row per transition. No new alerting pipeline is built for orders: the store-owner order-paid email is already scoped in §3.4 of the master design doc via Resend and is unaffected by this plan.

**Tech Stack:** `@sentry/nextjs` (installed), Prisma 7.8, Vitest.

---

## Global Constraints

- Do not build a generic multi-purpose "AuditLog"/"Event" table. `OrderEvent` is scoped narrowly to `Order` state transitions — the one entity in this codebase that changes state repeatedly with no history today. Publish events already have `PublishLog`; there is no third "thing" that needs generic event logging yet.
- `OrderEvent` is written, never read back into any UI, in this plan. Surfacing it (e.g. an order-detail timeline, or a super-admin cross-tenant view) is a separate follow-up — flagged in Known Gaps, not built here, since no Paper artboard specs a timeline UI for it yet.
- Sentry crash/error alerting is configured entirely in the Sentry dashboard (Settings → Alerts → Issue Alert → email action) by whoever holds the Sentry account — not something this codebase can configure via code, and not re-implemented as a custom notification system.
- "Heavy usage" alerting (traffic spikes, elevated error rate as a %) has no data source in this codebase today. `@vercel/analytics` (already installed) is a passive dashboard package, not a threshold-alerting API on the free tier. This plan does not fake it with a cron job polling request counts — flagged as a real V2 gap in the master design doc §12, not built.
- Follow this codebase's Decimal convention: `Order.total` is Prisma `Decimal` — narrow to `number` via `Number(...)` before storing in any JSON payload field.
- Restart (not reload) the dev server after the Prisma schema change in Task 2, per this project's Preview Tool Glitches convention.

---

## Known Gaps (flagged, not silently invented)

- **No UI reads `OrderEvent` yet.** This plan only writes the table. A per-order timeline (customer-facing `/orders/[id]` or admin's order detail) and a cross-tenant super-admin view are natural follow-ups once real usage data exists to justify the UI — not built here, since building a screen for a table with zero real rows is speculative.
- **Heavy-usage/traffic alerting is not built and has no clear owner yet.** It would need either a metrics endpoint Vercel doesn't expose on the free analytics tier, or a separate paid service (Axiom, Datadog, Better Stack). Recorded as an open V2 item in the master design doc §12 rather than stubbed with fake thresholds.
- **Task 3 (wiring the writes) cannot start until Phase 3/5 commerce-data land.** `updateOrderPayment` (webhook handler) and `updateOrderStatus` (admin Server Action) are both still plan-only — grepped the live repo and neither function exists yet. This mirrors the same dependency Phase 7 growth-data already declares for its own order-event wiring.
- **Sentry captures nothing until a real DSN is supplied.** `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` are blank in `.env.example`; `Sentry.init({ dsn: undefined })` is a safe no-op, not an error, but also not doing anything. Creating the Sentry account and pasting the DSN into `.env.local`/Vercel is a manual step for the store owner — account creation is out of scope for an agent to perform.

---

### Task 1: Sentry error/crash capture — DONE (2026-07-18)

**Files (already created/modified, no further action needed):**
- `instrumentation.ts` — server + edge `Sentry.init`, `onRequestError = Sentry.captureRequestError`
- `instrumentation-client.ts` — browser `Sentry.init`, `onRouterTransitionStart = Sentry.captureRouterTransitionStart`
- `next.config.ts` — wrapped with `withSentryConfig(nextConfig, { org, project, silent: true })`
- `.env.example` — added `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`

Verified: `npx tsc --noEmit` clean, `npm run build` clean (Turbopack production build, all 20 routes compiled).

- [ ] **Remaining step (owner action, not agent-executable):** Create a free Sentry project (Next.js platform) at sentry.io, fill in the five env vars above in `.env.local` and Vercel, then in Sentry → Settings → Alerts create an Issue Alert rule ("A new issue is created" or "issue affects more than N users") with an email action pointed at the founder's address.

---

### Task 2: `OrderEvent` schema

**Files:**
- Modify: `prisma/schema.prisma`
- Migration: generated by `npx prisma migrate dev --name order_event_log`

**Interfaces:**
- Produces: `OrderEvent` model (`id`, `tenantId`, `orderId`, `type`, `fromStatus`, `toStatus`, `note`, `createdAt`), `Order.events` relation.

- [ ] **Step 1: Add the model**

In `prisma/schema.prisma`, add directly after the `OrderItem` model:

```prisma
model OrderEvent {
  id         String   @id @default(uuid()) @db.Uuid
  tenantId   String   @map("tenant_id") @db.Uuid
  orderId    String   @map("order_id") @db.Uuid
  type       String   // 'created' | 'payment_pending' | 'paid' | 'failed' | 'status_changed' | 'cancelled' | 'refunded'
  fromStatus String?  @map("from_status")
  toStatus   String?  @map("to_status")
  note       String?  // e.g. tracking ID entered, webhook payment ID — free text, not structured JSON (ponytail: no need for a payload jsonb column until a second consumer needs structured fields)
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz

  tenant Tenant @relation(fields: [tenantId], references: [id])
  order  Order  @relation(fields: [orderId], references: [id])

  @@index([orderId])
  @@map("order_events")
}
```

Add the inverse relations: `events OrderEvent[]` on both `Tenant` and `Order`.

- [ ] **Step 2: Generate and apply the migration**

Run: `npx prisma migrate dev --name order_event_log`
Expected: new migration file created, applies cleanly against the dev Supabase DB (via the connection pooler — see project memory on direct-host connections failing).

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add OrderEvent audit table for order lifecycle history"
```

---

### Task 3: Write `OrderEvent` rows at the two order-mutation points (BLOCKED — see Global Constraints)

**Do not start until `updateOrderPayment` and `updateOrderStatus` exist in the repo.**

**Files (once unblocked):**
- Create: `lib/data/order-events.ts`
- Create: `lib/data/order-events.test.ts`
- Modify: `lib/data/orders.ts` (wherever `updateOrderPayment` lands per Phase 3 commerce-data) — call `logOrderEvent` after the payment status write
- Modify: `app/store/admin/orders/actions.ts` (`updateOrderStatus` per Phase 5 tenant-admin-data) — call `logOrderEvent` after the status write

**Interfaces:**
- Produces: `logOrderEvent(tenantId: string, orderId: string, event: { type: string; fromStatus?: string; toStatus?: string; note?: string }): Promise<void>`

- [ ] **Step 1: Write failing test for `logOrderEvent`**

```typescript
import { describe, it, expect, vi } from 'vitest'

const createMock = vi.fn().mockResolvedValue({ id: 'evt-1' })
vi.mock('@/lib/prisma', () => ({
  prisma: { orderEvent: { create: createMock } },
}))

import { logOrderEvent } from './order-events'

describe('logOrderEvent', () => {
  it('writes an order event row', async () => {
    await logOrderEvent('tenant-1', 'order-1', { type: 'paid', fromStatus: 'pending', toStatus: 'confirmed' })
    expect(createMock).toHaveBeenCalledWith({
      data: { tenantId: 'tenant-1', orderId: 'order-1', type: 'paid', fromStatus: 'pending', toStatus: 'confirmed', note: undefined },
    })
  })
})
```

- [ ] **Step 2: Run test — verify it fails**, then **Step 3: implement**:

```typescript
import { prisma } from '@/lib/prisma'

export async function logOrderEvent(
  tenantId: string,
  orderId: string,
  event: { type: string; fromStatus?: string; toStatus?: string; note?: string }
): Promise<void> {
  await prisma.orderEvent.create({
    data: { tenantId, orderId, ...event },
  })
}
```

- [ ] **Step 4: Run test — verify it passes.**

- [ ] **Step 5: Call `logOrderEvent` from both mutation points**, immediately after each existing `prisma.order.update(...)` call — `type: 'paid'` (or `'failed'`) in the webhook handler, `type: 'status_changed'` (with the entered `trackingId` as `note` when shipping) in the admin action. Do not change either function's return type or existing behavior — this is an additive side-effect call, not a refactor.

- [ ] **Step 6: Commit**

```bash
git add lib/data/order-events.ts lib/data/order-events.test.ts <the two modified files>
git commit -m "feat: log OrderEvent rows on payment webhook and admin status changes"
```

---

## Post-Plan Verification

- [ ] `npx tsc --noEmit` and `npm run build` clean (already re-verified for Task 1 in this session).
- [ ] Once Task 3 is unblocked and done: `npm run test:run` passes including the new `order-events.test.ts`; manually trigger a UPI-manual order confirm and an admin status change on the seeded `silk` tenant, confirm `order_events` rows appear via `npx prisma studio` or a direct query.
- [ ] Confirm Sentry captures a deliberately-thrown test error once a real DSN is set (`throw new Error('sentry test')` in a scratch route, check it appears in the Sentry dashboard, then delete the scratch route).

---

## Self-Review

- **Scope discipline:** Of the three things originally requested (transactions, publishers, errors), two already had a correct home in this codebase (Sentry for errors, `PublishLog` for publish events) — this plan avoids rebuilding either. Only the genuine gap (order audit trail) gets new schema + code.
- **No speculative alerting infra:** "Heavy usage" alerting is named as an open gap with no invented cron job or fake threshold — matches this codebase's Known Gaps convention (see Phase 6 platform-data's billing/role gaps for the same pattern).
- **Dependency honesty:** Task 3 is explicitly blocked on two functions that were grepped directly in the live repo and confirmed not to exist yet, not assumed from the plan docs describing them.
- **ponytail:** `OrderEvent.note` is a plain nullable string, not a `jsonb` payload column — there's exactly one field (`trackingId`) that would ever go there today; add structure only when a second structured consumer shows up.
