# Phase 2 Storefront Re-Plan (Shop Rebuild + About + Reviews) — UI Track

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Track order:** This is a **UI-track** plan — part of the front-end-first pass across all 8 phases. Do not start any phase's **Data-track** plan until every phase's UI-track plan is complete. See the sibling `2026-07-06-talam-phase-2-storefront-data.md` for the wiring work that follows this file.

**Goal:** Fix the shop page so it matches the live Paper artboard pixel-for-pixel, verify the already-built product detail page against Paper and close its gaps, and build the two genuinely new screens (`/about`, product reviews) — all with mock data verified against Paper. Real Prisma wiring is out of scope for this file; see the Data-track sibling.

**Architecture:** Every UI-bearing task in this plan follows a strict shape: (1) pull the live Paper artboard via `paper-desktop` MCP tools — Paper is ground truth, the written design doc at `docs/2026-06-23-talam-design.md` is not to be trusted if it disagrees, (2) build/fix the UI with inline mock data typed like the real return types from `lib/data/products.ts` / `lib/data/tenant.ts`, matching Paper at 390px and 1440px, (3) verify via dev-server screenshot comparison + zero console/network errors, (4) commit that UI-only change. Real Prisma-backed wiring (TDD: failing test → implementation → passing test → swap mock for real call) happens later, only after every phase's UI track is done — tracked in the Data-track sibling file.

**Tech Stack:** Next.js 16 App Router, Tailwind (project tokens: `text-fg`, `text-muted-warm`, `bg-store-primary`, `font-heading`/`font-body`), Claude Preview MCP (`preview_start`/`preview_screenshot`/`preview_resize`/`preview_console_logs`) for the verification step.

## Global Constraints

- Inherit all constraints from the original Phase 2 plan (tenant-scoped data, `headers()`-based tenant resolution, Cloudinary `f_auto,q_auto` images) as context, but do not write any Prisma/Server Action/API/database code in this file — that is the Data-track's job.
- Paper file: "Talam Design" (`01KVZYTDJNREHBACTQMT2D9HR9`), page "Store Front" (`pageId: 1-0`). Do not query the `docs/2026-06-23-talam-design.md` design doc for pixel values — it lags Paper. Use it only for prose/business-rule context if Paper doesn't specify a rule.
- `lib/data/tenant.ts` and `lib/data/products.ts` are DONE and unmodified by this file — their real return-type shapes (`Product & { category, reviewCount, averageRating, isNew }`, `CategoryMeta`, `TenantStorefront`) are only referenced here to keep mock data type-accurate. No calls into them are wired in this file.
- Mock data in every UI task must satisfy the exact real return types — no invented fields, no missing fields.
- Verification step for every UI task: run `preview_start` (dev server), `preview_resize` to 390px width then 1440px width, `preview_screenshot` at both, `preview_console_logs` with `level: "error"` must return empty, `preview_network` with `filter: "failed"` must return empty.
- Design tokens confirmed live in Paper (`get_basic_info` tokens block) match what's already in `app/globals.css`: `--color-fg #18181B`, `--color-muted #8B7D7A` (mapped to `text-muted-warm` in this codebase), `--color-border #E8E8E8`, `--color-store-primary #E8577E`, `--color-success #10B981`, `--color-danger #EF4444`, `--font-heading "Playfair Display"`, `--font-body "DM Sans"`. Use existing Tailwind classes already used in `components/store/*` — do not introduce new raw hex values when a token/class already exists.
- No Prisma queries, Server Actions, API routes, or `lib/data/*.ts` writes belong in this file. If a task needs a data shape that doesn't exist yet, mock it locally and leave the real wiring to the Data-track sibling.

---

### Task 1: Rebuild Shop Page to Match Paper (`Shop — Desktop / Discovery` + `Shop — Mobile / Discovery` + `Filter Bottom Sheet — Mobile`) (UI)

**Paper ground truth pulled this session:**
- Desktop artboard `9HU-0` ("Shop — Desktop / Discovery", 1441×2915) — the "All Products" section (`9PK-0`) is a `flex` row: `paddingTop: 32px, gap: 32px, paddingInline: 64px` (i.e. `pt-8 gap-8 px-16`), with a `240px` fixed-width filter sidebar (`9PL-0`, `w-[240px] shrink-0`) and a `flex-1` product column (`9RE-0`).
- Filter sidebar (`9PL-0`, desktop) sections in order: **Category** (checkboxes with counts, e.g. "Sarees (48)"), **Size** (bordered pills, 6 sizes XS–XXL), **Price Range** (two bordered `₹` inputs joined by `–`), **Occasion** (checkboxes: Festive/Wedding/Casual — not in current implementation), **Apply / Reset** button row at the bottom (bordered pink "Apply" + plain "Reset" — current `FilterBar` has no Apply/Reset, it live-navigates on every click).
- Product column header (`9RF-0`): `"All Products 24 items"` on the left, active filter chips (pink pill `bg-[#FCE4EC] text-[#880E4F]` with an "×" per chip, e.g. "Sarees ×", "Size M ×") + a bordered **Sort dropdown** (`"Sort: Newest First"` with chevron) on the right — this whole row does not exist in the current `app/store/shop/page.tsx`.
- Product grid (`9RX-0`): `grid grid-cols-3 gap-4` (desktop, not `grid-cols-4` as current `ProductGrid` uses) — cards (`rounded-[12px] border-[1.5px] border-[#F0E8D8]`) show an image with a top-left badge (`% OFF` pink pill / `NEW` green pill / "Only 3 left!" bottom-left translucent-red pill / "2 days ago" top-left "recency" pill), a top-right circular wishlist heart, then a footer: `10px` uppercase muted material label, `15px` bold heading-font product name, price row (bold `17px` price + optional strikethrough compare-price on the left, `size-8` pink "+" quick-add square button on the right), and a `★★★★★ 4.9 (248)` rating line.
- Below the grid: a centered `"Show more products"` pink button (`h-[52px] max-w-[360px] rounded-xl`) + `"Showing 6 of 24 products"` caption — this is a **"load more" pattern**, not the pagination-less infinite grid currently rendered.
- Mobile artboard `995-0` → the "All Products" block (`9EB-0`) header uses a `4px` pink accent bar + `"All Products"` (15px bold) + `"24 items"` muted, and a **"Filter & Sort"** pill trigger (`bg-[#FFF3E0] border-[#FFD180] text-[#BF360C]`) with a pink circular count badge — tapping it opens the **Filter Bottom Sheet** artboard (`ASC-0`), not an inline `<details>` panel like the current mobile `FilterBar`.
- `Filter Bottom Sheet — Mobile` (`ASC-0`, 390×900): drag handle, `"Filters"` title + `"Reset all"` link, then Category/Size/Price Range/Sort By sections (note: **no Occasion section** in the mobile sheet — desktop-only), and a sticky footer with `"Cancel"` (bordered, `flex-1`) + `"Show 18 products"` (pink, `flex-[2]`) buttons.
- Sort By section: `"Newest First"` / `"Price: Low to High"` / `"Price: High to Low"` / `"Best Selling"` — matches current `FilterBar`'s `SORTS` array except the 4th label reads **"Best Selling"** in Paper, not `"Most Popular"`.

**Files:**
- Modify: `components/store/product-card.tsx`
- Modify: `components/store/product-grid.tsx`
- Modify: `components/store/filter-bar.tsx`
- Create: `components/store/filter-sheet.tsx` (mobile bottom sheet, new — Paper has a distinct mobile pattern from desktop sidebar)
- Modify: `app/store/shop/page.tsx` (mock-wired only in this file; real `getProducts`/`getCategories` wiring happens in the Data-track sibling)

**Interfaces:**
- Mocks (this file): `MOCK_CATEGORIES`, `MOCK_PRODUCTS` typed to match `getProducts`/`getCategories`'s real return shapes.
- Produces: no new exported functions — pure UI restructure of existing page/components.

- [ ] **Step 1: Add mock data fixtures matching real return types**

Create `components/store/__mocks__/shop-mock-data.ts`:

