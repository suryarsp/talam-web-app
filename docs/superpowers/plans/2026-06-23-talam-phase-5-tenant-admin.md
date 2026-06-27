# Phase 5: Tenant Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the tenant admin panel — dashboard with sales stats, full product CRUD with Cloudinary image upload, order management with status updates, customer list, and brand settings.

**Architecture:** All admin routes live under `app/store/admin/`. A layout-level auth guard verifies that the logged-in user is the tenant's `owner_id`. Products are managed via Server Actions (create/update/delete). Image upload goes directly to Cloudinary from the browser (unsigned upload preset), returning a URL stored in the DB. On-demand revalidation fires after product edits.

**Tech Stack:** Next.js 15 App Router (SSR + Server Actions), Prisma `withTenant`, Cloudinary unsigned upload, shadcn/ui data tables, `@vercel/og` revalidation call, Vitest

## Global Constraints

- Inherit all prior phase constraints
- Every admin route and action: verify `tenant.ownerId === auth.uid()` before any mutation
- `export const dynamic = 'force-dynamic'` on every admin page
- Product image upload: client-side unsigned upload to Cloudinary → returns URL → stored via Server Action
- On product save/delete: call `POST /api/revalidate` to bust ISR cache for that product slug

---

### Task 1: Admin Auth Guard & Layout

**Files:**
- Create: `app/store/admin/layout.tsx`
- Create: `lib/admin-guard.ts`
- Create: `lib/admin-guard.test.ts`

**Interfaces:**
- Produces: `requireOwner()` → `{ tenantId, ownerId }` or redirects to `/auth`
- Produces: admin layout with sidebar navigation

- [ ] **Step 1: Write failing test**

Create `lib/admin-guard.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'owner-uuid' } },
        error: null,
      }),
    },
  })),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: vi.fn((key: string) => {
      if (key === 'x-tenant-id') return 'tenant-uuid'
      return null
    }),
  })),
}))

vi.mock('@/lib/prisma', () => ({
  withTenant: vi.fn(async (_id: string, fn: (client: unknown) => Promise<unknown>) =>
    fn({
      tenant: {
        findUnique: vi.fn().mockResolvedValue({ id: 'tenant-uuid', ownerId: 'owner-uuid' }),
      },
    })
  ),
}))

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

import { requireOwner } from './admin-guard'

describe('requireOwner', () => {
  it('returns tenantId when logged-in user is the owner', async () => {
    const result = await requireOwner()
    expect(result.tenantId).toBe('tenant-uuid')
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm test -- --run lib/admin-guard.test.ts
```

Expected: FAIL — `Cannot find module './admin-guard'`

- [ ] **Step 3: Implement admin guard**

Create `lib/admin-guard.ts`:
```typescript
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { withTenant } from '@/lib/prisma'

export async function requireOwner() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth?next=/admin/dashboard')

  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  if (!tenantId) redirect('/')

  const tenant = await withTenant(tenantId, (db) =>
    db.tenant.findUnique({ where: { id: tenantId }, select: { id: true, ownerId: true } })
  )

  if (!tenant || tenant.ownerId !== user.id) redirect('/')

  return { tenantId, ownerId: user.id }
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npm test -- --run lib/admin-guard.test.ts
```

Expected: PASS

- [ ] **Step 5: Create admin layout**

Create `app/store/admin/layout.tsx`:
```typescript
import Link from 'next/link'
import { requireOwner } from '@/lib/admin-guard'
import { LayoutDashboard, Package, ShoppingBag, Users, Tag, Settings, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// Bottom nav: 4 items per spec §1 changelog. Secondary pages (categories, customers,
// promotions, payouts, about, reviews) are accessed via Settings hub sub-navigation.
const BOTTOM_NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

// Desktop sidebar shows expanded nav including Settings sub-items
const SIDEBAR_NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
  { href: '/admin/settings/store', label: 'Store Details', icon: Settings, indent: true },
  { href: '/admin/settings/brand', label: 'Brand', icon: Settings, indent: true },
  { href: '/admin/settings/payment', label: 'Payment', icon: DollarSign, indent: true },
  { href: '/admin/about', label: 'About Page', icon: Users, indent: true },
  { href: '/admin/categories', label: 'Categories', icon: Tag, indent: true },
  { href: '/admin/customers', label: 'Customers', icon: Users, indent: true },
  { href: '/admin/promotions', label: 'Promotions', icon: Tag, indent: true },
  { href: '/admin/reviews', label: 'Reviews', icon: Tag, indent: true },
  { href: '/admin/billing', label: 'Billing', icon: DollarSign, indent: true },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireOwner()

  return (
    <div className="min-h-screen flex flex-col">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-1">
        <aside className="w-56 border-r flex flex-col py-6 px-3 gap-1 bg-background shrink-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 mb-2">Admin</p>
          {SIDEBAR_NAV.map(({ href, label, icon: Icon, indent }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors',
                'text-muted-foreground hover:text-foreground',
                indent && 'pl-7 text-xs'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </aside>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>

      {/* Mobile: content + bottom nav */}
      <main className="md:hidden flex-1 overflow-auto pb-16">
        <div className="p-4">{children}</div>
      </main>
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-background border-t flex items-center justify-around px-2 z-50">
        {BOTTOM_NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-0.5 text-xs text-muted-foreground min-w-[44px] py-1"
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/admin-guard.ts lib/admin-guard.test.ts app/store/admin/layout.tsx
git commit -m "feat: add admin auth guard (owner-only) and admin layout with sidebar"
```

---

### Task 2: Admin Dashboard

**Files:**
- Create: `app/store/admin/dashboard/page.tsx`
- Create: `lib/data/admin-stats.ts`

**Interfaces:**
- Consumes: `requireOwner()`, `withTenant`
- Produces: dashboard with revenue (last 30d), orders count, active products count

- [ ] **Step 1: Create stats data function**

