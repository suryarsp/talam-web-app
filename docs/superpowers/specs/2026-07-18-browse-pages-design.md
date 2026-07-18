# Browse Pages, Global Search & Header Nav Rework

**Date:** 2026-07-18
**Status:** Design spec

---

## 1. Problem

The storefront header has dead links (Men/Women point to `/`, About is unwanted), no working search, and browse pages (category, occasion, offers) lack filters. Tenants need department-based navigation (Men/Women/Kids) and customers need a way to search products.

## 2. Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Department model | `department` string on `ProductCategory`, not `parentId` hierarchy | Flat is enough for textile shops; no recursive queries, no tree UI |
| Hierarchy depth | None (flat categories tagged with a department) | 2-level hierarchy is YAGNI for this tenant profile |
| Default departments | `men`, `women`, `kids` | Platform defaults, non-deletable |
| Search style | Overlay modal with debounced autocomplete | Mac Mini-style: clean, responsive, instant results |

## 3. Schema Change

```prisma
model ProductCategory {
  // existing fields unchanged
  department  String?  @db.VarChar(20)   // 'men' | 'women' | 'kids' | null (unisex)
  isDefault   Boolean  @default(false) @map("is_default")
}
```

- `department = null` means unisex — the category's products appear under every department page.
- `isDefault = true` for platform-seeded departments — prevents tenant from deleting Sarees, Kurtis, etc.
- No new model, no self-relation, no migration complexity.

## 4. Data Layer Changes

### `lib/data/products.ts`

**`ProductFilters` extended:**
```ts
export type ProductFilters = {
  categoryId?: string
  department?: string    // NEW — 'men' | 'women' | 'kids'
  offersOnly?: boolean   // NEW — replaces separate getOfferProducts()
  size?: string
  minPrice?: number
  maxPrice?: number
  sort?: ProductSort
  tagId?: string
}
```

**`getProducts()` changes:**
- `department` filter: `category: { OR: [{ department }, { department: null }] }` — matches the department or unisex categories.
- `offersOnly` filter: same `OR` condition currently in `getOfferProducts()` (comparePrice set OR active promotion). This lets `getOfferProducts()` become a thin wrapper: `getProducts(tenantId, { offersOnly: true, ...filters })`.

**`getCategories()` extended:**
```ts
export async function getCategories(tenantId: string, department?: string): Promise<CategoryMeta[]>
```
When `department` is passed, returns categories where `department = value OR department = null`. Used by FilterBar on department pages to show only relevant sub-categories.

### `lib/data/search.ts` (new)

```ts
export async function searchProducts(tenantId: string, query: string, limit = 8) {
  // product.findMany where name contains query (insensitive), isActive, published, limit
}
```

One function, no full-text index needed at this scale. `contains` + `mode: 'insensitive'` on the `name` field.

## 5. FilterBar — Made Generic

Current problem: `FilterBar` hardcodes `router.push('/?...')`.

Fix: Add `basePath` prop.

```tsx
type Props = {
  basePath: string          // e.g. '/category/sarees', '/men', '/offers'
  categories: CategoryMeta[]
  // ...existing active filter props
}
```

`setParam()` and `handlePriceSubmit()` push to `${basePath}?${params}` instead of `/?${params}`.

**New filter dimensions** (optional, rendered when prop is truthy):
- `occasions?: { id: string; name: string; slug: string }[]` — occasion chip filter on department/offers pages.
- No other new dimensions needed.

## 6. Routes

### Department pages: `/store/[department]` (new)

A single dynamic route replaces the need for three separate `/men`, `/women`, `/kids` pages.

```
app/store/[department]/page.tsx
```

- Validates `department` param is one of `men | women | kids`, else `notFound()`.
- Calls `getProducts(tenantId, { department, ...searchParamFilters })`.
- Calls `getCategories(tenantId, department)` for FilterBar's category chips.
- Renders: heading (e.g. "Men"), item count, `FilterBar` + `ProductGrid`.
- `basePath` passed to FilterBar: `/${department}`.

### Category page: `/store/category/[categorySlug]` (existing, enhanced)

Add `FilterBar` with `basePath="/category/${slug}"`. Pass `categories` minus the current one (or all — user can switch categories from within).

### Occasion page: `/store/occasion/[occasionSlug]` (existing, enhanced)

