# Phase 6: Platform Admin & Billing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the super admin panel at `admin.{YOUR_DOMAIN}`, the tenant onboarding wizard, trial expiry enforcement, and Razorpay subscription billing for Starter/Pro tiers.

**Architecture:** Super admin routes live under `app/super-admin/` (served via middleware rewrite from `admin.{YOUR_DOMAIN}`). A `super_admin` custom claim on the Supabase JWT gates all routes. Onboarding wizard is a multi-step Server Action flow (slug → brand → payment). Subscription billing uses Razorpay Subscriptions with a webhook that updates `tenant.tier`. Trial expiry is checked at checkout (Phase 3 stub) and on each admin page load.

**Tech Stack:** Next.js 15, Prisma `withTenant`, Razorpay Subscriptions API, Supabase custom JWT claims, Server Actions, Vitest

## Global Constraints

- Inherit all prior phase constraints
- Super admin guard: verifies `user.app_metadata.role === 'super_admin'` (set via Supabase service role)
- `export const dynamic = 'force-dynamic'` on every super admin page
- Razorpay subscription webhooks verified via HMAC-SHA256 signature
- Tenant tier changes only happen via verified webhook — never from client

---

### Task 1: Super Admin Auth Guard & Layout

**Files:**
- Create: `lib/super-admin-guard.ts`
- Create: `lib/super-admin-guard.test.ts`
- Create: `app/super-admin/layout.tsx`

**Interfaces:**
- Produces: `requireSuperAdmin()` → `User` or redirects to `/`

- [ ] **Step 1: Write failing test**

Create `lib/super-admin-guard.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: 'admin-uuid',
            app_metadata: { role: 'super_admin' },
          },
        },
        error: null,
      }),
    },
  })),
}))

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

import { requireSuperAdmin } from './super-admin-guard'

describe('requireSuperAdmin', () => {
  it('returns user when role is super_admin', async () => {
    const user = await requireSuperAdmin()
    expect(user.id).toBe('admin-uuid')
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm test -- --run lib/super-admin-guard.test.ts
```

Expected: FAIL

- [ ] **Step 3: Set super_admin role in Supabase**

In Supabase SQL Editor, set role for your user ID:
```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "super_admin"}'::jsonb
WHERE id = '<your-user-uuid>';
```

- [ ] **Step 4: Implement super admin guard**

Create `lib/super-admin-guard.ts`:
```typescript
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export async function requireSuperAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const role = user.app_metadata?.role
  if (role !== 'super_admin') redirect('/')

  return user
}
```

- [ ] **Step 5: Run test — verify it passes**

```bash
npm test -- --run lib/super-admin-guard.test.ts
```

Expected: PASS

- [ ] **Step 6: Create super admin layout**

Create `app/super-admin/layout.tsx`:
```typescript
import Link from 'next/link'
import { requireSuperAdmin } from '@/lib/super-admin-guard'
import { LayoutDashboard, Store, CreditCard } from 'lucide-react'

export const dynamic = 'force-dynamic'

const NAV = [
  { href: '/super-admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/super-admin/tenants', label: 'Tenants', icon: Store },
  { href: '/super-admin/billing', label: 'Billing', icon: CreditCard },
]

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  await requireSuperAdmin()

  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:flex w-52 border-r flex-col py-6 px-3 gap-1 bg-background shrink-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 mb-2">
          Talam Admin
        </p>
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </aside>
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add lib/super-admin-guard.ts lib/super-admin-guard.test.ts app/super-admin/layout.tsx
git commit -m "feat: add super admin guard (JWT role check) and layout"
```

---

### Task 2: Super Admin Dashboard & Tenant List

**Files:**
- Create: `app/super-admin/page.tsx`
- Create: `app/super-admin/tenants/page.tsx`
- Create: `app/super-admin/tenants/[id]/page.tsx`
- Create: `lib/data/platform-stats.ts`

**Interfaces:**
- Produces: platform dashboard with MRR, GMV, active stores
- Produces: tenant list with tier/status, individual tenant detail with tier override

- [ ] **Step 1: Create platform stats**

