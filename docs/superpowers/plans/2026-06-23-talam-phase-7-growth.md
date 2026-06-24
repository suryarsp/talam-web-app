# Phase 7: Growth Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up the post-checkout notification pipeline (Resend order emails), PostHog analytics events, `@vercel/og` social cards for WhatsApp sharing, and Upstash Redis OTP rate limiting.

**Architecture:** All side effects run via `after()` already stubbed in Phase 3 — this phase fills in the real implementations. OG images are generated at `/{store}/og` via `@vercel/og` and referenced in product/store `<head>`. Rate limiting wraps the OTP endpoint with a 5-per-10-min sliding window.

**Tech Stack:** `@vercel/og`, Resend SDK, PostHog Node SDK, `@upstash/ratelimit` + `@upstash/redis`, Next.js `after()`

## Global Constraints

- Inherit all prior phase constraints
- `after()` callbacks must never throw — wrap in try/catch and log errors
- No PII in PostHog events (no phone numbers, no emails — use `user_id` and `tenant_id`)
- Rate limit key: `otp:{phone}` — 5 attempts per 600 seconds (10 min)
- OG images: 1200×630px, uses tenant brand color and logo

---

### Task 1: OTP Rate Limiting

**Files:**
- Create: `lib/rate-limit.ts`
- Create: `lib/rate-limit.test.ts`
- Modify: `components/auth/otp-form.tsx` (call `/api/otp/send` instead of Supabase directly — adds server-side rate check)
- Create: `app/api/otp/send/route.ts`

**Interfaces:**
- Produces: `checkOtpRateLimit(phone)` → `{ allowed: boolean; remaining: number }`
- Produces: `POST /api/otp/send` — rate-checked OTP trigger endpoint

- [ ] **Step 1: Write failing test**

Create `lib/rate-limit.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: vi.fn().mockImplementation(() => ({
    limit: vi.fn().mockResolvedValue({ success: true, remaining: 4 }),
  })),
  slidingWindow: vi.fn(),
}))

vi.mock('@upstash/redis', () => ({
  Redis: { fromEnv: vi.fn().mockReturnValue({}) },
}))

import { checkOtpRateLimit } from './rate-limit'

describe('checkOtpRateLimit', () => {
  it('returns allowed:true when under limit', async () => {
    const result = await checkOtpRateLimit('+919876543210')
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm test -- --run lib/rate-limit.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement rate limiter**

Create `lib/rate-limit.ts`:
```typescript
import { Ratelimit, slidingWindow } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

const otpLimiter = new Ratelimit({
  redis,
  limiter: slidingWindow(5, '10 m'),
  prefix: 'talam:otp',
})

export async function checkOtpRateLimit(phone: string): Promise<{ allowed: boolean; remaining: number }> {
  const { success, remaining } = await otpLimiter.limit(`otp:${phone}`)
  return { allowed: success, remaining }
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npm test -- --run lib/rate-limit.test.ts
```

Expected: PASS

- [ ] **Step 5: Create OTP send API route (with rate limit)**

Create `app/api/otp/send/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { checkOtpRateLimit } from '@/lib/rate-limit'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const { phone } = await request.json() as { phone?: string }

  if (!phone) {
    return NextResponse.json({ error: 'Phone required' }, { status: 400 })
  }

  const { allowed, remaining } = await checkOtpRateLimit(phone)

  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many OTP requests. Try again in 10 minutes.' },
      { status: 429, headers: { 'Retry-After': '600' } }
    )
  }

  // Trigger OTP via Supabase Auth (fires SMS Hook → MSG91)
  const supabase = createAdminClient()
  const { error } = await supabase.auth.signInWithOtp({ phone })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, remaining })
}
```

- [ ] **Step 6: Update OTP form to use rate-limited endpoint**

Modify `components/auth/otp-form.tsx` — replace the `supabase.auth.signInWithOtp` call in `handleSendOtp`:

Old:
```typescript
const { error } = await supabase.auth.signInWithOtp({
  phone: `+91${cleaned}`,
})
```

New:
```typescript
const res = await fetch('/api/otp/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: `+91${cleaned}` }),
})
const data = await res.json()
if (!res.ok) {
  setError(data.error ?? 'Failed to send OTP')
  return
}
```

- [ ] **Step 7: Commit**

```bash
git add lib/rate-limit.ts lib/rate-limit.test.ts app/api/otp/ components/auth/otp-form.tsx
git commit -m "feat: add Upstash Redis OTP rate limiting (5 per 10 min per phone)"
```

---

### Task 2: PostHog Analytics

**Files:**
- Create: `lib/analytics.ts`
- Create: `components/providers/posthog-provider.tsx`
- Modify: `app/layout.tsx` (wrap with PostHog provider)
- Modify: `app/store/checkout/actions.ts` (add PostHog event in after())

**Interfaces:**
- Produces: `trackEvent(event, properties)` server-side PostHog call
- Produces: client-side `PostHogProvider` that auto-captures pageviews

- [ ] **Step 1: Install PostHog**

```bash
npm install posthog-js posthog-node
```

- [ ] **Step 2: Create server-side analytics helper**

Create `lib/analytics.ts`:
```typescript
import { PostHog } from 'posthog-node'