Keep the gradient banner + emoji hero. Add `FilterBar` below it with `basePath="/occasion/${slug}"`. The `tagId` is locked (implicit from the page), but category/size/price/sort are open.

### Offers page: `/store/offers` (existing, enhanced)

Replace `getOfferProducts()` call with `getProducts(tenantId, { offersOnly: true, ...searchParamFilters })`. Add `FilterBar` with `basePath="/offers"`.

### Home page: `/store` (existing)

No change to the home page. It keeps its own inline filter system and the "Shop by Occasion" / "Shop by Offers" strips.

## 7. Global Search

### Trigger
The search icon in `StoreHeader` opens a search overlay instead of linking to `/`.

### Component: `components/store/search-overlay.tsx` (new)

- **Mobile**: full-screen overlay with large input at top, results below.
- **Desktop**: centered modal (max-width ~560px), backdrop blur.
- **Input**: autofocused, large text, placeholder "Search products...".
- **Debounce**: 300ms. Calls `searchProductsAction(query)` server action.
- **Results**: list of product cards (image thumbnail, name, price, category). Max 8 results.
- **Empty state**: "No products found" when query has no matches.
- **Navigation**: clicking a result navigates to `/product/[slug]` and closes overlay.
- **Close**: ESC key, click backdrop, or X button.
- Uses `Dialog` component from `components/ui/dialog.tsx`.

### Server action: `app/store/actions.ts`

```ts
'use server'
export async function searchProductsAction(query: string) {
  // calls searchProducts() from lib/data/search.ts
}
```

## 8. Header Nav Changes

### `components/store/store-header.tsx`

**Remove:** "About" link, "New Arrivals" link.

**Update nav to:**
```
Women → /women
Men → /men
Kids → /kids
Offers → /offers
```

All use `StoreLink`. The `href` values are store-relative (tenant-aware via `useStoreBase()`).

**Search icon:** Change from `StoreIconButton href="/"` to a `<button>` that opens `SearchOverlay`.

## 9. Seed Data Changes

### `prisma/seed.ts`

Add `department` to existing catData:

```ts
const catData = [
  { name: 'Sarees', slug: 'sarees', sortOrder: 0, department: 'women' },
  { name: 'Kurtis', slug: 'kurtis', sortOrder: 1, department: 'women' },
  { name: 'Dupattas', slug: 'dupattas', sortOrder: 2, department: 'women' },
  { name: 'Sets & Suits', slug: 'sets-suits', sortOrder: 3, department: 'women' },
  { name: 'Lehengas', slug: 'lehengas', sortOrder: 4, department: 'women' },
  { name: 'Accessories', slug: 'accessories', sortOrder: 5, department: null },
]
```

Accessories stays `null` (unisex) — appears on all department pages.

### `app/admin/onboarding/actions.ts`

`seedStarterContent` creates the default categories with departments. Same idempotent upsert pattern as occasions.

## 10. Admin — Category Department Picker

### Where

The admin Products page already has a category `<select>` in the product editor modal. Categories are managed... nowhere currently (they're seed-only).

### New: Category management in Settings

Add a "Categories" section to the Settings page (or a button on the Products page that opens a Dialog):

- Lists all categories grouped by department (Women: Sarees, Kurtis... | Men: ... | Unisex: Accessories)
- Each row: category name, department dropdown (`Women / Men / Kids / Unisex`), delete button (disabled if `isDefault` or has products)
- "Add Category" row at bottom: name input + department dropdown
- No separate page — a Dialog is enough for this flat list

### Product editor change

The category `<select>` in the product add/edit modal gets optgroup headers by department:

```html
<select>
  <optgroup label="Women">
    <option>Sarees</option>
    <option>Kurtis</option>
  </optgroup>
  <optgroup label="Men">
    <option>Shirts</option>
  </optgroup>
  <optgroup label="Unisex">
    <option>Accessories</option>
  </optgroup>
</select>
```

## 11. What's NOT in Scope

- Mobile hamburger menu / drawer nav (existing mobile nav stays as-is)
- Full-text search / Postgres `tsvector` indexing (overkill at current scale)
- Search history / recent searches
- Category images or icons
- Breadcrumbs on browse pages
- URL-defined filters on the home page (home keeps its own inline system)

## Changelog

- 2026-07-18: Initial spec