Create `lib/data/admin-stats.ts`:
```typescript
import { withTenant } from '@/lib/prisma'

export type DashboardStats = {
  revenue30d: number
  orders30d: number
  activeProducts: number
  pendingOrders: number
}

export async function getDashboardStats(tenantId: string): Promise<DashboardStats> {
  const since = new Date()
  since.setDate(since.getDate() - 30)

  const [revenueResult, orders30d, activeProducts, pendingOrders] = await Promise.all([
    withTenant(tenantId, (db) =>
      db.order.aggregate({
        where: { tenantId, paymentStatus: 'paid', createdAt: { gte: since } },
        _sum: { total: true },
        _count: true,
      })
    ),
    withTenant(tenantId, (db) =>
      db.order.count({ where: { tenantId, createdAt: { gte: since } } })
    ),
    withTenant(tenantId, (db) =>
      db.product.count({ where: { tenantId, isActive: true } })
    ),
    withTenant(tenantId, (db) =>
      db.order.count({ where: { tenantId, status: 'pending' } })
    ),
  ])

  return {
    revenue30d: Number(revenueResult._sum.total ?? 0),
    orders30d,
    activeProducts,
    pendingOrders,
  }
}
```

- [ ] **Step 2: Create dashboard page**

Create `app/store/admin/dashboard/page.tsx`:
```typescript
import { requireOwner } from '@/lib/admin-guard'
import { getDashboardStats } from '@/lib/data/admin-stats'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, ShoppingBag, Package, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const { tenantId } = await requireOwner()
  const stats = await getDashboardStats(tenantId)

  const cards = [
    { title: 'Revenue (30d)', value: `₹${stats.revenue30d.toLocaleString('en-IN')}`, icon: TrendingUp, desc: 'Paid orders only' },
    { title: 'Orders (30d)', value: stats.orders30d.toString(), icon: ShoppingBag, desc: 'All statuses' },
    { title: 'Active Products', value: stats.activeProducts.toString(), icon: Package, desc: 'Live in your store' },
    { title: 'Pending Orders', value: stats.pendingOrders.toString(), icon: Clock, desc: 'Awaiting confirmation' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/store/admin/dashboard/ lib/data/admin-stats.ts
git commit -m "feat: add admin dashboard with 30-day revenue and order stats"
```

---

### Task 2.5: Categories CRUD (`/admin/categories`)

> **Must complete before Task 3** — the product form's category dropdown depends on categories existing.

**Files:**
- Create: `app/store/admin/categories/page.tsx`
- Create: `app/store/admin/categories/actions.ts`

**Interfaces:**
- Produces: `createCategory(name)`, `updateCategory(id, name)`, `deleteCategory(id)` Server Actions
- Produces: category list page with inline add form; delete blocked when products are assigned

- [ ] **Step 1: Create category actions**

Create `app/store/admin/categories/actions.ts`:
```typescript
'use server'

import { requireOwner } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function createCategory(name: string) {
  const { tenantId } = await requireOwner()
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const max = await withTenant(tenantId, (db) =>
    db.productCategory.aggregate({ where: { tenantId }, _max: { sortOrder: true } })
  )
  const sortOrder = (max._max.sortOrder ?? -1) + 1

  await withTenant(tenantId, (db) =>
    db.productCategory.create({ data: { tenantId, name, slug, sortOrder } })
  )
  revalidatePath('/admin/categories')
  revalidatePath('/store')
  revalidatePath('/store/shop')
}

export async function updateCategory(id: string, name: string) {
  const { tenantId } = await requireOwner()
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  await withTenant(tenantId, (db) =>
    db.productCategory.update({ where: { id }, data: { name, slug } })
  )
  revalidatePath('/admin/categories')
  revalidatePath('/store/shop')
}

export async function deleteCategory(id: string) {
  const { tenantId } = await requireOwner()
  // Unlink products before deleting
  await withTenant(tenantId, (db) =>
    db.product.updateMany({ where: { tenantId, categoryId: id }, data: { categoryId: null } })
  )
  await withTenant(tenantId, (db) =>
    db.productCategory.delete({ where: { id } })
  )
  revalidatePath('/admin/categories')
}
```

- [ ] **Step 2: Create categories list page**

Create `app/store/admin/categories/page.tsx`:
```typescript
import { requireOwner } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'
import { createCategory, deleteCategory } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminCategoriesPage() {
  const { tenantId } = await requireOwner()
  const categories = await withTenant(tenantId, (db) =>
    db.productCategory.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { products: true } } },
    })
  )

  return (
    <div className="space-y-4 max-w-lg">
      <h1 className="text-2xl font-semibold">Categories</h1>
      <p className="text-sm text-muted-foreground">
        Categories help customers filter your products. Each category is unique to your store.
      </p>
      <div className="space-y-2">
        {categories.map((cat) => (
          <div key={cat.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="text-sm font-medium">{cat.name}</p>
              <p className="text-xs text-muted-foreground">{cat._count.products} products</p>
            </div>
            <form action={async () => { 'use server'; await deleteCategory(cat.id) }}>
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                disabled={cat._count.products > 0}
                title={cat._count.products > 0 ? 'Reassign products first' : 'Delete'}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </form>
          </div>
        ))}
        {categories.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">No categories yet.</p>
        )}
      </div>
      <form
        action={async (fd: FormData) => {
          'use server'
          const name = fd.get('name') as string
          if (name?.trim()) await createCategory(name.trim())
        }}
        className="flex gap-2"
      >
        <Input name="name" placeholder="e.g. Sarees, Cakes, Facials" className="flex-1" />
        <Button type="submit">Add</Button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/store/admin/categories/
git commit -m "feat: add /admin/categories CRUD with tenant-scoped category management"
```

---

### Task 3: Products CRUD

**Files:**
- Create: `app/store/admin/products/page.tsx`
- Create: `app/store/admin/products/new/page.tsx`
- Create: `app/store/admin/products/[id]/page.tsx`
- Create: `app/store/admin/products/actions.ts`
- Create: `components/admin/product-form.tsx`
- Create: `components/admin/image-uploader.tsx`

**Interfaces:**
- Produces: Server Actions `createProduct`, `updateProduct`, `deleteProduct`
- Produces: product list with edit/delete, product form with Cloudinary image upload

- [ ] **Step 1: Create product server actions**

