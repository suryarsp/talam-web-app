# Phase 2: Storefront Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the customer-facing storefront: home page, product listing/filters, and product detail page — all with ISR caching and tenant-aware data fetching.

**Architecture:** All pages live under `app/store/`. They receive `x-tenant-id` from middleware via `headers()`. Home and shop use ISR (revalidate 1hr/30min). Product detail uses ISR + on-demand revalidation (triggered on product edit in admin). No client-side data fetching on these pages — all RSC with Suspense boundaries for UX.

**Tech Stack:** Next.js 15 App Router, ISR (`revalidate`), `@vercel/og` for OG images, Prisma + `withTenant`, Tailwind + shadcn/ui, Framer Motion for transitions, Lucide React icons

## Global Constraints

- Inherit all constraints from Phase 1
- All pages under `app/store/` read tenant from `headers()` — never from URL params
- Product slugs are unique per tenant (not globally) — queries always scope to `tenantId`
- Images served via Cloudinary with `f_auto,q_auto` transformation
- No client components unless absolutely required (filter interactions, cart button)
- ISR revalidation times: home = 3600s, shop = 1800s, product = on-demand only

---

### Task 1: Tenant Data Layer

**Files:**
- Create: `lib/data/tenant.ts`
- Create: `lib/data/products.ts`
- Create: `lib/data/products.test.ts`

**Interfaces:**
- Produces: `getTenantStorefront(tenantId)` → `{ name, brandColor, logoUrl, whatsappNumber, tier }`
- Produces: `getProducts(tenantId, opts?)` → `Product[]` (with optional categoryId/size filters)
- Produces: `getProductBySlug(tenantId, slug)` → `Product & { category: { id, name } | null } | null`
- Produces: `getCategories(tenantId)` → `{ id: string; name: string; slug: string }[]`

- [ ] **Step 1: Write failing tests**

Create `lib/data/products.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  withTenant: vi.fn(async (tenantId: string, fn: (client: unknown) => Promise<unknown>) => {
    const mockProduct = {
      id: 'p1', name: 'Silk Saree', slug: 'silk-saree', price: '4500',
      images: ['url1'], categoryId: 'cat-1',
      category: { id: 'cat-1', name: 'Sarees', slug: 'sarees', sortOrder: 0 },
      sizes: ['S', 'M', 'L'], isActive: true,
    }
    const mockClient = {
      product: {
        findMany: vi.fn().mockResolvedValue([mockProduct]),
        findFirst: vi.fn().mockResolvedValue(mockProduct),
      },
      productCategory: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'cat-1', name: 'Sarees', slug: 'sarees', sortOrder: 0 },
        ]),
      },
    }
    return fn(mockClient)
  }),
}))

import { getProducts, getProductBySlug, getCategories } from './products'

describe('getProducts', () => {
  it('returns active products for a tenant', async () => {
    const products = await getProducts('tenant-1')
    expect(products).toHaveLength(1)
    expect(products[0].name).toBe('Silk Saree')
  })
})

describe('getProductBySlug', () => {
  it('returns a product matching the slug', async () => {
    const product = await getProductBySlug('tenant-1', 'silk-saree')
    expect(product?.slug).toBe('silk-saree')
  })
})

describe('getCategories', () => {
  it('returns categories as objects with id and name', async () => {
    const cats = await getCategories('tenant-1')
    expect(cats).toHaveLength(1)
    expect(cats[0]).toMatchObject({ id: 'cat-1', name: 'Sarees', slug: 'sarees' })
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm test -- --run lib/data/products.test.ts
```

Expected: FAIL — `Cannot find module './products'`

- [ ] **Step 3: Implement data layer**

Create `lib/data/tenant.ts`:
```typescript
import { withTenant } from '@/lib/prisma'

export type TenantStorefront = {
  id: string
  name: string
  brandColor: string | null
  logoUrl: string | null
  whatsappNumber: string | null
  tier: string
}

export async function getTenantStorefront(tenantId: string): Promise<TenantStorefront | null> {
  return withTenant(tenantId, (db) =>
    db.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, brandColor: true, logoUrl: true, whatsappNumber: true, tier: true },
    })
  )
}
```

