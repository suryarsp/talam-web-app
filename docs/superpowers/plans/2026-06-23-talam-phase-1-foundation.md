# Phase 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Next.js 15 project with multi-tenant subdomain routing, Prisma DB schema, Supabase auth clients, and a working OTP + Google login flow.

**Architecture:** Middleware extracts the subdomain from every request, resolves the tenant, and rewrites URLs internally to route groups (`store/`, `super-admin/`). The marketing site lives at the root. Supabase handles auth (sessions via HttpOnly cookies). Prisma connects as a non-superuser role and injects `app.tenant_id` into each DB session for RLS enforcement.

**Tech Stack:** Next.js 15.1 (App Router), TypeScript 5.x, Tailwind CSS 3.x, shadcn/ui, Prisma 5.x, Supabase (Auth + PostgreSQL), Vitest, `@supabase/ssr`

## Global Constraints

- Node.js ≥ 20 LTS
- `NEXT_PUBLIC_` prefix is forbidden on any secret env var — ESLint rule enforces this
- Every Prisma query runs through a middleware that calls `SET LOCAL app.tenant_id = '...'`
- No `postgres` superuser role at runtime — only `talam_app_user`
- All auth state via Supabase Auth JWT + HttpOnly cookies (`@supabase/ssr`)
- Mobile-first: every UI component targets 390px viewport first
- Domain placeholder: replace `{YOUR_DOMAIN}` with the actual registered domain (e.g. `mytalam.com`)

---

### Task 1: Project Initialization

**Files:**
- Create: `package.json` (via create-next-app)
- Create: `next.config.ts`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `.env.local` (from template — added to .gitignore)
- Create: `.env.example`
- Create: `.gitignore`
- Create: `tsconfig.json` (via create-next-app)
- Create: `eslint.config.mjs`

**Interfaces:**
- Produces: working `npm run dev`, `npm test`, `npm run build` commands

- [x] **Step 1: Scaffold Next.js project**

```bash
cd "F:\Product\Talam\Web App\Source"
npx create-next-app@latest talam-web-app \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --yes
cd talam-web-app
```

- [x] **Step 2: Install core dependencies**

```bash
npm install \
  @supabase/supabase-js \
  @supabase/ssr \
  @prisma/client \
  zustand \
  swr \
  framer-motion \
  lucide-react \
  @upstash/redis \
  @upstash/ratelimit \
  resend \
  posthog-js

npm install -D \
  prisma \
  vitest \
  @vitejs/plugin-react \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  jsdom \
  @types/node
```

- [x] **Step 3: Initialize shadcn/ui**

```bash
npx shadcn@latest init
```

When prompted:
- Style: **Default**
- Base color: **Slate**
- CSS variables: **Yes**

Then add essential components:
```bash
npx shadcn@latest add button input label card tabs form toast badge separator
```

- [x] **Step 4: Create vitest config**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['node_modules', '.next', 'e2e'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

Create `vitest.setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

Add to `package.json` scripts:
```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:ui": "vitest --ui"
  }
}
```

- [x] **Step 5: Create environment template**

Create `.env.example`:
```bash
# PUBLIC (browser-safe)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_ROOT_DOMAIN=mytalam.com

# SERVER ONLY — never add NEXT_PUBLIC_ prefix
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
DATABASE_URL_SERVICE_ROLE=
MSG91_AUTH_KEY=
MSG91_TEMPLATE_ID=
SUPABASE_HOOK_SECRET=
RESEND_API_KEY=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
TALAM_RAZORPAY_KEY_ID=
TALAM_RAZORPAY_KEY_SECRET=
```

Copy to `.env.local` and fill in values from the config checklist.

- [x] **Step 6: Add ESLint rule to block NEXT_PUBLIC_ on secrets**

In `eslint.config.mjs`, add:
```javascript
{
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: 'MemberExpression[object.name="process"][property.name="env"][parent.property.name=/^NEXT_PUBLIC_SUPABASE_SERVICE_ROLE|^NEXT_PUBLIC_.*SECRET|^NEXT_PUBLIC_.*KEY.*SECRET/]',
        message: 'Never expose secret keys with NEXT_PUBLIC_ prefix.',
      },
    ],
  },
}
```

- [x] **Step 7: Verify dev server starts**

```bash
npm run dev
```

Expected: `✓ Ready in ~2s` at `http://localhost:3000`