let client: PostHog | null = null

function getClient(): PostHog {
  if (!client) {
    client = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      host: 'https://app.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    })
  }
  return client
}

export async function trackEvent(
  userId: string,
  event: string,
  properties: Record<string, unknown> = {}
) {
  try {
    const ph = getClient()
    ph.capture({ distinctId: userId, event, properties })
    await ph.flush()
  } catch (err) {
    console.error('[PostHog] trackEvent failed:', err)
  }
}
```

- [ ] **Step 3: Create PostHog client provider**

Create `components/providers/posthog-provider.tsx`:
```typescript
'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: 'https://app.posthog.com',
      capture_pageview: true,
      capture_pageleave: true,
      persistence: 'localStorage',
    })
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
```

- [ ] **Step 4: Add PostHog provider to root layout**

Modify `app/layout.tsx`:
```typescript
import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { PostHogProvider } from '@/components/providers/posthog-provider'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Talam — Your platform. Your business.',
  description: 'Multi-tenant e-commerce for Indian small businesses.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={geist.className}>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 5: Add PostHog event to order creation**

Modify `app/store/checkout/actions.ts` — replace the stub `after()` block:

Old:
```typescript
after(async () => {
  console.log(`[after] Order ${order.id} created for tenant ${tenantId}`)
})
```

New:
```typescript
after(async () => {
  try {
    await trackEvent(user.id, 'order_placed', {
      order_id: order.id,
      tenant_id: tenantId,
      amount: total,
      item_count: cartItems.length,
    })
  } catch (err) {
    console.error('[after] PostHog event failed:', err)
  }
})
```

Add import at top: `import { trackEvent } from '@/lib/analytics'`

- [ ] **Step 6: Commit**

```bash
git add lib/analytics.ts components/providers/ app/layout.tsx app/store/checkout/actions.ts
git commit -m "feat: add PostHog analytics with server-side order events and client-side pageview tracking"
```

---

### Task 3: Resend Order Confirmation Emails

**Files:**
- Create: `lib/email.ts`
- Create: `emails/order-confirmation.tsx`
- Create: `emails/new-order-alert.tsx`
- Modify: `app/api/webhooks/instamojo/route.ts` (add Resend call in after())
- Modify: `app/store/checkout/actions.ts` (add Resend for UPI Manual orders)

**Interfaces:**
- Produces: `sendOrderConfirmation(to, order)` — customer email
- Produces: `sendNewOrderAlert(to, order)` — store owner email

- [ ] **Step 1: Create email helper**

