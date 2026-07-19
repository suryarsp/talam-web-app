'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, SlidersHorizontal, MoreHorizontal, Plus, X, Image as ImageIcon, CheckSquare, Square } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import type { AdminProduct, CategoryMeta, ProductInput } from '@/lib/data/products'
import {
  createProductAction,
  updateProductAction,
  setProductActiveAction,
  bulkAssignToOccasionAction,
  bulkSetCategoryAction,
  bulkSetActiveAction,
  bulkDeleteAction,
  bulkResetToDefaultAction,
} from './actions'
import { BATCH_ACTIONS, type BatchAction } from './batch-actions'

type OccasionOption = { id: string; name: string; emoji: string | null }

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

function filesToDataUrls(files: FileList): Promise<string[]> {
  return Promise.all(
    Array.from(files).map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
    )
  )
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

/* ── Product editor modal (Add / Edit) ── */

function ProductEditor({
  open, onClose, editProduct, categories,
}: {
  open: boolean; onClose: () => void; editProduct: AdminProduct | null; categories: CategoryMeta[]
}) {
  const router = useRouter()
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [images, setImages] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setSelectedSizes(editProduct?.sizes ?? [])
      setImages(editProduct?.images ?? [])
      setError(null)
    }
  }, [open, editProduct])

  if (!open) return null

  const isEdit = editProduct !== null
  const title = isEdit ? 'Edit Product' : 'Add New Product'
  const submitLabel = isEdit ? 'Save Changes' : 'Add Product'

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    const urls = await filesToDataUrls(fileList)
    setImages((prev) => [...prev, ...urls].slice(0, 5))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const quantity = Number(formData.get('quantity') ?? 0)
    const input: ProductInput = {
      name: String(formData.get('name') ?? '').trim(),
      description: String(formData.get('description') ?? '').trim() || null,
      price: Number(formData.get('price') ?? 0),
      comparePrice: formData.get('comparePrice') ? Number(formData.get('comparePrice')) : null,
      categoryId: String(formData.get('categoryId') ?? '') || null,
      sizes: selectedSizes,
      images,
      stockBySize: Object.fromEntries(selectedSizes.map((s) => [s, quantity])),
    }

    if (!input.name || images.length === 0) {
      setError('Product name and at least one photo are required.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      if (isEdit) await updateProductAction(editProduct.id, input)
      else await createProductAction(input)
      router.refresh()
      onClose()
    } catch {
      setError('Something went wrong saving the product. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} className="md:max-w-[560px]">
      <div className="flex max-h-[95vh] flex-col md:max-h-[90vh]">
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
              <select name="categoryId" required defaultValue={editProduct?.categoryId ?? ''} className="cursor-pointer rounded-lg border border-border bg-bg px-3 py-[11px] text-md outline-none transition-colors focus:border-brand-primary focus:bg-surface">
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-bold text-fg">Price *</span>
                <div className="flex">
                  <span className="flex items-center rounded-l-lg border border-r-0 border-border bg-bg px-3 text-sm text-muted-warm">₹</span>
                  <input name="price" required type="number" min="0" step="0.01" defaultValue={editProduct?.price ?? ''} className="grow rounded-r-lg border border-border bg-bg px-3 py-[11px] text-md outline-none transition-colors focus:border-brand-primary focus:bg-surface" placeholder="1,299" />
                </div>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-bold text-fg">Price After Discount</span>
                <div className="flex">
                  <span className="flex items-center rounded-l-lg border border-r-0 border-border bg-bg px-3 text-sm text-muted-warm">₹</span>
                  <input name="comparePrice" type="number" min="0" step="0.01" defaultValue={editProduct?.comparePrice ?? ''} className="grow rounded-r-lg border border-border bg-bg px-3 py-[11px] text-md outline-none transition-colors focus:border-brand-primary focus:bg-surface" placeholder="999" />
                </div>
              </label>
            </div>

            <label className="flex flex-col gap-1.5 md:w-1/2 md:pr-1.5">
              <span className="text-sm font-bold text-fg">Quantity per size *</span>
              <input name="quantity" required type="number" min="0" defaultValue={isEdit ? (editProduct.sizes[0] ? editProduct.stockBySize[editProduct.sizes[0]] : 0) : ''} className="rounded-lg border border-border bg-bg px-3 py-[11px] text-md outline-none transition-colors focus:border-brand-primary focus:bg-surface" placeholder="e.g., 25" />
            </label>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-fg">Product Pictures * (Min 1, Max 5)</span>
              {images.length > 0 && (
                <div className="mb-1 flex flex-wrap gap-2">
                  {images.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <div key={i} className="relative size-16 overflow-hidden rounded-lg bg-store-primary/10">
                      <img src={src} alt="" className="size-full object-cover" />
                      <button type="button" onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))} className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-fg text-surface">
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {images.length < 5 && (
                <label className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-border bg-bg px-4 py-6 transition-colors hover:border-brand-primary">
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                  <ImageIcon className="mb-1.5 size-7 text-muted-warm" strokeWidth={1.5} />
                  <span className="text-sm font-medium text-fg">Click to upload or drag and drop</span>
                  <span className="text-2xs text-muted-warm">PNG, JPG, GIF up to 5MB each</span>
                </label>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-fg">Sizes Available</span>
              <div className="flex flex-wrap gap-3">
                {ALL_SIZES.map((size) => (
                  <label key={size} className="flex cursor-pointer items-center gap-1.5 text-sm text-fg">
                    <input type="checkbox" checked={selectedSizes.includes(size)} onChange={() => setSelectedSizes((prev) => prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size])} className="size-4 rounded border-border accent-brand-primary" />
                    {size}
                  </label>
                ))}
              </div>
            </div>
          </form>
        </div>

        <div className="flex shrink-0 gap-3 border-t border-border p-4">
          <button type="button" onClick={onClose} className="grow cursor-pointer rounded-lg border border-border py-3 text-md font-semibold text-fg transition-colors active:bg-bg">Cancel</button>
          <button form="product-form" type="submit" disabled={saving} className="grow cursor-pointer rounded-lg bg-brand-primary py-3 text-md font-semibold text-surface transition-transform active:scale-[0.98] disabled:opacity-60">
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
                  <span className="text-sm text-fg">₹{p.price.toLocaleString('en-IN')}</span>
                  <span className={`text-sm font-semibold ${stock.color}`}>{stock.label}</span>
                  <span className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-2xs font-semibold ${p.isActive ? 'bg-success/10 text-success' : 'bg-muted-warm/10 text-muted-warm'}`}>{p.isActive ? 'Active' : 'Inactive'}</span>
                  <button onClick={(e) => { e.stopPropagation(); toggleActive(p) }} className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-border transition-colors hover:bg-bg" title={p.isActive ? 'Deactivate' : 'Activate'}>
                    <MoreHorizontal className="size-4 text-muted-warm" />
                  </button>
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
                    <p className="text-sm text-fg">₹{p.price.toLocaleString('en-IN')}</p>
                    <p className={`text-xs font-semibold ${stock.color}`}>{stock.label}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); toggleActive(p) }} className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border transition-colors hover:bg-bg">
                    <MoreHorizontal className="size-4 text-muted-warm" />
                  </button>
                </div>
              )
            })}
            {filtered.length === 0 && <p className="py-12 text-center text-sm text-muted-warm">No products found</p>}
          </div>
        </div>
      </div>

      {/* FAB */}
      <button onClick={openAdd} className="fixed bottom-24 right-4 z-30 flex size-14 cursor-pointer items-center justify-center rounded-full bg-brand-primary shadow-lg transition-transform active:scale-90 md:bottom-8 md:right-8">
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

      <ProductEditor open={editorOpen} onClose={() => setEditorOpen(false)} editProduct={editProduct} categories={categories} />
    </div>
  )
}