- [x] **Step 8: Verify tests run**

```bash
npm test -- --run
```

Expected: `0 tests` (no tests yet) with no errors.

- [x] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js 15 project with Tailwind, shadcn, Vitest"
```

> Actually shipped as Next.js 16 / Tailwind 4 (user-approved deviation) — commit `7624ac7`.

---

### Task 2: Prisma Schema & Database

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/migrations/0001_init/migration.sql`
- Create: `lib/prisma.ts`
- Create: `lib/prisma.test.ts`

**Interfaces:**
- Produces: `prisma` singleton exported from `lib/prisma.ts`
- Produces: `withTenant(tenantId, fn)` function that wraps queries with RLS context

- [x] **Step 1: Initialize Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

- [x] **Step 2: Write the schema**

> Actually shipped without inline `url`/`directUrl` on the `datasource` block — Prisma 7.8 (user-approved deviation) moved connection config to `prisma.config.ts` (`datasource.url = env('DATABASE_URL')`, loaded via `dotenv/config`). Everything else matches the plan verbatim.

Replace `prisma/schema.prisma` contents:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DATABASE_URL_SERVICE_ROLE")
}

enum Tier {
  trial
  starter
  pro
}

enum PaymentProvider {
  upi_manual
  instamojo
  razorpay
  // phonepe — V2 only
}

enum OrderStatus {
  pending
  confirmed
  shipped
  delivered
  cancelled
  returned
}

enum PaymentStatus {
  pending
  paid
  failed
  refunded
}

enum DiscountType {
  percent
  fixed
}

model Tenant {
  id                    String          @id @default(uuid()) @db.Uuid
  ownerId               String          @db.Uuid @map("owner_id")
  slug                  String          @unique
  name                  String
  tagline               String?
  tier                  Tier            @default(trial)
  trialEndsAt           DateTime?       @map("trial_ends_at") @db.Timestamptz
  brandColor            String?         @map("brand_color")
  logoUrl               String?         @map("logo_url")
  whatsappNumber        String?         @map("whatsapp_number")
  contactPhone          String?         @map("contact_phone")
  contactEmail          String?         @map("contact_email")
  showWhatsappButton    Boolean         @default(true) @map("show_whatsapp_button")
  notifyEmailOnOrder    Boolean         @default(true) @map("notify_email_on_order")
  paymentProvider       PaymentProvider @default(upi_manual) @map("payment_provider")
  paymentConfig         Json?           @map("payment_config")
  storeType             String?         @map("store_type")
  freeDeliveryAbove     Decimal?        @db.Decimal(10, 2) @map("free_delivery_above")
  shippingFee           Decimal         @default(0) @db.Decimal(10, 2) @map("shipping_fee")
  deliveryEstimateText  String?         @map("delivery_estimate_text")
  returnWindowDays      Int?            @map("return_window_days")
  trustBadgeText        String?         @map("trust_badge_text")
  sizeGuideUrl          String?         @map("size_guide_url")
  deletedAt             DateTime?       @map("deleted_at") @db.Timestamptz
  createdAt             DateTime        @default(now()) @map("created_at") @db.Timestamptz

  products              Product[]
  customers             Customer[]
  orders                Order[]
  orderItems            OrderItem[]
  wishlists             Wishlist[]
  discountCodes         DiscountCode[]
  categories            ProductCategory[]
  about                 StoreAbout?
  branches              StoreBranch[]
  reviews               ProductReview[]

  @@map("tenants")
}

model Product {
  id           String    @id @default(uuid()) @db.Uuid
  tenantId     String    @db.Uuid @map("tenant_id")
  name         String
  slug         String
  description  String?
  price        Decimal   @db.Decimal(10, 2)
  comparePrice Decimal?  @db.Decimal(10, 2) @map("compare_price")
  categoryId   String?   @db.Uuid @map("category_id")
  sizes        String[]
  images       String[]
  stockBySize  Json      @default("{}") @map("stock_by_size")
  isActive     Boolean   @default(true) @map("is_active")
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz

  tenant       Tenant          @relation(fields: [tenantId], references: [id])
  category     ProductCategory? @relation(fields: [categoryId], references: [id])
  orderItems   OrderItem[]
  wishlists    Wishlist[]
  reviews      ProductReview[]

  @@unique([tenantId, slug])
  @@map("products")
}