Create `lib/email.ts`:
```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = `orders@mail.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`

type OrderSummary = {
  id: string
  total: number
  items: { productName: string; quantity: number; unitPrice: number; size?: string | null }[]
  customerName: string
  storeName: string
}

export async function sendOrderConfirmation(to: string, order: OrderSummary) {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Order confirmed — ${order.storeName}`,
      html: `
        <h2>Thank you for your order!</h2>
        <p>Order #${order.id.slice(-8).toUpperCase()} from <strong>${order.storeName}</strong></p>
        <table>
          ${order.items.map((item) => `
            <tr>
              <td>${item.productName}${item.size ? ` (${item.size})` : ''} ×${item.quantity}</td>
              <td>₹${(item.unitPrice * item.quantity).toLocaleString('en-IN')}</td>
            </tr>
          `).join('')}
        </table>
        <p><strong>Total: ₹${order.total.toLocaleString('en-IN')}</strong></p>
      `,
    })
  } catch (err) {
    console.error('[Resend] sendOrderConfirmation failed:', err)
  }
}

export async function sendNewOrderAlert(to: string, order: OrderSummary) {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `New order ₹${order.total.toLocaleString('en-IN')} from ${order.customerName}`,
      html: `
        <h2>New order received!</h2>
        <p>Order #${order.id.slice(-8).toUpperCase()} · ₹${order.total.toLocaleString('en-IN')}</p>
        <p>From: ${order.customerName}</p>
        <p>${order.items.map((i) => `${i.productName} ×${i.quantity}`).join(', ')}</p>
      `,
    })
  } catch (err) {
    console.error('[Resend] sendNewOrderAlert failed:', err)
  }
}
```

- [ ] **Step 2: Wire emails into Instamojo webhook after()**

Modify `app/api/webhooks/instamojo/route.ts` — replace the stub `after()` block:

Old:
```typescript
after(async () => {
  console.log(`[after] Order ${orderId} paid via Instamojo`)
})
```

New:
```typescript
after(async () => {
  try {
    const fullOrder = await getOrder(tenantId, orderId)
    if (!fullOrder) return

    const tenant = await withTenant(tenantId, (db) =>
      db.tenant.findUnique({ where: { id: tenantId }, select: { name: true } })
    )

    // Customer email (if we have their email — stored in customer record)
    const customer = await withTenant(tenantId, (db) =>
      db.customer.findUnique({ where: { id: fullOrder.customerId }, select: { email: true, name: true } })
    )

    const orderSummary = {
      id: fullOrder.id,
      total: Number(fullOrder.total),
      items: fullOrder.items.map((i) => ({
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        size: i.size,
      })),
      customerName: customer?.name ?? 'Customer',
      storeName: tenant?.name ?? 'Store',
    }

    if (customer?.email) {
      await sendOrderConfirmation(customer.email, orderSummary)
    }

    await trackEvent(fullOrder.customerId, 'order_paid', {
      order_id: fullOrder.id,
      tenant_id: tenantId,
      amount: Number(fullOrder.total),
    })
  } catch (err) {
    console.error('[after] Instamojo post-payment failed:', err)
  }
})
```

Add imports: `import { sendOrderConfirmation } from '@/lib/email'` and `import { trackEvent } from '@/lib/analytics'`

- [ ] **Step 3: Commit**

```bash
git add lib/email.ts app/api/webhooks/instamojo/route.ts
git commit -m "feat: add Resend order confirmation and new-order alert emails wired to payment webhooks"
```

---

### Task 3.5: Owner Email Nurture Sequences

**Files:**
- Modify: `app/api/webhooks/instamojo/route.ts` (fix missing owner email recipient)
- Create: `app/api/cron/nurture/route.ts` (Vercel Cron — daily nurture check)
- Modify: `vercel.json` (add cron schedule)

**Interfaces:**
- Produces: daily cron job that checks tenant state and sends targeted nurture emails
- Fixes: `sendNewOrderAlert` now fetches owner email before sending

- [ ] **Step 1: Fix owner email in Instamojo webhook**

In `app/api/webhooks/instamojo/route.ts`, inside the `after()` block, replace the stub with:
```typescript
after(async () => {
  try {
    const fullOrder = await getOrder(tenantId, orderId)
    if (!fullOrder) return

    const [tenant, customer] = await Promise.all([
      withTenant(tenantId, (db) =>
        db.tenant.findUnique({ where: { id: tenantId }, select: { name: true, ownerId: true } })
      ),
      withTenant(tenantId, (db) =>
        db.customer.findUnique({ where: { id: fullOrder.customerId }, select: { email: true, name: true } })
      ),
    ])

    const orderSummary = {
      id: fullOrder.id,
      total: Number(fullOrder.total),
      items: fullOrder.items.map((i) => ({
        productName: i.productName, quantity: i.quantity,
        unitPrice: Number(i.unitPrice), size: i.size,
      })),
      customerName: customer?.name ?? 'Customer',
      storeName: tenant?.name ?? 'Store',
    }

    if (customer?.email) await sendOrderConfirmation(customer.email, orderSummary)

    // Fetch owner email via Supabase admin
    if (tenant?.ownerId) {
      const { data: ownerData } = await createAdminClient().auth.admin.getUserById(tenant.ownerId)
      if (ownerData?.user?.email) await sendNewOrderAlert(ownerData.user.email, orderSummary)
    }

    await trackEvent(fullOrder.customerId, 'order_paid', {
      order_id: fullOrder.id, tenant_id: tenantId, amount: Number(fullOrder.total),
    })
  } catch (err) {
    console.error('[after] post-payment failed:', err)
  }
})
```

- [ ] **Step 2: Create nurture cron route**

Create `app/api/cron/nurture/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