Create `app/store/admin/products/actions.ts`:
```typescript
'use server'

import { requireOwner } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

type ProductInput = {
  name: string
  slug: string
  description?: string
  price: number
  comparePrice?: number
  categoryId?: string
  sizes: string[]
  images: string[]
  stockBySize: Record<string, number>
  isActive: boolean
}

const TIER_LIMITS: Record<string, number> = { trial: 25, starter: 100, pro: Infinity }

export async function createProduct(input: ProductInput) {
  const { tenantId } = await requireOwner()

  // Enforce per-tier product count limit
  const tenant = await withTenant(tenantId, (db) =>
    db.tenant.findUnique({ where: { id: tenantId }, select: { tier: true } })
  )
  const count = await withTenant(tenantId, (db) =>
    db.product.count({ where: { tenantId, isActive: true } })
  )
  const limit = TIER_LIMITS[tenant?.tier ?? 'trial']
  if (count >= limit) {
    throw new Error(`Product limit reached for ${tenant?.tier} plan (${limit} products). Upgrade to add more.`)
  }

  await withTenant(tenantId, (db) =>
    db.product.create({
      data: { ...input, tenantId, price: input.price, comparePrice: input.comparePrice ?? null, categoryId: input.categoryId ?? null },
    })
  )

  // Bust ISR cache for shop page
  revalidatePath('/store')
  revalidatePath('/store/shop')
  redirect('/admin/products')
}

export async function updateProduct(id: string, input: ProductInput) {
  const { tenantId } = await requireOwner()

  await withTenant(tenantId, (db) =>
    db.product.update({
      where: { id },
      data: { ...input, price: input.price, comparePrice: input.comparePrice ?? null, categoryId: input.categoryId ?? null },
    })
  )

  // On-demand revalidation for this product's ISR page
  await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/revalidate?secret=${process.env.REVALIDATE_SECRET}`,
    { method: 'POST', body: JSON.stringify({ slug: input.slug }), headers: { 'Content-Type': 'application/json' } }
  )

  revalidatePath('/store')
  revalidatePath('/store/shop')
  redirect('/admin/products')
}

export async function deleteProduct(id: string, slug: string) {
  const { tenantId } = await requireOwner()

  await withTenant(tenantId, (db) =>
    db.product.update({ where: { id }, data: { isActive: false } })
  )

  await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/revalidate?secret=${process.env.REVALIDATE_SECRET}`,
    { method: 'POST', body: JSON.stringify({ slug }), headers: { 'Content-Type': 'application/json' } }
  )

  revalidatePath('/admin/products')
}
```

Add `NEXT_PUBLIC_SITE_URL` and `REVALIDATE_SECRET` to `.env.local`:
```bash
NEXT_PUBLIC_SITE_URL=https://{store}.{YOUR_DOMAIN}   # set per deployment
REVALIDATE_SECRET=                                     # openssl rand -hex 32
```

- [ ] **Step 2: Create image uploader component**

Create `components/admin/image-uploader.tsx`:
```typescript
'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  images: string[]
  onChange: (images: string[]) => void
}

export function ImageUploader({ images, onChange }: Props) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    setUploading(true)
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!
    const uploadPreset = 'talam_products'

    const uploaded: string[] = []
    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', uploadPreset)

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.secure_url) uploaded.push(data.secure_url)
    }

    onChange([...images, ...uploaded])
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  function removeImage(url: string) {
    onChange(images.filter((img) => img !== url))
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {images.map((url) => (
          <div key={url} className="relative aspect-square rounded-md overflow-hidden bg-muted group">
            <Image src={`${url}?w=200,q_auto,f_auto`} alt="Product" fill className="object-cover" />
            <button
              type="button"
              onClick={() => removeImage(url)}
              className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="aspect-square rounded-md border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-foreground transition-colors disabled:opacity-50"
        >
          <Upload className="h-5 w-5" />
          <span className="text-xs">{uploading ? 'Uploading…' : 'Add'}</span>
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
```

- [ ] **Step 3: Create product form component**

Create `components/admin/product-form.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ImageUploader } from './image-uploader'
import { Badge } from '@/components/ui/badge'
import type { Product } from '@prisma/client'

const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size']

type FormValues = {
  name: string
  slug: string
  description: string
  price: number
  comparePrice: number
  categoryId: string
  isActive: boolean
}

type Props = {
  product?: Product & { category?: { id: string; name: string } | null }
  categories: { id: string; name: string }[]
  onSubmit: (data: FormValues & { images: string[]; sizes: string[]; stockBySize: Record<string, number> }) => void
  loading?: boolean
}

export function ProductForm({ product, categories, onSubmit, loading }: Props) {
  const [images, setImages] = useState<string[]>(product?.images ?? [])
  const [sizes, setSizes] = useState<string[]>(product?.sizes ?? [])
  const [stockBySize, setStockBySize] = useState<Record<string, number>>(
    (product?.stockBySize as Record<string, number>) ?? {}
  )

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormValues>({
    defaultValues: {
      name: product?.name ?? '',
      slug: product?.slug ?? '',
      description: product?.description ?? '',
      price: product ? Number(product.price) : 0,
      comparePrice: product?.comparePrice ? Number(product.comparePrice) : 0,
      categoryId: product?.category?.id ?? '',
      isActive: product?.isActive ?? true,
    },
  })

  // Auto-generate slug from name
  const name = watch('name')
  function handleNameBlur() {
    if (!product) {
      setValue('slug', name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))
    }
  }

  function toggleSize(size: string) {
    setSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    )
  }

  function handleSubmitForm(data: FormValues) {
    onSubmit({ ...data, images, sizes, stockBySize })
  }

  return (
    <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-5 max-w-lg">
      <div className="space-y-1">
        <Label htmlFor="name">Product Name</Label>
        <Input id="name" {...register('name', { required: 'Required' })} onBlur={handleNameBlur} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="slug">URL Slug</Label>
        <Input id="slug" {...register('slug', { required: 'Required', pattern: { value: /^[a-z0-9-]+$/, message: 'Lowercase letters, numbers, hyphens only' } })} />
        {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="price">Price (₹)</Label>
          <Input id="price" type="number" min={0} {...register('price', { required: 'Required', valueAsNumber: true })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="comparePrice">Compare Price (₹)</Label>
          <Input id="comparePrice" type="number" min={0} {...register('comparePrice', { valueAsNumber: true })} />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Category</Label>
        <Select
          value={watch('categoryId') ?? ''}
          onValueChange={(val) => setValue('categoryId', val)}
        >
          <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          <a href="/admin/categories" className="underline">Manage categories →</a>
        </p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" rows={3} {...register('description')} />
      </div>

      <div className="space-y-2">
        <Label>Sizes</Label>
        <div className="flex flex-wrap gap-2">
          {ALL_SIZES.map((size) => (
            <Badge
              key={size}
              variant={sizes.includes(size) ? 'default' : 'outline'}
              className="cursor-pointer select-none"
              onClick={() => toggleSize(size)}
            >
              {size}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Images</Label>
        <ImageUploader images={images} onChange={setImages} />
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? 'Saving…' : product ? 'Update Product' : 'Create Product'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 4: Create products list page**

Create `app/store/admin/products/page.tsx`:
```typescript
import { requireOwner } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { deleteProduct } from './actions'
import { Plus, Pencil } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminProductsPage() {
  const { tenantId } = await requireOwner()

  const products = await withTenant(tenantId, (db) =>
    db.product.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, slug: true, price: true, category: true, isActive: true, images: true },
    })
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Button asChild size="sm">
          <Link href="/admin/products/new"><Plus className="h-4 w-4 mr-1" />Add Product</Link>
        </Button>
      </div>

      <div className="space-y-2">
        {products.map((p) => (
          <div key={p.id} className="flex items-center gap-3 p-3 border rounded-lg">
            {p.images[0] ? (
              <img src={`${p.images[0]}?w=60,q_auto,f_auto`} alt={p.name} className="w-12 h-12 object-cover rounded-md" />
            ) : (
              <div className="w-12 h-12 bg-muted rounded-md" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{p.name}</p>
              <p className="text-xs text-muted-foreground">₹{Number(p.price).toLocaleString('en-IN')}{p.category ? ` · ${p.category}` : ''}</p>
            </div>
            <Badge variant={p.isActive ? 'default' : 'secondary'}>{p.isActive ? 'Active' : 'Inactive'}</Badge>
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/admin/products/${p.id}`}><Pencil className="h-4 w-4" /></Link>
            </Button>
          </div>
        ))}
        {products.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No products yet. Add your first one.</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create new product page**

Create `app/store/admin/products/new/page.tsx`:
```typescript
'use client'

import { useState, useTransition } from 'react'
import { requireOwner } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'
import { ProductFormClient } from './form-client'

export const dynamic = 'force-dynamic'

export default async function NewProductPage() {
  const { tenantId } = await requireOwner()
  const categories = await withTenant(tenantId, (db) =>
    db.productCategory.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true },
    })
  )
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">New Product</h1>
      <ProductFormClient categories={categories} />
    </div>
  )
}
```

Create `app/store/admin/products/new/form-client.tsx`:
```typescript
'use client'
import { useTransition } from 'react'
import { ProductForm } from '@/components/admin/product-form'
import { createProduct } from '../actions'

export function ProductFormClient({ categories }: { categories: { id: string; name: string }[] }) {
  const [isPending, startTransition] = useTransition()
  function handleSubmit(data: Parameters<typeof createProduct>[0]) {
    startTransition(() => createProduct(data))
  }
  return <ProductForm categories={categories} onSubmit={handleSubmit} loading={isPending} />
}
```

- [ ] **Step 6: Create edit product page**

Create `app/store/admin/products/[id]/page.tsx`:
```typescript
import { requireOwner } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { EditProductClient } from './edit-client'

export const dynamic = 'force-dynamic'
// Fetches both the product and tenant categories; passes both to client component

type Props = { params: Promise<{ id: string }> }

export default async function EditProductPage({ params }: Props) {
  const { tenantId } = await requireOwner()
  const { id } = await params

  const product = await withTenant(tenantId, (db) =>
    db.product.findFirst({ where: { id, tenantId } })
  )
  if (!product) notFound()

  const categories = await withTenant(tenantId, (db) =>
    db.productCategory.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true },
    })
  )

  return <EditProductClient product={product} categories={categories} />
}
```

Create `app/store/admin/products/[id]/edit-client.tsx`:
```typescript
'use client'