Create `lib/data/products.ts`:
```typescript
import { withTenant } from '@/lib/prisma'
import type { Product } from '@prisma/client'

export type ProductFilters = {
  categoryId?: string   // UUID — not a name string
  size?: string
  maxPrice?: number
}

export type CategoryMeta = { id: string; name: string; slug: string }

export async function getProducts(tenantId: string, filters?: ProductFilters): Promise<Product[]> {
  return withTenant(tenantId, (db) =>
    db.product.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(filters?.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters?.size ? { sizes: { has: filters.size } } : {}),
        ...(filters?.maxPrice ? { price: { lte: filters.maxPrice } } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })
  )
}

export async function getProductBySlug(tenantId: string, slug: string) {
  return withTenant(tenantId, (db) =>
    db.product.findFirst({
      where: { tenantId, slug, isActive: true },
      include: { category: { select: { id: true, name: true } } },
    })
  )
}

export async function getCategories(tenantId: string): Promise<CategoryMeta[]> {
  return withTenant(tenantId, (db) =>
    db.productCategory.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, slug: true },
    })
  )
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npm test -- --run lib/data/products.test.ts
```

Expected: PASS — 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add lib/data/
git commit -m "feat: add tenant and product data layer with Prisma"
```

---

### Task 2: Store Home Page (ISR)

**Files:**
- Create: `app/store/page.tsx`
- Create: `components/store/hero-banner.tsx`
- Create: `components/store/product-grid.tsx`
- Create: `components/store/product-card.tsx`

**Interfaces:**
- Consumes: `getTenantStorefront(tenantId)`, `getProducts(tenantId)`
- Produces: ISR home page at `{store}.{YOUR_DOMAIN}/`

- [ ] **Step 1: Create product card component**

Create `components/store/product-card.tsx`:
```typescript
import Image from 'next/image'
import Link from 'next/link'
import type { Product } from '@prisma/client'
import { Badge } from '@/components/ui/badge'

type Props = {
  product: Product
  subdomain: string
}