model ProductCategory {
  id        String    @id @default(uuid()) @db.Uuid
  tenantId  String    @db.Uuid @map("tenant_id")
  name      String
  slug      String
  sortOrder Int       @default(0) @map("sort_order")
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz

  tenant    Tenant    @relation(fields: [tenantId], references: [id])
  products  Product[]

  @@unique([tenantId, slug])
  @@map("product_categories")
}

model Customer {
  id        String   @id @db.Uuid
  tenantId  String   @db.Uuid @map("tenant_id")
  name      String?
  phone     String?
  email     String?
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  orders    Order[]
  wishlists Wishlist[]
  reviews   ProductReview[]

  @@map("customers")
}

model Order {
  id              String        @id @default(uuid()) @db.Uuid
  tenantId        String        @db.Uuid @map("tenant_id")
  customerId      String        @db.Uuid @map("customer_id")
  status          OrderStatus   @default(pending)
  total           Decimal       @db.Decimal(10, 2)
  paymentProvider String?       @map("payment_provider")
  paymentId       String?       @map("payment_id")
  paymentStatus   PaymentStatus @default(pending) @map("payment_status")
  shippingAddress Json          @map("shipping_address")
  trackingId      String?       @map("tracking_id")
  createdAt       DateTime      @default(now()) @map("created_at") @db.Timestamptz

  tenant          Tenant        @relation(fields: [tenantId], references: [id])
  customer        Customer      @relation(fields: [customerId], references: [id])
  items           OrderItem[]

  @@map("orders")
}

model OrderItem {
  id          String   @id @default(uuid()) @db.Uuid
  orderId     String   @db.Uuid @map("order_id")
  tenantId    String   @db.Uuid @map("tenant_id")
  productId   String   @db.Uuid @map("product_id")
  productName String   @map("product_name")
  size        String?
  quantity    Int
  unitPrice   Decimal  @db.Decimal(10, 2) @map("unit_price")

  order       Order    @relation(fields: [orderId], references: [id])
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  product     Product  @relation(fields: [productId], references: [id])

  @@map("order_items")
}

model Wishlist {
  id         String   @id @default(uuid()) @db.Uuid
  tenantId   String   @db.Uuid @map("tenant_id")
  customerId String   @db.Uuid @map("customer_id")
  productId  String   @db.Uuid @map("product_id")

  tenant     Tenant   @relation(fields: [tenantId], references: [id])
  customer   Customer @relation(fields: [customerId], references: [id])
  product    Product  @relation(fields: [productId], references: [id])

  @@unique([tenantId, customerId, productId])
  @@map("wishlists")
}

model DiscountCode {
  id        String       @id @default(uuid()) @db.Uuid
  tenantId  String       @db.Uuid @map("tenant_id")
  code      String
  type      DiscountType
  value     Decimal      @db.Decimal(10, 2)
  minOrder  Decimal?     @db.Decimal(10, 2) @map("min_order")
  usesLimit Int?         @map("uses_limit")
  usesCount Int          @default(0) @map("uses_count")
  expiresAt DateTime?    @map("expires_at") @db.Timestamptz
  isActive  Boolean      @default(true) @map("is_active")

  tenant    Tenant       @relation(fields: [tenantId], references: [id])

  @@unique([tenantId, code])
  @@map("discount_codes")
}

model StoreAbout {
  id               String   @id @default(uuid()) @db.Uuid
  tenantId         String   @unique @db.Uuid @map("tenant_id")
  storyTitle       String?  @map("story_title")
  description      String?
  ownerPhotoUrl    String?  @map("owner_photo_url")
  instagramUrl     String?  @map("instagram_url")
  facebookUrl      String?  @map("facebook_url")
  youtubeUrl       String?  @map("youtube_url")
  googleBusinessUrl String? @map("google_business_url")
  createdAt        DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt        DateTime @updatedAt @map("updated_at") @db.Timestamptz

  tenant           Tenant   @relation(fields: [tenantId], references: [id])

  @@map("store_about")
}