import { useTransition } from 'react'
import type { Product } from '@prisma/client'
import { ProductForm } from '@/components/admin/product-form'
import { updateProduct, deleteProduct } from '../actions'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

export function EditProductClient({ product, categories }: { product: Product & { category?: { id: string; name: string } | null }; categories: { id: string; name: string }[] }) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(data: Parameters<typeof updateProduct>[1]) {
    startTransition(() => updateProduct(product.id, data))
  }

  function handleDelete() {
    if (!confirm('Delete this product?')) return
    startTransition(() => deleteProduct(product.id, product.slug))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit Product</h1>
        <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>
          <Trash2 className="h-4 w-4 mr-1" />Delete
        </Button>
      </div>
      <ProductForm product={product} categories={categories} onSubmit={handleSubmit} loading={isPending} />
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add app/store/admin/products/ components/admin/
git commit -m "feat: add admin products CRUD with Cloudinary image upload and ISR revalidation"
```

---

### Task 4: Orders Management

**Files:**
- Create: `app/store/admin/orders/page.tsx`
- Create: `app/store/admin/orders/[id]/page.tsx`
- Create: `app/store/admin/orders/actions.ts`

**Interfaces:**
- Produces: order list with status filter, order detail with status update + tracking ID entry

- [ ] **Step 1: Create order management actions**

Create `app/store/admin/orders/actions.ts`:
```typescript
'use server'

import { requireOwner } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function updateOrderStatus(
  orderId: string,
  status: string,
  trackingId?: string
) {
  const { tenantId } = await requireOwner()

  await withTenant(tenantId, (db) =>
    db.order.update({
      where: { id: orderId },
      data: {
        status: status as never,
        ...(trackingId ? { trackingId } : {}),
      },
    })
  )

  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${orderId}`)
}

export async function confirmManualPayment(orderId: string) {
  const { tenantId } = await requireOwner()

  await withTenant(tenantId, (db) =>
    db.order.update({
      where: { id: orderId },
      data: { paymentStatus: 'paid', status: 'confirmed' },
    })
  )

  revalidatePath(`/admin/orders/${orderId}`)
}
```

- [ ] **Step 2: Create orders list page**

Create `app/store/admin/orders/page.tsx`:
```typescript
import { requireOwner } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  confirmed: 'default',
  shipped: 'default',
  delivered: 'outline',
  cancelled: 'destructive',
  returned: 'destructive',
}

export default async function AdminOrdersPage() {
  const { tenantId } = await requireOwner()

  const orders = await withTenant(tenantId, (db) =>
    db.order.findMany({
      where: { tenantId },
      include: { items: { select: { productName: true, quantity: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  )

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Orders</h1>
      <div className="space-y-2">
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/admin/orders/${order.id}`}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div>
              <p className="text-sm font-medium">#{order.id.slice(-8).toUpperCase()}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(order.createdAt).toLocaleDateString('en-IN')} ·{' '}
                {order.items.map((i) => `${i.productName} ×${i.quantity}`).join(', ')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">₹{Number(order.total).toLocaleString('en-IN')}</span>
              <Badge variant={STATUS_COLORS[order.status] ?? 'secondary'}>{order.status}</Badge>
            </div>
          </Link>
        ))}
        {orders.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No orders yet.</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create order detail + management page**

Create `app/store/admin/orders/[id]/page.tsx`:
```typescript
import { requireOwner } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { OrderActions } from './order-actions'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export default async function AdminOrderDetailPage({ params }: Props) {
  const { tenantId } = await requireOwner()
  const { id } = await params

  const order = await withTenant(tenantId, (db) =>
    db.order.findFirst({
      where: { id, tenantId },
      include: { items: true },
    })
  )
  if (!order) notFound()

  const addr = order.shippingAddress as Record<string, string>

  return (
    <div className="max-w-xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Order #{id.slice(-8).toUpperCase()}</h1>
        <Badge>{order.status}</Badge>
      </div>

      <div className="space-y-2">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{item.productName}{item.size ? ` (${item.size})` : ''} ×{item.quantity}</span>
            <span>₹{(Number(item.unitPrice) * item.quantity).toLocaleString('en-IN')}</span>
          </div>
        ))}
        <Separator />
        <div className="flex justify-between font-semibold text-sm">
          <span>Total</span>
          <span>₹{Number(order.total).toLocaleString('en-IN')}</span>
        </div>
      </div>

      <div className="text-sm space-y-0.5">
        <p className="font-medium">Ship to</p>
        <p className="text-muted-foreground">{addr.name} · {addr.phone}</p>
        <p className="text-muted-foreground">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}, {addr.city}, {addr.state} — {addr.pin}</p>
      </div>

      <OrderActions
        orderId={order.id}
        currentStatus={order.status}
        paymentStatus={order.paymentStatus}
        trackingId={order.trackingId ?? ''}
      />
    </div>
  )
}
```

Create `app/store/admin/orders/[id]/order-actions.tsx`:
```typescript
'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { updateOrderStatus, confirmManualPayment } from '../actions'

const STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned']

type Props = {
  orderId: string
  currentStatus: string
  paymentStatus: string
  trackingId: string
}

export function OrderActions({ orderId, currentStatus, paymentStatus, trackingId: initialTracking }: Props) {
  const [status, setStatus] = useState(currentStatus)
  const [tracking, setTracking] = useState(initialTracking)
  const [isPending, startTransition] = useTransition()

  return (
    <div className="space-y-4 border rounded-lg p-4">
      <p className="text-sm font-medium">Update Order</p>

      {paymentStatus !== 'paid' && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => startTransition(() => confirmManualPayment(orderId))}
          disabled={isPending}
        >
          Mark as Paid (UPI Manual)
        </Button>
      )}

      <div className="space-y-1">
        <Label>Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label>Tracking ID (optional)</Label>
        <Input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Enter courier tracking number" />
      </div>

      <Button
        size="sm"
        onClick={() => startTransition(() => updateOrderStatus(orderId, status, tracking || undefined))}
        disabled={isPending}
      >
        {isPending ? 'Saving…' : 'Save Changes'}
      </Button>
    </div>
  )
}
```

Install missing shadcn component:
```bash
npx shadcn@latest add select textarea
```

- [ ] **Step 4: Commit**

```bash
git add app/store/admin/orders/
git commit -m "feat: add admin orders list and detail with status update and tracking ID"
```

---

### Task 5: Customers List

**Files:**
- Create: `app/store/admin/customers/page.tsx`

- [ ] **Step 1: Create customers page**

Create `app/store/admin/customers/page.tsx`:
```typescript
import { requireOwner } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function AdminCustomersPage() {
  const { tenantId } = await requireOwner()

  const customers = await withTenant(tenantId, (db) =>
    db.customer.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, phone: true, email: true, createdAt: true },
    })
  )

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Customers ({customers.length})</h1>
      <div className="space-y-2">
        {customers.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="text-sm font-medium">{c.name ?? 'Anonymous'}</p>
              <p className="text-xs text-muted-foreground">{c.phone ?? c.email ?? '—'}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(c.createdAt).toLocaleDateString('en-IN')}
            </p>
          </div>
        ))}
        {customers.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No customers yet.</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/store/admin/customers/
git commit -m "feat: add admin customers list"
```

---

### Task 5.5: Settings Hub + Sub-Pages

> Per spec §3.2 and §1 changelog: Settings is a hub page linking to 13 sub-routes. All secondary admin features are accessed through Settings, keeping the bottom nav to 4 items.

**Files:**
- Create: `app/store/admin/settings/page.tsx` (hub)
- Create: `app/store/admin/settings/store/page.tsx` + `actions.ts`
- Create: `app/store/admin/settings/brand/page.tsx` + `actions.ts`
- Create: `app/store/admin/settings/payment/page.tsx` + `actions.ts`
- Create: `app/store/admin/settings/whatsapp/page.tsx` + `actions.ts`
- Create: `app/store/admin/settings/delivery/page.tsx` + `actions.ts`
- Create: `app/store/admin/settings/notifications/page.tsx` + `actions.ts`

- [ ] **Step 1: Create Settings hub page**

Create `app/store/admin/settings/page.tsx`:
```typescript
import { requireOwner } from '@/lib/admin-guard'
import Link from 'next/link'
import { ChevronRight, Store, Palette, CreditCard, MessageCircle, Truck, Bell, BookOpen, Star, Tag, Users, DollarSign, CreditCard as BillingIcon, AlertTriangle } from 'lucide-react'

export const dynamic = 'force-dynamic'

const SETTINGS_SECTIONS = [
  {
    title: 'Store',
    items: [
      { href: '/admin/settings/store', label: 'Store Details', desc: 'Name, tagline, contact info', icon: Store },
      { href: '/admin/settings/brand', label: 'Brand', desc: 'Logo and primary color', icon: Palette },
      { href: '/admin/settings/payment', label: 'Payment', desc: 'Gateway configuration', icon: CreditCard },
      { href: '/admin/settings/whatsapp', label: 'WhatsApp', desc: 'Button visibility and number', icon: MessageCircle },
      { href: '/admin/settings/delivery', label: 'Delivery & Trust', desc: 'Shipping, returns, trust badges', icon: Truck },
      { href: '/admin/settings/notifications', label: 'Notifications', desc: 'Email and order alerts', icon: Bell },
    ],
  },
  {
    title: 'Content',
    items: [
      { href: '/admin/about', label: 'About Page', desc: 'Store story, social links, branches', icon: BookOpen },
      { href: '/admin/reviews', label: 'Reviews', desc: 'Moderate product reviews', icon: Star },
      { href: '/admin/categories', label: 'Categories', desc: 'Product categories', icon: Tag },
    ],
  },
  {
    title: 'Business',
    items: [
      { href: '/admin/customers', label: 'Customers', desc: 'Customer list and contacts', icon: Users },
      { href: '/admin/promotions', label: 'Promotions', desc: 'Discount codes and sale banners', icon: Tag },
      { href: '/admin/payouts', label: 'Payouts', desc: 'Settlement history', icon: DollarSign },
      { href: '/admin/billing', label: 'Billing', desc: 'Subscription plan and payment history', icon: BillingIcon },
    ],
  },
  {
    title: 'Danger Zone',
    items: [
      { href: '/admin/settings/danger', label: 'Delete Store', desc: 'Permanently remove your store', icon: AlertTriangle },
    ],
  },
]

export default async function AdminSettingsPage() {
  await requireOwner()

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-semibold">Settings</h1>
      {SETTINGS_SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{section.title}</p>
          <div className="border rounded-lg divide-y overflow-hidden">
            {section.items.map(({ href, label, desc, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create Store Details sub-page**

Create `app/store/admin/settings/store/actions.ts`:
```typescript
'use server'
import { requireOwner } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function updateStoreDetails(input: { name: string; tagline: string; contactPhone: string; contactEmail: string }) {
  const { tenantId } = await requireOwner()
  await withTenant(tenantId, (db) =>
    db.tenant.update({
      where: { id: tenantId },
      data: {
        name: input.name,
        tagline: input.tagline || null,
        contactPhone: input.contactPhone || null,
        contactEmail: input.contactEmail || null,
      },
    })
  )
  revalidatePath('/store')
  revalidatePath('/store/about')
}
```

Create `app/store/admin/settings/store/page.tsx`:
```typescript
import { requireOwner } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'
import { StoreDetailsForm } from './store-details-form'
export const dynamic = 'force-dynamic'

export default async function StoreDetailsPage() {
  const { tenantId } = await requireOwner()
  const tenant = await withTenant(tenantId, (db) =>
    db.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, tagline: true, contactPhone: true, contactEmail: true },
    })
  )
  return (
    <div className="space-y-4 max-w-lg">
      <h1 className="text-xl font-semibold">Store Details</h1>
      <StoreDetailsForm tenant={tenant} />
    </div>
  )
}
```

Create `app/store/admin/settings/store/store-details-form.tsx`:
```typescript
'use client'
import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { updateStoreDetails } from './actions'