export function ProductCard({ product, subdomain }: Props) {
  const discount = product.comparePrice && product.comparePrice > product.price
    ? Math.round((1 - Number(product.price) / Number(product.comparePrice)) * 100)
    : null

  const imageUrl = product.images[0]
    ? `${product.images[0]}?f_auto,q_auto,w_400`
    : '/placeholder.jpg'

  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted">
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {discount && (
          <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground">
            {discount}% off
          </Badge>
        )}
      </div>
      <div className="mt-2 space-y-1">
        <p className="text-sm font-medium line-clamp-2 leading-tight">{product.name}</p>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">₹{Number(product.price).toLocaleString('en-IN')}</span>
          {product.comparePrice && (
            <span className="text-xs text-muted-foreground line-through">
              ₹{Number(product.comparePrice).toLocaleString('en-IN')}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Create product grid component**

Create `components/store/product-grid.tsx`:
```typescript
import type { Product } from '@prisma/client'
import { ProductCard } from './product-card'

type Props = {
  products: Product[]
  subdomain: string
}

export function ProductGrid({ products, subdomain }: Props) {
  if (products.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        No products yet. Check back soon.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} subdomain={subdomain} />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create store home page**

Replace `app/store/page.tsx`:
```typescript
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getTenantStorefront } from '@/lib/data/tenant'
import { getProducts } from '@/lib/data/products'
import { ProductGrid } from '@/components/store/product-grid'

export const revalidate = 3600 // 1 hour ISR

export default async function StorePage() {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  const subdomain = headersList.get('x-subdomain') ?? ''

  if (!tenantId) notFound()

  const [tenant, products] = await Promise.all([
    getTenantStorefront(tenantId),
    getProducts(tenantId),
  ])

  if (!tenant) notFound()

  return (
    <main>
      {/* Hero */}
      <section
        className="py-10 px-4 text-center"
        style={{ backgroundColor: tenant.brandColor ?? '#6366f1' }}
      >
        {tenant.logoUrl ? (
          <img src={tenant.logoUrl} alt={tenant.name} className="h-12 mx-auto mb-3 object-contain" />
        ) : (
          <h1 className="text-2xl font-bold text-white">{tenant.name}</h1>
        )}
      </section>

      {/* Products */}
      <section className="px-4 py-6 max-w-6xl mx-auto">
        <h2 className="text-lg font-semibold mb-4">All Products</h2>
        <ProductGrid products={products} subdomain={subdomain} />
      </section>
    </main>
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
git add components/store/ app/store/page.tsx
git commit -m "feat: add store home page with ISR and product grid"
```

---

### Task 3: Shop Page with Filters (ISR)

**Files:**
- Create: `app/store/shop/page.tsx`
- Create: `components/store/filter-bar.tsx`

**Interfaces:**
- Consumes: `getProducts(tenantId, filters)`, `getCategories(tenantId)`
- Produces: `/shop` page with category/size filter sidebar, ISR 30min

- [ ] **Step 1: Create filter bar component**

Create `components/store/filter-bar.tsx`:
```typescript
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import type { CategoryMeta } from '@/lib/data/products'

type Props = {
  categories: CategoryMeta[]
  sizes: string[]
  activeCategoryId?: string
  activeSize?: string
}

export function FilterBar({ categories, sizes, activeCategoryId, activeSize }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (params.get(key) === value) {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.push(`/shop?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      {categories.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Category</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Badge
                key={cat.id}
                variant={activeCategoryId === cat.id ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setFilter('categoryId', cat.id)}
              >
                {cat.name}
              </Badge>
            ))}
          </div>
        </div>
      )}
      {sizes.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Size</p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => (
              <Badge
                key={size}
                variant={activeSize === size ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setFilter('size', size)}
              >
                {size}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create shop page**

Create `app/store/shop/page.tsx`:
```typescript
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getProducts, getCategories } from '@/lib/data/products'
import { ProductGrid } from '@/components/store/product-grid'
import { FilterBar } from '@/components/store/filter-bar'
import { Suspense } from 'react'

export const revalidate = 1800 // 30 min ISR

const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

type PageProps = {
  searchParams: Promise<{ categoryId?: string; size?: string }>
}

export default async function ShopPage({ searchParams }: PageProps) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  const subdomain = headersList.get('x-subdomain') ?? ''
  const { categoryId, size } = await searchParams

  if (!tenantId) notFound()

  const [products, categories] = await Promise.all([
    getProducts(tenantId, { categoryId, size }),
    getCategories(tenantId),
  ])

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-xl font-semibold mb-6">Shop All</h1>
      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="lg:w-48 shrink-0">
          <Suspense>
            <FilterBar
              categories={categories}
              sizes={ALL_SIZES}
              activeCategoryId={categoryId}
              activeSize={size}
            />
          </Suspense>
        </aside>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-4">
            {products.length} {products.length === 1 ? 'product' : 'products'}
          </p>
          <ProductGrid products={products} subdomain={subdomain} />
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/store/shop/ components/store/filter-bar.tsx
git commit -m "feat: add shop page with category and size filters"
```

---

### Task 4: Product Detail Page (ISR + On-Demand Revalidation)

**Files:**
- Create: `app/store/product/[slug]/page.tsx`
- Create: `app/api/revalidate/route.ts`
- Create: `components/store/size-picker.tsx`
- Create: `components/store/add-to-cart-button.tsx`

**Interfaces:**
- Consumes: `getProductBySlug(tenantId, slug)`
- Produces: product detail page with ISR + on-demand revalidation endpoint
- Produces: `/api/revalidate?slug={slug}&secret={REVALIDATE_SECRET}` endpoint

- [ ] **Step 1: Create size picker component**

Create `components/store/size-picker.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  sizes: string[]
  stockBySize: Record<string, number>
  onSelect: (size: string) => void
}

export function SizePicker({ sizes, stockBySize, onSelect }: Props) {
  const [selected, setSelected] = useState<string | null>(null)

  function handleSelect(size: string) {
    setSelected(size)
    onSelect(size)
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Size</p>
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => {
          const inStock = (stockBySize[size] ?? 0) > 0
          return (
            <button
              key={size}
              type="button"
              disabled={!inStock}
              onClick={() => handleSelect(size)}
              className={cn(
                'h-9 min-w-[2.5rem] px-3 rounded-md border text-sm font-medium transition-colors',
                selected === size
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-background hover:border-foreground',
                !inStock && 'opacity-40 cursor-not-allowed line-through'
              )}
            >
              {size}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create product detail page**

Create `app/store/product/[slug]/page.tsx`:
```typescript
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getProductBySlug } from '@/lib/data/products'
import { SizePicker } from '@/components/store/size-picker'
import { AddToCartButton } from '@/components/store/add-to-cart-button'
import type { Metadata } from 'next'

export const revalidate = false // On-demand only

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  const { slug } = await params

  if (!tenantId) return {}

  const product = await getProductBySlug(tenantId, slug)
  if (!product) return {}

  return {
    title: product.name,
    description: product.description ?? undefined,
    openGraph: {
      title: product.name,
      images: product.images[0] ? [product.images[0]] : [],
    },
  }
}

export default async function ProductPage({ params }: Props) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  const { slug } = await params

  if (!tenantId) notFound()

  const product = await getProductBySlug(tenantId, slug)
  if (!product) notFound()

  const stockBySize = (product.stockBySize ?? {}) as Record<string, number>
  const hasDiscount = product.comparePrice && product.comparePrice > product.price
  const discountPct = hasDiscount
    ? Math.round((1 - Number(product.price) / Number(product.comparePrice!)) * 100)
    : null

  return (
    <main className="max-w-4xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Images */}
        <div className="space-y-2">
          {product.images.length > 0 ? (
            <>
              <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-muted">
                <Image
                  src={`${product.images[0]}?f_auto,q_auto,w_600`}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                  priority
                />
              </div>
              {product.images.length > 1 && (
                <div className="grid grid-cols-4 gap-1">
                  {product.images.slice(1).map((img, i) => (
                    <div key={i} className="relative aspect-square overflow-hidden rounded-md bg-muted">
                      <Image
                        src={`${img}?f_auto,q_auto,w_150`}
                        alt={`${product.name} ${i + 2}`}
                        fill
                        sizes="25vw"
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="aspect-[3/4] rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
              No image
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-5">
          <div>
            {product.category && (
              <Link
                href={`/shop?categoryId=${product.category.id}`}
                className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground mb-1 block transition-colors"
              >
                {product.category.name}
              </Link>
            )}
            <h1 className="text-2xl font-semibold leading-tight">{product.name}</h1>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold">₹{Number(product.price).toLocaleString('en-IN')}</span>
            {hasDiscount && (
              <>
                <span className="text-base text-muted-foreground line-through">
                  ₹{Number(product.comparePrice).toLocaleString('en-IN')}
                </span>
                <span className="text-sm text-green-600 font-medium">{discountPct}% off</span>
              </>
            )}
          </div>

          {product.sizes.length > 0 && (
            <AddToCartButton product={product} stockBySize={stockBySize} />
          )}

          {product.description && (
            <div className="space-y-1">
              <p className="text-sm font-medium">Description</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Create add-to-cart button (client component)**

Create `components/store/add-to-cart-button.tsx`:
```typescript
'use client'

import { useState } from 'react'
import type { Product } from '@prisma/client'
import { SizePicker } from './size-picker'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/lib/store/cart'

type Props = {
  product: Product
  stockBySize: Record<string, number>
}

export function AddToCartButton({ product, stockBySize }: Props) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [error, setError] = useState('')
  const addItem = useCartStore((s) => s.addItem)

  function handleAddToCart() {
    if (product.sizes.length > 0 && !selectedSize) {
      setError('Please select a size')
      return
    }
    setError('')
    addItem({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      size: selectedSize ?? undefined,
      image: product.images[0] ?? '',
      tenantId: product.tenantId,
    })
  }

  return (
    <div className="space-y-3">
      <SizePicker
        sizes={product.sizes}
        stockBySize={stockBySize}
        onSelect={(size) => { setSelectedSize(size); setError('') }}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button className="w-full" size="lg" onClick={handleAddToCart}>
        Add to Cart
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: Create Zustand cart store**

Create `lib/store/cart.ts`:
```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CartItem = {
  productId: string
  name: string
  price: number
  size?: string
  image: string
  tenantId: string
  quantity: number
}

type CartStore = {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (productId: string, size?: string) => void
  updateQuantity: (productId: string, size: string | undefined, quantity: number) => void
  clear: () => void
  total: () => number
  count: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        set((state) => {
          const existing = state.items.find(
            (i) => i.productId === item.productId && i.size === item.size
          )
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId && i.size === item.size
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              ),
            }
          }
          return { items: [...state.items, { ...item, quantity: 1 }] }
        })
      },

      removeItem: (productId, size) => {
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.productId === productId && i.size === size)
          ),
        }))
      },

      updateQuantity: (productId, size, quantity) => {
        if (quantity < 1) {
          get().removeItem(productId, size)
          return
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId && i.size === size
              ? { ...i, quantity }
              : i
          ),
        }))
      },

      clear: () => set({ items: [] }),
      total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: 'talam-cart',
    }
  )
)
```

- [ ] **Step 5: Create on-demand revalidation endpoint**

Add `REVALIDATE_SECRET` to `.env.local` (generate with `openssl rand -hex 32`).

Create `app/api/revalidate/route.ts`:
```typescript
import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')

  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { slug } = body as { slug?: string }

  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
  }

  revalidatePath(`/product/${slug}`)

  return NextResponse.json({ revalidated: true, slug })
}
```

- [ ] **Step 6: Build and verify**

```bash
npm run build
```

Expected: No TypeScript errors

- [ ] **Step 7: Commit**

```bash
git add app/store/product/ app/api/revalidate/ components/store/ lib/store/
git commit -m "feat: add product detail page with ISR, size picker, add-to-cart, and Zustand cart store"
```

---

### Task 3.5: Category SEO Pages (`/shop/[categorySlug]`)

**Files:**
- Create: `app/store/shop/[categorySlug]/page.tsx`

**Interfaces:**
- Consumes: `getCategories(tenantId)`, `getProducts(tenantId, { categoryId })`
- Produces: `/shop/sarees` — ISR page, statically pre-rendered per category, crawlable by search engines

- [ ] **Step 1: Create category slug page**

Create `app/store/shop/[categorySlug]/page.tsx`:
```typescript
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getCategories, getProducts } from '@/lib/data/products'
import { ProductGrid } from '@/components/store/product-grid'
import type { Metadata } from 'next'

export const revalidate = 1800 // 30 min ISR

type Props = { params: Promise<{ categorySlug: string }> }

export async function generateStaticParams() {
  // Called at build time — returns slugs for all tenants' categories
  // In practice this runs per-tenant via middleware; return [] to allow on-demand ISR
  return []
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  const { categorySlug } = await params
  if (!tenantId) return {}
  const categories = await getCategories(tenantId)
  const cat = categories.find((c) => c.slug === categorySlug)
  if (!cat) return {}
  return { title: cat.name }
}

export default async function CategoryPage({ params }: Props) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  const subdomain = headersList.get('x-subdomain') ?? ''
  const { categorySlug } = await params

  if (!tenantId) notFound()

  const categories = await getCategories(tenantId)
  const cat = categories.find((c) => c.slug === categorySlug)
  if (!cat) notFound()

  const products = await getProducts(tenantId, { categoryId: cat.id })

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-xl font-semibold mb-6">{cat.name}</h1>
      <ProductGrid products={products} subdomain={subdomain} />
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/store/shop/
git commit -m "feat: add /shop/[categorySlug] ISR pages for SEO-indexable category URLs"
```

---

## Phase 2 Verification

```bash
npm test -- --run
```
Expected: All tests pass including new data layer tests

```bash
npm run build
```
Expected: No errors

Manual smoke test (on Vercel preview):
- [ ] `https://silk.{YOUR_DOMAIN}` → home page loads with products grid
- [ ] `https://silk.{YOUR_DOMAIN}/shop` → shop page with filter badges
- [ ] Filter by category → URL updates, products re-filter
- [ ] Click product → detail page loads with images and size picker
- [ ] Select size → Add to Cart → cart count increments in header
- [ ] `POST /api/revalidate?secret=...` with `{ "slug": "test" }` → returns `{ revalidated: true }`
- [ ] Images load as Cloudinary URLs with `f_auto,q_auto` transformation
