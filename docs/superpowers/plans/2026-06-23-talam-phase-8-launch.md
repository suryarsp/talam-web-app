# Phase 8: Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up the missing storefront shell (header, nav, WhatsApp button), seed D'Mystique Boutique as Store #1, pass Core Web Vitals, complete a security audit, and do a production go-live.

**Architecture:** This phase adds the chrome around each storefront (header with cart count, mobile nav), the WhatsApp floating button, and a seed script for D'Mystique data. Performance work targets LCP < 2.5s on mobile (Cloudinary images already have `f_auto,q_auto`; this phase adds `priority` on hero images and `next/font` preloading). Security work runs `npm audit` and validates that no secret env vars are exposed.

**Tech Stack:** Next.js 15, Prisma seed script, Lighthouse CI, `@supabase/ssr`, existing stack

## Global Constraints

- Inherit all prior phase constraints
- D'Mystique slug: `silk` — store URL will be `silk.{YOUR_DOMAIN}`
- WhatsApp button: only shown on Starter/Pro tier stores
- LCP target: < 2.5s on mobile (Moto G4, slow 4G) via Lighthouse CI
- Security: zero `NEXT_PUBLIC_` prefixed secrets, all webhook endpoints verify signatures

---

### Task 1: Storefront Header & Navigation

**Files:**
- Create: `components/store/store-header.tsx`
- Create: `components/store/mobile-nav.tsx`
- Modify: `app/store/layout.tsx` (add header)

**Interfaces:**
- Consumes: `x-tenant-id`, `x-subdomain`, `x-tenant-tier` from headers
- Consumes: `useCartStore` for cart count badge
- Produces: sticky header with logo, nav links, cart icon with count

- [ ] **Step 1: Create store header component**

Create `components/store/store-header.tsx`:
```typescript
import Link from 'next/link'
import { headers } from 'next/headers'
import { getTenantStorefront } from '@/lib/data/tenant'
import { CartBadge } from './cart-badge'
import { ShoppingBag, Menu } from 'lucide-react'

export async function StoreHeader() {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  const subdomain = headersList.get('x-subdomain') ?? ''

  const tenant = tenantId ? await getTenantStorefront(tenantId) : null

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo / Store name */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          {tenant?.logoUrl ? (
            <img
              src={`${tenant.logoUrl}?h=32,q_auto,f_auto`}
              alt={tenant.name}
              className="h-8 w-auto object-contain"
            />
          ) : (
            <span className="font-semibold text-base truncate max-w-[140px]">
              {tenant?.name ?? subdomain}
            </span>
          )}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-5 text-sm">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">Home</Link>
          <Link href="/shop" className="text-muted-foreground hover:text-foreground transition-colors">Shop</Link>
          <Link href="/orders" className="text-muted-foreground hover:text-foreground transition-colors">Orders</Link>
          <Link href="/account" className="text-muted-foreground hover:text-foreground transition-colors">Account</Link>
        </nav>

        {/* Cart */}
        <div className="flex items-center gap-2">
          <Link href="/cart" className="relative p-2 rounded-md hover:bg-muted transition-colors" aria-label="Cart">
            <ShoppingBag className="h-5 w-5" />
            <CartBadge />
          </Link>
          {/* Mobile menu button */}
          <button className="sm:hidden p-2 rounded-md hover:bg-muted" aria-label="Menu">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Create cart badge (client component)**

Create `components/store/cart-badge.tsx`:
```typescript
'use client'

import { useCartStore } from '@/lib/store/cart'

export function CartBadge() {
  const count = useCartStore((s) => s.count())
  if (count === 0) return null

  return (
    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center leading-none">
      {count > 9 ? '9+' : count}
    </span>
  )
}
```

- [ ] **Step 3: Update store layout to include header**

Replace `app/store/layout.tsx`:
```typescript
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { StoreHeader } from '@/components/store/store-header'

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) notFound()

  return (
    <div className="min-h-screen flex flex-col">
      <StoreHeader />
      <div className="flex-1">{children}</div>
    </div>
  )
}
```

- [ ] **Step 4: Build check**

```bash
npm run build
```

Expected: No TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add components/store/store-header.tsx components/store/cart-badge.tsx app/store/layout.tsx
git commit -m "feat: add storefront header with logo, nav links, and cart count badge"
```