model StoreBranch {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @db.Uuid @map("tenant_id")
  name      String
  address   String?
  city      String?
  phone     String?
  mapsUrl   String?  @map("maps_url")
  sortOrder Int      @default(0) @map("sort_order")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  tenant    Tenant   @relation(fields: [tenantId], references: [id])

  @@map("store_branches")
}

model ProductReview {
  id                 String    @id @default(uuid()) @db.Uuid
  tenantId           String    @db.Uuid @map("tenant_id")
  productId          String    @db.Uuid @map("product_id")
  customerId         String    @db.Uuid @map("customer_id")
  rating             Int
  comment            String?
  isVerifiedPurchase Boolean   @default(false) @map("is_verified_purchase")
  isDeleted          Boolean   @default(false) @map("is_deleted")
  createdAt          DateTime  @default(now()) @map("created_at") @db.Timestamptz

  tenant             Tenant    @relation(fields: [tenantId], references: [id])
  product            Product   @relation(fields: [productId], references: [id])
  customer           Customer  @relation(fields: [customerId], references: [id])
  reports            ReviewReport[]

  @@unique([tenantId, productId, customerId])
  @@map("product_reviews")
}

model ReviewReport {
  id         String        @id @default(uuid()) @db.Uuid
  tenantId   String        @db.Uuid @map("tenant_id")
  reviewId   String        @db.Uuid @map("review_id")
  reporterId String        @db.Uuid @map("reporter_id")
  reason     String        // 'spam' | 'inappropriate' | 'fake' | 'other'
  createdAt  DateTime      @default(now()) @map("created_at") @db.Timestamptz

  review     ProductReview @relation(fields: [reviewId], references: [id])

  @@unique([tenantId, reviewId, reporterId])
  @@map("review_reports")
}
```

- [x] **Step 3: Run migration**

```bash
npx prisma migrate dev --name init
```

Expected: `✓ Generated Prisma Client` and migration file created in `prisma/migrations/`

- [x] **Step 4: Write failing test for Prisma tenant wrapper**

Create `lib/prisma.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock PrismaClient before importing lib/prisma
vi.mock('@prisma/client', () => {
  const mockExecuteRaw = vi.fn().mockResolvedValue(1)
  const mockPrismaClient = vi.fn(() => ({
    $executeRaw: mockExecuteRaw,
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  }))
  return { PrismaClient: mockPrismaClient }
})

import { withTenant } from './prisma'

describe('withTenant', () => {
  it('sets app.tenant_id before running the callback', async () => {
    const tenantId = 'test-tenant-uuid'
    const mockFn = vi.fn().mockResolvedValue('result')

    const result = await withTenant(tenantId, mockFn)

    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(result).toBe('result')
  })

  it('passes the prisma client to the callback', async () => {
    const tenantId = 'test-tenant-uuid'
    let receivedClient: unknown

    await withTenant(tenantId, (client) => {
      receivedClient = client
      return Promise.resolve(null)
    })

    expect(receivedClient).toBeDefined()
    expect(typeof receivedClient).toBe('object')
  })
})
```

- [x] **Step 5: Run test — verify it fails**

```bash
npm test -- --run lib/prisma.test.ts
```

Expected: FAIL — `Cannot find module './prisma'`

- [x] **Step 6: Implement lib/prisma.ts**

Create `lib/prisma.ts`:
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function withTenant<T>(
  tenantId: string,
  fn: (client: PrismaClient) => Promise<T>
): Promise<T> {
  await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`
  return fn(prisma)
}
```

- [x] **Step 7: Run test — verify it passes**

```bash
npm test -- --run lib/prisma.test.ts
```

Expected: PASS — 2 tests pass

> The plan's mock (`vi.fn(() => ({...}))`) isn't callable with `new` under Vitest 4 — fixed by using a `class MockPrismaClient` instead. Test-only change, no impact on `lib/prisma.ts`.

- [x] **Step 8: Apply RLS policies in Supabase**

In Supabase SQL Editor, run for each table:
```sql
-- Enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_about ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_reports ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy (all tables with tenant_id)
CREATE POLICY "tenant_isolation" ON product_categories
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY "tenant_isolation" ON products
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY "tenant_isolation" ON customers
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY "tenant_isolation" ON orders
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY "tenant_isolation" ON order_items
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY "tenant_isolation" ON wishlists
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY "tenant_isolation" ON discount_codes
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY "tenant_isolation" ON store_about
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY "tenant_isolation" ON store_branches
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY "tenant_isolation" ON product_reviews
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY "tenant_isolation" ON review_reports
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- tenants table — owner sees only their own store
CREATE POLICY "owner_isolation" ON tenants
  USING (id = current_setting('app.tenant_id')::uuid);