Create `lib/data/platform-stats.ts`:
```typescript
import { prisma } from '@/lib/prisma'

export type PlatformStats = {
  totalTenants: number
  activeTenants: number
  mrr: number
  gmv30d: number
}

const TIER_PRICES: Record<string, number> = { starter: 499, pro: 1499 }

export async function getPlatformStats(): Promise<PlatformStats> {
  const since = new Date()
  since.setDate(since.getDate() - 30)

  const [tenants, gmvResult] = await Promise.all([
    prisma.tenant.findMany({
      select: { id: true, tier: true, trialEndsAt: true },
    }),
    prisma.order.aggregate({
      where: { paymentStatus: 'paid', createdAt: { gte: since } },
      _sum: { total: true },
    }),
  ])

  const now = new Date()
  const activeTenants = tenants.filter(
    (t) => t.tier !== 'trial' || (t.trialEndsAt && t.trialEndsAt > now)
  )
  const mrr = tenants
    .filter((t) => t.tier !== 'trial')
    .reduce((sum, t) => sum + (TIER_PRICES[t.tier] ?? 0), 0)

  return {
    totalTenants: tenants.length,
    activeTenants: activeTenants.length,
    mrr,
    gmv30d: Number(gmvResult._sum.total ?? 0),
  }
}
```

Note: `platform-stats.ts` uses `prisma` directly (not `withTenant`) — super admin queries all tenants.

- [ ] **Step 2: Create super admin dashboard**

Create `app/super-admin/page.tsx`:
```typescript
import { requireSuperAdmin } from '@/lib/super-admin-guard'
import { getPlatformStats } from '@/lib/data/platform-stats'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Store, TrendingUp, Users, DollarSign } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function SuperAdminPage() {
  await requireSuperAdmin()
  const stats = await getPlatformStats()

  const cards = [
    { title: 'Total Stores', value: stats.totalTenants.toString(), icon: Store },
    { title: 'Active Stores', value: stats.activeTenants.toString(), icon: Users },
    { title: 'MRR', value: `₹${stats.mrr.toLocaleString('en-IN')}`, icon: DollarSign },
    { title: 'GMV (30d)', value: `₹${stats.gmv30d.toLocaleString('en-IN')}`, icon: TrendingUp },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Platform Overview</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create tenant list page**

Create `app/super-admin/tenants/page.tsx`:
```typescript
import { requireSuperAdmin } from '@/lib/super-admin-guard'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