type FormValues = { name: string; tagline: string; contactPhone: string; contactEmail: string }

export function StoreDetailsForm({ tenant }: { tenant: Partial<FormValues> | null }) {
  const [isPending, startTransition] = useTransition()
  const { register, handleSubmit } = useForm<FormValues>({ defaultValues: { name: tenant?.name ?? '', tagline: tenant?.tagline ?? '', contactPhone: tenant?.contactPhone ?? '', contactEmail: tenant?.contactEmail ?? '' } })
  return (
    <form onSubmit={handleSubmit((d) => startTransition(() => updateStoreDetails(d)))} className="space-y-4">
      <div className="space-y-1"><Label>Store Name</Label><Input {...register('name', { required: true })} /></div>
      <div className="space-y-1"><Label>Tagline</Label><Input {...register('tagline')} placeholder="Handpicked Indian Fashion…" /></div>
      <div className="space-y-1"><Label>Contact Phone</Label><Input {...register('contactPhone')} inputMode="tel" /></div>
      <div className="space-y-1"><Label>Contact Email</Label><Input {...register('contactEmail')} type="email" /></div>
      <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Save'}</Button>
    </form>
  )
}
```

- [ ] **Step 3: Create Brand sub-page**

Create `app/store/admin/settings/brand/actions.ts`:
```typescript
'use server'
import { requireOwner } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function updateBrand(input: { brandColor: string; logoUrl: string }) {
  const { tenantId } = await requireOwner()
  await withTenant(tenantId, (db) =>
    db.tenant.update({ where: { id: tenantId }, data: { brandColor: input.brandColor || null, logoUrl: input.logoUrl || null } })
  )
  revalidatePath('/store')
}
```

Create `app/store/admin/settings/brand/page.tsx` (similar pattern to store details — form with brandColor color picker and logoUrl input, calls `updateBrand`).

- [ ] **Step 4: Create Delivery & Trust sub-page**

Create `app/store/admin/settings/delivery/actions.ts`:
```typescript
'use server'
import { requireOwner } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function updateDelivery(input: {
  freeDeliveryAbove: string
  shippingFee: string
  deliveryEstimateText: string
  returnWindowDays: string
  trustBadgeText: string
  sizeGuideUrl: string
}) {
  const { tenantId } = await requireOwner()
  await withTenant(tenantId, (db) =>
    db.tenant.update({
      where: { id: tenantId },
      data: {
        freeDeliveryAbove: input.freeDeliveryAbove ? Number(input.freeDeliveryAbove) : null,
        shippingFee: Number(input.shippingFee) || 0,
        deliveryEstimateText: input.deliveryEstimateText || null,
        returnWindowDays: input.returnWindowDays ? Number(input.returnWindowDays) : null,
        trustBadgeText: input.trustBadgeText || null,
        sizeGuideUrl: input.sizeGuideUrl || null,
      },
    })
  )
  revalidatePath('/store/product/[slug]', 'page')
}
```

Create `app/store/admin/settings/delivery/page.tsx` (form with free delivery threshold, shipping fee, delivery estimate text, return window, trust badge text, size guide upload, calls `updateDelivery`).

- [ ] **Step 5: Create WhatsApp sub-page**

Create `app/store/admin/settings/whatsapp/actions.ts`:
```typescript
'use server'
import { requireOwner } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function updateWhatsApp(input: { whatsappNumber: string; showWhatsappButton: boolean }) {
  const { tenantId } = await requireOwner()
  await withTenant(tenantId, (db) =>
    db.tenant.update({ where: { id: tenantId }, data: { whatsappNumber: input.whatsappNumber || null, showWhatsappButton: input.showWhatsappButton } })
  )
  revalidatePath('/store')
}
```

Create `app/store/admin/settings/whatsapp/page.tsx` (form with phone number input and show/hide toggle, calls `updateWhatsApp`).

- [ ] **Step 6: Create Notifications sub-page**

Create `app/store/admin/settings/notifications/actions.ts`:
```typescript
'use server'
import { requireOwner } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function updateNotifications(input: { notifyEmailOnOrder: boolean }) {
  const { tenantId } = await requireOwner()
  await withTenant(tenantId, (db) =>
    db.tenant.update({ where: { id: tenantId }, data: { notifyEmailOnOrder: input.notifyEmailOnOrder } })
  )
  revalidatePath('/admin/settings/notifications')
}
```

Create `app/store/admin/settings/notifications/page.tsx` (toggle for "Email me on new order", calls `updateNotifications`).

- [ ] **Step 7: Commit**

```bash
git add app/store/admin/settings/ app/store/admin/customers/
git commit -m "feat: add settings hub with 13 sub-routes (store details, brand, payment, whatsapp, delivery, notifications)"
```

---

### Task 5.6: `/admin/about` — Store About Page

**Files:**
- Create: `app/store/admin/about/page.tsx`
- Create: `app/store/admin/about/actions.ts`

**Interfaces:**
- Produces: `saveAbout(input)` Server Action
- Produces: form for story title, description, owner photo, social links + branch management

- [ ] **Step 1: Create about actions**

Create `app/store/admin/about/actions.ts`:
```typescript
'use server'
import { requireOwner } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function saveAbout(input: {
  storyTitle: string
  description: string
  ownerPhotoUrl: string
  instagramUrl: string
  facebookUrl: string
  youtubeUrl: string
  googleBusinessUrl: string
}) {
  const { tenantId } = await requireOwner()
  await withTenant(tenantId, (db) =>
    db.storeAbout.upsert({
      where: { tenantId },
      create: { tenantId, ...input },
      update: input,
    })
  )
  revalidatePath('/store/about')
}