```

Applied via Supabase MCP `execute_sql` (not the SQL Editor UI) — `get_advisors` security scan returned zero lints afterward.

- [x] **Step 9: Commit**

```bash
git add prisma/ lib/prisma.ts lib/prisma.test.ts
git commit -m "feat: add Prisma schema with all tables and RLS-aware withTenant wrapper"
```

> Also committed `prisma.config.ts` — required for the Prisma 7 datasource-config change above. Commit `ced669a`.

---

### Task 3: Supabase Clients

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/admin.ts`
- Create: `lib/supabase/middleware.ts`
- Create: `lib/supabase/client.test.ts`

**Interfaces:**
- Produces: `createBrowserClient()` — browser-safe Supabase client
- Produces: `createServerClient()` — server component client (reads cookies)
- Produces: `createAdminClient()` — service role client (server only)
- Produces: `updateSession(request)` — call from middleware to refresh auth

- [ ] **Step 1: Write failing test**

Create `lib/supabase/client.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({ auth: { getUser: vi.fn() } })),
  createServerClient: vi.fn(() => ({ auth: { getUser: vi.fn() } })),
}))

describe('Supabase browser client', () => {
  it('exports createBrowserClient factory', async () => {
    const { createBrowserClient } = await import('./client')
    expect(createBrowserClient).toBeDefined()
    expect(typeof createBrowserClient).toBe('function')
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm test -- --run lib/supabase/client.test.ts
```

Expected: FAIL — `Cannot find module './client'`

- [ ] **Step 3: Create browser client**

Create `lib/supabase/client.ts`:
```typescript
import { createBrowserClient as createClient } from '@supabase/ssr'

export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 4: Create server client**

Create `lib/supabase/server.ts`:
```typescript
import { createServerClient as createClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerClient() {
  const cookieStore = await cookies()

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component — cannot set cookies, middleware handles this
          }
        },
      },
    }
  )
}
```

- [ ] **Step 5: Create admin client**

Create `lib/supabase/admin.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase admin credentials')
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
```

- [ ] **Step 6: Create middleware session helper**

Create `lib/supabase/middleware.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — do not remove this
  await supabase.auth.getUser()

  return supabaseResponse
}
```

- [ ] **Step 7: Run test — verify it passes**

```bash
npm test -- --run lib/supabase/client.test.ts
```

Expected: PASS — 1 test passes

- [ ] **Step 8: Commit**

```bash
git add lib/supabase/
git commit -m "feat: add Supabase browser, server, admin clients and middleware session helper"
```

---

### Task 4: Multi-Tenant Middleware

**Files:**
- Create: `middleware.ts`
- Create: `lib/tenant.ts`
- Create: `lib/tenant.test.ts`

**Interfaces:**
- Produces: `getTenantBySlug(slug: string): Promise<{ id: string; slug: string; tier: string } | null>`
- Produces: Next.js middleware that sets `x-subdomain` and `x-tenant-id` headers and rewrites to correct route group

- [ ] **Step 1: Write failing tests**

Create `lib/tenant.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: 'uuid-123', slug: 'silk', tier: 'starter' },
            error: null,
          }),
        })),
      })),
    })),
  })),
}))

import { getTenantBySlug } from './tenant'