export default async function TenantsPage() {
  await requireSuperAdmin()

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, slug: true, name: true, tier: true, trialEndsAt: true, createdAt: true },
  })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">All Stores ({tenants.length})</h1>
      <div className="space-y-2">
        {tenants.map((t) => {
          const isTrialExpired = t.tier === 'trial' && t.trialEndsAt && t.trialEndsAt < new Date()
          return (
            <Link
              key={t.id}
              href={`/super-admin/tenants/${t.id}`}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div>
                <p className="text-sm font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.slug}.{process.env.NEXT_PUBLIC_ROOT_DOMAIN}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={isTrialExpired ? 'destructive' : t.tier === 'trial' ? 'secondary' : 'default'}>
                  {isTrialExpired ? 'expired' : t.tier}
                </Badge>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create tenant detail with tier override**

Create `app/super-admin/tenants/[id]/page.tsx`:
```typescript
import { requireSuperAdmin } from '@/lib/super-admin-guard'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { TenantTierOverride } from './tier-override'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export default async function TenantDetailPage({ params }: Props) {
  await requireSuperAdmin()
  const { id } = await params

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    select: { id: true, slug: true, name: true, tier: true, trialEndsAt: true, createdAt: true },
  })
  if (!tenant) notFound()

  return (
    <div className="max-w-lg space-y-5">
      <h1 className="text-xl font-semibold">{tenant.name}</h1>
      <div className="text-sm space-y-1 text-muted-foreground">
        <p>Slug: <span className="text-foreground font-mono">{tenant.slug}</span></p>
        <p>Tier: <span className="text-foreground">{tenant.tier}</span></p>
        {tenant.trialEndsAt && <p>Trial ends: {new Date(tenant.trialEndsAt).toLocaleDateString('en-IN')}</p>}
        <p>Created: {new Date(tenant.createdAt).toLocaleDateString('en-IN')}</p>
      </div>
      <TenantTierOverride tenantId={tenant.id} currentTier={tenant.tier} />
    </div>
  )
}
```

Create `app/super-admin/tenants/[id]/tier-override.tsx`:
```typescript
'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState } from 'react'
import { overrideTier } from './actions'

export function TenantTierOverride({ tenantId, currentTier }: { tenantId: string; currentTier: string }) {
  const [tier, setTier] = useState(currentTier)
  const [isPending, startTransition] = useTransition()

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <p className="text-sm font-medium">Override Tier</p>
      <Select value={tier} onValueChange={setTier}>
        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="trial">Trial</SelectItem>
          <SelectItem value="starter">Starter</SelectItem>
          <SelectItem value="pro">Pro</SelectItem>
        </SelectContent>
      </Select>
      <Button
        size="sm"
        onClick={() => startTransition(() => overrideTier(tenantId, tier))}
        disabled={isPending}
      >
        {isPending ? 'Saving…' : 'Apply Override'}
      </Button>
    </div>
  )
}
```

Create `app/super-admin/tenants/[id]/actions.ts`:
```typescript
'use server'

import { requireSuperAdmin } from '@/lib/super-admin-guard'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function overrideTier(tenantId: string, tier: string) {
  await requireSuperAdmin()

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { tier: tier as never },
  })

  revalidatePath(`/super-admin/tenants/${tenantId}`)
  revalidatePath('/super-admin/tenants')
}
```

- [ ] **Step 5: Commit**

```bash
git add app/super-admin/ lib/data/platform-stats.ts
git commit -m "feat: add super admin dashboard, tenant list, and tier override"
```

---

### Task 3: Onboarding Wizard

**Files:**
- Create: `app/store/admin/onboarding/page.tsx`
- Create: `app/store/admin/onboarding/actions.ts`

**Interfaces:**
- Produces: 5-step wizard: Store → Brand → Product → Payment → Go Live (per spec §1 changelog)
- Step 1 captures `store_type` for PostHog segmentation
- Triggers on first admin visit when tenant has no products

- [ ] **Step 1: Create onboarding actions**

Create `app/store/admin/onboarding/actions.ts`:
```typescript
'use server'

import { requireOwner } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export async function saveOnboardingStep1(name: string, storeType: string) {
  const { tenantId } = await requireOwner()
  await withTenant(tenantId, (db) =>
    db.tenant.update({ where: { id: tenantId }, data: { name, storeType: storeType || null } })
  )
}

export async function saveOnboardingStep2(brandColor: string, logoUrl: string) {
  const { tenantId } = await requireOwner()
  await withTenant(tenantId, (db) =>
    db.tenant.update({
      where: { id: tenantId },
      data: { brandColor: brandColor || null, logoUrl: logoUrl || null },
    })
  )
}

// Step 3 (Product) is handled by the existing /admin/products/new flow
// Step 4 (Payment) is handled by /admin/settings/payment — linked from wizard

export async function completeOnboarding() {
  redirect('/admin/dashboard')
}
```

- [ ] **Step 2: Create onboarding wizard page**

Create `app/store/admin/onboarding/page.tsx`:
```typescript
'use client'

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { saveOnboardingStep1, saveOnboardingStep2, completeOnboarding } from './actions'

type Step = 1 | 2 | 3 | 4 | 5

const STORE_TYPES = [
  { value: 'ethnic_wear', label: 'Ethnic wear / Fashion' },
  { value: 'bakery', label: 'Bakery / Food' },
  { value: 'salon', label: 'Salon / Beauty' },
  { value: 'handicrafts', label: 'Handicrafts / Art' },
  { value: 'other', label: 'Something else' },
]

const STEPS = [
  { n: 1, label: 'Store' },
  { n: 2, label: 'Brand' },
  { n: 3, label: 'Product' },
  { n: 4, label: 'Payment' },
  { n: 5, label: 'Go Live' },
]

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>(1)
  const [name, setName] = useState('')
  const [storeType, setStoreType] = useState('')
  const [brandColor, setBrandColor] = useState('#6366f1')
  const [logoUrl, setLogoUrl] = useState('')
  const [isPending, startTransition] = useTransition()

  async function handleStep1() {
    if (!name.trim()) return
    startTransition(async () => {
      await saveOnboardingStep1(name, storeType)
      setStep(2)
    })
  }

  async function handleStep2() {
    startTransition(async () => {
      await saveOnboardingStep2(brandColor, logoUrl)
      setStep(3)
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Progress */}
        <div className="flex items-center justify-center gap-1">
          {STEPS.map(({ n, label }) => (
            <div key={n} className="flex items-center gap-1">
              <div className="flex flex-col items-center gap-1">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-semibold ${step >= n ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {n}
                </div>
                <span className={`text-[10px] ${step === n ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{label}</span>
              </div>
              {n < 5 && <div className="w-8 h-px bg-border mb-4" />}
            </div>
          ))}
        </div>

        {/* Step 1: Store name + type */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-semibold">Tell us about your store</h1>
              <p className="text-sm text-muted-foreground mt-1">This appears on your storefront and receipts.</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="store-name">Store Name</Label>
              <Input id="store-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. D'Mystique Boutique" autoFocus />
            </div>
            <div className="space-y-2">
              <Label>What do you sell?</Label>
              <div className="grid grid-cols-1 gap-2">
                {STORE_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setStoreType(t.value)}
                    className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${storeType === t.value ? 'border-primary bg-primary/5 font-medium' : 'border-border hover:border-primary/50'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={handleStep1} disabled={isPending || !name.trim() || !storeType}>
              {isPending ? 'Saving…' : 'Continue →'}
            </Button>
          </div>
        )}

        {/* Step 2: Brand */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-semibold">Set your brand</h1>
              <p className="text-sm text-muted-foreground mt-1">Choose a color that represents your store.</p>
            </div>
            <div className="space-y-1">
              <Label>Brand Color</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="h-10 w-20 rounded-md border p-1 cursor-pointer" />
                <span className="text-sm font-mono text-muted-foreground">{brandColor}</span>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Logo URL (optional)</Label>
              <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://res.cloudinary.com/..." />
            </div>
            <Button className="w-full" onClick={handleStep2} disabled={isPending}>
              {isPending ? 'Saving…' : 'Continue →'}
            </Button>
          </div>
        )}

        {/* Step 3: Add first product */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-semibold">Add your first product</h1>
              <p className="text-sm text-muted-foreground mt-1">Customers can't buy what they can't see. Add at least one product to go live.</p>
            </div>
            <Button className="w-full" asChild>
              <Link href="/admin/products/new">Add a Product →</Link>
            </Button>
            <button type="button" onClick={() => setStep(4)} className="w-full text-sm text-muted-foreground underline">
              Skip for now
            </button>
          </div>
        )}

        {/* Step 4: Payment setup */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-semibold">Set up payments</h1>
              <p className="text-sm text-muted-foreground mt-1">UPI Manual requires no KYC — start collecting payments immediately.</p>
            </div>
            <div className="rounded-lg bg-muted p-4 text-sm space-y-2">
              <p className="font-medium">UPI Manual (recommended to start)</p>
              <p className="text-muted-foreground">Customers see your UPI QR. You confirm payment manually in Orders.</p>
            </div>
            <Button className="w-full" asChild>
              <Link href="/admin/settings/payment">Configure Payment →</Link>
            </Button>
            <button type="button" onClick={() => setStep(5)} className="w-full text-sm text-muted-foreground underline">
              Skip for now
            </button>
          </div>
        )}

        {/* Step 5: Go Live */}
        {step === 5 && (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-semibold">You're ready to go live! 🎉</h1>
              <p className="text-sm text-muted-foreground mt-1">Your store is set up. Share the link and start selling.</p>
            </div>
            <form action={completeOnboarding}>
              <Button className="w-full" type="submit">Go to Dashboard →</Button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/store/admin/onboarding/
git commit -m "feat: add 5-step onboarding wizard (Store→Brand→Product→Payment→Go Live) with store_type capture"
```

---

### Task 4: Trial Expiry Enforcement & Subscription Billing

**Files:**
- Create: `app/api/webhooks/razorpay/route.ts`
- Create: `app/store/admin/billing/page.tsx`
- Create: `components/store/trial-banner.tsx`

**Interfaces:**
- Produces: `POST /api/webhooks/razorpay` — verifies signature, upgrades tenant tier on payment
- Produces: trial expiry banner shown to store owner when trial is expired
- Produces: billing page with Razorpay checkout for Starter/Pro

- [ ] **Step 1: Create Razorpay subscription webhook**

Create `app/api/webhooks/razorpay/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { after } from 'next/server'

const PLAN_TO_TIER: Record<string, string> = {
  [process.env.RAZORPAY_STARTER_PLAN_ID ?? '']: 'starter',
  [process.env.RAZORPAY_PRO_PLAN_ID ?? '']: 'pro',
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('x-razorpay-signature') ?? ''
  const secret = process.env.TALAM_RAZORPAY_KEY_SECRET ?? ''

  // Verify HMAC-SHA256 signature
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(body)
  const eventType: string = event.event

  if (eventType === 'subscription.activated' || eventType === 'subscription.charged') {
    const subscription = event.payload.subscription.entity
    const planId: string = subscription.plan_id
    const tier = PLAN_TO_TIER[planId]

    if (!tier) return NextResponse.json({ ok: true })

    // Find tenant by Razorpay subscription ID (stored in paymentConfig)
    const tenant = await prisma.tenant.findFirst({
      where: { paymentConfig: { path: ['razorpaySubscriptionId'], equals: subscription.id } },
    })

    if (tenant) {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { tier: tier as never },
      })

      after(async () => {
        console.log(`[after] Tenant ${tenant.id} upgraded to ${tier}`)
      })
    }
  }

  if (eventType === 'subscription.cancelled' || eventType === 'subscription.expired') {
    const subscription = event.payload.subscription.entity
    const tenant = await prisma.tenant.findFirst({
      where: { paymentConfig: { path: ['razorpaySubscriptionId'], equals: subscription.id } },
    })
    if (tenant) {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { tier: 'trial' },
      })
    }
  }

  return NextResponse.json({ ok: true })
}
```

Add to `.env.local`:
```bash
RAZORPAY_STARTER_PLAN_ID=plan_XXXX   # from Razorpay dashboard
RAZORPAY_PRO_PLAN_ID=plan_YYYY
```

- [ ] **Step 2: Create trial banner component**

Create `components/store/trial-banner.tsx`:
```typescript
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

