# Talam — Full Product Design Spec

**Date:** 2026-06-23  
**Last updated:** 2026-06-24  
**Status:** Approved — v1.1  
**Author:** Surya Prakash  
**Version:** 1.1

**Changelog v1.1 (2026-06-24)**
- Domain changed from `talam.app` (unavailable) to `mytalam.com`
- Added `product_categories` table — dynamic, per-tenant, ordered categories replacing free-text `category` field on products
- Added `/admin/categories` route and `/shop/[categorySlug]` SEO-friendly category pages
- Expanded GTM section: ICP definition, referral attribution, email nurture sequences, pricing page
- Added product count enforcement per tier, missing env vars, promotions admin page

---

## 1. Product Overview

**Name:** Talam (தளம் — Tamil for "platform/ground")  
**Domain:** `mytalam.com`  
**Tagline:** "Your platform. Your business."  
**Type:** Multi-tenant SaaS e-commerce platform

### What It Is
A Myntra-quality online store builder for any Indian small business — ethnic wear, bakeries, salons, tutors, handicrafts. Non-technical owners sign up, configure in 14 minutes, and start selling via UPI/cards with no GST or MSME registration required.

### What It Is Not
- Not a competitor to Shopify at scale — it is the Indian-first, individual-seller-friendly alternative
- Not a template to download — it is a hosted SaaS platform
- Not multi-currency — India-only at launch

### Store #1
D'Mystique Boutique (`silk.mytalam.com`) — the owner's own ethnic wear boutique. Used as proof-of-concept, marketing demo, and first viral referral source.

---

## 2. Business Model

| | Trial | Starter | Pro |
|---|---|---|---|
| **Price** | Free (14 days) | ₹499/mo | ₹1,499/mo |
| **Products** | 25 | 100 | Unlimited |
| **OTP logins/mo** | 100 | 500 | 2,000 |
| **Subdomain** | Yes | Yes | Yes |
| **Custom domain** | No | No | V2 |
| **Payments** | Yes | Yes | Yes |
| **WhatsApp button** | No | Yes | Yes |
| **Discount codes** | No | Yes | Yes |
| **Wishlist** | No | Yes | Yes |
| **Analytics** | No | Basic | Advanced |
| **"Powered by" badge** | Shown | Hidden | Hidden |
| **Support** | Docs | Email | Priority |

**On trial expiry:** Store goes read-only (customers can browse, cannot checkout). Banner shown to store owner to subscribe.

**Product count limit enforcement:** Enforced server-side on `createProduct` Server Action — returns a user-visible error before writing to the DB.

**Referral program:** A store owner who refers a new subscriber earns 1 free month. Tracked via `utm_source=badge&utm_medium=store&utm_campaign={slug}` on the "Powered by Talam" badge link → `/join` landing page on `mytalam.com` captures the referral source.

**Talam subscription billing:** Via Talam's own Razorpay account (separate from tenant payments).

**Break-even:** 4 paying Starter tenants (₹1,996 revenue vs ₹1,890/mo infra cost).

---

## 3. Architecture

### 3.1 Multi-Tenancy Model
- **Routing:** Wildcard subdomain `*.mytalam.com` — Vercel middleware extracts subdomain → resolves `tenant_id` → injects into request context via `x-tenant-id` / `x-tenant-tier` headers
- **Database:** Shared PostgreSQL, every table has `tenant_id` UUID foreign key
- **Isolation:** Supabase Row Level Security (RLS) enforces tenant boundaries at DB level; Prisma `withTenant()` sets `app.tenant_id` session variable before every query
- **Image isolation:** Cloudinary folder per tenant `/talam/{tenantId}/`
- **Admin split:** Tenant admin at `{store}.mytalam.com/admin`, Super admin at `admin.mytalam.com`

### 3.2 App Structure

```
mytalam.com/                       → Marketing landing page + pricing page
{store}.mytalam.com/               → Tenant storefront
{store}.mytalam.com/admin          → Tenant admin panel
admin.mytalam.com/                 → Super admin (platform owner)
```

**Storefront routes:**
```
/                         Home — hero, collections, sale banner
/shop                     Product listing + filters (category, size, price)
/shop/[categorySlug]      Category-specific listing — SEO-indexable, pre-rendered (ISR 30 min)
/product/[slug]           Product detail — images, size picker, add to cart
/cart                     Shopping cart (Zustand + localStorage)
/checkout                 Address + payment gateway
/orders                   Order history + tracking
/orders/[id]              Single order detail + status
/wishlist                 Saved products
/account                  Profile, saved addresses
/auth                     OTP / Google / Email login
```