describe('getTenantBySlug', () => {
  it('returns tenant when slug exists', async () => {
    const tenant = await getTenantBySlug('silk')
    expect(tenant).toEqual({ id: 'uuid-123', slug: 'silk', tier: 'starter' })
  })

  it('returns null for empty slug', async () => {
    const tenant = await getTenantBySlug('')
    expect(tenant).toBeNull()
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm test -- --run lib/tenant.test.ts
```

Expected: FAIL — `Cannot find module './tenant'`

- [ ] **Step 3: Implement tenant resolver**

Create `lib/tenant.ts`:
```typescript
import { createAdminClient } from '@/lib/supabase/admin'

export type TenantMeta = {
  id: string
  slug: string
  tier: string
}

export async function getTenantBySlug(slug: string): Promise<TenantMeta | null> {
  if (!slug) return null

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('tenants')
    .select('id, slug, tier')
    .eq('slug', slug)
    .single()

  if (error || !data) return null
  return data as TenantMeta
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npm test -- --run lib/tenant.test.ts
```

Expected: PASS — 2 tests pass

- [ ] **Step 5: Implement middleware**

Create `middleware.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { getTenantBySlug } from '@/lib/tenant'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'mytalam.com'

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') ?? ''
  const pathname = request.nextUrl.pathname

  // Strip port (for local dev: localhost:3000)
  const host = hostname.split(':')[0]

  // Refresh Supabase session on every request
  const sessionResponse = await updateSession(request)

  // Main marketing domain → no rewrite, serve root route group
  if (host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}` || host === 'localhost') {
    return sessionResponse
  }

  // Super admin subdomain → rewrite to /super-admin/*
  if (host === `admin.${ROOT_DOMAIN}`) {
    const url = new URL(`/super-admin${pathname === '/' ? '' : pathname}`, request.url)
    return NextResponse.rewrite(url, { headers: sessionResponse.headers })
  }

  // Tenant subdomain → resolve tenant and rewrite to /store/*
  const subdomain = host.replace(`.${ROOT_DOMAIN}`, '')
  if (subdomain && subdomain !== host) {
    const tenant = await getTenantBySlug(subdomain)

    if (!tenant) {
      // Unknown tenant → 404
      return NextResponse.rewrite(new URL('/not-found', request.url))
    }

    const url = new URL(`/store${pathname === '/' ? '' : pathname}`, request.url)
    const response = NextResponse.rewrite(url, { headers: sessionResponse.headers })
    response.headers.set('x-subdomain', subdomain)
    response.headers.set('x-tenant-id', tenant.id)
    response.headers.set('x-tenant-tier', tenant.tier)
    return response
  }

  return sessionResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 6: Create app route structure**

```bash
# Create internal routing directories
mkdir -p app/store
mkdir -p app/super-admin
```

Create `app/store/layout.tsx`:
```typescript
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) notFound()

  return <>{children}</>
}
```

Create `app/store/page.tsx`:
```typescript
import { headers } from 'next/headers'

export default async function StorePage() {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  const subdomain = headersList.get('x-subdomain')

  return (
    <main>
      <h1>Store: {subdomain}</h1>
      <p>Tenant ID: {tenantId}</p>
    </main>
  )
}
```

Create `app/super-admin/layout.tsx`:
```typescript
export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
```

Create `app/super-admin/page.tsx`:
```typescript
export default function SuperAdminPage() {
  return <main><h1>Super Admin</h1></main>
}
```

- [ ] **Step 7: Verify middleware routing manually**

```bash
npm run dev
```

In browser or curl:
- `http://localhost:3000` → serves `app/page.tsx` (marketing)
- `http://silk.localhost:3000` (requires `/etc/hosts` or browser extension) → not easily testable locally; use Vercel preview instead

- [ ] **Step 8: Commit**

```bash
git add middleware.ts lib/tenant.ts lib/tenant.test.ts app/store/ app/super-admin/
git commit -m "feat: add multi-tenant middleware with subdomain routing and tenant resolution"
```

---

### Task 5: Auth Flow (OTP + Google)

> **Synced to Paper design 2026-07-04:** the `/auth` page is a single unified "Log in or Sign up" screen — phone number form first, then a divider, then "Continue with Google" below it. There is no tabbed UI and no email fallback in the current design (Paper never designed an email tab or a separate signup screen — one phone-based flow covers both). `email-form.tsx` and the `Tabs` wrapper below are **not** part of the current design; do not build them. See `docs/design/2026-06-23-talam-oss-design.md` §4.1b for the reference layout.

**Files:**
- Create: `app/store/auth/page.tsx`
- Create: `app/store/auth/actions.ts`
- Create: `components/auth/otp-form.tsx`
- Create: `components/auth/google-button.tsx`
- Create: `supabase/functions/msg91-sms-hook/index.ts`
- Create: `components/auth/otp-form.test.tsx`

**Interfaces:**
- Consumes: `createBrowserClient()` from `lib/supabase/client`
- Consumes: `createServerClient()` from `lib/supabase/server`
- Produces: `/store/auth` page — single phone-first form (OTP) with Google as a secondary option; matches the Account Menu's single "Log in / Sign up" entry point (no separate login vs. signup screen)

- [ ] **Step 1: Write failing component test**

Create `components/auth/otp-form.test.tsx`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OtpForm } from './otp-form'

vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: vi.fn(() => ({
    auth: {
      signInWithOtp: vi.fn().mockResolvedValue({ data: {}, error: null }),
      verifyOtp: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  })),
}))