type Props = {
  isOwner: boolean
  tier: string
  trialEndsAt: Date | null
}

export function TrialBanner({ isOwner, tier, trialEndsAt }: Props) {
  if (tier !== 'trial') return null

  const isExpired = trialEndsAt && trialEndsAt < new Date()
  const daysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  if (isExpired && isOwner) {
    return (
      <div className="bg-destructive text-destructive-foreground text-center py-2 px-4 text-sm flex items-center justify-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>Your trial has expired. Checkout is disabled.</span>
        <Link href="/admin/billing" className="underline font-medium ml-1">Subscribe now →</Link>
      </div>
    )
  }

  if (!isExpired && daysLeft !== null && daysLeft <= 3 && isOwner) {
    return (
      <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-center py-2 px-4 text-sm">
        Trial ends in {daysLeft} day{daysLeft !== 1 ? 's' : ''}.{' '}
        <Link href="/admin/billing" className="underline font-medium">Subscribe to keep selling</Link>
      </div>
    )
  }

  return null
}
```

- [ ] **Step 3: Create billing page**

Create `app/store/admin/billing/page.tsx`:
```typescript
import { requireOwner } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PLANS = [
  {
    name: 'Starter',
    price: 499,
    tier: 'starter',
    features: ['100 products', '500 OTPs/mo', 'WhatsApp button', 'Discount codes', 'Wishlist', 'Email support'],
  },
  {
    name: 'Pro',
    price: 1499,
    tier: 'pro',
    features: ['Unlimited products', '2,000 OTPs/mo', 'Advanced analytics', 'Priority support', 'All Starter features'],
    recommended: true,
  },
]