**Tenant admin routes:**
```
/admin/dashboard     Sales stats, revenue, active orders
/admin/products      Add / edit / delete products
/admin/categories    Create / reorder / delete product categories (per tenant)
/admin/orders        Order list, status updates, tracking ID entry
/admin/customers     Customer list, contact details
/admin/promotions    Discount codes, sale banners
/admin/settings      Brand (logo, colors), payment gateway, WhatsApp number
/admin/payouts       Settlement history from payment gateway
/admin/billing       Subscription plan, upgrade, payment history
/admin/onboarding    First-run setup wizard (store name → brand → payment)
```

**Super admin routes:**
```
/dashboard           Platform metrics — GMV, active stores, MRR
/tenants             All stores — tier, status, last order date
/tenants/[id]        Individual store details, tier override
/billing             Subscription payments, failed renewals
```

**Marketing site routes:**
```
mytalam.com/         Landing page — hero, features, social proof
mytalam.com/pricing  Plan comparison — Trial / Starter / Pro feature table + CTA
mytalam.com/join     Referral landing page — captures utm_campaign={slug} for attribution
```

### 3.3 Rendering Strategy

| Page | Strategy | Revalidation |
|---|---|---|
| Storefront home | ISR | 1 hour |
| Shop / filters | ISR | 30 minutes |
| Shop / [categorySlug] | ISR + generateStaticParams | 30 minutes |
| Product detail | ISR + on-demand | On admin product edit via `/api/revalidate` |
| Cart | Client (Zustand) | — |
| Checkout | SSR dynamic | Every request |
| Orders | SSR dynamic | Every request |
| Admin all pages | SSR dynamic | Every request |
| Marketing (pricing, join) | Static | On deploy |

### 3.4 Post-Checkout Flow (Non-blocking)

```
Payment webhook received → verify signature → mark order PAID
→ Vercel after() fires:
    ├── Resend: order confirmation email to customer
    ├── Resend: "New order ₹X from {name}" to store owner (fetched via Supabase admin)
    ├── PostHog: order_paid event tracked (user_id, tenant_id, amount — no PII)
    └── (V1.5) MSG91 WhatsApp: order alert to store owner
```

---

## 4. Tech Stack

| Layer | Choice | Version | Cost |
|---|---|---|---|
| Framework | Next.js App Router | 15.1 | Free |
| Language | TypeScript | 5.x | Free |
| Styling | Tailwind CSS | 3.x | Free |
| UI Components | shadcn/ui (mobile-first) | Latest | Free |
| State | Zustand | 4.x | Free |
| Client fetch | SWR | 2.x | Free |
| Animations | Framer Motion | 11.x | Free |
| Icons | Lucide React | Latest | Free |
| ORM | Prisma (non-superuser role) | 5.x | Free |
| Database | Supabase PostgreSQL | — | Free (500MB) |
| Auth | Supabase Auth | — | Free (50K MAU) |
| OTP delivery | MSG91 via Supabase SMS Hook | — | ₹0.12/SMS |
| Image storage | Cloudinary | — | Free (25GB) |
| Email | Resend | — | Free (3K/mo) |
| Background jobs | Vercel `after()` | Next.js 15.1 | Free |
| Rate limiting | Upstash Redis | — | Free (10K/day) |
| OG cards | @vercel/og | — | Free |
| Analytics | PostHog | — | Free (1M events) |
| Hosting | Vercel Pro | — | $20/mo (~₹1,700) |
| Domain | mytalam.com via Cloudflare | — | ~$10/yr (~₹850) |
| DNS | Vercel nameservers | — | Free |

**Total infra cost before first tenant: ₹1,890/mo**

---

## 5. Authentication

**Providers (in priority order):**
1. **Phone OTP** — primary, matches Myntra/Flipkart UX, via Supabase Auth + SMS Hook + MSG91
2. **Google Sign-In** — one-tap alternative
3. **Email + Password** — fallback

**OTP flow:**
```
User enters phone → rate limit check (Upstash Redis: 5/10 min per phone)
→ Supabase Auth generates OTP
→ SMS Hook fires → Supabase Edge Function (msg91-sms-hook)
→ MSG91 API delivers OTP to phone (₹0.12)
→ User enters OTP → Supabase verifies
→ JWT issued → RLS identity bound → session created
```

