'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, SlidersHorizontal, MoreHorizontal, Plus, X, Image as ImageIcon, CheckSquare, Square, Pencil, Trash2, Power, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog } from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'
import {
  Attachment,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentActions,
  AttachmentAction,
  AttachmentTrigger,
} from '@/components/ui/attachment'
import type { AdminProduct, CategoryMeta, ProductInput, ProductSpec, ProductUnit } from '@/lib/data/products'
import {
  createProductAction,
  updateProductAction,
  updateProductOccasionsAction,
  uploadProductImageAction,
  setProductActiveAction,
  bulkAssignToOccasionAction,
  bulkSetCategoryAction,
  bulkSetActiveAction,
  bulkDeleteAction,
  bulkResetToDefaultAction,
} from './actions'
import { BATCH_ACTIONS, type BatchAction } from './batch-actions'

type OccasionOption = { id: string; name: string; emoji: string | null }

// ponytail: heuristic name match, not a schema flag — this only pre-fills a starting point the
// admin can freely edit/remove, so it doesn't need to be a durable per-category fact.
function defaultSpecsFor(categoryName: string | undefined): ProductSpec[] {
  const name = (categoryName ?? '').toLowerCase()
  if (name.includes('saree')) {
    return [
      { label: 'Fabric', value: '' },
      { label: 'Length', value: '' },
      { label: 'Blouse Piece', value: '' },
      { label: 'Wash Care', value: '' },
    ]
  }
  return [
    { label: 'Fabric', value: '' },
    { label: 'Fit', value: '' },
    { label: 'Wash Care', value: '' },
  ]
}

type StockFilter = 'in_stock' | 'low' | 'out'
type SortKey = 'newest' | 'price_asc' | 'price_desc'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest First' },
  { key: 'price_asc', label: 'Price: Low to High' },
  { key: 'price_desc', label: 'Price: High to Low' },
]

const STOCK_OPTIONS: { key: StockFilter; label: string }[] = [
  { key: 'in_stock', label: 'In Stock' },
  { key: 'low', label: 'Low Stock' },
  { key: 'out', label: 'Out of Stock' },
]

const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const SWATCHES = [
  { bg: 'bg-[#FBEAE3]', icon: 'text-brand-primary' },
  { bg: 'bg-[#FEF3C7]', icon: 'text-amber' },
  { bg: 'bg-[#DBEAFE]', icon: 'text-brand-primary' },
]

function BagIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  )
}

function stockInfo(stockBySize: Record<string, number>) {
  const total = Object.values(stockBySize).reduce((s, n) => s + n, 0)
  if (total === 0) return { filter: 'out' as StockFilter, label: 'Out of stock', color: 'text-danger' }
  if (total <= 5) return { filter: 'low' as StockFilter, label: `Low (${total})`, color: 'text-amber' }
  return { filter: 'in_stock' as StockFilter, label: 'In stock', color: 'text-success' }
}

/* ── Filter chips ── */

type ActiveFilter = { key: string; label: string }

function FilterChips({ filters, onRemove, onClearAll }: { filters: ActiveFilter[]; onRemove: (key: string) => void; onClearAll: () => void }) {
  if (filters.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 pb-3 md:px-0">
      {filters.map((f) => (
        <button key={f.key} onClick={() => onRemove(f.key)} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-fg shadow-sm transition-colors hover:bg-bg">
          {f.label}
          <X className="size-3 text-muted-warm" />
        </button>
      ))}
      <button onClick={onClearAll} className="cursor-pointer text-xs font-semibold text-brand-primary">Clear all</button>
    </div>
  )
}

/* ── Desktop sidebar filter panel ── */

function DesktopFilters({
  stockFilters, sort, priceMin, priceMax,
  onToggleStock, onSetSort, onPriceMin, onPriceMax, onReset,
}: {
  stockFilters: Set<StockFilter>; sort: SortKey
  priceMin: string; priceMax: string
  onToggleStock: (k: StockFilter) => void
  onSetSort: (k: SortKey) => void; onPriceMin: (v: string) => void; onPriceMax: (v: string) => void
  onReset: () => void
}) {
  return (
    <aside className="hidden w-[240px] shrink-0 md:block">
      <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-bold uppercase tracking-[0.06em] text-fg">Filters</p>
          <button onClick={onReset} className="cursor-pointer text-xs font-semibold text-brand-primary">Reset</button>
        </div>

        <div className="mb-5">
          <p className="mb-2 text-2xs font-bold uppercase tracking-[0.06em] text-muted-warm">Sort By</p>
          {SORT_OPTIONS.map((o) => (
            <label key={o.key} className="flex cursor-pointer items-center gap-2.5 py-1.5 text-sm text-fg">
              <input type="radio" name="sort" checked={sort === o.key} onChange={() => onSetSort(o.key)} className="size-4 accent-brand-primary" />
              {o.label}
            </label>
          ))}
        </div>

        <div className="mb-5">
          <p className="mb-2 text-2xs font-bold uppercase tracking-[0.06em] text-muted-warm">Price Range</p>
          <div className="flex items-center gap-2">
            <input value={priceMin} onChange={(e) => onPriceMin(e.target.value)} placeholder="Min" className="w-full rounded-lg border border-border bg-bg px-2.5 py-2 text-sm outline-none focus:border-brand-primary focus:bg-surface" />
            <span className="text-muted-warm">–</span>
            <input value={priceMax} onChange={(e) => onPriceMax(e.target.value)} placeholder="Max" className="w-full rounded-lg border border-border bg-bg px-2.5 py-2 text-sm outline-none focus:border-brand-primary focus:bg-surface" />
          </div>
        </div>

        <div>
          <p className="mb-2 text-2xs font-bold uppercase tracking-[0.06em] text-muted-warm">Stock Status</p>
          {STOCK_OPTIONS.map((o) => (
            <label key={o.key} className="flex cursor-pointer items-center gap-2.5 py-1.5 text-sm text-fg">
              <input type="checkbox" checked={stockFilters.has(o.key)} onChange={() => onToggleStock(o.key)} className="size-4 rounded border-border accent-brand-primary" />
              {o.label}
            </label>
          ))}
        </div>
      </div>
    </aside>
  )
}

