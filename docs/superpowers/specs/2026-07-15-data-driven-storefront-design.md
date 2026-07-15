# Data-Driven Storefront — Design Spec

**Date:** 2026-07-15
**Status:** Draft
**Author:** Surya Prakash + Claude
**Scope:** Remove all hardcoded storefront data, make home page DB-driven, rename tenant to dmystique

---

## 1. Problem

The storefront home page (`app/store/page.tsx`) has ~700 lines of hardcoded textile data: categories (Sarees, Kurtis, Dupattas), occasion tags (Festive, Wedding, Casual), deal banners ("Upto 50% off Sarees"), hero carousel products, and product UI metadata (gradients, fabric labels). None of this comes from the database. A second tenant onboarding today would see D'Mystique's saree catalog on their own store.

The data layer (`lib/data/products.ts`, `lib/data/tenant.ts`) is already DB-driven. The storefront home page bypasses it.

## 2. Decision

**Path 1: Textile-only for V1.** Talam targets ethnic wear / textile business owners. The storefront design stays fashion-oriented. But all data flows from the database — no hardcoded product names, categories, deals, or occasions in component code.

## 3. Schema Additions

### 3.1 `StoreBanner` (hero carousel slides)

```prisma
model StoreBanner {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @db.Uuid @map("tenant_id")
  productId String?  @db.Uuid @map("product_id")
  headline  String?
  subtitle  String?
  sortOrder Int      @default(0) @map("sort_order")
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  product   Product? @relation(fields: [productId], references: [id])

  @@map("store_banners")
}
```

Each row = one hero carousel slide. `productId` links to the featured product (pulls its name, price, images, sizes, reviews). `headline` / `subtitle` are optional overrides — if null, the product name and category are used. `sortOrder` controls carousel order. If a tenant has zero banners, the hero section is hidden.

### 3.2 `StorePromotion` (flash sale / deal cards)

```prisma
model StorePromotion {
  id        String    @id @default(uuid()) @db.Uuid
  tenantId  String    @db.Uuid @map("tenant_id")
  offerText String    @map("offer_text")
  subtitle  String?
  linkUrl   String?   @map("link_url")
  endsAt    DateTime? @map("ends_at") @db.Timestamptz
  isActive  Boolean   @default(true) @map("is_active")
  sortOrder Int       @default(0) @map("sort_order")
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz

  tenant    Tenant    @relation(fields: [tenantId], references: [id])

  @@map("store_promotions")
}
```

Each row = one deal chip in the flash sale bar (e.g. "Upto 50% off" / "Sarees"). `endsAt` drives the countdown timer — if null, no timer is shown. If the soonest `endsAt` across all active promotions is in the future, the flash sale bar renders with a countdown to that timestamp. If a tenant has zero active promotions, the flash sale bar is hidden entirely.

### 3.3 `ProductTag` + join table (occasion / grouping tags)

```prisma
model ProductTag {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @db.Uuid @map("tenant_id")
  name      String
  slug      String
  emoji     String?
  sortOrder Int      @default(0) @map("sort_order")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  tenant    Tenant              @relation(fields: [tenantId], references: [id])
  products  ProductTagAssignment[]

  @@unique([tenantId, slug])
  @@map("product_tags")
}

model ProductTagAssignment {
  id        String     @id @default(uuid()) @db.Uuid
  tenantId  String     @db.Uuid @map("tenant_id")
  productId String     @db.Uuid @map("product_id")
  tagId     String     @db.Uuid @map("tag_id")

  product   Product    @relation(fields: [productId], references: [id])
  tag       ProductTag @relation(fields: [tagId], references: [id])

  @@unique([tenantId, productId, tagId])
  @@map("product_tag_assignments")
}
```

Replaces the hardcoded `occasion` field. A textile store creates tags like Festive, Wedding, Casual with emoji. The "Shop by Occasion" section renders from `ProductTag[]` — hidden if none exist. Tag assignments are many-to-many (a product can be both Festive and Wedding).

### 3.4 Tenant model additions

Add relations to Tenant:

```prisma
// Add to existing Tenant model
banners       StoreBanner[]
promotions    StorePromotion[]
tags          ProductTag[]
```

Add relation to Product:

```prisma
// Add to existing Product model
banners       StoreBanner[]
tagAssignments ProductTagAssignment[]
```

## 4. Data Layer Additions

New functions in `lib/data/storefront.ts`:

```typescript
// Returns hero carousel slides with their linked product data
export async function getStoreBanners(tenantId: string)

// Returns active, non-expired promotions sorted by sortOrder
export async function getStorePromotions(tenantId: string)

// Returns all tags with product count per tag
export async function getProductTags(tenantId: string)
```

No new file for `getProductsByTag` — the existing `getProducts()` in `lib/data/products.ts` gains an optional `tagId` filter in `ProductFilters`.

## 5. Storefront Home Page Rewrite

`app/store/page.tsx` becomes an SSR page (no `'use client'` at page level) that calls:

1. `getTenantStorefront(tenantId)` — tenant branding
2. `getStoreBanners(tenantId)` — hero carousel data
3. `getStorePromotions(tenantId)` — flash sale data
4. `getProductTags(tenantId)` — "Shop by" tags
5. `getCategories(tenantId)` — category cards
6. `getProducts(tenantId, filters)` — product grid