**Session management:** Supabase Auth handles JWT issuance, refresh, and expiry. HttpOnly cookies via `@supabase/ssr`. Session refreshed on every request in middleware.

---

## 6. Database Schema (Key Tables)

```sql
tenants
  id uuid PK
  owner_id uuid FK → auth.users  -- Supabase Auth user who created the store
  slug text UNIQUE               -- "silk" in silk.mytalam.com
  name text
  tier enum('trial','starter','pro')
  trial_ends_at timestamptz
  brand_color text               -- CSS hex
  logo_url text                  -- Cloudinary URL
  whatsapp_number text
  payment_provider enum('upi_manual','instamojo','phonepe','razorpay')
  payment_config jsonb           -- encrypted gateway keys
  store_type text                -- 'ethnic_wear' | 'bakery' | 'salon' | 'handicrafts' | 'other'
                                 -- captured at onboarding, used for PostHog segmentation
  created_at timestamptz

product_categories
  id uuid PK
  tenant_id uuid FK → tenants
  name text                      -- "Cakes", "Kurtis", "Haircuts" — owner-defined
  slug text                      -- URL-safe, e.g. "cakes" → /shop/cakes
  sort_order int                 -- controls display order in filter UI and home category strips
  created_at timestamptz
  ── UNIQUE(tenant_id, slug)

products
  id uuid PK
  tenant_id uuid FK → tenants
  name text
  slug text
  description text
  price numeric
  compare_price numeric          -- for sale display (strikethrough)
  category_id uuid FK → product_categories  -- nullable (product may have no category)
  sizes text[]                   -- ['XS','S','M','L','XL','XXL'] — empty array = no size
  images text[]                  -- Cloudinary URLs
  stock_by_size jsonb            -- {"M": 5, "L": 3} — empty if no sizes
  is_active boolean
  created_at timestamptz
  ── UNIQUE(tenant_id, slug)

customers
  id uuid FK → auth.users        -- Supabase Auth user
  tenant_id uuid FK → tenants
  name text
  phone text
  email text
  created_at timestamptz

orders
  id uuid PK
  tenant_id uuid FK → tenants
  customer_id uuid FK → customers
  status enum('pending','confirmed','shipped','delivered','cancelled','returned')
  total numeric
  payment_provider text
  payment_id text                -- gateway transaction ID
  payment_status enum('pending','paid','failed','refunded')
  shipping_address jsonb
  tracking_id text
  created_at timestamptz

order_items
  id uuid PK
  order_id uuid FK → orders
  tenant_id uuid FK → tenants
  product_id uuid FK → products
  product_name text              -- snapshot at time of order
  size text
  quantity int
  unit_price numeric

wishlists
  id uuid PK
  tenant_id uuid FK → tenants
  customer_id uuid FK → customers
  product_id uuid FK → products
  ── UNIQUE(tenant_id, customer_id, product_id)

discount_codes
  id uuid PK
  tenant_id uuid FK → tenants
  code text
  type enum('percent','fixed')
  value numeric
  min_order numeric
  uses_limit int
  uses_count int
  expires_at timestamptz
  is_active boolean
  ── UNIQUE(tenant_id, code)
```

**RLS policy pattern (applied to every table including `product_categories`):**
```sql
CREATE POLICY "tenant_isolation"
ON {table_name}
USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

---

## 7. Payment Architecture

### Payment Provider Abstraction
```typescript
interface PaymentProvider {
  name: string
  createOrder(amount: number, orderId: string): Promise<{ checkoutData: CheckoutData }>
  verifyWebhook(payload: unknown, headers: Headers): Promise<WebhookVerifyResult>
}

type CheckoutData = {
  paymentUrl?: string      // UPI deep link or Instamojo redirect URL
  qrCode?: string          // UPI QR code image URL
}