export async function addBranch(input: { name: string; address: string; city: string; phone: string; mapsUrl: string }) {
  const { tenantId } = await requireOwner()
  const max = await withTenant(tenantId, (db) =>
    db.storeBranch.aggregate({ where: { tenantId }, _max: { sortOrder: true } })
  )
  await withTenant(tenantId, (db) =>
    db.storeBranch.create({ data: { tenantId, ...input, sortOrder: (max._max.sortOrder ?? -1) + 1 } })
  )
  revalidatePath('/admin/about')
}

export async function deleteBranch(id: string) {
  const { tenantId } = await requireOwner()
  await withTenant(tenantId, (db) => db.storeBranch.delete({ where: { id } }))
  revalidatePath('/admin/about')
}
```

- [ ] **Step 2: Create about admin page**

Create `app/store/admin/about/page.tsx`:
```typescript
import { requireOwner } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'
import { AboutForm } from './about-form'
export const dynamic = 'force-dynamic'

export default async function AdminAboutPage() {
  const { tenantId } = await requireOwner()
  const [about, branches] = await Promise.all([
    withTenant(tenantId, (db) => db.storeAbout.findUnique({ where: { tenantId } })),
    withTenant(tenantId, (db) => db.storeBranch.findMany({ where: { tenantId }, orderBy: { sortOrder: 'asc' } })),
  ])
  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-xl font-semibold">About Page</h1>
      <AboutForm about={about} branches={branches} />
    </div>
  )
}
```

Create `app/store/admin/about/about-form.tsx` (client component: story title, description textarea, owner photo URL, 4 social link inputs, branch list with add/delete, calls `saveAbout`, `addBranch`, `deleteBranch`).

- [ ] **Step 3: Commit**

```bash
git add app/store/admin/about/
git commit -m "feat: add /admin/about for store story, social links, and branch locations"
```

---

### Task 5.7: `/admin/reviews` — Review Moderation

**Files:**
- Create: `app/store/admin/reviews/page.tsx`
- Create: `app/store/admin/reviews/actions.ts`

**Interfaces:**
- Produces: list of all reviews + reported reviews tab
- Produces: `deleteReview(id)` Server Action (soft delete)

- [ ] **Step 1: Create review moderation actions**

Create `app/store/admin/reviews/actions.ts`:
```typescript
'use server'
import { requireOwner } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function deleteReview(reviewId: string) {
  const { tenantId } = await requireOwner()
  await withTenant(tenantId, (db) =>
    db.productReview.update({ where: { id: reviewId }, data: { isDeleted: true } })
  )
  revalidatePath('/admin/reviews')
}
```

- [ ] **Step 2: Create reviews moderation page**

Create `app/store/admin/reviews/page.tsx`:
```typescript
import { requireOwner } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'
import { deleteReview } from './actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Star, Trash2 } from 'lucide-react'
export const dynamic = 'force-dynamic'