export default async function BillingPage() {
  const { tenantId } = await requireOwner()

  const tenant = await withTenant(tenantId, (db) =>
    db.tenant.findUnique({
      where: { id: tenantId },
      select: { tier: true, trialEndsAt: true },
    })
  )

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Current plan: <span className="font-medium capitalize">{tenant?.tier ?? 'trial'}</span>
          {tenant?.tier === 'trial' && tenant.trialEndsAt && (
            <> · Trial ends {new Date(tenant.trialEndsAt).toLocaleDateString('en-IN')}</>
          )}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {PLANS.map((plan) => (
          <Card key={plan.tier} className={plan.recommended ? 'border-primary ring-1 ring-primary' : ''}>
            {plan.recommended && (
              <div className="bg-primary text-primary-foreground text-xs text-center py-1 rounded-t-lg font-medium">
                Recommended
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-base">{plan.name}</CardTitle>
              <p className="text-2xl font-bold">₹{plan.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              {tenant?.tier === plan.tier ? (
                <Badge className="w-full justify-center py-1">Current Plan</Badge>
              ) : (
                <Button className="w-full" variant={plan.recommended ? 'default' : 'outline'}>
                  Subscribe — ₹{plan.price}/mo
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Payments secured by Razorpay. Cancel anytime — your store stays live until the billing period ends.
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/webhooks/razorpay/ app/store/admin/billing/ components/store/trial-banner.tsx
git commit -m "feat: add Razorpay subscription webhook, billing page, and trial expiry banner"
```

---

## Phase 6 Verification

```bash
npm test -- --run
```
Expected: All tests pass including super-admin-guard.test

```bash
npm run build
```
Expected: No TypeScript errors

Manual smoke test:
- [ ] `admin.{YOUR_DOMAIN}` → super admin dashboard loads with platform metrics
- [ ] Non-super-admin user visiting `admin.{YOUR_DOMAIN}` → redirected to `/`
- [ ] Tenant list shows all stores with tier badges
- [ ] Tier override → tenant tier updates in DB immediately
- [ ] New store visits `/admin/onboarding` → 3-step wizard works
- [ ] Trial expired store → banner visible to owner, checkout blocked
- [ ] Simulated Razorpay `subscription.activated` webhook → tenant tier updates to `starter`