### Section rendering rules

| Section | Data source | Hidden when |
|---------|-------------|-------------|
| Hero carousel | `StoreBanner[]` | No active banners |
| Flash sale bar | `StorePromotion[]` | No active promotions |
| Shop by [tags] | `ProductTag[]` | No tags created |
| New This Week | `Product[]` where `createdAt` < 14 days | No new products |
| Browse Categories | `ProductCategory[]` | No categories |
| All Products grid | `Product[]` + filters | Never (always shown) |

### Client interactivity

The filter sidebar, sort dropdown, mobile filter sheet, and "Show more" pagination remain client-side. Extract these into a `'use client'` child component (`StoreProductGrid` or similar) that receives the initial product list and categories as props from the server page.

## 6. Tenant Rename & Seed

### 6.1 Tenant identity

| Field | Value |
|-------|-------|
| slug | `dmystique` |
| name | `D'Mystique Boutique` |
| tagline | `Handpicked Indian Fashion for Every Occasion` |
| brandColor | `#E8577E` (current store-primary) |
| storeType | `ethnic_wear` |
| contactPhone | `+91 98765 43210` |
| contactEmail | `hello@dmystique.com` |
| freeDeliveryAbove | `999` |
| shippingFee | `79` |
| deliveryEstimateText | `5–7 business days` |
| returnWindowDays | `7` |
| trustBadgeText | `100% authentic, handpicked by Meena` |

### 6.2 Categories (6)

Sarees, Kurtis, Dupattas, Sets & Suits, Lehengas, Accessories — matching the current mock data's 6 categories.

### 6.3 Products (12)

Carry over all 12 products from `lib/mock-data.ts` into the seed, with their descriptions, prices, compare prices, sizes, stock, and Unsplash image URLs. Assign to appropriate categories.

### 6.4 Banners (3)

Feature the first 3 products (Kanjivaram Silk Saree, Block Print Kurti Set, Zari Border Dupatta) as hero carousel slides.

### 6.5 Promotions (4)

| offerText | subtitle | endsAt |
|-----------|----------|--------|
| Upto 50% off | Sarees | +48h from seed time |
| Buy 2 Get 1 | Dupattas | +48h |
| Flat ₹200 off | Orders above ₹1000 | +48h |
| Free Shipping | Orders above ₹599 | null (permanent) |

### 6.6 Tags (7)

Festive 🎉, Wedding 💍, Casual ☀️, Office 💼, Daily 🌿, Party 🎊, Travel ✈️ — with product assignments matching the current hardcoded `occasion` field in `app/store/page.tsx`.

### 6.7 Reviews & Customers

Carry over the 8 mock customers and all reviews from `lib/mock-data.ts`.

### 6.8 Store About & Branch

Same as current seed — story, social links, Anna Nagar branch.

### 6.9 Dev tenant slug

Update `TALAM_DEV_TENANT_SLUG` default from `silk` to `dmystique` in `lib/data/tenant.ts`.

## 7. Deletions

- **`lib/mock-data.ts`** — entire file. All 12 mock products, categories, customers, reviews move to `prisma/seed.ts`.
- **`productUI` map in `app/store/page.tsx`** — the hardcoded gradients, fabric labels, badges, and occasion tags. Gone.
- **All `mockGet*` imports** across 10 storefront pages — replaced with real `lib/data/*` calls:
  `app/store/page.tsx`, `app/store/product/[slug]/page.tsx`, `app/store/cart/page.tsx`,
  `app/store/wishlist/page.tsx`, `app/store/orders/page.tsx`, `app/store/orders/[id]/page.tsx`,
  `app/store/category/[categorySlug]/page.tsx`, `app/store/about/page.tsx`,
  `app/checkout/page.tsx`, `app/checkout/confirmed/page.tsx`.

## 8. What's NOT in scope

- **Admin CRUD for banners, promotions, tags.** These are seed-only for V1. Admin UI to manage them is a follow-up.
- **Multi-business-type theming.** V1 stays textile-focused. The schema is generic enough that a bakery could use tags like "Birthday" / "Anniversary" instead of "Festive" / "Wedding", but the storefront design language (size picker, fashion photography layout) remains fashion-oriented.
- **Occasion as a filter.** Tags appear as a "Shop by" browsing section, not as a filter in the sidebar. Adding tag-based filtering is a minor follow-up if needed.

## 9. Migration Strategy

1. Create Prisma migration adding `store_banners`, `store_promotions`, `product_tags`, `product_tag_assignments` tables
2. Add relations to `Tenant` and `Product` models
3. Rewrite `prisma/seed.ts` with dmystique tenant and all seed data
4. Add `lib/data/storefront.ts` with banner/promotion/tag queries
5. Add `tagId` filter to `lib/data/products.ts`
6. Rewrite `app/store/page.tsx` as SSR page consuming real data
7. Delete `lib/mock-data.ts` and update all imports
8. Update `TALAM_DEV_TENANT_SLUG` default to `dmystique`