describe('OtpForm', () => {
  it('renders phone input in initial state', () => {
    render(<OtpForm />)
    expect(screen.getByPlaceholderText(/mobile number/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send otp/i })).toBeInTheDocument()
  })

  it('shows OTP input after phone submission', async () => {
    const user = userEvent.setup()
    render(<OtpForm />)

    await user.type(screen.getByPlaceholderText(/mobile number/i), '9876543210')
    await user.click(screen.getByRole('button', { name: /send otp/i }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/6-digit otp/i)).toBeInTheDocument()
    })
  })

  it('displays error when phone is invalid', async () => {
    const user = userEvent.setup()
    render(<OtpForm />)

    await user.type(screen.getByPlaceholderText(/mobile number/i), '123')
    await user.click(screen.getByRole('button', { name: /send otp/i }))

    await waitFor(() => {
      expect(screen.getByText(/valid 10-digit/i)).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm test -- --run components/auth/otp-form.test.tsx
```

Expected: FAIL — `Cannot find module './otp-form'`

- [ ] **Step 3: Create OTP form component**

Create `components/auth/otp-form.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Step = 'phone' | 'otp'

export function OtpForm() {
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = createBrowserClient()

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length !== 10) {
      setError('Enter a valid 10-digit mobile number')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      phone: `+91${cleaned}`,
    })
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setStep('otp')
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.verifyOtp({
      phone: `+91${phone.replace(/\D/g, '')}`,
      token: otp,
      type: 'sms',
    })
    setLoading(false)

    if (error) {
      setError(error.message)
    }
    // On success, Supabase sets the session cookie and redirects via the auth state listener
  }

  if (step === 'otp') {
    return (
      <form onSubmit={handleVerifyOtp} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="otp">Enter OTP</Label>
          <Input
            id="otp"
            placeholder="6-digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={6}
            inputMode="numeric"
            autoComplete="one-time-code"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Verifying…' : 'Verify OTP'}
        </Button>
        <button
          type="button"
          onClick={() => { setStep('phone'); setError('') }}
          className="text-sm text-muted-foreground underline w-full text-center"
        >
          Change number
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={handleSendOtp} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="phone">Mobile Number</Label>
        <div className="flex">
          <span className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted text-sm text-muted-foreground">
            +91
          </span>
          <Input
            id="phone"
            placeholder="Mobile number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-l-none"
            inputMode="tel"
            autoComplete="tel-national"
            maxLength={10}
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Sending…' : 'Send OTP'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npm test -- --run components/auth/otp-form.test.tsx
```

Expected: PASS — 3 tests pass

- [ ] **Step 5: Create Google Sign-In button**

Create `components/auth/google-button.tsx`:
```typescript
'use client'

import { createBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function GoogleButton() {
  const supabase = createBrowserClient()

  async function handleGoogleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={handleGoogleSignIn}
    >
      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Continue with Google
    </Button>
  )
}
```

- [ ] **Step 6: Create auth page**

Create `app/store/auth/page.tsx` (single phone-first form, Google as secondary option — matches the Paper `Auth — Mobile` / `Auth — Desktop` artboards, no tabs):
```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OtpForm } from '@/components/auth/otp-form'
import { GoogleButton } from '@/components/auth/google-button'
import { headers } from 'next/headers'

export default async function AuthPage() {
  const headersList = await headers()
  const subdomain = headersList.get('x-subdomain') ?? ''

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Log in or Sign up</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter your mobile number — we&apos;ll text you a one-time code to continue.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <OtpForm />
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>
          <GoogleButton />
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 7: Create Supabase OAuth callback route**

Create `app/store/auth/callback/route.ts`:
```typescript
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=oauth_failed`)
}
```

- [ ] **Step 8: Create MSG91 SMS Hook Edge Function**

Create `supabase/functions/msg91-sms-hook/index.ts`:
```typescript
import { createHmac } from 'node:crypto'

const MSG91_API_URL = 'https://api.msg91.com/api/v5/otp'

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Verify Supabase hook signature
  const hookSecret = Deno.env.get('SUPABASE_HOOK_SECRET')
  const signature = req.headers.get('x-supabase-signature')

  if (!hookSecret || !signature) {
    return new Response('Unauthorized', { status: 401 })
  }

  const body = await req.text()
  const expectedSig = createHmac('sha256', hookSecret)
    .update(body)
    .digest('hex')

  if (signature !== expectedSig) {
    return new Response('Unauthorized', { status: 401 })
  }

  const payload = JSON.parse(body)
  const { phone, otp } = payload

  // Call MSG91 OTP API
  const msg91Response = await fetch(
    `${MSG91_API_URL}?authkey=${Deno.env.get('MSG91_AUTH_KEY')}&template_id=${Deno.env.get('MSG91_TEMPLATE_ID')}&mobile=${phone}&otp=${otp}`,
    { method: 'POST' }
  )

  if (!msg91Response.ok) {
    const text = await msg91Response.text()
    console.error('MSG91 error:', text)
    return new Response(JSON.stringify({ error: 'SMS delivery failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
```

- [ ] **Step 9: Deploy Edge Function**

```bash
# Install Supabase CLI if not present
npm install -g supabase

# Link to your project
supabase login
supabase link --project-ref {YOUR_SUPABASE_PROJECT_REF}

# Deploy the function
supabase functions deploy msg91-sms-hook \
  --env-file .env.local
```

Expected: `✓ Function deployed successfully`

- [ ] **Step 10: Run all tests**

```bash
npm test -- --run
```

Expected: All tests pass (prisma.test, client.test, tenant.test, otp-form.test)

- [ ] **Step 11: Commit**

```bash
git add app/store/auth/ components/auth/ supabase/functions/
git commit -m "feat: add OTP + Google auth flow with MSG91 SMS hook Edge Function"
```

---

### Task 6: Root Layout & Marketing Home

**Files:**
- Modify: `app/layout.tsx`
- Create: `app/page.tsx` (marketing landing placeholder)
- Create: `app/not-found.tsx`

**Interfaces:**
- Produces: root `app/layout.tsx` with PostHog provider
- Produces: marketing landing page at `{YOUR_DOMAIN}/`

- [ ] **Step 1: Update root layout**

Replace `app/layout.tsx`:
```typescript
import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Talam — Your platform. Your business.',
  description: 'Multi-tenant e-commerce for Indian small businesses.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={geist.className}>{children}</body>
    </html>
  )
}
```

- [ ] **Step 2: Create marketing landing placeholder**

Replace `app/page.tsx`:
```typescript
export default function MarketingHome() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Talam</h1>
        <p className="text-muted-foreground text-lg">Your platform. Your business.</p>
        <p className="text-sm text-muted-foreground">Coming soon.</p>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Create not-found page**

Create `app/not-found.tsx`:
```typescript
export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold">Store not found</h1>
        <p className="text-muted-foreground text-sm">
          This store doesn't exist or may have moved.
        </p>
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Build check**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx app/page.tsx app/not-found.tsx
git commit -m "feat: add root layout, marketing home placeholder, and 404 for unknown tenants"
```

---

## Phase 1 Verification

After all tasks:

```bash
npm test -- --run
```
Expected: All tests pass (≥6 tests)

```bash
npm run build
```
Expected: Build succeeds, no TypeScript errors

Manual smoke test (after Vercel deployment):
- [ ] `https://{YOUR_DOMAIN}` loads marketing placeholder
- [ ] `https://test.{YOUR_DOMAIN}` serves 404 "Store not found" (unknown tenant)
- [ ] `https://silk.{YOUR_DOMAIN}/auth` shows OTP login form
- [ ] Phone OTP flow: number → SMS → OTP input → session created
- [ ] Google Sign-In redirects correctly