---

### Task 2: WhatsApp Floating Button

**Files:**
- Create: `components/store/whatsapp-button.tsx`
- Modify: `app/store/layout.tsx` (add WhatsApp button for Starter/Pro)

**Interfaces:**
- Consumes: `x-tenant-tier`, `whatsappNumber` from tenant record
- Produces: fixed bottom-right WhatsApp CTA (Starter/Pro only)

- [ ] **Step 1: Create WhatsApp button**

Create `components/store/whatsapp-button.tsx`:
```typescript
type Props = {
  phoneNumber: string // E.164 without + e.g. "919876543210"
  storeName: string
}

export function WhatsAppButton({ phoneNumber, storeName }: Props) {
  const message = encodeURIComponent(`Hi! I found your store ${storeName} and have a question.`)
  const href = `https://wa.me/${phoneNumber}?text=${message}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-5 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-lg hover:bg-[#20ba5a] transition-colors"
    >
      {/* WhatsApp SVG icon */}
      <svg viewBox="0 0 24 24" className="h-7 w-7 fill-white" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    </a>
  )
}
```

- [ ] **Step 2: Add to store layout for Starter/Pro tenants**

Modify `app/store/layout.tsx` to fetch tenant and conditionally render:
```typescript
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { StoreHeader } from '@/components/store/store-header'
import { WhatsAppButton } from '@/components/store/whatsapp-button'
import { getTenantStorefront } from '@/lib/data/tenant'

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  const tier = headersList.get('x-tenant-tier') ?? 'trial'

  if (!tenantId) notFound()

  const tenant = await getTenantStorefront(tenantId)
  if (!tenant) notFound()

  const showWhatsApp =
    (tier === 'starter' || tier === 'pro') &&
    !!tenant.whatsappNumber &&
    tenant.showWhatsappButton === true

  return (
    <div className="min-h-screen flex flex-col">
      <StoreHeader />
      <div className="flex-1">{children}</div>
      {showWhatsApp && (
        <WhatsAppButton
          phoneNumber={tenant.whatsappNumber!}
          storeName={tenant.name}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/store/whatsapp-button.tsx app/store/layout.tsx
git commit -m "feat: add WhatsApp floating button for Starter/Pro tier stores"
```

---

### Task 3: "Powered by Talam" Badge

**Files:**
- Create: `components/store/powered-by-badge.tsx`
- Modify: `app/store/layout.tsx` (add badge for trial tier)

- [ ] **Step 1: Create badge component**

Create `components/store/powered-by-badge.tsx`:
```typescript
import Link from 'next/link'
import { headers } from 'next/headers'

export async function PoweredByBadge() {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'mytalam.com'
  const headersList = await headers()
  const subdomain = headersList.get('x-subdomain') ?? ''

  // UTM + subdomain enables referral attribution on /join landing page
  const href = `https://${rootDomain}/join?utm_source=badge&utm_medium=store&utm_campaign=${subdomain}`

  return (
    <div className="fixed bottom-4 left-4 z-40">
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 bg-background/90 backdrop-blur border rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors shadow-sm"
      >
        <span className="text-[10px]">⚡</span>
        Powered by Talam
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: Add to store layout for trial tier**

In `app/store/layout.tsx`, add after the WhatsApp button:
```typescript
import { PoweredByBadge } from '@/components/store/powered-by-badge'

// Inside the layout return, after WhatsAppButton:
{tier === 'trial' && <PoweredByBadge />}
```

- [ ] **Step 3: Commit**

```bash
git add components/store/powered-by-badge.tsx app/store/layout.tsx
git commit -m "feat: add 'Powered by Talam' badge for trial tier stores"
```

---

### Task 4: D'Mystique Boutique Seed Data

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json` (add seed script)

**Goal:** Create D'Mystique Boutique (`silk`) as the first real tenant with sample products, so it's ready for the live demo.

- [ ] **Step 1: Create seed script**

Create `prisma/seed.ts`:
```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding D\'Mystique Boutique…')

  // The owner_id must be the actual Supabase auth user UUID
  // Replace with real UUID after creating the owner account
  const OWNER_ID = process.env.DMYSTIQUE_OWNER_ID
  if (!OWNER_ID) throw new Error('Set DMYSTIQUE_OWNER_ID in .env.local')

  // Upsert tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'silk' },
    update: {},
    create: {
      ownerId: OWNER_ID,
      slug: 'silk',
      name: "D'Mystique Boutique",
      tier: 'starter',
      brandColor: '#7c3aed', // deep violet — ethnic wear aesthetic
      whatsappNumber: '919876543210', // replace with real number
      paymentProvider: 'upi_manual',
      paymentConfig: {
        upiId: 'dmystique@upi',     // replace with real UPI ID
        displayName: "D'Mystique Boutique",
      },
    },
  })

  console.log(`Tenant: ${tenant.name} (${tenant.id})`)

  // Step 1: Seed categories first (products reference categoryId FK)
  const categoryDefs = [
    { name: 'Sarees', slug: 'sarees', sortOrder: 0 },
    { name: 'Kurtas', slug: 'kurtas', sortOrder: 1 },
    { name: 'Blouses', slug: 'blouses', sortOrder: 2 },
    { name: 'Accessories', slug: 'accessories', sortOrder: 3 },
  ]

  const seededCategories = await Promise.all(
    categoryDefs.map((cat) =>
      prisma.productCategory.upsert({
        where: { tenantId_slug: { tenantId: tenant.id, slug: cat.slug } },
        update: {},
        create: { tenantId: tenant.id, ...cat },
      })
    )
  )
  const catMap = Object.fromEntries(seededCategories.map((c) => [c.slug, c.id]))
  console.log(`Categories seeded: ${seededCategories.map((c) => c.name).join(', ')}`)

  // Step 2: Seed products referencing categoryId
  const products = [
    {
      name: 'Kanjivaram Silk Saree — Emerald Green',
      slug: 'kanjivaram-silk-emerald-green',
      description: 'Pure Kanjivaram silk with traditional gold zari border. 6.3 metres including blouse piece.',
      price: 8500,
      comparePrice: 11000,
      categoryId: catMap['sarees'],
      sizes: ['Free Size'],
      images: [], // add Cloudinary URLs after uploading product photos
      stockBySize: { 'Free Size': 3 },
    },
    {
      name: 'Cotton Anarkali Kurta — Pastel Pink',
      slug: 'cotton-anarkali-pastel-pink',
      description: 'Lightweight cotton Anarkali with mirror work detailing. Includes dupatta.',
      price: 2200,
      comparePrice: 2800,
      categoryId: catMap['kurtas'],
      sizes: ['S', 'M', 'L', 'XL'],
      images: [],
      stockBySize: { S: 2, M: 5, L: 4, XL: 2 },
    },
    {
      name: 'Chanderi Silk Dupatta — Gold',
      slug: 'chanderi-silk-dupatta-gold',
      description: 'Chanderi silk dupatta with hand-block printed border. Pairs with any kurta set.',
      price: 950,
      categoryId: catMap['accessories'],
      sizes: ['Free Size'],
      images: [],
      stockBySize: { 'Free Size': 10 },
    },
    {
      name: 'Banarasi Brocade Blouse — Maroon',
      slug: 'banarasi-brocade-blouse-maroon',
      description: 'Ready-to-stitch Banarasi brocade fabric for blouse. 1 metre.',
      price: 1800,
      categoryId: catMap['blouses'],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      images: [],
      stockBySize: { S: 3, M: 5, L: 5, XL: 3, XXL: 2 },
    },
  ]

  for (const product of products) {
    await prisma.product.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: product.slug } },
      update: {},
      create: { ...product, tenantId: tenant.id, isActive: true },
    })
    console.log(`  ✓ ${product.name}`)
  }

  console.log('Seed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 2: Add seed script to package.json**

In `package.json`, under `"prisma"`:
```json
{
  "prisma": {
    "seed": "ts-node --compiler-options '{\"module\":\"CommonJS\"}' prisma/seed.ts"
  }
}
```

Install ts-node:
```bash
npm install -D ts-node
```

- [ ] **Step 3: Set owner UUID and run seed**

In `.env.local`, add:
```bash
DMYSTIQUE_OWNER_ID=<uuid-of-owner-supabase-auth-user>
```

Create the owner account via Supabase Auth (phone OTP at `silk.{YOUR_DOMAIN}/auth`), then copy the UUID from Supabase → Auth → Users.

Run the seed:
```bash
npx prisma db seed
```

Expected output:
```
Seeding D'Mystique Boutique…
Tenant: D'Mystique Boutique (uuid-xxx)
  ✓ Kanjivaram Silk Saree — Emerald Green
  ✓ Cotton Anarkali Kurta — Pastel Pink
  ✓ Chanderi Silk Dupatta — Gold
  ✓ Banarasi Brocade Blouse — Maroon
Seed complete.
```

- [ ] **Step 4: Upload product photos to Cloudinary**

For each product:
1. Cloudinary → Media Library → Upload → folder `talam/silk/`
2. Copy the secure URL
3. Update `prisma/seed.ts` `images` array with the real URLs
4. Re-run `npx prisma db seed` (upsert updates nothing, so manually update via admin panel instead)

Use D'Mystique admin at `silk.{YOUR_DOMAIN}/admin/products` to upload photos via the Image Uploader component.

- [ ] **Step 5: Commit**

```bash
git add prisma/seed.ts package.json
git commit -m "feat: add D'Mystique Boutique seed data with 4 sample products"
```

---

### Task 5: Performance Audit & Fixes

**Files:**
- Modify: `app/store/page.tsx` (ensure hero image uses `priority`)
- Modify: `next.config.ts` (add Cloudinary remote pattern)
- Create: `.lighthouserc.json`

- [ ] **Step 1: Configure Cloudinary image domain in Next.js**

Modify `next.config.ts`:
```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
}

export default nextConfig
```

- [ ] **Step 2: Add LCP priority hint to hero product image**

In `components/store/product-card.tsx`, the first product card in the home grid should have `priority`. Pass a prop:

Modify `components/store/product-card.tsx` — add `priority` prop:
```typescript
type Props = {
  product: Product
  subdomain: string
  priority?: boolean  // add this
}

export function ProductCard({ product, subdomain, priority }: Props) {
  // ...
  <Image
    src={imageUrl}
    alt={product.name}
    fill
    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
    className="object-cover transition-transform duration-300 group-hover:scale-105"
    priority={priority}  // add this
  />
```

Modify `components/store/product-grid.tsx` — pass `priority` to first card:
```typescript
{products.map((product, i) => (
  <ProductCard key={product.id} product={product} subdomain={subdomain} priority={i === 0} />
))}
```

- [ ] **Step 3: Create Lighthouse CI config**

Create `.lighthouserc.json`:
```json
{
  "ci": {
    "collect": {
      "url": ["https://silk.{YOUR_DOMAIN}"],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["warn", { "minScore": 0.7 }],
        "first-contentful-paint": ["warn", { "maxNumericValue": 3000 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 4000 }],
        "cumulative-layout-shift": ["warn", { "maxNumericValue": 0.1 }]
      }
    }
  }
}
```

- [ ] **Step 4: Run Lighthouse manually and record baseline**

```bash
npx lighthouse https://silk.{YOUR_DOMAIN} \
  --preset=desktop \
  --output=html \
  --output-path=./lighthouse-report.html \
  --chrome-flags="--headless"
```

Open `lighthouse-report.html` and record:
- LCP: _____
- CLS: _____
- FID/INP: _____
- Performance score: _____

Target: LCP < 4s on mobile, < 2.5s on desktop.

- [ ] **Step 5: Commit**

```bash
git add next.config.ts components/store/product-card.tsx components/store/product-grid.tsx .lighthouserc.json
git commit -m "perf: add Cloudinary image domain, LCP priority hint on first product card"
```

---

### Task 6: Security Hardening

**Files:**
- Modify: `middleware.ts` (add security headers)
- Verify: no `NEXT_PUBLIC_` secret leakage

- [ ] **Step 1: Add security headers to middleware**

Modify `middleware.ts` — add security headers to every response. After all subdomain routing logic, before returning any response, add a helper:

```typescript
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  )
  return response
}
```

Call `addSecurityHeaders(response)` before each `return` in the middleware.

- [ ] **Step 2: Verify no secret leakage**

```bash
# Check no secret keys have NEXT_PUBLIC_ prefix in the codebase
grep -r "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE\|NEXT_PUBLIC_.*SECRET\|NEXT_PUBLIC_.*_KEY_SECRET" --include="*.ts" --include="*.tsx" .
```

Expected: zero matches

```bash
# Check .env.local is in .gitignore
grep -n "\.env\.local" .gitignore
```

Expected: `.env.local` line found

- [ ] **Step 3: Run npm audit**

```bash
npm audit --audit-level=high
```

Expected: 0 high/critical vulnerabilities. Fix any that appear with `npm audit fix`.

- [ ] **Step 4: Verify webhook signature checks are in place**

Confirm each webhook route returns 401 for invalid signatures:

```bash
# Instamojo webhook — send request with wrong MAC
curl -X POST https://silk.{YOUR_DOMAIN}/api/webhooks/instamojo \
  -d "mac=wrong&amount=100&status=Credit"
# Expected: 401 Unauthorized

# Razorpay webhook — send without signature header
curl -X POST https://{YOUR_DOMAIN}/api/webhooks/razorpay \
  -H "Content-Type: application/json" \
  -d '{"event":"subscription.activated"}'
# Expected: 401 Unauthorized
```

- [ ] **Step 5: Commit**

```bash
git add middleware.ts
git commit -m "security: add CSP/XSS/frame security headers to all responses via middleware"
```

---

### Task 6.5: Marketing Pricing Page

**Files:**
- Create: `app/(marketing)/pricing/page.tsx`

**Interfaces:**
- Produces: `mytalam.com/pricing` — static page, plan comparison table, "Start free" CTA
- This is the primary conversion page for paid and organic traffic

- [ ] **Step 1: Create pricing page**

Create `app/(marketing)/pricing/page.tsx`:
```typescript
import Link from 'next/link'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing — Talam',
  description: 'Start free for 14 days. No credit card required. Sell online in minutes.',
}

const PLANS = [
  {
    name: 'Trial',
    price: 'Free',
    period: '14 days',
    tier: 'trial',
    features: [
      '25 products',
      'UPI & card payments',
      'Your own subdomain',
      '100 OTP logins/month',
      '"Powered by Talam" badge',
    ],
    cta: 'Start free trial',
    ctaHref: '/admin/onboarding',
    highlight: false,
  },
  {
    name: 'Starter',
    price: '₹499',
    period: 'per month',
    tier: 'starter',
    features: [
      '100 products',
      'UPI & card payments',
      'WhatsApp button',
      'Discount codes',
      'Wishlist for customers',
      '500 OTP logins/month',
      'No "Powered by" badge',
      'Email support',
    ],
    cta: 'Get started',
    ctaHref: '/admin/onboarding',
    highlight: true,
  },
  {
    name: 'Pro',
    price: '₹1,499',
    period: 'per month',
    tier: 'pro',
    features: [
      'Unlimited products',
      'Everything in Starter',
      'Advanced analytics',
      '2,000 OTP logins/month',
      'Priority support',
    ],
    cta: 'Get started',
    ctaHref: '/admin/onboarding',
    highlight: false,
  },
]

export default function PricingPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold tracking-tight">Simple, honest pricing</h1>
        <p className="text-muted-foreground mt-3 text-lg">
          Start free. No credit card required. Cancel anytime.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => (
          <Card key={plan.tier} className={plan.highlight ? 'border-primary ring-1 ring-primary' : ''}>
            {plan.highlight && (
              <div className="bg-primary text-primary-foreground text-xs text-center py-1 rounded-t-lg font-medium">
                Most popular
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-base">{plan.name}</CardTitle>
              <div className="mt-1">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-sm text-muted-foreground ml-1">{plan.period}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={plan.highlight ? 'default' : 'outline'}
                asChild
              >
                <Link href={plan.ctaHref}>{plan.cta}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground mt-10">
        All plans include your own store at <strong>yourname.mytalam.com</strong>,
        UPI + card payments direct to your bank, and mobile-first design.
      </p>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(marketing\)/pricing/
git commit -m "feat: add public pricing page at mytalam.com/pricing"
```

---

### Task 7: Final QA Checklist & Go-Live

**Files:**
- No new files — this is a validation task

- [ ] **Pre-launch checklist — run through every item:**

**Infrastructure**
- [ ] `{YOUR_DOMAIN}` resolves over HTTPS (green padlock)
- [ ] `silk.{YOUR_DOMAIN}` resolves and loads the D'Mystique store
- [ ] `admin.{YOUR_DOMAIN}` redirects non-super-admins to `/`
- [ ] Vercel deployment status: **Ready** on `main` branch
- [ ] All 19 environment variables set in Vercel → Production

**Authentication**
- [ ] Phone OTP: number → SMS arrives < 10s → OTP accepted → session created
- [ ] Google Sign-In: redirects → consent → returns to app with active session
- [ ] Sign out: session cleared, redirected to `/auth`
- [ ] 6th OTP request for same phone in 10 min → 429 error shown to user

**Storefront**
- [ ] Home page loads with D'Mystique products
- [ ] Shop page: category filter works, size filter works
- [ ] Product detail: images load, size picker shows in/out-of-stock correctly
- [ ] Add to Cart → cart count increments in header
- [ ] Cart page: quantity +/- works, remove item works
- [ ] Cart persists after page refresh (Zustand localStorage)

**Checkout & Payments**
- [ ] Checkout requires login (redirects unauthenticated user to `/auth`)
- [ ] Checkout: fill address form → UPI Manual → redirected to orders page with UPI link
- [ ] Order appears in Supabase DB with status `pending`
- [ ] Admin marks UPI order as paid → paymentStatus updates to `paid`
- [ ] Order confirmation email arrives in customer inbox via Resend

**Admin Panel**
- [ ] Non-owner visiting `/admin` → redirected to `/auth`
- [ ] Dashboard shows today's stats
- [ ] Create product → appears in storefront within 1 minute (ISR revalidation)
- [ ] Update product price → product detail page shows new price (on-demand revalidation)
- [ ] Update order status to `shipped` + tracking ID → customer order page reflects it
- [ ] Settings: update brand color → store home hero reflects new color

**WhatsApp & Social**
- [ ] D'Mystique store (Starter tier): WhatsApp button visible, tapping opens wa.me link
- [ ] Trial store: WhatsApp button not shown, "Powered by Talam" badge visible
- [ ] Share `silk.{YOUR_DOMAIN}` link in WhatsApp → OG card shows store name + brand color
- [ ] Share a product link in WhatsApp → OG card shows product image

**Super Admin**
- [ ] `admin.{YOUR_DOMAIN}` dashboard shows D'Mystique in tenant list
- [ ] Tier override works: change to `pro` → WhatsApp button updates on next visit

**Performance (run after all above passes)**
- [ ] `npx lighthouse https://silk.{YOUR_DOMAIN} --preset=mobile` → LCP < 4s
- [ ] No layout shift on page load (CLS < 0.1)

- [ ] **Go live: merge to main and monitor**

```bash
git checkout main
git push origin main
```

Watch Vercel dashboard → Deployments for the production build. After deploy:
- Visit `silk.{YOUR_DOMAIN}` — confirm live
- Place one real test order
- Check Resend logs for email delivery
- Check PostHog Live Events for `order_placed`
- Check MSG91 delivery report for OTP

**Post-launch (Week 1 actions)**
- [ ] Share D'Mystique store link in relevant WhatsApp groups
- [ ] Screenshot the first real order → use as social proof for tenant acquisition
- [ ] Monitor Vercel error logs daily
- [ ] Check PostHog "Key Metrics" dashboard after 48 hours

- [ ] **Final commit**

```bash
git add .
git commit -m "chore: Phase 8 complete — D'Mystique live, QA passed, security headers added"
```

---

## Phase 8 Verification

All items in the pre-launch checklist above must be checked off before considering Phase 8 complete.

**North Star Metric:** After go-live, track "active stores with ≥1 order in last 30 days" in PostHog. Target for Month 1: 5 paying stores.