// Implementations
class UpiManualProvider implements PaymentProvider { ... }
class InstamojoProvider implements PaymentProvider { ... }
class PhonePeProvider implements PaymentProvider { ... }
class RazorpayProvider implements PaymentProvider { ... }
```

### Payment Options for Tenants

| Provider | KYC Required | Fee | Best For |
|---|---|---|---|
| UPI Manual | UPI ID only | 0% | Anyone, manual confirm |
| Instamojo ← Recommended | PAN + savings account | 2% + ₹3 | Individual sellers |
| PhonePe PG | PAN + current account | 0% UPI, ~2% cards | Sellers with current account |
| Razorpay | Existing account | 2% | Already registered businesses |

### Money Flow
```
Customer pays → tenant's payment gateway account
→ Money direct to tenant's bank (T+2 or instant for UPI)
→ Talam never touches transaction money
→ Talam charges subscription separately via own Razorpay
```

**Razorpay Route (V2):** Once Talam has 50+ stores and qualifies for FLDG, migrate to central collection with automated platform fee deduction.

---

## 8. Security

### Critical Controls (Blockers — must implement first)

**1. Prisma non-superuser role:**
```sql
CREATE ROLE talam_app_user WITH LOGIN PASSWORD '...';
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO talam_app_user;
```
```typescript
// withTenant() injects tenant context before every query
await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`
```

**2. Supabase client split:**
```
NEXT_PUBLIC_SUPABASE_ANON_KEY    → browser/client components (safe)
SUPABASE_SERVICE_ROLE_KEY        → server-only, never NEXT_PUBLIC_ prefix
```
ESLint rule blocks accidental `NEXT_PUBLIC_` prefix on any secret key.

**3. MSG91 via SMS Hook (not direct):**
Supabase generates OTP → SMS Hook → Edge Function → MSG91 API → customer phone.
Supabase session management unbroken. Hook signature verified with HMAC-SHA256.

### Additional Security
- All Server Actions verify Supabase session before any DB mutation
- Admin routes verify `tenant.owner_id === auth.uid()`
- Super admin routes verify `user.app_metadata.role === 'super_admin'`
- Webhook endpoints verify provider signature before any order status update
- Rate limiting on OTP endpoint: 5 attempts per phone per 10 min (Upstash Redis)
- Payment gateway keys stored in `tenant.payment_config` JSONB (encrypted at rest by Supabase)
- Security headers on all responses via middleware: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`

---

## 9. Infrastructure

### DNS Setup
```
Domain registrar: Cloudflare (at-cost pricing, no markup)
Domain: mytalam.com
Nameservers: ns1.vercel-dns.com + ns2.vercel-dns.com (required for wildcard SSL)
Vercel project: Add mytalam.com + *.mytalam.com wildcard domain
Email subdomain: mail.mytalam.com (Resend SPF/DKIM DNS records added via Vercel DNS)
SSL: Auto-provisioned by Vercel via Let's Encrypt (wildcard cert requires Vercel nameservers)
```

### Environment Variables
```bash
# ─── PUBLIC (browser-safe) ───────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_ROOT_DOMAIN=mytalam.com     # used in middleware, OG cards, badge links