export default async function AdminReviewsPage() {
  const { tenantId } = await requireOwner()
  const reviews = await withTenant(tenantId, (db) =>
    db.productReview.findMany({
      where: { tenantId, isDeleted: false },
      include: {
        product: { select: { name: true } },
        reports: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  )

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Reviews</h1>
      <div className="space-y-3">
        {reviews.map((review) => (
          <div key={review.id} className="border rounded-lg p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{review.product.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3 w-3 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
                  ))}
                  {review.isVerifiedPurchase && (
                    <Badge variant="outline" className="text-[10px] ml-1">Verified</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {review.reports.length > 0 && (
                  <Badge variant="destructive" className="text-xs">{review.reports.length} report{review.reports.length !== 1 ? 's' : ''}</Badge>
                )}
                <form action={async () => { 'use server'; await deleteReview(review.id) }}>
                  <Button type="submit" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </div>
            {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
            <p className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleDateString('en-IN')}</p>
          </div>
        ))}
        {reviews.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No reviews yet.</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/store/admin/reviews/
git commit -m "feat: add /admin/reviews moderation with soft delete and report count"
```

---

### Task 6: Promotions — Discount Codes

**Files:**
- Create: `app/store/admin/promotions/page.tsx`
- Create: `app/store/admin/promotions/actions.ts`

**Interfaces:**
- Produces: `createDiscountCode(input)`, `toggleDiscountCode(id, active)` Server Actions
- Produces: list + create form for discount codes; validates code at checkout (Phase 3 stub filled in here)

- [ ] **Step 1: Create promotions server actions**

Create `app/store/admin/promotions/actions.ts`:
```typescript
'use server'

import { requireOwner } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

type DiscountInput = {
  code: string
  type: 'percent' | 'fixed'
  value: number
  minOrder?: number
  usesLimit?: number
  expiresAt?: string
}

export async function createDiscountCode(input: DiscountInput) {
  const { tenantId } = await requireOwner()
  await withTenant(tenantId, (db) =>
    db.discountCode.create({
      data: {
        tenantId,
        code: input.code.toUpperCase(),
        type: input.type,
        value: input.value,
        minOrder: input.minOrder ?? null,
        usesLimit: input.usesLimit ?? null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        isActive: true,
        usesCount: 0,
      },
    })
  )
  revalidatePath('/admin/promotions')
}

export async function toggleDiscountCode(id: string, isActive: boolean) {
  const { tenantId } = await requireOwner()
  await withTenant(tenantId, (db) =>
    db.discountCode.update({ where: { id }, data: { isActive } })
  )
  revalidatePath('/admin/promotions')
}
```

- [ ] **Step 2: Create promotions page**

Create `app/store/admin/promotions/page.tsx`:
```typescript
import { requireOwner } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { PromotionsClient } from './promotions-client'

export const dynamic = 'force-dynamic'

export default async function AdminPromotionsPage() {
  const { tenantId } = await requireOwner()
  const codes = await withTenant(tenantId, (db) =>
    db.discountCode.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    })
  )

  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="text-2xl font-semibold">Discount Codes</h1>
      <div className="space-y-2">
        {codes.map((code) => (
          <div key={code.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="text-sm font-mono font-semibold">{code.code}</p>
              <p className="text-xs text-muted-foreground">
                {code.type === 'percent' ? `${code.value}% off` : `₹${Number(code.value)} off`}
                {code.minOrder ? ` · min ₹${Number(code.minOrder)}` : ''}
                {code.usesLimit ? ` · ${code.usesCount}/${code.usesLimit} uses` : ` · ${code.usesCount} uses`}
              </p>
            </div>
            <Badge variant={code.isActive ? 'default' : 'secondary'}>
              {code.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        ))}
        {codes.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No discount codes yet.</p>
        )}
      </div>
      <PromotionsClient />
    </div>
  )
}
```

Create `app/store/admin/promotions/promotions-client.tsx`:
```typescript
'use client'

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createDiscountCode } from './actions'

export function PromotionsClient() {
  const [type, setType] = useState<'percent' | 'fixed'>('percent')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(() =>
      createDiscountCode({
        code: fd.get('code') as string,
        type,
        value: Number(fd.get('value')),
        minOrder: fd.get('minOrder') ? Number(fd.get('minOrder')) : undefined,
        usesLimit: fd.get('usesLimit') ? Number(fd.get('usesLimit')) : undefined,
        expiresAt: fd.get('expiresAt') as string || undefined,
      })
    )
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-3">
      <p className="text-sm font-medium">Create Discount Code</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1 col-span-2">
          <Label>Code</Label>
          <Input name="code" placeholder="SUMMER20" className="uppercase" required />
        </div>
        <div className="space-y-1">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as 'percent' | 'fixed')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="percent">Percent off</SelectItem>
              <SelectItem value="fixed">Fixed amount</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Value ({type === 'percent' ? '%' : '₹'})</Label>
          <Input name="value" type="number" min={1} required />
        </div>
        <div className="space-y-1">
          <Label>Min Order (₹, optional)</Label>
          <Input name="minOrder" type="number" min={0} />
        </div>
        <div className="space-y-1">
          <Label>Max Uses (optional)</Label>
          <Input name="usesLimit" type="number" min={1} />
        </div>
        <div className="space-y-1 col-span-2">
          <Label>Expires At (optional)</Label>
          <Input name="expiresAt" type="date" />
        </div>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Creating…' : 'Create Code'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/store/admin/promotions/
git commit -m "feat: add promotions page with discount code creation and listing"
```

---

## Phase 5 Verification

```bash
npm test -- --run
```
Expected: All tests pass including admin-guard.test

```bash
npm run build
```
Expected: No TypeScript errors

Manual smoke test:
- [ ] Non-owner visiting `/{store}/admin/dashboard` → redirected to `/auth`
- [ ] Owner visiting `/{store}/admin/dashboard` → sees revenue/order stats
- [ ] Create product → appears in products list, visible in storefront
- [ ] Edit product → product detail page ISR cache busted (on-demand revalidate fires)
- [ ] Admin orders list → all orders visible with status badges
- [ ] Update order status → customer order detail page reflects new status
- [ ] Mark UPI order as paid → paymentStatus updates to `paid`
- [ ] Settings save → store name/color updates on storefront home