```typescript
import type { Product, ProductCategory } from '@prisma/client'

export type MockProduct = Product & {
  category?: Pick<ProductCategory, 'name'> | null
  reviewCount: number
  averageRating: number | null
  isNew: boolean
}

export const MOCK_CATEGORIES = [
  { id: 'cat-1', name: 'Sarees', slug: 'sarees' },
  { id: 'cat-2', name: 'Kurtis', slug: 'kurtis' },
  { id: 'cat-3', name: 'Dupattas', slug: 'dupattas' },
  { id: 'cat-4', name: 'Sets & Suits', slug: 'sets-suits' },
  { id: 'cat-5', name: 'Lehengas', slug: 'lehengas' },
]

export const MOCK_PRODUCTS: MockProduct[] = [
  {
    id: 'p1', tenantId: 't1', name: 'Kanjivaram Silk Saree', slug: 'kanjivaram-silk-saree',
    description: null, price: '2499' as unknown as Product['price'],
    comparePrice: '3299' as unknown as Product['comparePrice'],
    categoryId: 'cat-1', sizes: ['XS', 'S', 'M', 'L', 'XL'], images: [],
    stockBySize: {}, isActive: true, createdAt: new Date(),
    category: { name: 'Sarees' }, reviewCount: 248, averageRating: 4.9, isNew: false,
  },
  {
    id: 'p2', tenantId: 't1', name: 'Block Print Kurti Set', slug: 'block-print-kurti-set',
    description: null, price: '1299' as unknown as Product['price'], comparePrice: null,
    categoryId: 'cat-2', sizes: ['S', 'M', 'L'], images: [],
    stockBySize: {}, isActive: true, createdAt: new Date(),
    category: { name: 'Kurtis' }, reviewCount: 152, averageRating: 4.2, isNew: true,
  },
  {
    id: 'p3', tenantId: 't1', name: 'Zari Border Dupatta', slug: 'zari-border-dupatta',
    description: null, price: '699' as unknown as Product['price'], comparePrice: null,
    categoryId: 'cat-3', sizes: [], images: [],
    stockBySize: {}, isActive: true, createdAt: new Date(),
    category: { name: 'Dupattas' }, reviewCount: 89, averageRating: 4.7, isNew: false,
  },
]
```

- [ ] **Step 2: Rebuild `ProductCard` to match Paper card markup**

Replace `components/store/product-card.tsx`:

```typescript
import Image from 'next/image'
import Link from 'next/link'
import type { Product, ProductCategory } from '@prisma/client'

type Props = {
  product: Product & {
    category?: Pick<ProductCategory, 'name'> | null
    reviewCount: number
    averageRating: number | null
    isNew: boolean
  }
}

export function ProductCard({ product }: Props) {
  const discount =
    product.comparePrice && Number(product.comparePrice) > Number(product.price)
      ? Math.round((1 - Number(product.price) / Number(product.comparePrice)) * 100)
      : null

  const imageUrl = product.images[0] ? `${product.images[0]}?f_auto,q_auto,w_400` : null
  const roundedRating = product.averageRating ? Math.round(product.averageRating) : 0
  const stars = '★'.repeat(roundedRating) + '☆'.repeat(5 - roundedRating)

  return (
    <div className="group relative overflow-hidden rounded-xl border-[1.5px] border-[#F0E8D8] bg-surface">
      <Link href={`/product/${product.slug}`} className="absolute inset-0 z-0" aria-label={product.name} />

      <div className="relative aspect-[3/4] bg-bg">
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}

        {discount ? (
          <span className="absolute top-0 left-0 rounded-tl-xl bg-store-primary px-3 py-1.5 font-body text-xs font-black text-surface">
            {discount}% OFF
          </span>
        ) : product.isNew ? (
          <span className="absolute top-2.5 left-2.5 rounded-full bg-success px-2.5 py-1 font-body text-2xs font-bold text-surface">
            NEW
          </span>
        ) : null}

        {/* ponytail: decorative only — wishlist toggle needs a signed-in customer session, wire up once storefront auth exists */}
        <span className="absolute top-2.5 right-2.5 z-10 flex size-8 items-center justify-center rounded-full bg-surface shadow-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
              stroke="#8B7D7A"
              strokeWidth="1.8"
            />
          </svg>
        </span>
      </div>

      <div className="p-3">
        {product.category?.name && (
          <p className="mb-1 font-body text-2xs tracking-[0.06em] text-[#B0A090] uppercase">{product.category.name}</p>
        )}
        <p className="mb-2 font-heading text-[15px] leading-[130%] font-bold text-fg">{product.name}</p>
        <div className="flex items-center justify-between">
          <div>
            <span className="font-body text-[17px] font-extrabold text-fg">
              ₹{Number(product.price).toLocaleString('en-IN')}
            </span>
            {product.comparePrice && (
              <p className="font-body text-2xs text-[#B0A090] line-through">
                ₹{Number(product.comparePrice).toLocaleString('en-IN')}
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label={`Add ${product.name} to cart`}
            className="z-10 flex size-8 shrink-0 items-center justify-center rounded-lg bg-store-primary"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <line x1="12" y1="5" x2="12" y2="19" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
              <line x1="5" y1="12" x2="19" y2="12" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {product.reviewCount > 0 && (
          <p className="mt-1 font-body text-2xs text-[#B0A090]">
            {stars} {product.averageRating?.toFixed(1)} ({product.reviewCount})
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Rebuild `ProductGrid` to 3-column desktop grid**

Modify `components/store/product-grid.tsx` — the Paper grid is `grid-cols-3` on desktop with `gap-4`, and 2-column on mobile (matches current mobile `9RX-0` isn't shown at mobile in Paper's Shop artboard, but the "New This Week" carousel and existing `ProductGrid` usage elsewhere in the codebase use 2-col mobile / 3-col tablet — keep mobile/tablet breakpoints, fix only the desktop column count and gap):

```typescript
import type { Product, ProductCategory } from '@prisma/client'
import { ProductCard } from './product-card'

type ProductWithCategory = Product & {
  category?: Pick<ProductCategory, 'name'> | null
  reviewCount: number
  averageRating: number | null
  isNew: boolean
}

type Props = {
  products: ProductWithCategory[]
}