# ─── SERVER ONLY (never add NEXT_PUBLIC_ prefix) ─────────────────────────────
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=                            # talam_app_user role (Prisma runtime)
DATABASE_URL_SERVICE_ROLE=               # postgres superuser (migrations only)
MSG91_AUTH_KEY=
MSG91_TEMPLATE_ID=
SUPABASE_HOOK_SECRET=                    # 32-byte hex — HMAC secret for SMS Hook
RESEND_API_KEY=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
TALAM_RAZORPAY_KEY_ID=                  # Talam's own subscription billing account
TALAM_RAZORPAY_KEY_SECRET=
RAZORPAY_STARTER_PLAN_ID=               # plan_XXXX from Razorpay dashboard
RAZORPAY_PRO_PLAN_ID=                   # plan_YYYY from Razorpay dashboard
REVALIDATE_SECRET=                       # 32-byte hex — guards /api/revalidate endpoint
DMYSTIQUE_OWNER_ID=                      # Supabase auth.users UUID for D'Mystique owner (seed only)
```

---

## 10. GTM Strategy

### Ideal Customer Profile (ICP)

**Primary ICP — V1 focus:**
Women-owned ethnic wear, handicrafts, or homemade food businesses in Tier 1–2 Indian cities. Selling today via Instagram DMs and WhatsApp forwards. No website. 0–3 years old. 20–200 orders/month at ₹500–₹5,000 AOV. Phone-first: browses Instagram on phone, manages orders on WhatsApp at night.

**Why this ICP first:** D'Mystique is this exact profile. The first 5 referrals target the same category — not bakeries or salons (different UX needs, lower price tolerance). Once ethnic wear is proven, adjacent categories are fast follows.

**ICP captured at onboarding:** Wizard step 1 asks "What kind of products do you sell?" → maps to `tenant.store_type` → drives PostHog segmentation (`store_type` property on all events).

### GTM Motion

| | |
|---|---|
| **Primary motion** | Community-led — WhatsApp forwards + Instagram Reels |
| **Store #1** | D'Mystique live → real order screenshots → WhatsApp forward to peer sellers |
| **Viral loop** | "Powered by Talam" badge → `/join?utm_campaign={slug}` → signup → referrer gets 1 free month |
| **WhatsApp preview** | `@vercel/og` generates 1200×630 card when store link shared — brand color + product image |
| **Paid (Month 2)** | Instagram Reels ads, ₹5–10K/mo, Tamil Nadu women business owners 25–45 |
| **SEO** | Per-tenant category pages (`silk.mytalam.com/shop/sarees`) — indexable, shareable URLs |
| **Pricing page** | `mytalam.com/pricing` — public plan comparison with "Start free" CTA, no credit card required |

### Referral Attribution
- "Powered by Talam" badge on trial stores links to `mytalam.com/join?utm_source=badge&utm_medium=store&utm_campaign={slug}`
- `/join` page reads `utm_campaign`, shows: *"You found us via {store name}. They get 1 free month when you subscribe."*
- On successful subscription, referrer's `trial_ends_at` extended by 30 days (super admin action or Razorpay webhook)

### Owner Email Nurture Sequence (Resend)
Triggered by Vercel Cron — checks tenant state daily:

| Trigger | Delay | Email |
|---|---|---|
| Tenant created | Day 0 | "Welcome to Talam — add your first product in 5 minutes" |
| No products added | Day 2 | "Need a hand? Here's how to set up your store" |
| Products added, no orders | Day 7 | "Your store is live — share this link to get your first order" |
| Trial ends in 1 day | Day 13 | "Your trial ends tomorrow — subscribe to keep selling" |
| Trial expired, not subscribed | Day 15 | "Your store is paused — reactivate in 1 click" |

### Targets

| Metric | Month 1 | Month 3 |
|---|---|---|
| Paying stores | 5 | 25 |
| MRR | ₹2,495 | ₹12,475 |
| Active stores (≥1 order/30d) | 4 | 20 |

**North Star Metric:** Active stores with ≥1 order in last 30 days.

---

## 11. Timeline

| Week | Focus |
|---|---|
| 1 | Project init, Supabase setup, Prisma schema (incl. `product_categories`), auth flow (OTP + Google) |
| 2 | Storefront — home, shop, `/shop/[categorySlug]`, product detail pages |
| 3 | Cart, checkout, payment gateway integration (UPI Manual + Instamojo) |
| 4 | Orders, account, wishlist |
| 5 | Tenant admin — dashboard, **categories CRUD**, products CRUD, orders management, promotions |
| 6 | Super admin, onboarding wizard (incl. store_type question), trial/subscription billing |
| 7 | OG cards, PostHog analytics, Resend emails + **nurture sequences**, rate limiting, pricing page |
| 8 | D'Mystique goes live as Store #1, QA, Lighthouse performance audit, security headers, go-live |

**Target launch: August 18, 2026** (8 weeks from June 23, 2026)

> D'Mystique launches as Store #1 at Week 8, completing both the Talam platform and the boutique's online presence simultaneously.

---

## 12. Open Questions / V2 Backlog

**V2 Features:**
- Custom domain per Pro tenant (Vercel Domains API integration)
- Razorpay Route for automated platform fee deduction (requires 50+ stores for FLDG)
- MSG91 WhatsApp order notifications to store owner
- Tamil language UI toggle
- Vyapar CSV export for accounting sync
- Drag-to-reorder categories in admin (sort_order already in schema — just needs UI)
- Multi-image upload with drag-drop reorder on product form
- COD (cash on delivery) support
- Referral dashboard for store owners (track how many stores they've referred)
- International shipping / currency

**Resolved questions (moved from backlog):**
- ~~Domain `talam.app`~~ → **`mytalam.com`** (registered)
- ~~Free-text category field~~ → **`product_categories` FK table** (v1.1)
- ~~No referral tracking~~ → **UTM + `/join` page** (v1.1)