// Vercel Cron calls this daily at 09:00 IST
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const tenants = await prisma.tenant.findMany({
    select: { id: true, ownerId: true, name: true, tier: true, trialEndsAt: true, createdAt: true },
  })

  let sent = 0

  for (const tenant of tenants) {
    const daysSinceCreated = Math.floor((now.getTime() - tenant.createdAt.getTime()) / 86400000)

    // Fetch owner email
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const { data: ownerData } = await createAdminClient().auth.admin.getUserById(tenant.ownerId)
    const ownerEmail = ownerData?.user?.email
    if (!ownerEmail) continue

    const productCount = await prisma.product.count({ where: { tenantId: tenant.id, isActive: true } })
    const orderCount = await prisma.order.count({ where: { tenantId: tenant.id } })
    const trialExpiresTomorrow =
      tenant.tier === 'trial' && tenant.trialEndsAt &&
      Math.floor((tenant.trialEndsAt.getTime() - now.getTime()) / 86400000) === 1

    // Day 0: welcome
    if (daysSinceCreated === 0) {
      await sendEmail({ to: ownerEmail, subject: `Welcome to Talam — add your first product`, html: `<p>Hi! Your store <strong>${tenant.name}</strong> is ready. <a href="https://${tenant.id}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/admin/products/new">Add your first product →</a></p>` })
      sent++
    }
    // Day 2: no products added
    else if (daysSinceCreated === 2 && productCount === 0) {
      await sendEmail({ to: ownerEmail, subject: `Need help setting up ${tenant.name}?`, html: `<p>It only takes 5 minutes to add your first product. <a href="https://${tenant.id}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/admin/products/new">Add a product →</a></p>` })
      sent++
    }
    // Day 7: products but no orders
    else if (daysSinceCreated === 7 && productCount > 0 && orderCount === 0) {
      await sendEmail({ to: ownerEmail, subject: `Your store is live — share it to get your first order`, html: `<p>Share your store link with customers: <strong>https://${tenant.id}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}</strong></p>` })
      sent++
    }
    // Day 13: trial ends tomorrow
    else if (trialExpiresTomorrow) {
      await sendEmail({ to: ownerEmail, subject: `Your Talam trial ends tomorrow`, html: `<p>Subscribe to keep selling. <a href="https://${tenant.id}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/admin/billing">Choose a plan →</a></p>` })
      sent++
    }
  }

  return NextResponse.json({ ok: true, sent })
}
```

Add `CRON_SECRET` to `.env.local` (generate with `openssl rand -hex 32`).

- [ ] **Step 3: Add cron schedule to vercel.json**

Create (or update) `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/nurture",
      "schedule": "0 3 * * *"
    }
  ]
}
```
(03:00 UTC = 08:30 IST)

- [ ] **Step 4: Commit**

```bash
git add app/api/webhooks/instamojo/route.ts app/api/cron/ vercel.json
git commit -m "feat: add owner nurture email sequences via Vercel Cron + fix owner email in order alerts"
```

---

### Task 4: OG Images for WhatsApp Sharing

**Files:**
- Create: `app/store/og/route.tsx`
- Modify: `app/store/page.tsx` (add OG metadata)
- Modify: `app/store/product/[slug]/page.tsx` (already has OG in generateMetadata — enhance it)

**Interfaces:**
- Produces: `GET /og?title=...&image=...&color=...` → 1200×630 OG image via `@vercel/og`
- Produces: proper `og:image` meta tags on store home and product pages

- [ ] **Step 1: Install @vercel/og**

```bash
npm install @vercel/og
```

- [ ] **Step 2: Create OG image route**

Create `app/store/og/route.tsx`:
```typescript
import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title') ?? 'Welcome'
  const subtitle = searchParams.get('subtitle') ?? ''
  const imageUrl = searchParams.get('image') ?? ''
  const color = searchParams.get('color') ?? '#6366f1'

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '1200px',
          height: '630px',
          backgroundColor: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Left panel — branding */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '60px',
            width: imageUrl ? '55%' : '100%',
            backgroundColor: color,
          }}
        >
          <div style={{ fontSize: '52px', fontWeight: 700, color: '#ffffff', lineHeight: 1.1 }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: '28px', color: 'rgba(255,255,255,0.85)', marginTop: '16px' }}>
              {subtitle}
            </div>
          )}
          <div style={{ fontSize: '20px', color: 'rgba(255,255,255,0.6)', marginTop: '32px' }}>
            Powered by Talam
          </div>
        </div>

        {/* Right panel — product image */}
        {imageUrl && (
          <div
            style={{
              display: 'flex',
              width: '45%',
              overflow: 'hidden',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${imageUrl}?w=540,h=630,c_fill,g_auto,f_auto`}
              alt={title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        )}
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
```

- [ ] **Step 3: Add OG metadata to store home**

Modify `app/store/page.tsx` — add `generateMetadata` export before the page component:

```typescript
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  const subdomain = headersList.get('x-subdomain') ?? ''

  if (!tenantId) return {}

  const tenant = await getTenantStorefront(tenantId)
  if (!tenant) return {}

  const host = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'mytalam.com'
  const storeUrl = `https://${subdomain}.${host}`
  const ogUrl = `${storeUrl}/og?title=${encodeURIComponent(tenant.name)}&subtitle=Shop+Now&color=${encodeURIComponent(tenant.brandColor ?? '#6366f1')}`

  return {
    title: tenant.name,
    description: `Shop ${tenant.name} — quality products delivered to your door.`,
    openGraph: {
      title: tenant.name,
      description: `Shop ${tenant.name}`,
      url: storeUrl,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      images: [ogUrl],
    },
  }
}
```

- [ ] **Step 4: Build check**

```bash
npm run build
```

Expected: No TypeScript errors, edge runtime OG route compiles successfully

- [ ] **Step 5: Commit**

```bash
git add app/store/og/ app/store/page.tsx lib/analytics.ts
git commit -m "feat: add @vercel/og social cards for WhatsApp sharing with tenant brand colors"
```

---

## Phase 7 Verification

```bash
npm test -- --run
```
Expected: All tests pass including rate-limit.test

```bash
npm run build
```
Expected: No errors

Manual smoke test:
- [ ] Send OTP 5 times for same phone → 6th attempt returns 429 with error message
- [ ] Place order → PostHog Live Events shows `order_placed` within 30s
- [ ] Pay via Instamojo test → customer receives order confirmation email
- [ ] Visit `https://silk.{YOUR_DOMAIN}/og?title=Test&color=%236366f1` → returns 1200×630 image
- [ ] Share store link in WhatsApp → OG card shows store name and brand color
- [ ] Share product link in WhatsApp → OG card shows product image and name