/* ── Mobile filter bottom sheet ── */

function MobileFilterSheet({
  open, onClose,
  stockFilters, sort, priceMin, priceMax,
  onToggleStock, onSetSort, onPriceMin, onPriceMax, onReset, onApply,
}: {
  open: boolean; onClose: () => void
  stockFilters: Set<StockFilter>; sort: SortKey
  priceMin: string; priceMax: string
  onToggleStock: (k: StockFilter) => void
  onSetSort: (k: SortKey) => void; onPriceMin: (v: string) => void; onPriceMax: (v: string) => void
  onReset: () => void; onApply: () => void
}) {
  return (
    <Dialog open={open} onClose={onClose}>
      <div className="flex max-h-[85vh] flex-col">
        <div className="flex shrink-0 items-center justify-between border-b border-border p-4">
          <span className="text-lg font-bold text-fg">Filters</span>
          <button onClick={onReset} className="cursor-pointer text-sm font-semibold text-brand-primary">Reset</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="mb-5">
            <p className="mb-2 text-2xs font-bold uppercase tracking-[0.06em] text-muted-warm">Sort By</p>
            {SORT_OPTIONS.map((o) => (
              <label key={o.key} className="flex cursor-pointer items-center gap-2.5 py-2 text-sm text-fg">
                <input type="radio" name="mobileSort" checked={sort === o.key} onChange={() => onSetSort(o.key)} className="size-4 accent-brand-primary" />
                {o.label}
              </label>
            ))}
          </div>

          <div className="mb-5">
            <p className="mb-2 text-2xs font-bold uppercase tracking-[0.06em] text-muted-warm">Price Range</p>
            <div className="flex items-center gap-2">
              <input value={priceMin} onChange={(e) => onPriceMin(e.target.value)} placeholder="Min" className="w-full rounded-lg border border-border bg-bg px-3 py-[11px] text-sm outline-none focus:border-brand-primary focus:bg-surface" />
              <span className="text-muted-warm">–</span>
              <input value={priceMax} onChange={(e) => onPriceMax(e.target.value)} placeholder="Max" className="w-full rounded-lg border border-border bg-bg px-3 py-[11px] text-sm outline-none focus:border-brand-primary focus:bg-surface" />
            </div>
          </div>

          <div>
            <p className="mb-2 text-2xs font-bold uppercase tracking-[0.06em] text-muted-warm">Stock Status</p>
            {STOCK_OPTIONS.map((o) => (
              <label key={o.key} className="flex cursor-pointer items-center gap-2.5 py-2 text-sm text-fg">
                <input type="checkbox" checked={stockFilters.has(o.key)} onChange={() => onToggleStock(o.key)} className="size-4 rounded border-border accent-brand-primary" />
                {o.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 gap-3 border-t border-border p-4">
          <button onClick={onClose} className="grow cursor-pointer rounded-lg border border-border py-3 text-sm font-semibold text-fg transition-colors active:bg-bg">Cancel</button>
          <button onClick={onApply} className="grow cursor-pointer rounded-lg bg-brand-primary py-3 text-sm font-semibold text-surface transition-transform active:scale-[0.98]">Apply Filters</button>
        </div>
      </div>
    </Dialog>
  )
}

/* ── Per-row "..." menu ── */

function ProductRowMenu({ product, onEdit, onToggleActive, onDelete }: {
  product: AdminProduct; onEdit: () => void; onToggleActive: () => void; onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border transition-colors hover:bg-bg"
      >
        <MoreHorizontal className="size-4 text-muted-warm" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-[180px] rounded-lg border border-border bg-surface py-1 shadow-lg">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit() }}
            className="flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-fg hover:bg-bg"
          >
            <Pencil className="size-4 text-muted-warm" /> Edit Product
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setOpen(false); onToggleActive() }}
            className="flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-fg hover:bg-bg"
          >
            <Power className="size-4 text-muted-warm" /> {product.isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete() }}
            className="flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-danger hover:bg-danger/10"
          >
            <Trash2 className="size-4" /> Delete Product
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Product editor modal (Add / Edit) ── */

function ProductEditor({
  open, onClose, editProduct, categories, occasions,
}: {
  open: boolean; onClose: () => void; editProduct: AdminProduct | null; categories: CategoryMeta[]; occasions: OccasionOption[]
}) {
  if (!open) return null
  return (
    <ProductEditorForm
      key={editProduct?.id ?? 'new'}
      onClose={onClose}
      editProduct={editProduct}
      categories={categories}
      occasions={occasions}
    />
  )
}

function ProductEditorForm({
  onClose, editProduct, categories, occasions,
}: {
  onClose: () => void; editProduct: AdminProduct | null; categories: CategoryMeta[]; occasions: OccasionOption[]
}) {
  const router = useRouter()
  const [unit, setUnit] = useState<ProductUnit>(editProduct?.unit ?? 'piece')
  const [selectedSizes, setSelectedSizes] = useState<string[]>(editProduct?.sizes ?? [])
  // Default on for new products (most items — sarees, unstitched fabric — are one-size);
  // an existing product already carrying real sizes starts unchecked so editing doesn't wipe them.
  const [noSize, setNoSize] = useState(() => !editProduct || editProduct.sizes.every((s) => s === 'Free Size'))
  const [sizeQuantities, setSizeQuantities] = useState<Record<string, string>>(
    () => Object.fromEntries((editProduct?.sizes ?? []).map((s) => [s, String(editProduct?.stockBySize[s] ?? '')]))
  )
  const [images, setImages] = useState<string[]>(editProduct?.images ?? [])
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>(editProduct?.occasionIds ?? [])
  const [specs, setSpecs] = useState<ProductSpec[]>(editProduct?.specifications ?? [])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sizesOpen, setSizesOpen] = useState(false)
  const sizesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sizesOpen) return
    const handler = (e: MouseEvent) => {
      if (sizesRef.current && !sizesRef.current.contains(e.target as Node)) setSizesOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [sizesOpen])

  const isEdit = editProduct !== null
  const title = isEdit ? 'Edit Product' : 'Add New Product'
  const submitLabel = isEdit ? 'Save Changes' : 'Add Product'

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    setUploading(true)
    setError(null)
    try {
      const urls = await Promise.all(Array.from(fileList).map((file) => uploadProductImageAction(file)))
      setImages((prev) => [...prev, ...urls].slice(0, 5))
    } catch {
      setError('Image upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    // No sizes selected → unstitched/one-size item (e.g. sarees, sold by length). Matches the
    // 'Free Size' convention prisma/seed.ts and onboarding already use for sizeless products,
    // so the storefront's existing sizeless handling (add-to-cart-button, checkout-pricing) just works.
    // Sold-by-meter items are inherently one-size, regardless of the checkbox state.
    const hasSizes = unit === 'piece' && !noSize && selectedSizes.length > 0
    const freeSizeQuantity = Number(formData.get('quantity') ?? 0)
    const stockBySize = hasSizes
      ? Object.fromEntries(selectedSizes.map((s) => [s, Number(sizeQuantities[s] ?? 0)]))
      : { 'Free Size': freeSizeQuantity }
    const input: ProductInput = {
      name: String(formData.get('name') ?? '').trim(),
      description: String(formData.get('description') ?? '').trim() || null,
      price: Number(formData.get('price') ?? 0),
      comparePrice: formData.get('comparePrice') ? Number(formData.get('comparePrice')) : null,
      categoryId: String(formData.get('categoryId') ?? '') || null,
      sizes: hasSizes ? selectedSizes : ['Free Size'],
      unit,
      images,
      stockBySize,
      specifications: specs.filter((s) => s.label.trim() || s.value.trim()),
      // Blank stays null rather than becoming 0: it means "use the store's default shipping
      // weight", and a 0kg parcel would make every courier quote nonsense.
      weight: formData.get('weight') ? Number(formData.get('weight')) : null,
    }

    if (!input.name || images.length === 0) {
      setError('Product name and at least one photo are required.')
      return
    }
    if (input.comparePrice !== null && input.comparePrice <= input.price) {
      setError('Original price must be greater than the selling price.')
      return
    }
    if (hasSizes ? selectedSizes.some((s) => Number(sizeQuantities[s] ?? 0) <= 0) : freeSizeQuantity <= 0) {
      setError(hasSizes ? 'Enter a quantity for every selected size.' : 'Quantity must be at least 1.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      let productId: string
      if (isEdit) {
        productId = editProduct.id
        await updateProductAction(editProduct.id, input)
      } else {
        const created = await createProductAction(input)
        productId = created.id
        if (created.readyToGoLive) {
          toast.success('You have 3+ products!', { description: 'Click Go Live in the header to enable your store.' })
        }
      }
      await updateProductOccasionsAction(productId, selectedOccasions)
      router.refresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong saving the product. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={onClose} className="md:max-w-[560px]">
      <div className="flex max-h-[80vh] flex-col md:max-h-[85vh]">
        <div className="flex shrink-0 items-center justify-between border-b border-border p-4">
          <span className="text-base font-bold text-fg">{title}</span>
          <button onClick={onClose} className="cursor-pointer transition-transform active:scale-90"><X className="size-6 text-muted-warm" /></button>
        </div>

        <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <form id="product-form" className="flex flex-col gap-5 p-4" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</div>
            )}

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-fg">Product Name *</span>
              <input name="name" required defaultValue={editProduct?.name ?? ''} className="rounded-lg border border-border bg-bg px-3 py-[11px] text-md outline-none transition-colors focus:border-brand-primary focus:bg-surface" placeholder="e.g., Premium Cotton Kurta Set" />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-fg">Description</span>
              <textarea name="description" defaultValue={editProduct?.description ?? ''} className="h-[100px] resize-none rounded-lg border border-border bg-bg px-3 py-[11px] text-md outline-none transition-colors focus:border-brand-primary focus:bg-surface" placeholder="Add product details, features, care instructions, fabric information..." />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-fg">Category *</span>
              <select
                name="categoryId"
                required
                defaultValue={editProduct?.categoryId ?? ''}
                onChange={(e) => {
                  if (isEdit || specs.length > 0) return
                  const category = categories.find((c) => c.id === e.target.value)
                  setSpecs(defaultSpecsFor(category?.name))
                }}
                className="cursor-pointer rounded-lg border border-border bg-bg px-3 py-[11px] text-md outline-none transition-colors focus:border-brand-primary focus:bg-surface"
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-bold text-fg">Selling Price *</span>
                <div className="flex">
                  <span className="flex items-center rounded-l-lg border border-r-0 border-border bg-bg px-3 text-sm text-muted-warm">₹</span>
                  <input name="price" required type="number" min="0" step="0.01" defaultValue={editProduct?.price ?? ''} className="grow rounded-r-lg border border-border bg-bg px-3 py-[11px] text-md outline-none transition-colors focus:border-brand-primary focus:bg-surface" placeholder="999" />
                </div>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-bold text-fg">Original Price (MRP)</span>
                <div className="flex">
                  <span className="flex items-center rounded-l-lg border border-r-0 border-border bg-bg px-3 text-sm text-muted-warm">₹</span>
                  <input name="comparePrice" type="number" min="0" step="0.01" defaultValue={editProduct?.comparePrice ?? ''} className="grow rounded-r-lg border border-border bg-bg px-3 py-[11px] text-md outline-none transition-colors focus:border-brand-primary focus:bg-surface" placeholder="1,299" />
                </div>
              </label>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-fg">Shipping Weight</span>
              <div className="flex">
                <input name="weight" type="number" min="0" step="0.001" defaultValue={editProduct?.weight ?? ''} className="grow rounded-l-lg border border-r-0 border-border bg-bg px-3 py-[11px] text-md outline-none transition-colors focus:border-brand-primary focus:bg-surface" placeholder="0.5" />
                <span className="flex items-center rounded-r-lg border border-border bg-bg px-3 text-sm text-muted-warm">kg</span>
              </div>
              <span className="text-xs text-muted-warm">Optional — your store&apos;s default weight is used when this is blank.</span>
            </label>

            {!noSize && selectedSizes.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-bold text-fg">Quantity per size *</span>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {selectedSizes.map((size) => (
                    <label key={size} className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-muted-warm">{size}</span>
                      <input
                        type="number"
                        min="1"
                        value={sizeQuantities[size] ?? ''}
                        onChange={(e) => setSizeQuantities((prev) => ({ ...prev, [size]: e.target.value }))}
                        className="rounded-lg border border-border bg-bg px-3 py-2.25 text-md outline-none transition-colors focus:border-brand-primary focus:bg-surface"
                        placeholder="25"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <label className="flex flex-col gap-1.5 md:w-1/2 md:pr-1.5">
                <span className="text-sm font-bold text-fg">Quantity *</span>
                <input name="quantity" required type="number" min="1" defaultValue={isEdit ? (editProduct.sizes[0] ? editProduct.stockBySize[editProduct.sizes[0]] : '') : ''} className="rounded-lg border border-border bg-bg px-3 py-[11px] text-md outline-none transition-colors focus:border-brand-primary focus:bg-surface" placeholder="e.g., 25" />
              </label>
            )}

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-fg">Product Pictures * (Min 1, Max 5)</span>
              <AttachmentGroup>
                {images.map((src, i) => (
                  <Attachment key={i} orientation="vertical" size="default" className="w-40">
                    <AttachmentMedia variant="image" onClick={() => setPreviewSrc(src)} className="cursor-pointer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" />
                    </AttachmentMedia>
                    <AttachmentActions>
                      <AttachmentAction type="button" onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}>
                        <X />
                      </AttachmentAction>
                    </AttachmentActions>
                  </Attachment>
                ))}
                {images.length < 5 && (
                  <Attachment orientation="vertical" size="default" className="w-40" state={uploading ? 'uploading' : 'idle'}>
                    <AttachmentTrigger
                      render={<label />}
                      aria-disabled={uploading}
                    >
                      <input type="file" accept="image/*" multiple disabled={uploading} className="sr-only" onChange={(e) => handleFiles(e.target.files)} />
                    </AttachmentTrigger>
                    <AttachmentMedia>
                      <ImageIcon />
                    </AttachmentMedia>
                    <AttachmentContent>
                      <AttachmentTitle>{uploading ? 'Uploading…' : 'Add photo'}</AttachmentTitle>
                      <AttachmentDescription>PNG, JPG up to 5MB</AttachmentDescription>
                    </AttachmentContent>
                  </Attachment>
                )}
              </AttachmentGroup>
              {previewSrc && (
                <Dialog open onClose={() => setPreviewSrc(null)} className="max-w-2xl" position="center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewSrc} alt="" className="max-h-[80vh] w-full rounded-2xl object-contain" />
                </Dialog>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-fg">Sold As</span>
              <div className="flex gap-2">
                {(['piece', 'meter'] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnit(u)}
                    className={`rounded-lg border px-4 py-2 text-sm font-semibold capitalize transition-colors ${
                      unit === u ? 'border-brand-primary bg-brand-primary/10 text-brand-primary' : 'border-border text-muted-warm'
                    }`}
                  >
                    {u === 'piece' ? 'Pieces' : 'Meters'}
                  </button>
                ))}
              </div>
            </div>

            {unit === 'meter' ? (
              <p className="rounded-lg bg-bg px-3 py-2.5 text-xs text-muted-warm">
                Sold as one continuous piece, measured in meters — no sizes needed.
              </p>
            ) : (
            <div className="relative flex flex-col gap-1.5" ref={sizesRef}>
              <span className="text-sm font-bold text-fg">Sizes Available</span>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-fg">
                <input
                  type="checkbox"
                  checked={noSize}
                  onChange={(e) => {
                    setNoSize(e.target.checked)
                    if (e.target.checked) {
                      setSelectedSizes([])
                      setSizesOpen(false)
                    }
                  }}
                  className="size-4 rounded border-border accent-brand-primary"
                />
                No size (one-size item, e.g. sarees or unstitched fabric)
              </label>

              {!noSize && (
                <>
                  <button
                    type="button"
                    onClick={() => setSizesOpen((v) => !v)}
                    className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-bg px-3 py-[11px] text-md text-fg outline-none transition-colors focus:border-brand-primary focus:bg-surface"
                  >
                    <span className={selectedSizes.length === 0 ? 'text-muted-warm' : ''}>
                      {selectedSizes.length === 0 ? 'Select sizes' : selectedSizes.join(', ')}
                    </span>
                    <ChevronDown className={`size-4 shrink-0 text-muted-warm transition-transform ${sizesOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {sizesOpen && (
                    <div className="absolute top-full z-20 mt-1 w-full rounded-lg border border-border bg-surface p-2 shadow-lg">
                      <div className="mb-1 flex items-center justify-between px-1">
                        <button type="button" onClick={() => setSelectedSizes(ALL_SIZES)} className="cursor-pointer text-xs font-semibold text-brand-primary">Select all</button>
                        <button type="button" onClick={() => setSelectedSizes([])} className="cursor-pointer text-xs font-semibold text-muted-warm">Clear</button>
                      </div>
                      {ALL_SIZES.map((size) => (
                        <label key={size} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-fg hover:bg-bg">
                          <input type="checkbox" checked={selectedSizes.includes(size)} onChange={() => setSelectedSizes((prev) => prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size])} className="size-4 rounded border-border accent-brand-primary" />
                          {size}
                        </label>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            )}

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-fg">Occasions</span>
              <div className="flex flex-wrap gap-2">
                {occasions.map((o) => (
                  <label key={o.id} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-fg has-[:checked]:border-brand-primary has-[:checked]:bg-brand-primary/10">
                    <input
                      type="checkbox"
                      checked={selectedOccasions.includes(o.id)}
                      onChange={() => setSelectedOccasions((prev) => prev.includes(o.id) ? prev.filter((id) => id !== o.id) : [...prev, o.id])}
                      className="size-4 rounded border-border accent-brand-primary"
                    />
                    {o.emoji || '🎉'} {o.name}
                  </label>
                ))}
                {occasions.length === 0 && <p className="text-sm text-muted-warm">No occasions yet — create one under Occasions.</p>}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-fg">Product Specifications</span>
              <span className="text-xs text-muted-warm">Shown on the product page. Pick a category above for a starting template.</span>
              <div className="flex flex-col gap-2">
                {specs.map((spec, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={spec.label}
                      onChange={(e) => setSpecs((prev) => prev.map((s, j) => (j === i ? { ...s, label: e.target.value } : s)))}
                      placeholder="Label, e.g. Fabric"
                      className="w-2/5 rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none transition-colors focus:border-brand-primary focus:bg-surface"
                    />
                    <input
                      value={spec.value}
                      onChange={(e) => setSpecs((prev) => prev.map((s, j) => (j === i ? { ...s, value: e.target.value } : s)))}
                      placeholder="Value, e.g. Pure Silk"
                      className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none transition-colors focus:border-brand-primary focus:bg-surface"
                    />
                    <button type="button" onClick={() => setSpecs((prev) => prev.filter((_, j) => j !== i))} className="cursor-pointer text-muted-warm hover:text-danger">
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setSpecs((prev) => [...prev, { label: '', value: '' }])}
                  className="flex w-fit cursor-pointer items-center gap-1.5 text-sm font-semibold text-brand-primary"
                >
                  <Plus className="size-4" /> Add spec
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="flex shrink-0 gap-3 border-t border-border p-4">
          <button type="button" onClick={onClose} className="grow cursor-pointer rounded-lg border border-border py-3 text-md font-semibold text-fg transition-colors active:bg-bg">Cancel</button>
          <button form="product-form" type="submit" disabled={saving || uploading} className="grow cursor-pointer rounded-lg bg-brand-primary py-3 text-md font-semibold text-surface transition-transform active:scale-[0.98] disabled:opacity-60">
            {saving ? 'Saving…' : submitLabel}
          </button>
        </div>
      </div>
    </Dialog>
  )
}

/* ── Main page ── */

export function AdminProductsClient({ products, categories, occasions }: { products: AdminProduct[]; categories: CategoryMeta[]; occasions: OccasionOption[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [stockFilters, setStockFilters] = useState<Set<StockFilter>>(new Set())
  const [sort, setSort] = useState<SortKey>('newest')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<AdminProduct | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pickerAction, setPickerAction] = useState<BatchAction | null>(null)
  const [pickerBusy, setPickerBusy] = useState(false)

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function clearSelection() {
    setSelected(new Set())
  }

  function toggleStock(k: StockFilter) { setStockFilters(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n }) }

  function resetFilters() {
    setStockFilters(new Set()); setSort('newest'); setPriceMin(''); setPriceMax('')
  }

  const activeFilters: ActiveFilter[] = Array.from(stockFilters).map(k => ({ key: `stock-${k}`, label: STOCK_OPTIONS.find(o => o.key === k)!.label }))

  function removeChip(key: string) {
    if (key.startsWith('stock-')) { const k = key.slice(6) as StockFilter; setStockFilters(prev => { const n = new Set(prev); n.delete(k); return n }) }
  }

  const filtered = products
    .filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
      if (stockFilters.size > 0 && !stockFilters.has(stockInfo(p.stockBySize).filter)) return false
      if (priceMin && p.price < Number(priceMin)) return false
      if (priceMax && p.price > Number(priceMax)) return false
      return true
    })
    .sort((a, b) => {
      if (sort === 'price_asc') return a.price - b.price
      if (sort === 'price_desc') return b.price - a.price
      return 0
    })

  function selectAllVisible() {
    setSelected(new Set(filtered.map((p) => p.id)))
  }

  function selectByCategory(categoryId: string) {
    setSelected(new Set(filtered.filter((p) => p.categoryId === categoryId).map((p) => p.id)))
  }

  async function runBatchAction(action: BatchAction, extra?: { occasionId?: string; categoryId?: string | null }) {
    const ids = [...selected]
    if (ids.length === 0) return

    try {
      if (action.id === 'assign-occasion' && extra?.occasionId) {
        const result = await bulkAssignToOccasionAction(extra.occasionId, ids)
        if (result.error) {
          window.alert(result.error)
          return
        }
      } else if (action.id === 'change-category') {
        await bulkSetCategoryAction(ids, extra?.categoryId ?? null)
      } else if (action.id === 'set-active') {
        await bulkSetActiveAction(ids, true)
      } else if (action.id === 'set-inactive') {
        await bulkSetActiveAction(ids, false)
      } else if (action.id === 'reset-default') {
        await bulkResetToDefaultAction(ids)
      } else if (action.id === 'delete') {
        await bulkDeleteAction(ids)
      }
    } catch {
      window.alert('Something went wrong. Please try again.')
      return
    }

    clearSelection()
    router.refresh()
  }

  async function handleBatchActionClick(action: BatchAction) {
    if (action.kind === 'occasion-picker' || action.kind === 'category-picker') {
      setPickerAction(action)
      return
    }
    if (action.kind === 'confirm') {
      if (!window.confirm(`${action.confirmText!.title}\n\n${action.confirmText!.body}`)) return
    }
    await runBatchAction(action)
  }

  function openAdd() { setEditProduct(null); setEditorOpen(true) }
  function openEdit(p: AdminProduct) { setEditProduct(p); setEditorOpen(true) }
  async function toggleActive(p: AdminProduct) {
    await setProductActiveAction(p.id, !p.isActive)
    router.refresh()
  }
  async function deleteProduct(p: AdminProduct) {
    if (!window.confirm(`Delete "${p.name}"? This can't be undone.`)) return
    await bulkDeleteAction([p.id])
    router.refresh()
  }

  return (
    <div className="px-4 pb-24 md:px-0 md:pb-0">

      {/* Search + filter button */}
      <div className="flex items-center gap-2 pb-3">
        <div className="flex h-10 grow items-center gap-2 rounded-lg border border-border bg-surface px-3 shadow-sm">
          <Search className="size-[18px] text-muted-warm" />
          <input className="grow bg-transparent text-md outline-none placeholder:text-muted-warm" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select
          onChange={(e) => { if (e.target.value) selectByCategory(e.target.value); e.target.value = '' }}
          defaultValue=""
          className="hidden h-10 cursor-pointer rounded-lg border border-border bg-surface px-2 text-sm text-muted-warm outline-none md:block"
        >
          <option value="" disabled>Select by category…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button onClick={() => setMobileFilterOpen(true)} className="flex size-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface shadow-sm transition-colors hover:bg-bg md:hidden">
          <SlidersHorizontal className="size-[18px] text-muted-warm" />
        </button>
      </div>

      {/* Count */}
      <div className="flex items-center justify-between pb-2">
        <span className="text-sm text-muted-warm">{filtered.length} product{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Filter chips */}
      <FilterChips filters={activeFilters} onRemove={removeChip} onClearAll={resetFilters} />

      {/* Desktop: sidebar + table */}
      <div className="md:flex md:gap-8">
        <DesktopFilters
          stockFilters={stockFilters} sort={sort}
          priceMin={priceMin} priceMax={priceMax}
          onToggleStock={toggleStock} onSetSort={setSort}
          onPriceMin={setPriceMin} onPriceMax={setPriceMax} onReset={resetFilters}
        />

        <div className="min-w-0 flex-1">
          {/* Desktop table */}
          <div className="hidden md:block">
            <div className="grid grid-cols-[auto_2fr_1fr_1fr_1fr_auto] gap-x-4 border-b border-border pb-2 text-2xs font-bold uppercase tracking-[0.06em] text-muted-warm">
              <button onClick={selected.size === filtered.length && filtered.length > 0 ? clearSelection : selectAllVisible} className="flex size-5 cursor-pointer items-center justify-center">
                {selected.size === filtered.length && filtered.length > 0 ? <CheckSquare className="size-4 text-brand-primary" /> : <Square className="size-4 text-border" />}
              </button>
              <span>Product Name</span>
              <span>Price</span>
              <span>Stock</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {filtered.map((p, i) => {
              const stock = stockInfo(p.stockBySize)
              const swatch = SWATCHES[i % SWATCHES.length]
              return (
                <div key={p.id} className="grid cursor-pointer grid-cols-[auto_2fr_1fr_1fr_1fr_auto] items-center gap-x-4 border-b border-border-light py-3 transition-colors hover:bg-bg" onClick={() => openEdit(p)}>
                  <button onClick={(e) => { e.stopPropagation(); toggleSelected(p.id) }} className="flex size-5 cursor-pointer items-center justify-center">
                    {selected.has(p.id) ? <CheckSquare className="size-4 text-brand-primary" /> : <Square className="size-4 text-border" />}
                  </button>
                  <div className="flex items-center gap-3">
                    <div className={`flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg ${swatch.bg}`}>
                      {p.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.images[0]} alt="" className="size-full object-cover" />
                      ) : (
                        <BagIcon className={`size-5 ${swatch.icon}`} />
                      )}
                    </div>
                    <span className="truncate text-sm font-semibold text-fg">{p.name}</span>
                  </div>
                  <span className="text-sm text-fg">{formatCurrency(p.price)}</span>
                  <span className={`text-sm font-semibold ${stock.color}`}>{stock.label}</span>
                  <span className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-2xs font-semibold ${p.isActive ? 'bg-success/10 text-success' : 'bg-muted-warm/10 text-muted-warm'}`}>{p.isActive ? 'Active' : 'Inactive'}</span>
                  <div onClick={(e) => e.stopPropagation()}>
                    <ProductRowMenu product={p} onEdit={() => openEdit(p)} onToggleActive={() => toggleActive(p)} onDelete={() => deleteProduct(p)} />
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && <p className="py-12 text-center text-sm text-muted-warm">No products found</p>}
          </div>

          {/* Mobile list */}
          <div className="md:hidden">
            {filtered.map((p, i) => {
              const stock = stockInfo(p.stockBySize)
              const swatch = SWATCHES[i % SWATCHES.length]
              return (
                <div key={p.id} className="flex cursor-pointer items-center gap-3 border-b border-border-light py-3.5 transition-colors active:bg-bg" onClick={() => openEdit(p)}>
                  <button onClick={(e) => { e.stopPropagation(); toggleSelected(p.id) }} className="flex size-5 shrink-0 cursor-pointer items-center justify-center">
                    {selected.has(p.id) ? <CheckSquare className="size-4 text-brand-primary" /> : <Square className="size-4 text-border" />}
                  </button>
                  <div className={`flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl ${swatch.bg}`}>
                    {p.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images[0]} alt="" className="size-full object-cover" />
                    ) : (
                      <BagIcon className={`size-5 ${swatch.icon}`} />
                    )}
                  </div>
                  <div className="min-w-0 grow">
                    <p className="truncate text-sm font-semibold text-fg">{p.name}</p>
                    <p className="text-sm text-fg">{formatCurrency(p.price)}</p>
                    <p className={`text-xs font-semibold ${stock.color}`}>{stock.label}</p>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <ProductRowMenu product={p} onEdit={() => openEdit(p)} onToggleActive={() => toggleActive(p)} onDelete={() => deleteProduct(p)} />
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && <p className="py-12 text-center text-sm text-muted-warm">No products found</p>}
          </div>
        </div>
      </div>

      {/* FAB */}
      <button data-tour="add-product" onClick={openAdd} className="fixed bottom-24 right-4 z-30 flex size-14 cursor-pointer items-center justify-center rounded-full bg-brand-primary shadow-lg transition-transform active:scale-90 md:bottom-8 md:right-8">
        <Plus className="size-7 text-surface" />
      </button>

      {selected.size > 0 && (
        <div className="fixed inset-x-4 bottom-24 z-40 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-3 shadow-lg md:inset-x-auto md:bottom-8 md:left-1/2 md:-translate-x-1/2">
          <span className="mr-1 text-sm font-semibold text-fg">{selected.size} selected</span>
          {BATCH_ACTIONS.map((action) => (
            <button
              key={action.id}
              onClick={() => handleBatchActionClick(action)}
              className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                action.variant === 'danger' ? 'border-danger text-danger hover:bg-danger/10' : 'border-border text-fg hover:bg-bg'
              }`}
            >
              {action.label}
            </button>
          ))}
          <button onClick={clearSelection} className="cursor-pointer rounded-lg px-2 py-1.5 text-xs font-semibold text-muted-warm hover:text-fg">
            Clear
          </button>
        </div>
      )}

      {pickerAction && (
        <Dialog open onClose={() => setPickerAction(null)}>
          <div className="flex max-h-[70vh] flex-col p-4">
            <span className="mb-3 text-base font-bold text-fg">{pickerAction.label}</span>
            <div className="flex-1 overflow-y-auto">
              {pickerAction.kind === 'occasion-picker' &&
                occasions.map((o) => (
                  <button
                    key={o.id}
                    disabled={pickerBusy}
                    onClick={async () => {
                      setPickerBusy(true)
                      await runBatchAction(pickerAction, { occasionId: o.id })
                      setPickerBusy(false)
                      setPickerAction(null)
                    }}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-fg hover:bg-bg disabled:opacity-50"
                  >
                    <span className="text-lg leading-none">{o.emoji || '🎉'}</span>
                    {o.name}
                  </button>
                ))}
              {pickerAction.kind === 'category-picker' &&
                categories.map((c) => (
                  <button
                    key={c.id}
                    disabled={pickerBusy}
                    onClick={async () => {
                      setPickerBusy(true)
                      await runBatchAction(pickerAction, { categoryId: c.id })
                      setPickerBusy(false)
                      setPickerAction(null)
                    }}
                    className="flex w-full cursor-pointer items-center rounded-lg px-2 py-2 text-left text-sm text-fg hover:bg-bg disabled:opacity-50"
                  >
                    {c.name}
                  </button>
                ))}
            </div>
            <button onClick={() => setPickerAction(null)} className="mt-3 cursor-pointer rounded-lg border border-border py-2.5 text-sm font-semibold text-fg">
              Cancel
            </button>
          </div>
        </Dialog>
      )}

      {/* Modals */}
      <MobileFilterSheet
        open={mobileFilterOpen} onClose={() => setMobileFilterOpen(false)}
        stockFilters={stockFilters} sort={sort}
        priceMin={priceMin} priceMax={priceMax}
        onToggleStock={toggleStock} onSetSort={setSort}
        onPriceMin={setPriceMin} onPriceMax={setPriceMax} onReset={resetFilters}
        onApply={() => setMobileFilterOpen(false)}
      />

      <ProductEditor open={editorOpen} onClose={() => setEditorOpen(false)} editProduct={editProduct} categories={categories} occasions={occasions} />
    </div>
  )
}