export function ProductGrid({ products }: Props) {
  if (products.length === 0) {
    return <p className="py-16 text-center font-body text-muted-warm">No products yet. Check back soon.</p>
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Rebuild desktop `FilterBar` sidebar to match Paper's 240px sidebar exactly**

Replace `components/store/filter-bar.tsx` — desktop sidebar becomes checkboxes with counts, an Occasion section, and Apply/Reset buttons (the mobile `<details>` sheet moves to a new `FilterSheet` component in Step 6). URL navigation via `router.push` stays as client-side routing (not a data-layer concern):

```typescript
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import type { CategoryMeta } from '@/lib/data/products'

export type FilterBarProps = {
  categories: CategoryMeta[]
  activeCategory?: string
  activeSize?: string
  minPrice?: string
  maxPrice?: string
  activeSort?: string
}

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

export const SORTS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'popular', label: 'Best Selling' },
]

export function FilterBar({ categories, activeCategory, activeSize, minPrice, maxPrice, activeSort }: FilterBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [draftMin, setDraftMin] = useState(minPrice ?? '')
  const [draftMax, setDraftMax] = useState(maxPrice ?? '')

  function buildParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString())
    mutate(params)
    return params
  }

  function applyAll() {
    const params = buildParams((p) => {
      draftMin ? p.set('minPrice', draftMin) : p.delete('minPrice')
      draftMax ? p.set('maxPrice', draftMax) : p.delete('maxPrice')
    })
    router.push(`/shop?${params.toString()}`)
  }

  function resetAll() {
    setDraftMin('')
    setDraftMax('')
    router.push('/shop')
  }

  function toggleCategory(slug: string) {
    const params = buildParams((p) => (p.get('category') === slug ? p.delete('category') : p.set('category', slug)))
    router.push(`/shop?${params.toString()}`)
  }

  function toggleSize(size: string) {
    const params = buildParams((p) => (p.get('size') === size ? p.delete('size') : p.set('size', size)))
    router.push(`/shop?${params.toString()}`)
  }

  function setSort(value: string) {
    const params = buildParams((p) => p.set('sort', value))
    router.push(`/shop?${params.toString()}`)
  }

  return (
    <aside className="hidden w-60 shrink-0 sm:block">
      <p className="mb-5 font-body text-base font-bold text-fg">Filters</p>

      {categories.length > 0 && (
        <div className="mb-5 border-b border-[#F0E8D8] pb-5">
          <p className="mb-3 font-body text-2xs font-bold tracking-wide text-muted-warm uppercase">Category</p>
          <div className="flex flex-col gap-2">
            {categories.map((cat) => (
              <label key={cat.id} className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={activeCategory === cat.slug}
                  onChange={() => toggleCategory(cat.slug)}
                  className="size-4 rounded-sm border-[1.5px] border-border accent-store-primary"
                />
                <span className="font-body text-sm text-fg">{cat.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="mb-5 border-b border-[#F0E8D8] pb-5">
        <p className="mb-3 font-body text-2xs font-bold tracking-wide text-muted-warm uppercase">Size</p>
        <div className="flex flex-wrap gap-1.5">
          {SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => toggleSize(size)}
              className={
                activeSize === size
                  ? 'rounded-md border-[1.5px] border-store-primary bg-[#E8577E0F] px-3 py-1.5 font-body text-xs font-semibold text-store-primary'
                  : 'rounded-md border-[1.5px] border-border px-3 py-1.5 font-body text-xs text-muted-warm'
              }
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5 border-b border-[#F0E8D8] pb-5">
        <p className="mb-3 font-body text-2xs font-bold tracking-wide text-muted-warm uppercase">Price Range</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            placeholder="500"
            value={draftMin}
            onChange={(e) => setDraftMin(e.target.value)}
            className="w-full min-w-0 rounded-md border-[1.5px] border-border px-2.5 py-1.5 font-body text-xs text-fg"
          />
          <span className="shrink-0 font-body text-xs text-[#B0A090]">–</span>
          <input
            type="number"
            min={0}
            placeholder="5000"
            value={draftMax}
            onChange={(e) => setDraftMax(e.target.value)}
            className="w-full min-w-0 rounded-md border-[1.5px] border-border px-2.5 py-1.5 font-body text-xs text-fg"
          />
        </div>
      </div>

      <div className="mb-5">
        <p className="mb-3 font-body text-2xs font-bold tracking-wide text-muted-warm uppercase">Sort By</p>
        <div className="flex flex-col gap-2">
          {SORTS.map((sort) => (
            <button
              key={sort.value}
              type="button"
              onClick={() => setSort(sort.value)}
              className={
                (activeSort ?? 'newest') === sort.value
                  ? 'rounded-xl bg-fg px-3.5 py-3 text-left font-body text-md/snug font-semibold text-surface'
                  : 'rounded-xl border border-border px-3.5 py-3 text-left font-body text-md/snug text-fg'
              }
            >
              {sort.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={applyAll}
          className="grow rounded-lg border-[1.5px] border-store-primary p-2.5 text-center font-body text-sm font-semibold text-store-primary"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={resetAll}
          className="rounded-lg border-[1.5px] border-border px-3.5 py-2.5 font-body text-sm text-muted-warm"
        >
          Reset
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 5: Screenshot-verify the desktop sidebar in isolation against Paper (Checkpoint A)**

Start the dev server and preview at 1440px width against a route that renders `FilterBar` with `MOCK_CATEGORIES`. Temporarily import `MOCK_CATEGORIES` into `app/store/shop/page.tsx` in place of any category source for this checkpoint only.

Use `preview_start` (launch.json config pointing at `npm run dev`), then `preview_resize` to `{ width: 1440, height: 900 }`, then `preview_screenshot`. Compare the sidebar region against the Paper screenshot of node `9PL-0` pulled this session (checkboxes with counts, Size pills, Price Range inputs, Sort By, Apply/Reset). Verdict: fix any spacing/color mismatch before continuing.

- [ ] **Step 6: Build mobile `FilterSheet` bottom-sheet component**

Create `components/store/filter-sheet.tsx`:

```typescript
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import type { CategoryMeta } from '@/lib/data/products'
import { SIZES, SORTS } from './filter-bar'

type Props = {
  categories: CategoryMeta[]
  activeCategory?: string
  activeSize?: string
  minPrice?: string
  maxPrice?: string
  activeSort?: string
  totalCount: number
  onClose: () => void
}

export function FilterSheet({
  categories,
  activeCategory,
  activeSize,
  minPrice,
  maxPrice,
  activeSort,
  totalCount,
  onClose,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [draftCategory, setDraftCategory] = useState(activeCategory)
  const [draftSize, setDraftSize] = useState(activeSize)
  const [draftMin, setDraftMin] = useState(minPrice ?? '')
  const [draftMax, setDraftMax] = useState(maxPrice ?? '')
  const [draftSort, setDraftSort] = useState(activeSort ?? 'newest')

  function apply() {
    const params = new URLSearchParams(searchParams.toString())
    draftCategory ? params.set('category', draftCategory) : params.delete('category')
    draftSize ? params.set('size', draftSize) : params.delete('size')
    draftMin ? params.set('minPrice', draftMin) : params.delete('minPrice')
    draftMax ? params.set('maxPrice', draftMax) : params.delete('maxPrice')
    params.set('sort', draftSort)
    router.push(`/shop?${params.toString()}`)
    onClose()
  }

  function resetAll() {
    setDraftCategory(undefined)
    setDraftSize(undefined)
    setDraftMin('')
    setDraftMax('')
    setDraftSort('newest')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:hidden" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-surface">
        <div className="flex justify-center pt-3.5">
          <span className="h-1 w-9 rounded-full bg-border" />
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="font-body text-xl font-bold text-fg">Filters</h2>
          <button type="button" onClick={resetAll} className="font-body text-sm text-store-primary">
            Reset all
          </button>
        </div>

        <div className="space-y-6 px-5 pb-6">
          {categories.length > 0 && (
            <div>
              <p className="mb-2.5 font-body text-xs font-bold text-fg">Category</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setDraftCategory(draftCategory === cat.slug ? undefined : cat.slug)}
                    className={
                      draftCategory === cat.slug
                        ? 'rounded-full bg-fg px-4 py-2 font-body text-sm font-semibold text-surface'
                        : 'rounded-full border-[1.5px] border-border px-4 py-2 font-body text-sm text-fg'
                    }
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2.5 font-body text-xs font-bold text-fg">Size</p>
            <div className="flex flex-wrap gap-2">
              {SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setDraftSize(draftSize === size ? undefined : size)}
                  className={
                    draftSize === size
                      ? 'min-w-[52px] rounded-lg bg-fg px-3.5 py-2.5 font-body text-sm font-bold text-surface'
                      : 'min-w-[52px] rounded-lg border-[1.5px] border-border px-3.5 py-2.5 font-body text-sm text-fg'
                  }
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2.5 font-body text-xs font-bold text-fg">Price Range</p>
            <div className="flex items-center gap-2.5">
              <div className="grow">
                <p className="mb-1 font-body text-2xs text-muted-warm">Min</p>
                <input
                  type="number"
                  value={draftMin}
                  onChange={(e) => setDraftMin(e.target.value)}
                  placeholder="500"
                  className="w-full rounded-lg border-[1.5px] border-border px-3 py-2.5 font-body text-sm text-fg"
                />
              </div>
              <span className="pt-4.5 font-body text-base text-muted-warm">–</span>
              <div className="grow">
                <p className="mb-1 font-body text-2xs text-muted-warm">Max</p>
                <input
                  type="number"
                  value={draftMax}
                  onChange={(e) => setDraftMax(e.target.value)}
                  placeholder="5,000"
                  className="w-full rounded-lg border-[1.5px] border-border px-3 py-2.5 font-body text-sm text-fg"
                />
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2.5 font-body text-xs font-bold text-fg">Sort By</p>
            <div className="flex flex-col gap-2">
              {SORTS.map((sort) => (
                <button
                  key={sort.value}
                  type="button"
                  onClick={() => setDraftSort(sort.value)}
                  className={
                    draftSort === sort.value
                      ? 'flex items-center justify-between rounded-xl bg-fg px-3.5 py-3 font-body text-md font-semibold text-surface'
                      : 'flex items-center justify-between rounded-xl border-[1.5px] border-border px-3.5 py-3 font-body text-md text-fg'
                  }
                >
                  {sort.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2.5 border-t border-border px-5 pt-3 pb-7">
          <button
            type="button"
            onClick={onClose}
            className="h-[50px] flex-1 rounded-xl border-[1.5px] border-border font-body text-md font-semibold text-muted-warm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={apply}
            className="h-[50px] flex-[2] rounded-xl bg-store-primary font-body text-md font-bold text-surface"
          >
            Show {totalCount} products
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Rewrite shop page (mock-wired) with header row (item count, filter chips, sort dropdown desktop / Filter & Sort pill mobile)**

Replace `app/store/shop/page.tsx` — this file wires `MOCK_PRODUCTS`/`MOCK_CATEGORIES` for now; the Data-track sibling swaps these for `getProducts`/`getCategories`:

```typescript
import { MOCK_PRODUCTS, MOCK_CATEGORIES } from '@/components/store/__mocks__/shop-mock-data'
import { ProductGrid } from '@/components/store/product-grid'
import { FilterBar, SORTS } from '@/components/store/filter-bar'
import { ShopMobileControls } from '@/components/store/shop-mobile-controls'

type PageProps = {
  searchParams: Promise<{
    category?: string
    size?: string
    minPrice?: string
    maxPrice?: string
    sort?: string
  }>
}

export default async function ShopPage({ searchParams }: PageProps) {
  const { category, size, minPrice, maxPrice, sort } = await searchParams

  const categories = MOCK_CATEGORIES
  const activeCategory = categories.find((c) => c.slug === category)
  const products = MOCK_PRODUCTS // real filtering by category/size/price/sort happens in the Data-track wiring

  const sortLabel = SORTS.find((s) => s.value === (sort ?? 'newest'))?.label ?? 'Newest First'
  const activeFilterChips = [
    activeCategory && { key: 'category', label: activeCategory.name },
    size && { key: 'size', label: `Size ${size}` },
  ].filter((c): c is { key: string; label: string } => Boolean(c))

  return (
    <main className="mx-auto max-w-6xl px-4 py-3.5 sm:px-16 sm:py-8">
      <ShopMobileControls
        categories={categories}
        activeCategory={category}
        activeSize={size}
        minPrice={minPrice}
        maxPrice={maxPrice}
        activeSort={sort}
        totalCount={products.length}
        chips={activeFilterChips}
      />

      <div className="hidden sm:flex sm:gap-8">
        <FilterBar
          categories={categories}
          activeCategory={category}
          activeSize={size}
          minPrice={minPrice}
          maxPrice={maxPrice}
          activeSort={sort}
        />
        <div className="min-w-0 flex-1">
          <div className="mb-5 flex items-center justify-between">
            <p className="font-body text-base text-fg">All Products {products.length} items</p>
            <div className="flex items-center gap-3">
              {activeFilterChips.map((chip) => (
                <span
                  key={chip.key}
                  className="inline-flex items-center gap-1 rounded-full bg-[#FCE4EC] px-2.5 py-1 font-body text-xs font-semibold text-[#880E4F]"
                >
                  {chip.label} ×
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5 rounded-lg border-[1.5px] border-[#F0E8D8] bg-surface px-3.5 py-2 font-body text-sm">
                <span className="text-muted-warm">Sort:</span>
                <span className="font-semibold text-fg">{sortLabel}</span>
              </span>
            </div>
          </div>
          <ProductGrid products={products} />
        </div>
      </div>

      <div className="sm:hidden">
        <ProductGrid products={products} />
      </div>
    </main>
  )
}
```

- [ ] **Step 8: Build the mobile header/chips/Filter-Sheet-trigger client wrapper**

Create `components/store/shop-mobile-controls.tsx`:

```typescript
'use client'

import { useState } from 'react'
import type { CategoryMeta } from '@/lib/data/products'
import { FilterSheet } from './filter-sheet'

type Props = {
  categories: CategoryMeta[]
  activeCategory?: string
  activeSize?: string
  minPrice?: string
  maxPrice?: string
  activeSort?: string
  totalCount: number
  chips: { key: string; label: string }[]
}

export function ShopMobileControls({
  categories,
  activeCategory,
  activeSize,
  minPrice,
  maxPrice,
  activeSort,
  totalCount,
  chips,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <div className="mb-3.5 sm:hidden">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-[18px] w-1 shrink-0 rounded-sm bg-store-primary" />
          <span className="font-body text-[15px] font-bold text-fg">All Products</span>
          <span className="font-body text-xs text-[#B0A090]">{totalCount} items</span>
        </div>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#FFD180] bg-[#FFF3E0] px-3 py-1.5 font-body text-xs font-semibold text-[#BF360C]"
        >
          Filter &amp; Sort
          {chips.length > 0 && (
            <span className="flex size-4 items-center justify-center rounded-full bg-store-primary font-body text-[9px] font-bold text-surface">
              {chips.length}
            </span>
          )}
        </button>
      </div>

      {chips.length > 0 && (
        <div className="mb-3 flex gap-1.5">
          {chips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 rounded-full bg-[#FCE4EC] px-2 py-[3px] font-body text-2xs font-semibold text-[#880E4F]"
            >
              {chip.label} ×
            </span>
          ))}
        </div>
      )}

      {sheetOpen && (
        <FilterSheet
          categories={categories}
          activeCategory={activeCategory}
          activeSize={activeSize}
          minPrice={minPrice}
          maxPrice={maxPrice}
          activeSort={activeSort}
          totalCount={totalCount}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 9: Verify full shop page (mock-wired) against Paper at both breakpoints (Checkpoint B — final)**

Run:
```bash
npm run build
```
Expected: no TypeScript errors.

Start the dev server via `preview_start`, navigate to `/shop` (mock-wired), then:
1. `preview_resize` to `{ width: 1440, height: 900 }`, `preview_screenshot` — compare header row (item count + chips + sort dropdown), sidebar (checkboxes/sizes/price/occasion/apply-reset), and 3-column grid against the Paper screenshot of `9HU-0` pulled this session.
2. `preview_resize` to `{ width: 390, height: 900 }`, `preview_screenshot` — compare "All Products" header + "Filter & Sort" pill + chips + 2-column grid against the Paper screenshot of `995-0`.
3. Click the "Filter & Sort" pill, `preview_screenshot` the open sheet, compare against `ASC-0`.
4. `preview_console_logs({ level: "error" })` — expect empty array.
5. `preview_network({ filter: "failed" })` — expect empty array.

Fix any mismatch found (spacing, missing Occasion section, wrong grid columns, etc.) before proceeding. Keep the mock data file in place — it stays until the Data-track sibling swaps it for real calls.

- [ ] **Step 10: Commit the shop rebuild (mock-wired)**

```bash
git add components/store/product-card.tsx components/store/product-grid.tsx components/store/filter-bar.tsx components/store/filter-sheet.tsx components/store/shop-mobile-controls.tsx components/store/__mocks__/shop-mock-data.ts app/store/shop/page.tsx
git commit -m "fix: rebuild shop page UI to match live Paper artboard (grid, filters, mobile sheet) [mock data]"
```

---

### Task 2: Verify and Fix Product Detail Page Against Paper (UI)

**Paper ground truth pulled this session (artboards `3-0` mobile, `4-0` desktop):**
- Desktop layout (`4-0`, 1427×1852, bg `#FFFBF8`): a countdown banner above the fold (`"⏰ 2h : 45m : 32s"` dismissible bar) — **not present in current page**, treat as decorative/out-of-scope for this task since it needs live countdown state; skip it explicitly (ponytail: no countdown timer feature exists yet, add if a flash-sale system is built).
- Gallery: large image (`w-[520px] h-[380px]` on this artboard's placeholder) with 4 thumbnail squares below it (`52×52px`, first thumbnail has an active `border-2 border-surface` state) — **current page already has this via `product.images.slice(1)` mapped to a 4-col grid**, matches.
- Right column, in order: uppercase muted material label (`"HANDWOVEN SILK"`), `Playfair Display` bold heading (product name, wraps 2 lines), a **rating summary line** `"★★★★★ 248 reviews · 4.8 rating"` (green-tinted, matches `text-success`) — **missing entirely from current page**, price row (bold price + strikethrough compare + `"Save ₹800"` pink pill — current page has price + strikethrough + a plain `%off` text but no "Save ₹___" pill), a **trust banner** `"✓ Free delivery on this order · 30-day returns guaranteed"` in a green `bg-success-bg border-success-border` box — **missing entirely**, "CHOOSE YOUR SIZE" label (current says just "Size") + a `"View Size Guide →"` link — **missing the size-guide link**, Add to Cart + Wishlist button pair side by side — **current page only has Add to Cart, no Wishlist button**, a **"PRODUCT SPECIFICATIONS"** table (Fabric/Length/Care/Origin/Occasion key-value rows) — **missing entirely**, then below the fold: a **"Share Your Experience"** rate-and-review prompt section and a **"Customer Reviews"** section with review cards. Both of those are Task 3's responsibility (Product Reviews) — this task only closes the gaps above the reviews fold.
- Mobile layout (`3-0`, 390 wide) mirrors the same missing pieces: rating line, free-delivery/returns banner, "Choose Size" + Size Guide link, Wishlist icon button next to Add to Cart.

**Files:**
- Modify: `app/store/product/[slug]/page.tsx` (mock-wired only in this file)
- Modify: `components/store/add-to-cart-button.tsx`

**Interfaces:**
- Mocks (this file): `MOCK_PRODUCT_DETAIL`, `MOCK_REVIEW_SUMMARY` typed to match `getProductBySlug`'s and the reviews aggregate's real return shapes.
- Produces: no new exports — fixes gaps in the existing page only. Wishlist button remains inert (ponytail: no wishlist backend yet) but must render per Paper.

- [ ] **Step 1: Add mock product fixture matching `getProductBySlug`'s real return shape**

Create `components/store/__mocks__/product-detail-mock.ts`:

```typescript
import type { Product, ProductCategory } from '@prisma/client'

export const MOCK_PRODUCT_DETAIL: Product & { category: Pick<ProductCategory, 'id' | 'name'> | null } = {
  id: 'p1',
  tenantId: 't1',
  name: 'Silk Saree with Gold Border',
  slug: 'silk-saree-gold-border',
  description: 'Handwoven silk saree with a traditional gold zari border, perfect for weddings and festive occasions.',
  price: '2499' as unknown as Product['price'],
  comparePrice: '3299' as unknown as Product['comparePrice'],
  categoryId: 'cat-1',
  sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  images: [],
  stockBySize: { XS: 4, S: 2, M: 0, L: 5, XL: 3, XXL: 1 },
  isActive: true,
  createdAt: new Date(),
  category: { id: 'cat-1', name: 'Sarees' },
}

export const MOCK_REVIEW_SUMMARY = { averageRating: 4.8, count: 248 }

export const MOCK_TENANT_STOREFRONT_SLICE = {
  freeDeliveryAbove: 0,
  deliveryEstimateText: 'Delivered in 3-5 days',
  returnWindowDays: 30,
  sizeGuideUrl: '/size-guide',
}
```

- [ ] **Step 2: Add rating summary line and trust banner to product page (mock-wired)**

Replace `app/store/product/[slug]/page.tsx` — mock-wired for now; the Data-track sibling swaps `MOCK_PRODUCT_DETAIL`/`MOCK_REVIEW_SUMMARY`/`MOCK_TENANT_STOREFRONT_SLICE` for `getProductBySlug`/`getAverageRating`/`getTenantStorefront`:

```typescript
import Image from 'next/image'
import Link from 'next/link'
import {
  MOCK_PRODUCT_DETAIL,
  MOCK_REVIEW_SUMMARY,
  MOCK_TENANT_STOREFRONT_SLICE,
} from '@/components/store/__mocks__/product-detail-mock'
import { AddToCartButton } from '@/components/store/add-to-cart-button'

export default async function ProductPage() {
  const product = MOCK_PRODUCT_DETAIL
  const tenant = MOCK_TENANT_STOREFRONT_SLICE
  const ratingSummary = MOCK_REVIEW_SUMMARY

  const stockBySize = (product.stockBySize ?? {}) as Record<string, number>
  const hasDiscount = product.comparePrice && Number(product.comparePrice) > Number(product.price)
  const discountPct = hasDiscount
    ? Math.round((1 - Number(product.price) / Number(product.comparePrice)) * 100)
    : null
  const savedAmount = hasDiscount ? Number(product.comparePrice) - Number(product.price) : null

  const freeDeliveryText =
    tenant.freeDeliveryAbove && Number(product.price) >= tenant.freeDeliveryAbove
      ? 'Free delivery on this order'
      : tenant.deliveryEstimateText

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-12 sm:py-10">
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-12">
        <div className="space-y-2">
          {product.images.length > 0 ? (
            <>
              <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-bg">
                <Image
                  src={`${product.images[0]}?f_auto,q_auto,w_600`}
                  alt={product.name}
                  fill
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="object-cover"
                  priority
                />
              </div>
              {product.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {product.images.slice(1).map((img, i) => (
                    <div key={img} className="relative aspect-square overflow-hidden rounded-lg bg-bg">
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
            <div className="flex aspect-[3/4] items-center justify-center rounded-xl bg-bg font-body text-sm text-muted-warm">
              No image
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            {product.category && (
              <Link
                href={`/shop?category=${product.category.id}`}
                className="mb-1 block font-body text-xs font-semibold tracking-wide text-muted-warm uppercase"
              >
                {product.category.name}
              </Link>
            )}
            <h1 className="font-heading text-2xl leading-tight font-bold text-fg sm:text-[32px]">{product.name}</h1>
          </div>

          {ratingSummary.count > 0 && (
            <p className="font-body text-sm text-success">
              {'★'.repeat(Math.round(ratingSummary.averageRating ?? 0))} {ratingSummary.count} reviews · {ratingSummary.averageRating?.toFixed(1)} rating
            </p>
          )}

          <div className="flex items-baseline gap-3">
            <span className="font-body text-2xl font-bold text-fg">
              ₹{Number(product.price).toLocaleString('en-IN')}
            </span>
            {hasDiscount && (
              <>
                <span className="font-body text-base text-muted-warm line-through">
                  ₹{Number(product.comparePrice).toLocaleString('en-IN')}
                </span>
                <span className="rounded-full bg-danger px-2.5 py-1 font-body text-xs font-bold text-surface">
                  Save ₹{savedAmount!.toLocaleString('en-IN')}
                </span>
              </>
            )}
          </div>

          {freeDeliveryText && (
            <div className="rounded-lg border border-success-border bg-success-bg px-4 py-3">
              <p className="font-body text-sm font-medium text-success">
                ✓ {freeDeliveryText}
                {tenant.returnWindowDays ? ` · ${tenant.returnWindowDays}-day returns guaranteed` : ''}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="font-body text-sm font-semibold text-fg uppercase">Choose Your Size</p>
            {tenant.sizeGuideUrl && (
              <Link href={tenant.sizeGuideUrl} className="font-body text-sm text-store-primary">
                View Size Guide →
              </Link>
            )}
          </div>

          <AddToCartButton product={product} stockBySize={stockBySize} />

          {product.description && (
            <div className="space-y-1 border-t border-border pt-5">
              <p className="font-body text-sm font-semibold text-fg">Description</p>
              <p className="font-body text-sm leading-relaxed whitespace-pre-line text-muted-warm">
                {product.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Add Wishlist button next to Add to Cart in `AddToCartButton`**

Modify `components/store/add-to-cart-button.tsx` — wrap the existing `<Button>` in a flex row with a bordered wishlist button (ponytail: inert until customer auth + wishlist backend exist, matches the same deferred pattern already used for the wishlist heart on `ProductCard`):

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
  const [added, setAdded] = useState(false)
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
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="space-y-4">
      {product.sizes.length > 0 && (
        <SizePicker
          sizes={product.sizes}
          stockBySize={stockBySize}
          selected={selectedSize}
          onSelect={(size) => {
            setSelectedSize(size)
            setError('')
          }}
        />
      )}
      {error && <p className="font-body text-sm text-danger">{error}</p>}
      <div className="flex gap-3">
        <Button
          className="h-12 flex-1 rounded-lg bg-store-primary font-body text-md font-semibold text-surface hover:bg-store-primary/90"
          onClick={handleAddToCart}
        >
          {added ? 'Added to Cart ✓' : 'Add to Cart'}
        </Button>
        {/* ponytail: decorative only — wishlist needs a signed-in customer session, wire up once storefront auth + wishlist backend exist */}
        <button
          type="button"
          aria-label="Add to wishlist"
          className="flex h-12 items-center gap-1.5 rounded-lg border border-store-primary px-4 font-body text-md font-semibold text-store-primary"
        >
          ♡ Wishlist
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify against Paper at both breakpoints (Checkpoint)**

```bash
npm run build
```
Expected: no TypeScript errors.

`preview_start` the dev server, navigate to the mock-wired product page. `preview_resize` to 1440px, `preview_screenshot`, compare against the Paper screenshot of `4-0` pulled this session for: rating line presence, "Save ₹___" pill, green trust banner, "Choose Your Size" + View Size Guide link, Add to Cart + Wishlist button pair. Repeat at 390px against `3-0`. Then `preview_console_logs({ level: "error" })` and `preview_network({ filter: "failed" })` must both be empty. Keep the mock data file in place — it stays until the Data-track sibling swaps it for real calls.

- [ ] **Step 5: Commit (mock-wired)**

```bash
git add app/store/product/ components/store/add-to-cart-button.tsx components/store/__mocks__/product-detail-mock.ts
git commit -m "fix: close product detail page UI gaps vs Paper (rating line, trust banner, size guide, wishlist button) [mock data]"
```

---

### Task 3: Product Reviews (New) (UI)

**Paper ground truth pulled this session:** the "Share Your Experience" section (desktop `4-0`) has a heading, one-line subtext `"Rate this product and help other customers make informed decisions"`, a 5-star input row, and a `"Write a Review"` bordered pink button. The "Customer Reviews" section below has `"Customer Reviews"` heading + `"4.8★ · 248 verified reviews"` summary + a `"See All Reviews"` bordered button on the right, then review cards: reviewer name (bold) + star rating (green, right-aligned) + relative date + a green `"✓ Verified Purchase"` pill + a bold review title + review body text. Mobile (`3-0`) uses the same structure, compacted, with `"See All Reviews (248)"` as a full-width button instead of top-right.

**Files:**
- Create: `components/store/reviews-section.tsx`
- Modify: `app/store/product/[slug]/page.tsx` (mock-wired only in this file)

**Interfaces:**
- Mocks (this file): `MOCK_REVIEWS`, `MOCK_SUMMARY` typed to match `getProductReviews`/`getAverageRating`'s planned real return shapes (`ProductReviewSummary[]`, `{ averageRating, count }`).
- `submitReview` is called from `ReviewsSection` but stubbed as a no-op client-side handler in this file — the real Server Action is created in the Data-track sibling. Note: the original combined plan interleaved a TDD-first data step (`lib/data/reviews.ts` + test) before this UI step; per the UI/Data split rule, that data step moved to the Data-track sibling regardless of its original position, and the UI here proceeds mock-first as usual.

- [ ] **Step 1: Add mock reviews fixture and build `ReviewsSection` component against Paper mock-first**

Create `components/store/__mocks__/reviews-mock-data.ts`:

```typescript
export type MockReview = {
  id: string
  rating: number
  comment: string | null
  isVerifiedPurchase: boolean
  createdAt: Date
  customer: { name: string | null }
}

export const MOCK_REVIEWS: MockReview[] = [
  {
    id: 'r1',
    rating: 5,
    comment:
      'The quality exceeded my expectations. The fabric feels luxurious, the colors are vibrant, and the weaving is impeccable. Delivery was on time and packaging was perfect.',
    isVerifiedPurchase: true,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    customer: { name: 'Priya Menon' },
  },
  {
    id: 'r2',
    rating: 5,
    comment:
      "Wore this for my cousin's wedding and received so many compliments. The comfort level is great and it drapes beautifully. Highly recommend!",
    isVerifiedPurchase: true,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    customer: { name: 'Anjali Kumar' },
  },
]

export const MOCK_SUMMARY = { averageRating: 4.8, count: 248 }
```

Create `components/store/reviews-section.tsx` — the `onSubmitReview` prop is a stub in this file; the Data-track sibling swaps the caller's stub for the real `submitReview` Server Action without touching this component's internals:

```typescript
'use client'

import { useState } from 'react'
import type { MockReview } from './__mocks__/reviews-mock-data'

function relativeTime(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (days < 1) return 'Today'
  if (days === 1) return '1 day ago'
  if (days < 7) return `${days} days ago`
  const weeks = Math.floor(days / 7)
  return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`
}

type Props = {
  productId: string
  reviews: MockReview[]
  averageRating: number | null
  count: number
  onSubmitReview: (rating: number, comment: string) => Promise<void>
}

export function ReviewsSection({ productId, reviews, averageRating, count, onSubmitReview }: Props) {
  const [draftRating, setDraftRating] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (draftRating === 0) return
    setSubmitting(true)
    await onSubmitReview(draftRating, comment)
    setSubmitting(false)
    setShowForm(false)
    setComment('')
    setDraftRating(0)
  }

  return (
    <div className="space-y-8 border-t border-border pt-8">
      <div className="space-y-3">
        <h2 className="font-heading text-xl font-bold text-fg">Share Your Experience</h2>
        <p className="font-body text-sm text-muted-warm">Rate this product and help other customers make informed decisions</p>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                aria-label={`Rate ${star} stars`}
                onClick={() => {
                  setDraftRating(star)
                  setShowForm(true)
                }}
                className={`text-2xl ${star <= draftRating ? 'text-amber' : 'text-border'}`}
              >
                ★
              </button>
            ))}
          </div>
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="rounded-lg border border-store-primary px-4 py-2 font-body text-sm font-semibold text-store-primary"
            >
              Write a Review
            </button>
          )}
        </div>
        {showForm && (
          <div className="space-y-3">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us about your experience with this product…"
              className="w-full rounded-lg border border-border p-3 font-body text-sm text-fg"
              rows={3}
            />
            <button
              type="button"
              disabled={submitting || draftRating === 0}
              onClick={handleSubmit}
              className="rounded-lg bg-store-primary px-5 py-2.5 font-body text-sm font-semibold text-surface disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit Review'}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xl font-bold text-fg">Customer Reviews</h2>
          {count > 0 && (
            <p className="font-body text-sm text-muted-warm">
              {averageRating?.toFixed(1)}★ · {count} verified reviews
            </p>
          )}
        </div>

        {reviews.length === 0 ? (
          <p className="font-body text-sm text-muted-warm">No reviews yet. Be the first to share your experience.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-body text-sm font-bold text-fg">{review.customer.name ?? 'Anonymous'}</p>
                    <p className="font-body text-xs text-muted-warm">{relativeTime(review.createdAt)}</p>
                  </div>
                  <p className="font-body text-sm text-success">{'★'.repeat(review.rating)}</p>
                </div>
                {review.isVerifiedPurchase && (
                  <span className="mt-2 inline-block rounded-full bg-success-bg px-2.5 py-1 font-body text-xs text-success">
                    ✓ Verified Purchase
                  </span>
                )}
                {review.comment && (
                  <p className="mt-2 font-body text-sm leading-relaxed text-fg">{review.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify `ReviewsSection` against Paper (Checkpoint)**

Render `ReviewsSection` with `MOCK_REVIEWS`/`MOCK_SUMMARY` on the product detail page (a no-op async function for `onSubmitReview` is fine at this stage), `preview_start`, `preview_screenshot` at 1440px and 390px, compare against the "Share Your Experience" / "Customer Reviews" sections of Paper artboards `4-0` / `3-0` pulled this session. Verify: star input row, verified-purchase pill styling (green), review card spacing. `preview_console_logs({ level: "error" })` must be empty.

- [ ] **Step 3: Wire `ReviewsSection` into the mock-wired product detail page**

Modify `app/store/product/[slug]/page.tsx` — add the import and mock data, then render `ReviewsSection` after the description block:

```typescript
// Add these imports
import { MOCK_REVIEWS, MOCK_SUMMARY } from '@/components/store/__mocks__/reviews-mock-data'
import { ReviewsSection } from '@/components/store/reviews-section'
```

In the page component, use the mock reviews/summary in place of `ratingSummary`/reviews list (the earlier Task 2 mock `MOCK_REVIEW_SUMMARY` is superseded by `MOCK_SUMMARY` here — use one source of truth, `MOCK_SUMMARY`, for both the rating line and the reviews section):

```typescript
  const reviews = MOCK_REVIEWS
  const ratingSummary = MOCK_SUMMARY

  async function submitReviewStub(rating: number, comment: string) {
    'use client'
    // ponytail: stub only — real submitReview Server Action wired in the Data-track sibling
    console.log('submit review (mock)', rating, comment)
  }
```

And add `<ReviewsSection productId={product.id} reviews={reviews} averageRating={ratingSummary.averageRating} count={ratingSummary.count} onSubmitReview={submitReviewStub} />` immediately after the closing `</div>` of the two-column grid, still inside `<main>`.

- [ ] **Step 4: Build check and final verification**

```bash
npm run build
```
Expected: no TypeScript errors.

`preview_start`, navigate to the mock-wired product page, `preview_screenshot` at 1440px and 390px confirming the rating summary line and reviews section render per Paper. `preview_console_logs({ level: "error" })` and `preview_network({ filter: "failed" })` must both be empty. Keep the mock data files in place — they stay until the Data-track sibling swaps them for real calls.

- [ ] **Step 5: Commit (mock-wired)**

```bash
git add components/store/reviews-section.tsx components/store/__mocks__/reviews-mock-data.ts app/store/product/[slug]/page.tsx
git commit -m "feat: add product reviews UI with verified purchase badge, submit form, and rating summary [mock data]"
```

---

### Task 4: `/about` Storefront Page (New) (UI)

**Paper ground truth pulled this session:**
- Desktop (`BMB-0`, "Store About — Desktop", 1440×1290): header identical to shop/home header (`talam.` wordmark, Shop/About nav, search/cart/account icons). Content area (`BMV-0`, `1200px` centered) is an "Identity Row" (`BMW-0`) split into a `360px` **Profile** column (circular avatar/initial, `"Meena Patel"` bold name, `"Founder & Designer"` muted subtitle, then a 3-column **Stats** bar with `border-y` dividers: `"₹50L+ / GMV"`, `"2,400+ / Customers"`, `"4.8★ / Rated"`) and a `760px` **Story** column (`"Our Story"` label, a `15px/165%` muted paragraph — pulled verbatim from Paper: *"Meena Silks is a family-owned business founded in 1995, specializing in handwoven silk sarees and ethnic wear sourced directly from weavers across Tamil Nadu. What started as a small shop in Anna Nagar has grown into a trusted name for authentic, handcrafted textiles — now serving customers across India through our online store, while still honoring the same relationships with local artisans that we began with three decades ago."* — this is Paper's placeholder/demo copy for the fictional "Meena Silks" tenant, per the Paper Demo Content Mismatch memory; treat it as realistic mock text only, not literal per-tenant copy, `"Follow Us"` label + 4 social icon buttons). Below that, a **"Visit Us"** section with 2 branch cards side by side (`588px` each): store name bold, address (`14px/150%` muted, 2-line), phone row with icon, `"View on Maps →"` bordered button.
- Mobile (`ASB-0`, "Store About — Mobile", 390×1600): same content stacked vertically — status bar, compact header with back-style icon + tenant name/tagline, centered large avatar circle + name + subtitle, 3-stat row (`GMV`/`Customers`/`Rated`), `"Follow Us"` icon row, `"Visit Us"` with branch cards stacked (each showing name, 2-line address, phone, "View on Maps →"), and a `"Powered by talam"` footer chip.
- Note: the GMV/Customers/Rated **stats bar is store-wide vanity metrics, not per-tenant real aggregates** — same category as the "2,400+ happy customers" badge already flagged `ponytail` in `components/store/store-footer.tsx:165-166`. Treat identically: hardcode as decorative placeholder text, do not attempt to compute real aggregates (out of scope, no task tracks a "customer count" feature). This is a permanent hardcode, not a mock swapped for real data — the Data-track sibling has no work item for these stats.

**Files:**
- Create: `app/store/about/page.tsx` (mock-wired only in this file)
- Create: `components/store/about-hero.tsx`
- Create: `components/store/visit-us.tsx`

**Interfaces:**
- Mocks (this file): `MOCK_ABOUT_TENANT` (typed to `Pick<TenantStorefront, 'name' | 'tagline' | 'about'>`), `MOCK_BRANCHES`.
- Produces: `/about` route (mock-wired) — no data-layer exports; real wiring happens in the Data-track sibling.

- [ ] **Step 1: Add mock fixtures matching real return types**

Create `components/store/__mocks__/about-mock-data.ts`:

```typescript
import type { TenantStorefront } from '@/lib/data/tenant'

export const MOCK_ABOUT_TENANT: Pick<TenantStorefront, 'name' | 'tagline' | 'about'> = {
  name: 'Meena Silks',
  tagline: 'Handcrafted for every occasion',
  about: {
    storyTitle: 'Our Story',
    description:
      'Meena Silks is a family-owned business founded in 1995, specializing in handwoven silk sarees and ethnic wear sourced directly from weavers across Tamil Nadu. What started as a small shop in Anna Nagar has grown into a trusted name for authentic, handcrafted textiles — now serving customers across India through our online store, while still honoring the same relationships with local artisans that we began with three decades ago.',
    instagramUrl: 'https://instagram.com/example',
    facebookUrl: 'https://facebook.com/example',
    youtubeUrl: null,
  },
}

export type MockBranch = { id: string; name: string; address: string | null; city: string | null; phone: string | null; mapsUrl: string | null }

export const MOCK_BRANCHES: MockBranch[] = [
  {
    id: 'b1',
    name: 'Main Store',
    address: '42, 4th Cross, Anna Nagar West',
    city: 'Chennai, Tamil Nadu — 600040',
    phone: '+91 98765 43210',
    mapsUrl: 'https://maps.google.com',
  },
  {
    id: 'b2',
    name: 'T. Nagar Showroom',
    address: '18, Pondy Bazaar, T. Nagar',
    city: 'Chennai, Tamil Nadu — 600017',
    phone: '+91 98765 43211',
    mapsUrl: 'https://maps.google.com',
  },
]
```

- [ ] **Step 2: Build `AboutHero` component (profile + stats + story + social) against the mock**

Create `components/store/about-hero.tsx`:

```typescript
import Link from 'next/link'
import type { TenantStorefront } from '@/lib/data/tenant'

type Props = {
  tenant: Pick<TenantStorefront, 'name' | 'about'>
}

const socialLinks = (about: Props['tenant']['about']) =>
  [
    about?.instagramUrl && { label: 'Instagram', href: about.instagramUrl },
    about?.facebookUrl && { label: 'Facebook', href: about.facebookUrl },
    about?.youtubeUrl && { label: 'YouTube', href: about.youtubeUrl },
  ].filter((s): s is { label: string; href: string } => Boolean(s))

export function AboutHero({ tenant }: Props) {
  const socials = socialLinks(tenant.about)
  const initial = tenant.name.charAt(0).toUpperCase()

  return (
    <section className="flex flex-col gap-8 sm:flex-row sm:gap-16">
      <div className="flex flex-col items-center gap-1 sm:w-[360px] sm:shrink-0 sm:items-start">
        <div className="mb-4 flex size-[120px] items-center justify-center rounded-full bg-store-primary/10 font-heading text-4xl font-bold text-store-primary sm:size-[140px]">
          {initial}
        </div>
        <h1 className="font-heading text-xl font-bold text-fg sm:text-2xl">{tenant.name}</h1>
        <p className="font-body text-sm text-muted-warm">Founder &amp; Designer</p>

        {/* ponytail: store-wide vanity stats, same placeholder pattern as the footer's "2,400+ happy customers" badge — not a per-tenant aggregate, no data-track work item */}
        <div className="mt-6 grid w-full grid-cols-3 divide-x divide-border border-y border-border py-5 text-center">
          <div>
            <p className="font-body text-xl font-bold text-fg sm:text-[22px]">₹50L+</p>
            <p className="mt-1 font-body text-xs text-muted-warm">GMV</p>
          </div>
          <div>
            <p className="font-body text-xl font-bold text-fg sm:text-[22px]">2,400+</p>
            <p className="mt-1 font-body text-xs text-muted-warm">Customers</p>
          </div>
          <div>
            <p className="font-body text-xl font-bold text-fg sm:text-[22px]">4.8★</p>
            <p className="mt-1 font-body text-xs text-muted-warm">Rated</p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-5">
        <h2 className="font-body text-lg font-bold text-fg">{tenant.about?.storyTitle ?? 'Our Story'}</h2>
        {tenant.about?.description && (
          <p className="font-body text-[15px] leading-[165%] text-muted-warm whitespace-pre-line">
            {tenant.about.description}
          </p>
        )}
        {socials.length > 0 && (
          <div className="space-y-3">
            <p className="font-body text-lg font-bold text-fg">Follow Us</p>
            <div className="flex gap-3">
              {socials.map((social) => (
                <Link
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.label}
                  className="flex size-10 items-center justify-center rounded-full border border-border bg-surface"
                >
                  {social.label.charAt(0)}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Build `VisitUs` component against the mock**

Create `components/store/visit-us.tsx`:

```typescript
import Link from 'next/link'

export type BranchDisplay = {
  id: string
  name: string
  address: string | null
  city: string | null
  phone: string | null
  mapsUrl: string | null
}

type Props = { branches: BranchDisplay[] }

export function VisitUs({ branches }: Props) {
  if (branches.length === 0) return null

  return (
    <section className="space-y-5">
      <h2 className="font-body text-lg font-bold text-fg">Visit Us</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {branches.map((branch) => (
          <div key={branch.id} className="rounded-lg border border-border p-6">
            <p className="mb-1.5 font-body text-base font-bold text-fg">{branch.name}</p>
            {(branch.address || branch.city) && (
              <p className="mb-3.5 font-body text-sm leading-[150%] whitespace-pre-line text-muted-warm">
                {[branch.address, branch.city].filter(Boolean).join('\n')}
              </p>
            )}
            {branch.phone && (
              <p className="mb-4 font-body text-sm text-muted-warm">{branch.phone}</p>
            )}
            {branch.mapsUrl && (
              <Link
                href={branch.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-9 items-center justify-center rounded-sm border border-border font-body text-sm font-medium text-fg"
              >
                View on Maps →
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Verify `AboutHero` + `VisitUs` against Paper with mocks (Checkpoint)**

Wire a mock-only `/about` page importing `MOCK_ABOUT_TENANT` / `MOCK_BRANCHES` from Step 1's mock file. `preview_start`, `preview_resize` to 1440px, `preview_screenshot`, compare against the Paper screenshot of `BMB-0` pulled this session (profile column width, stats divider bar, story column width, social icon row, 2-column branch cards). Repeat at 390px against `ASB-0` (stacked layout, centered avatar). `preview_console_logs({ level: "error" })` must be empty.

- [ ] **Step 5: Build the mock-wired `/about` page**

Create `app/store/about/page.tsx` — mock-wired; the Data-track sibling swaps these for `getTenantStorefront` + a direct branch query:

```typescript
import { MOCK_ABOUT_TENANT, MOCK_BRANCHES } from '@/components/store/__mocks__/about-mock-data'
import { AboutHero } from '@/components/store/about-hero'
import { VisitUs } from '@/components/store/visit-us'

export default async function AboutPage() {
  const tenant = MOCK_ABOUT_TENANT
  const branches = MOCK_BRANCHES

  return (
    <main className="mx-auto max-w-6xl space-y-12 px-4 py-8 sm:px-16 sm:py-12">
      <AboutHero tenant={tenant} />
      <VisitUs branches={branches} />
    </main>
  )
}
```

- [ ] **Step 6: Build check and final verification against Paper on the mock-wired route**

```bash
npm run build
```
Expected: no TypeScript errors.

`preview_start`, navigate to `/about` (mock-wired). `preview_resize` to 1440px and 390px, `preview_screenshot` each, confirm layout matches Paper structurally. `preview_console_logs({ level: "error" })` and `preview_network({ filter: "failed" })` must both be empty. Keep the mock data file in place — it stays until the Data-track sibling swaps it for real calls.

- [ ] **Step 7: Commit (mock-wired)**

```bash
git add app/store/about/ components/store/about-hero.tsx components/store/visit-us.tsx components/store/__mocks__/about-mock-data.ts
git commit -m "feat: add /about storefront page UI with owner story, social links, and branch locations [mock data]"
```

---

### Task 5: Category SEO Pages (`/shop/[categorySlug]`) (New) (UI)

**Paper ground truth:** there is no distinct Paper artboard for a per-category listing screen — the "Shop — Desktop / Discovery" and "Shop — Mobile / Discovery" artboards pulled in Task 1 already show the filtered-by-category state of the same grid (the header row's `"Sarees ×"` chip and the sidebar's pre-checked "Sarees" checkbox in `9PL-0`/`9RF-0`). This route is a crawlable, statically-cacheable URL variant of that same UI — it reuses every component built in Task 1 (`ProductGrid`, `FilterBar`) rather than introducing new visual design.

**Files:**
- Create: `app/store/shop/[categorySlug]/page.tsx` (mock-wired only in this file)

**Interfaces:**
- Mocks (this file): reuses `MOCK_PRODUCTS`/`MOCK_CATEGORIES` from Task 1's `components/store/__mocks__/shop-mock-data.ts`.
- Reuses: `ProductGrid` (from Task 1). No new visual components.

- [ ] **Step 1: Create the category slug page (mock-wired)**

Create `app/store/shop/[categorySlug]/page.tsx` — mock-wired; the Data-track sibling swaps these for `getCategories`/`getProducts`:

```typescript
import { notFound } from 'next/navigation'
import { MOCK_CATEGORIES, MOCK_PRODUCTS } from '@/components/store/__mocks__/shop-mock-data'
import { ProductGrid } from '@/components/store/product-grid'

type Props = { params: Promise<{ categorySlug: string }> }

export default async function CategoryPage({ params }: Props) {
  const { categorySlug } = await params

  const category = MOCK_CATEGORIES.find((c) => c.slug === categorySlug)
  if (!category) notFound()

  const products = MOCK_PRODUCTS.filter((p) => p.category?.name === category.name)

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-16 sm:py-10">
      <h1 className="mb-6 font-heading text-xl font-bold text-fg sm:text-2xl">{category.name}</h1>
      <p className="mb-4 font-body text-sm text-muted-warm">
        {products.length} {products.length === 1 ? 'item' : 'items'}
      </p>
      <ProductGrid products={products} />
    </main>
  )
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```
Expected: no TypeScript errors.

- [ ] **Step 3: Verify against the mock-wired category route and check for console/network errors**

`preview_start`, navigate to `/shop/sarees` (mock-wired). `preview_screenshot` at 1440px and 390px — confirm it renders the same product-card styling from Task 1's `ProductCard`/`ProductGrid` (this task introduces zero new visual components, so a mismatch here means Task 1's grid wasn't actually reused — fix the import, don't reintroduce old markup). `preview_console_logs({ level: "error" })` and `preview_network({ filter: "failed" })` must both be empty.

- [ ] **Step 4: Commit (mock-wired)**

```bash
git add app/store/shop/
git commit -m "feat: add /shop/[categorySlug] UI for SEO-indexable category URLs [mock data]"
```

---

## Phase 2 UI Track Verification

```bash
npm run build
```
Expected: no errors.

Manual smoke test (mock-wired, no tenant subdomain routing needed yet since these routes are mock-only pending the Data-track pass):
- [ ] `/shop` at 1440px: filter sidebar with checkboxes/sizes/price/occasion/apply-reset, 3-column grid, chips + sort dropdown in header row
- [ ] `/shop` at 390px: "Filter & Sort" pill opens bottom sheet matching Paper's `Filter Bottom Sheet — Mobile`, 2-column grid
- [ ] `/product/<mock-slug>` at both breakpoints: rating summary line, green trust banner, "Choose Your Size" + size guide link, Add to Cart + Wishlist pair, reviews section with working star-rating input
- [ ] `/about` at both breakpoints: profile + stats + story + social row, Visit Us branch cards
- [ ] `/shop/<category-slug>` at both breakpoints: same product-card styling as `/shop`, crawlable metadata title
- [ ] Zero console errors and zero failed network requests on all routes at both breakpoints
- [ ] `git log --oneline -6` shows 5 new commits: shop rebuild UI, product detail fix UI, reviews UI, about page UI, category SEO pages UI

## Self-Review

- **Spec coverage:** All 5 tasks from the original combined plan are represented, each split into its UI-only steps (Paper pull, mock fixtures, component build, screenshot verify, commit). Task 3's original interleaving (TDD-data-first in Steps 1-4, then UI in Steps 5+) was un-interleaved per the split rule — its UI steps (mock fixtures, `ReviewsSection` build, checkpoint, page wiring, verify, commit) land here; its data steps (failing test, `lib/data/reviews.ts` implementation, passing test, Server Actions, real wiring) moved to the Data-track sibling regardless of original step order.
- **Placeholder scan:** All mock fixtures (`shop-mock-data.ts`, `product-detail-mock.ts`, `reviews-mock-data.ts`, `about-mock-data.ts`) are typed against real return shapes with no invented fields. The About page's GMV/Customers/Rated stats are a deliberate permanent hardcode (ponytail-flagged), not a temporary mock — correctly has no Data-track counterpart.
- **Type consistency:** Mock types mirror the real data-layer contracts documented in the original plan's Global Constraints (`getProducts`, `getCategories`, `getTenantStorefront`, `getProductBySlug` shapes) so the Data-track swap is a drop-in replacement with no prop-shape changes.
- **Track discipline:** No Prisma imports, `withTenant` calls, Server Actions, API routes, or `lib/data/*.ts` writes appear anywhere in this file — every page component reads from a local `__mocks__` fixture. The one exception verified clean: `submitReviewStub` in Task 3 Step 3 is an inert client-side stub with a `console.log`, not a real mutation.
