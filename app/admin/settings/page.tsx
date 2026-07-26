'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, AlertTriangle, X, GripVertical } from 'lucide-react'
import Link from 'next/link'
import {
  getAboutAction,
  updateAboutAction,
  getContactSettingsAction,
  updateContactSettingsAction,
  addGalleryPhotoAction,
  removeGalleryPhotoAction,
  getStoreSettingsAction,
  updateStoreSettingsAction,
  getCategoriesAction,
  addCategoryAction,
  deleteCategoryAction,
  getAlertsAction,
  updateAlertsAction,
  getPromotionsAction,
  createPromotionAction,
  togglePromotionAction,
  deletePromotionAction,
  getSubscriptionAction,
  getPaymentsSettingsAction,
  updatePaymentsSettingsAction,
  deleteStoreAction,
  type StoreSettings,
  type StoreSettingsInput,
  type CategoryItem,
  type NotificationPreferences,
  type PromotionItem,
  type CreatePromotionInput,
  type SubscriptionInfo,
  type PaymentGatewayConfig,
} from './actions'
import { RichTextEditor } from '@/components/admin/rich-text-editor'
import { Dialog } from '@/components/ui/dialog'
import { ROOT_DOMAIN } from '@/lib/tenant-url'
import { DEPARTMENTS, type Department } from '@/lib/departments'
import type { SocialLink } from '@/lib/data/tenant'

const TABS = ['About', 'Store', 'Alerts', 'Promotions', 'Subscription', 'Payments', 'Contact Info'] as const
type Tab = (typeof TABS)[number] | 'Delete Store'

const COLOR_PRESETS = ['#C1502E', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#0EA5E9']

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex h-[26px] w-12 shrink-0 cursor-pointer items-center rounded-full px-[2px] transition-colors ${checked ? 'bg-brand-primary' : 'bg-[#D1D5DB]'}`}
    >
      <div className={`size-[22px] rounded-full bg-surface shadow-sm transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0'}`} />
    </button>
  )
}

function SectionLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between border-b border-border-light pb-2">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-warm">{children}</p>
      {right}
    </div>
  )
}

function Input({ label, defaultValue, type = 'text', ...props }: { label: string; defaultValue?: string; type?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-semibold text-fg">{label}</span>
      <input
        type={type}
        defaultValue={defaultValue}
        className="rounded-lg border border-border bg-surface px-3 py-[11px] text-md text-fg outline-none transition-colors focus:border-brand-primary"
        {...props}
      />
    </label>
  )
}

function ImageUploadPreview({ initialLabel, imageUrl, onFile }: { initialLabel: string; imageUrl: string | null; onFile: (file: File) => void }) {
  const [preview, setPreview] = useState<string | null>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setPreview(URL.createObjectURL(file))
      onFile(file)
    }
  }

  const src = preview ?? imageUrl

  return (
    <label
      title="Click to change"
      className="flex size-12 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-brand-primary/10 transition-opacity hover:opacity-80"
    >
      <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <span className="text-sm font-bold tracking-[0.04em] text-brand-primary">{initialLabel}</span>
      )}
    </label>
  )
}

/** Small transient "✓ Saved" flash shown after a field autosaves — shared across tabs. */
function useSavedFlash(): [boolean, () => void] {
  const [saved, setSaved] = useState(false)
  const flash = useCallback(() => {
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }, [])
  return [saved, flash]
}

// ── About Tab ──
function AboutTab() {
  const [loaded, setLoaded] = useState(false)
  const [description, setDescription] = useState('')
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getAboutAction().then((about) => {
      setDescription(about.description)
      setSocialLinks(about.socialLinks)
      setLoaded(true)
    })
  }, [])

  function updateLink(i: number, patch: Partial<SocialLink>) {
    setSocialLinks((prev) => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  }

  async function handleSave() {
    setSaving(true)
    await updateAboutAction({ description, socialLinks })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!loaded) return <p className="py-12 text-center text-sm text-muted-warm">Loading…</p>

  return (
    <div className="flex flex-col gap-8">
      <div>
        <SectionLabel right={saved ? <span className="text-xs font-medium text-success">✓ Saved</span> : undefined}>Store Story</SectionLabel>
        <label data-tour="store-about" className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-fg">Your Story</span>
          <RichTextEditor defaultValue={description} onChange={setDescription} />
        </label>
      </div>
      <div>
        <SectionLabel right={<button type="button" onClick={() => setSocialLinks((prev) => [...prev, { platform: '', url: '' }])} className="cursor-pointer text-xs font-semibold text-brand-primary">+ Add link</button>}>
          Social Links
        </SectionLabel>
        <div className="flex flex-col gap-3">
          {socialLinks.length === 0 && <p className="text-sm text-muted-warm">No social links yet. Add Instagram, Facebook, YouTube — anything.</p>}
          {socialLinks.map((link, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-[9px]">
              <span className="flex size-7 shrink-0 items-center justify-center rounded bg-bg text-[10px] font-bold uppercase text-muted-warm">
                {link.platform.slice(0, 2) || '—'}
              </span>
              <input
                value={link.platform}
                onChange={(e) => updateLink(i, { platform: e.target.value })}
                placeholder="Platform (e.g., Instagram)"
                className="w-[120px] shrink-0 border-r border-border bg-transparent pr-2 text-sm font-semibold text-fg outline-none"
              />
              <input
                value={link.url}
                onChange={(e) => updateLink(i, { url: e.target.value })}
                placeholder="https://instagram.com/yourstore"
                className="min-w-0 flex-1 bg-transparent text-md text-fg outline-none"
              />
              <button type="button" onClick={() => setSocialLinks((prev) => prev.filter((_, j) => j !== i))} className="text-muted-warm hover:text-danger">
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="self-start rounded-lg bg-brand-primary px-5 py-[9px] text-sm font-semibold text-surface transition-transform active:scale-95 disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Save About Page'}
      </button>
    </div>
  )
}

// ── Store Tab ──
function AddCategoryDialog({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (category: CategoryItem) => void }) {
  const [name, setName] = useState('')
  const [department, setDepartment] = useState<Department | ''>('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setName('')
      setDepartment('')
      setError('')
    }
  }, [open])

  async function handleAdd() {
    const trimmed = name.trim()
    if (!trimmed || !department) return
    setBusy(true)
    setError('')
    const result = await addCategoryAction(trimmed, department)
    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    if (result.category) onAdded(result.category)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} position="center">
      <div className="p-6">
        <h2 className="font-marketing text-lg font-semibold text-fg">Add category</h2>
        <div className="mt-4 flex flex-col gap-4">
          <Input
            label="Category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="e.g. Sarees"
            autoFocus
          />
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-fg">Department</span>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value as Department)}
              className="cursor-pointer rounded-lg border border-border bg-bg px-3 py-[11px] text-md text-fg outline-none transition-colors focus:border-brand-primary focus:bg-surface"
            >
              <option value="" disabled>Select department</option>
              {DEPARTMENTS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </label>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 font-body text-sm font-semibold text-muted-warm hover:bg-bg">
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !name.trim() || !department}
            onClick={handleAdd}
            className="rounded-lg bg-brand-primary px-4 py-2 font-body text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? 'Adding…' : 'Add category'}
          </button>
        </div>
      </div>
    </Dialog>
  )
}

function CategoriesEditor() {
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    getCategoriesAction().then((cats) => {
      setCategories(cats)
      setLoaded(true)
    })
  }, [])

  async function handleDelete(id: string) {
    setError('')
    const result = await deleteCategoryAction(id)
    if (result.error) {
      setError(result.error)
      return
    }
    setCategories((prev) => prev.filter((c) => c.id !== id))
  }

  if (!loaded) return <p className="py-6 text-center text-sm text-muted-warm">Loading…</p>

  const departmentLabel = (value: string | null) => DEPARTMENTS.find((d) => d.value === value)?.label

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      {categories.length === 0 && <p className="px-1 py-2 text-sm text-muted-warm">No categories yet — add one below.</p>}
      {categories.map((cat) => (
        <div key={cat.id} className="flex items-center gap-2 border-b border-border-light py-2 last:border-0">
          <GripVertical className="size-4 text-muted-warm" />
          <span className="flex-1 text-md text-fg">{cat.name}</span>
          {departmentLabel(cat.department) && (
            <span className="rounded-full bg-bg px-2 py-0.5 text-2xs font-semibold text-muted-warm">{departmentLabel(cat.department)}</span>
          )}
          <button type="button" onClick={() => handleDelete(cat.id)} className="text-muted-warm hover:text-danger">
            <X className="size-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="rounded-lg border border-dashed border-border px-3 py-2 text-sm font-semibold text-brand-primary hover:border-brand-primary"
      >
        + Add category
      </button>
      {error && <p className="px-1 text-xs text-danger">{error}</p>}
      <AddCategoryDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onAdded={(cat) => setCategories((prev) => [...prev, cat])} />
    </div>
  )
}

function StoreTab() {
  const [loaded, setLoaded] = useState(false)
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [saved, flash] = useSavedFlash()
  const [error, setError] = useState('')

  useEffect(() => {
    getStoreSettingsAction().then((s) => {
      setSettings(s)
      setLoaded(true)
    })
  }, [])

  async function save(patch: StoreSettingsInput) {
    setError('')
    const result = await updateStoreSettingsAction(patch)
    if (result.error) {
      setError(result.error)
      return
    }
    setSettings((prev) => (prev ? { ...prev, ...patch, ...(result.logoUrl ? { logoUrl: result.logoUrl } : {}) } : prev))
    flash()
  }

  if (!loaded || !settings) return <p className="py-12 text-center text-sm text-muted-warm">Loading…</p>

  return (
    <div className="flex flex-col gap-8">
      <div>
        <SectionLabel right={saved ? <span className="text-xs font-medium text-success">✓ Saved</span> : undefined}>Store Details</SectionLabel>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Store Name" defaultValue={settings.name} onBlur={(e) => e.target.value !== settings.name && save({ name: e.target.value })} />
            <Input label="Tagline" defaultValue={settings.tagline} onBlur={(e) => e.target.value !== settings.tagline && save({ tagline: e.target.value })} />
          </div>
          <div className="flex items-center gap-3">
            <div>
              <p className="text-sm font-semibold text-fg">Store URL</p>
              <p className="text-sm text-brand-primary">{settings.slug}.{ROOT_DOMAIN}</p>
            </div>
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      </div>

      <div>
        <SectionLabel right={<span className="text-xs font-medium text-success">✓ Autosaves</span>}>Categories</SectionLabel>
        <CategoriesEditor />
        <p className="mt-1.5 text-xs text-muted-warm">Categories appear in your shop filters and home page.</p>
      </div>

      <div>
        <SectionLabel right={<span className="text-xs font-medium text-success">✓ Autosaves</span>}>Brand</SectionLabel>
        <div className="flex items-center gap-[14px] rounded-lg border border-border bg-surface p-3">
          <ImageUploadPreview
            initialLabel={settings.name.slice(0, 2).toUpperCase()}
            imageUrl={settings.logoUrl}
            onFile={(file) => save({ logo: file })}
          />
          <div className="grow">
            <p className="text-md font-semibold text-fg">Store Logo</p>
            <p className="text-xs text-muted-warm">PNG or SVG, min 200×200px</p>
          </div>
        </div>
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-warm">Primary Colour</p>
          <div className="flex flex-wrap items-center gap-3">
            {COLOR_PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => save({ brandColor: color })}
                className={`size-10 shrink-0 rounded-full transition-transform active:scale-90 ${color === settings.brandColor ? 'ring-[3px] ring-fg ring-offset-2' : ''}`}
                style={{ backgroundColor: color }}
              />
            ))}
            <input
              defaultValue={settings.brandColor ?? ''}
              onBlur={(e) => e.target.value !== settings.brandColor && save({ brandColor: e.target.value })}
              className="min-w-[100px] grow rounded-lg border border-border bg-surface px-[10px] py-2 font-mono text-md text-fg"
            />
          </div>
        </div>
      </div>

      <div>
        <SectionLabel right={<span className="text-xs font-medium text-success">✓ Autosaves</span>}>Delivery & Trust</SectionLabel>
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-fg">Free Delivery Above</span>
              <div className="flex items-center rounded-lg border border-border bg-bg px-2 py-[9px]">
                <span className="text-muted-warm">₹</span>
                <input
                  defaultValue={settings.freeDeliveryAbove ?? ''}
                  onBlur={(e) => save({ freeDeliveryAbove: e.target.value ? Number(e.target.value) : null })}
                  className="ml-1 min-w-0 flex-1 bg-transparent text-md text-fg outline-none"
                />
              </div>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-fg">Shipping Fee</span>
              <div className="flex items-center rounded-lg border border-border bg-bg px-2 py-[9px]">
                <span className="text-muted-warm">₹</span>
                <input
                  defaultValue={settings.shippingFee}
                  onBlur={(e) => save({ shippingFee: Number(e.target.value) || 0 })}
                  className="ml-1 min-w-0 flex-1 bg-transparent text-md text-fg outline-none"
                />
              </div>
            </label>
            <Input
              label="Delivery Estimate"
              defaultValue={settings.deliveryEstimateText}
              onBlur={(e) => e.target.value !== settings.deliveryEstimateText && save({ deliveryEstimateText: e.target.value })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-md font-semibold text-fg">Accept Returns</p>
              <p className="text-xs text-muted-warm">Show return window on product pages</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                defaultValue={settings.returnWindowDays ?? 7}
                onBlur={(e) => settings.returnWindowDays !== null && save({ returnWindowDays: Number(e.target.value) || 0 })}
                className="w-12 rounded-lg border border-border bg-bg px-2 py-1 text-center text-sm text-fg"
              />
              <span className="text-xs text-muted-warm">days</span>
              <Toggle
                checked={settings.returnWindowDays !== null}
                onChange={(checked) => save({ returnWindowDays: checked ? 7 : null })}
              />
            </div>
          </div>
          <Input
            label="Trust Badge Text"
            defaultValue={settings.trustBadgeText}
            onBlur={(e) => e.target.value !== settings.trustBadgeText && save({ trustBadgeText: e.target.value })}
          />
        </div>
      </div>

      <div>
        <SectionLabel right={<span className="text-xs font-medium text-success">✓ Autosaves</span>}>WhatsApp</SectionLabel>
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-fg">WhatsApp Number</span>
            <div className="flex items-center gap-2">
              <span className="rounded-lg border border-border bg-bg px-3 py-[9px] text-sm text-muted-warm">+91</span>
              <input
                defaultValue={settings.whatsappNumber}
                onBlur={(e) => e.target.value !== settings.whatsappNumber && save({ whatsappNumber: e.target.value })}
                className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 py-[9px] text-md text-fg outline-none focus:border-brand-primary"
              />
            </div>
          </label>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-md font-semibold text-fg">Show WhatsApp Button on Store</p>
              <p className="text-xs text-muted-warm">Floating button visible to all visitors</p>
            </div>
            <Toggle checked={settings.showWhatsappButton} onChange={(checked) => save({ showWhatsappButton: checked })} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Alerts Tab ──
const ALERT_SECTIONS: { label: string; items: { key: keyof NotificationPreferences; name: string; sub: string }[] }[] = [
  {
    label: 'Order Alerts',
    items: [
      { key: 'newOrder', name: 'New order placed', sub: 'Email you when a customer places an order' },
      { key: 'orderStatusUpdated', name: 'Order status updated', sub: "Confirmation when you update an order's status" },
      { key: 'orderCancelled', name: 'Order cancelled', sub: 'Alert when an order is cancelled by customer or you' },
      { key: 'lowStock', name: 'Low stock warning', sub: 'When a product drops below 5 units' },
    ],
  },
  {
    label: 'Payment Alerts',
    items: [
      { key: 'paymentReceived', name: 'Payment received', sub: "Confirm when a customer's payment is verified" },
      { key: 'paymentFailed', name: 'Payment failed / UTR pending', sub: "When UPI customer hasn't submitted UTR after 2 hours" },
      { key: 'refundInitiated', name: 'Refund initiated', sub: 'Alert when a refund is triggered via gateway' },
    ],
  },
  {
    label: 'Customer Alerts',
    items: [
      { key: 'newCustomer', name: 'New customer registered', sub: 'When a new customer creates an account on your store' },
      { key: 'wishlistAbandoned', name: 'Wishlist abandoned', sub: "Customer wishlisted an item but hasn't purchased in 3 days" },
    ],
  },
  {
    label: 'Review Alerts',
    items: [
      { key: 'newReview', name: 'New review submitted', sub: 'When a customer leaves a product review' },
      { key: 'reviewReported', name: 'Review reported', sub: 'When a customer flags a review as inappropriate' },
    ],
  },
  {
    label: 'Platform Alerts',
    items: [
      { key: 'trialExpiry', name: 'Trial expiry reminder', sub: '1 day before your trial ends' },
      { key: 'monthlySummary', name: 'Monthly summary report', sub: 'Monthly digest of orders, revenue, and top products' },
    ],
  },
]

function AlertsTab() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null)

  useEffect(() => {
    getAlertsAction().then(setPrefs)
  }, [])

  function handleToggle(key: keyof NotificationPreferences, checked: boolean) {
    setPrefs((prev) => (prev ? { ...prev, [key]: checked } : prev))
    updateAlertsAction({ [key]: checked })
  }

  if (!prefs) return <p className="py-12 text-center text-sm text-muted-warm">Loading…</p>

  return (
    <div className="flex flex-col gap-8">
      {ALERT_SECTIONS.map((section) => (
        <div key={section.label}>
          <SectionLabel>{section.label}</SectionLabel>
          <div className="flex flex-col divide-y divide-border-light rounded-lg border border-border">
            {section.items.map((item) => (
              <AlertRow key={item.key} name={item.name} sub={item.sub} checked={prefs[item.key]} onChange={(v) => handleToggle(item.key, v)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function AlertRow({ name, sub, checked, onChange }: { name: string; sub: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <div>
        <p className="text-md font-semibold text-fg">{name}</p>
        <p className="text-xs text-muted-warm">{sub}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  )
}

// ── Promotions Tab ──
function formatDiscount(o: PromotionItem): string {
  return o.type === 'percent' ? `${o.value}% OFF` : `₹${o.value} OFF`
}
function formatMinOrder(o: PromotionItem): string {
  return o.minOrder ? `₹${o.minOrder}+` : 'No minimum'
}
function formatUses(o: PromotionItem): string {
  return o.usesLimit ? `${o.usesCount} / ${o.usesLimit}` : `${o.usesCount} / ∞`
}
function formatExpiry(o: PromotionItem): string {
  return o.expiresAt ? new Date(o.expiresAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'No expiry'
}

function CreateOfferDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [code, setCode] = useState('')
  const [type, setType] = useState<CreatePromotionInput['type']>('percent')
  const [value, setValue] = useState('')
  const [minOrder, setMinOrder] = useState('')
  const [usesLimit, setUsesLimit] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function reset() {
    setCode('')
    setType('percent')
    setValue('')
    setMinOrder('')
    setUsesLimit('')
    setExpiresAt('')
    setError('')
  }

  async function handleCreate() {
    setSaving(true)
    setError('')
    const result = await createPromotionAction({
      code,
      type,
      value: Number(value),
      minOrder: minOrder ? Number(minOrder) : undefined,
      usesLimit: usesLimit ? Number(usesLimit) : undefined,
      expiresAt: expiresAt || undefined,
    })
    setSaving(false)
    if (result.error) {
      setError(result.error)
      return
    }
    reset()
    onCreated()
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} position="center">
      <div className="p-6">
        <h2 className="font-marketing text-lg font-semibold text-fg">Create Offer</h2>
        <div className="mt-4 flex flex-col gap-4">
          <Input label="Code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="DIWALI20" />
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-fg">Type</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as CreatePromotionInput['type'])}
                className="rounded-lg border border-border bg-surface px-3 py-[11px] text-md text-fg outline-none focus:border-brand-primary"
              >
                <option value="percent">Percent (%)</option>
                <option value="fixed">Fixed (₹)</option>
              </select>
            </label>
            <Input label="Value" type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder={type === 'percent' ? '20' : '100'} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Min Order (₹)" type="number" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} placeholder="Optional" />
            <Input label="Uses Limit" type="number" value={usesLimit} onChange={(e) => setUsesLimit(e.target.value)} placeholder="Optional" />
          </div>
          <Input label="Expires On" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={() => { reset(); onClose() }} className="rounded-lg px-4 py-2 font-body text-sm font-semibold text-muted-warm hover:bg-bg">
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || !code.trim() || !value}
            onClick={handleCreate}
            className="rounded-lg bg-brand-primary px-4 py-2 font-body text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'Creating…' : 'Create Offer'}
          </button>
        </div>
      </div>
    </Dialog>
  )
}

function PromotionsTab() {
  const [offers, setOffers] = useState<PromotionItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  const reload = useCallback(() => {
    getPromotionsAction().then((o) => {
      setOffers(o)
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  async function handleToggle(id: string, active: boolean) {
    setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, isActive: active } : o)))
    await togglePromotionAction(id, active)
  }

  async function handleDelete(id: string) {
    setOffers((prev) => prev.filter((o) => o.id !== id))
    await deletePromotionAction(id)
  }

  if (!loaded) return <p className="py-12 text-center text-sm text-muted-warm">Loading…</p>

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-warm">Active Offers</p>
          <button type="button" onClick={() => setDialogOpen(true)} className="rounded-lg border border-brand-primary px-4 py-2 text-sm font-semibold text-brand-primary">
            + Create Offer
          </button>
        </div>
        {offers.length === 0 && <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-warm">No offers yet. Create one to get started.</p>}
        {offers.length > 0 && (
          <>
            {/* Mobile: card list */}
            <div className="flex flex-col gap-3 md:hidden">
              {offers.map((o) => (
                <div key={o.id} className="rounded-lg border border-border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-brand-primary">{o.code}</span>
                    <Toggle checked={o.isActive} onChange={(v) => handleToggle(o.id, v)} />
                  </div>
                  <p className="text-sm font-semibold text-fg">{formatDiscount(o)} · Min {formatMinOrder(o)}</p>
                  <p className="text-xs text-muted-warm">{formatUses(o)} uses · {formatExpiry(o)}</p>
                </div>
              ))}
            </div>
            {/* Desktop: table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs font-bold uppercase tracking-[0.06em] text-muted-warm">
                    <th className="pb-2 pr-4">Code</th>
                    <th className="pb-2 pr-4">Discount</th>
                    <th className="pb-2 pr-4">Min Order</th>
                    <th className="pb-2 pr-4">Uses</th>
                    <th className="pb-2 pr-4">Expires</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {offers.map((o) => (
                    <tr key={o.id} className="border-b border-border-light">
                      <td className="py-3 pr-4 font-mono font-bold text-brand-primary">{o.code}</td>
                      <td className="py-3 pr-4 font-semibold text-fg">{formatDiscount(o)}</td>
                      <td className="py-3 pr-4 text-muted-warm">{formatMinOrder(o)}</td>
                      <td className="py-3 pr-4 text-muted-warm">{formatUses(o)}</td>
                      <td className="py-3 pr-4 text-muted-warm">{formatExpiry(o)}</td>
                      <td className="py-3 pr-4"><Toggle checked={o.isActive} onChange={(v) => handleToggle(o.id, v)} /></td>
                      <td className="py-3">
                        <button type="button" onClick={() => handleDelete(o.id)} className="text-muted-warm hover:text-danger">
                          <X className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      <CreateOfferDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreated={reload} />
    </div>
  )
}

// ── Subscription Tab (read-only: no billing provider wired up yet) ──
const PLAN_COPY: Record<'trial' | 'starter' | 'pro', { name: string; price: string; features: string[]; missing: string[]; note: string }> = {
  trial: { name: 'Trial', price: 'Free / 14 days', features: ['25 products', '100 OTP logins/mo'], missing: ['WhatsApp button', 'Discount codes', 'Wishlist'], note: 'Powered by badge shown' },
  starter: { name: 'Starter', price: '₹499 /mo', features: ['100 products', '500 OTP logins/mo', 'WhatsApp button', 'Discount codes', 'Wishlist'], missing: [], note: 'Badge hidden' },
  pro: { name: 'Pro', price: '₹1,499 /mo', features: ['Unlimited products', '2,000 OTP logins/mo', 'WhatsApp button', 'Advanced analytics', 'Priority support'], missing: [], note: 'Badge hidden' },
}

function SubscriptionTab() {
  const [info, setInfo] = useState<SubscriptionInfo | null>(null)

  useEffect(() => {
    getSubscriptionAction().then(setInfo)
  }, [])

  if (!info) return <p className="py-12 text-center text-sm text-muted-warm">Loading…</p>

  const current = PLAN_COPY[info.tier]
  const trialEndsAt = info.trialEndsAt ? new Date(info.trialEndsAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : null

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 rounded-lg border-2 border-brand-primary/30 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-lg font-bold text-fg">
            {current.name} Plan <span className="ml-2 rounded-full bg-success-bg px-2 py-0.5 text-2xs font-semibold text-success">ACTIVE</span>
          </p>
          <p className="text-sm text-muted-warm">{info.tier === 'trial' && trialEndsAt ? `Trial ends ${trialEndsAt}` : current.price}</p>
        </div>
        <div className="md:text-right">
          <p className="font-marketing text-[32px] font-semibold text-brand-primary">{current.price}</p>
          <button type="button" disabled title="Coming soon" className="mt-1 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-warm opacity-60">
            Manage Billing
          </button>
        </div>
      </div>

      <div>
        <SectionLabel>Available Plans</SectionLabel>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {(Object.keys(PLAN_COPY) as (keyof typeof PLAN_COPY)[]).map((key) => {
            const plan = PLAN_COPY[key]
            const isCurrent = key === info.tier
            return (
              <div key={key} className={`flex flex-col rounded-lg border-2 p-5 ${isCurrent ? 'border-brand-primary' : 'border-border'}`}>
                {isCurrent && <span className="mb-2 self-center rounded-full bg-brand-primary px-3 py-0.5 text-2xs font-bold text-surface">CURRENT</span>}
                <p className={`text-md font-bold ${isCurrent ? 'text-brand-primary' : 'text-fg'}`}>{plan.name}</p>
                <p className="font-marketing mb-3 text-xl font-semibold text-fg">{plan.price}</p>
                <div className="flex flex-col gap-1 text-sm">
                  {plan.features.map((f) => <span key={f} className="text-fg">✓ {f}</span>)}
                  {plan.missing.map((f) => <span key={f} className="text-muted-warm">✕ {f}</span>)}
                  <span className="mt-1 text-xs text-muted-warm">{plan.note}</span>
                </div>
                {key === 'pro' && !isCurrent && (
                  <button type="button" disabled title="Coming soon" className="mt-4 rounded-lg bg-brand-primary px-4 py-3 text-sm font-semibold text-surface opacity-60">
                    Upgrade to Pro
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <SectionLabel>Payment History</SectionLabel>
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-warm">No billing history yet — invoices will appear here once billing is enabled.</p>
      </div>
    </div>
  )
}

// ── Payments Tab ──
function PaymentsTab() {
  const [loaded, setLoaded] = useState(false)
  const [config, setConfig] = useState<PaymentGatewayConfig | null>(null)
  const [locked, setLocked] = useState(false)
  const [lockedCount, setLockedCount] = useState(0)
  const [error, setError] = useState('')
  const [saved, flash] = useSavedFlash()

  useEffect(() => {
    getPaymentsSettingsAction().then((r) => {
      setConfig(r.config)
      setLocked(r.locked)
      setLockedCount(r.lockedCount)
      setLoaded(true)
    })
  }, [])

  async function save(next: PaymentGatewayConfig) {
    setConfig(next)
    setError('')
    const result = await updatePaymentsSettingsAction(next)
    if (result.error) setError(result.error)
    else flash()
  }

  if (!loaded || !config) return <p className="py-12 text-center text-sm text-muted-warm">Loading…</p>

  return (
    <div data-tour="payments" className="flex flex-col gap-6">
      {locked && (
        <div className="flex items-center gap-3 rounded-lg bg-[#FEF3C7] p-4">
          <AlertTriangle className="size-5 shrink-0 text-amber" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#92400E]">{lockedCount} pending order{lockedCount === 1 ? '' : 's'} — payment settings locked</p>
            <p className="text-xs text-[#92400E]/70">Complete or cancel all orders before changing payment configuration.</p>
          </div>
          <Link href="/admin/orders" className="shrink-0 text-sm font-semibold text-fg">Go to Orders →</Link>
        </div>
      )}

      <p className="text-sm text-muted-warm">Money goes directly to your bank. Talam never holds funds. Enable any or all gateways — customers choose at checkout.</p>
      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-border p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-14 items-center justify-center rounded-lg bg-[#1A1040] text-xs font-bold text-amber">UPI</span>
              <div>
                <p className="text-md font-semibold text-fg">UPI / QR Code</p>
                <p className="text-xs text-muted-warm">0% fee · No KYC required</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {config.upi.enabled && <span className="rounded-full bg-success-bg px-2 py-0.5 text-2xs font-semibold text-success">Enabled</span>}
              <Toggle checked={config.upi.enabled} onChange={(v) => !locked && save({ ...config, upi: { ...config.upi, enabled: v } })} />
            </div>
          </div>
          {config.upi.enabled && (
            <div>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-fg">UPI ID</span>
                <input
                  defaultValue={config.upi.upiId}
                  disabled={locked}
                  onBlur={(e) => e.target.value !== config.upi.upiId && save({ ...config, upi: { ...config.upi, upiId: e.target.value } })}
                  className="rounded-lg border border-border bg-surface px-3 py-[11px] text-md text-fg outline-none focus:border-brand-primary disabled:opacity-60"
                />
              </label>
              <p className="mt-1 text-xs text-muted-warm">Customers scan your QR and share UTR manually to confirm payment</p>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-14 items-center justify-center rounded-lg bg-[#4A154B] text-[9px] font-bold text-surface">MOJO</span>
              <div>
                <p className="text-md font-semibold text-fg">Instamojo <span className="ml-1 rounded-full bg-amber/10 px-2 py-0.5 text-2xs font-semibold text-amber">RECOMMENDED</span></p>
                <p className="text-xs text-muted-warm">2% + ₹3 per transaction · PAN + savings account</p>
              </div>
            </div>
            <Toggle checked={config.instamojo.enabled} onChange={(v) => !locked && save({ ...config, instamojo: { enabled: v } })} />
          </div>
        </div>

        <div className="rounded-lg border border-border p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-14 items-center justify-center rounded-lg bg-[#072654] text-[9px] font-bold text-surface">RZRPAY</span>
              <div>
                <p className="text-md font-semibold text-fg">Razorpay</p>
                <p className="text-xs text-muted-warm">2% per transaction · Existing account required</p>
              </div>
            </div>
            <Toggle checked={config.razorpay.enabled} onChange={(v) => !locked && save({ ...config, razorpay: { enabled: v } })} />
          </div>
        </div>
      </div>

      {saved && <p className="text-center text-xs font-medium text-success">✓ Saved</p>}
      {locked && <p className="text-center text-xs text-muted-warm">🔒 Settings are locked while you have pending orders.</p>}
    </div>
  )
}

// ── Contact Info Tab ──
function ContactInfoTab() {
  const [loaded, setLoaded] = useState(false)
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerTitle, setOwnerTitle] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [showWhatsApp, setShowWhatsApp] = useState(true)
  const [hours, setHours] = useState('')
  const [sameAsContact, setSameAsContact] = useState(false)
  const [gallery, setGallery] = useState<string[]>([])
  const [galleryError, setGalleryError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getContactSettingsAction().then((data) => {
      setContactPhone(data.contactPhone)
      setContactEmail(data.contactEmail)
      setAddress(data.address)
      setCity(data.city)
      setOwnerName(data.ownerName)
      setOwnerTitle(data.ownerTitle)
      setWhatsappNumber(data.whatsappNumber)
      setShowWhatsApp(data.showWhatsappButton)
      setHours(data.hours)
      setGallery(data.galleryUrls)
      setSameAsContact(Boolean(data.whatsappNumber) && data.whatsappNumber === data.contactPhone)
      setLoaded(true)
    })
  }, [])

  async function handleSave() {
    setSaving(true)
    await updateContactSettingsAction({
      contactPhone,
      contactEmail,
      address,
      city,
      ownerName,
      ownerTitle,
      whatsappNumber: sameAsContact ? contactPhone : whatsappNumber,
      showWhatsappButton: showWhatsApp,
      hours,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleAddPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setGalleryError('')
    const result = await addGalleryPhotoAction(file)
    if (result.error) {
      setGalleryError(result.error)
      return
    }
    if (result.url) setGallery((prev) => [...prev, result.url!])
  }

  async function handleRemovePhoto(url: string) {
    setGallery((prev) => prev.filter((u) => u !== url))
    await removeGalleryPhotoAction(url)
  }

  if (!loaded) return <p className="py-12 text-center text-sm text-muted-warm">Loading…</p>

  return (
    <div className="flex flex-col gap-8">
      <div>
        <SectionLabel>Owner</SectionLabel>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input label="Owner Name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
          <Input label="Title / Role" value={ownerTitle} onChange={(e) => setOwnerTitle(e.target.value)} />
        </div>
      </div>

      <div>
        <SectionLabel right={saved ? <span className="text-xs font-medium text-success">✓ Saved</span> : undefined}>Contact Details</SectionLabel>
        <div className="flex flex-col gap-4">
          <div data-tour="contact-info" className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Contact Phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            <Input label="Contact Email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-fg">WhatsApp Number</span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg border border-border bg-surface px-3 py-[9px] text-sm text-muted-warm">+91</span>
              <input
                value={sameAsContact ? contactPhone : whatsappNumber}
                disabled={sameAsContact}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-[9px] text-md text-fg outline-none focus:border-brand-primary disabled:opacity-60"
              />
              <label className="flex shrink-0 items-center gap-1.5 text-sm text-muted-warm">
                <input type="checkbox" checked={sameAsContact} onChange={(e) => setSameAsContact(e.target.checked)} className="size-4 accent-brand-primary" />
                Same as contact phone
              </label>
            </div>
          </label>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-md font-semibold text-fg">Show WhatsApp Button on Store</p>
              <p className="text-xs text-muted-warm">Floating button visible to all visitors</p>
            </div>
            <Toggle checked={showWhatsApp} onChange={setShowWhatsApp} />
          </div>
        </div>
      </div>

      <div data-tour="store-address">
        <SectionLabel>Store Address</SectionLabel>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
          <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <p className="mt-1.5 text-xs text-muted-warm">Shown on your About page and used for delivery estimates.</p>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="self-start rounded-lg bg-brand-primary px-5 py-[9px] text-sm font-semibold text-surface transition-transform active:scale-95 disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Save Contact Info'}
      </button>

      <div>
        <SectionLabel>Store Photos</SectionLabel>
        <div className="flex gap-3 overflow-x-auto">
          {gallery.map((url) => (
            <div key={url} className="group relative size-24 shrink-0 overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="size-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemovePhoto(url)}
                className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
          {gallery.length < 8 && (
            <label className="flex size-24 shrink-0 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-warm hover:opacity-80">
              <input type="file" accept="image/*" className="hidden" onChange={handleAddPhoto} />
              <span className="text-2xl">+</span>
            </label>
          )}
        </div>
        {galleryError && <p className="mt-1.5 text-xs text-danger">{galleryError}</p>}
        <p className="mt-1.5 text-xs text-muted-warm">Max 8 photos. These appear on your About page and social share previews.</p>
      </div>

      <div>
        <SectionLabel>Store Hours</SectionLabel>
        <Input label="Hours" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Mon – Sat: 10 AM – 7 PM · Sunday: Closed" />
      </div>
    </div>
  )
}

// ── Delete Store Tab ──
function DeleteStoreTab() {
  const router = useRouter()
  const [storeName, setStoreName] = useState('')
  const [confirmName, setConfirmName] = useState('')
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    getStoreSettingsAction().then((s) => setStoreName(s.name))
  }, [])

  async function handleDelete() {
    setDeleting(true)
    setError('')
    const result = await deleteStoreAction(confirmName)
    setDeleting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    router.push('/')
  }

  const canDelete = storeName.length > 0 && confirmName.trim().toLowerCase() === storeName.trim().toLowerCase()

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg bg-danger/5 p-5">
        <p className="text-md font-bold text-danger">This action cannot be undone</p>
        <p className="mt-1 text-sm text-danger/80">Deleting your store will immediately take it offline. Your data will be permanently deleted after 30 days.</p>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-fg">What gets deleted:</p>
        <div className="flex flex-col gap-1 text-sm text-muted-warm">
          <span>✕ All products and product images</span>
          <span>✕ All customer orders and history</span>
          <span>✕ Your store URL</span>
          <span>✕ Payment gateway connections</span>
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-fg">Type your store name to confirm</span>
        <input
          value={confirmName}
          onChange={(e) => setConfirmName(e.target.value)}
          placeholder={storeName}
          className="rounded-lg border border-border bg-surface px-3 py-[11px] text-md text-fg outline-none focus:border-danger"
        />
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="button"
        disabled={!canDelete || deleting}
        onClick={handleDelete}
        className="w-full rounded-lg bg-danger py-3.5 text-md font-semibold text-surface transition-colors hover:bg-danger/90 disabled:opacity-50"
      >
        {deleting ? 'Deleting…' : 'Delete Store'}
      </button>
      <p className="text-center text-xs text-muted-warm">Your store goes read-only immediately. Hard-deleted after 30 days.</p>
    </div>
  )
}

// ── Main Page ──
export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Store')
  const searchParams = useSearchParams()

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && ([...TABS, 'Delete Store'] as readonly string[]).includes(tab)) setActiveTab(tab as Tab)
  }, [searchParams])

  return (
    <div className="mx-auto max-w-3xl">
      {/* Mobile header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <Link href="/admin/dashboard" className="flex size-8 items-center justify-center">
            <ChevronLeft className="size-5 text-fg" />
          </Link>
          <span className="font-marketing text-lg font-semibold text-fg">Store Settings</span>
        </div>
        <button className="rounded-lg bg-brand-primary px-4 py-[7px] text-sm font-semibold text-surface">Save</button>
      </div>

      {/* Desktop header */}
      <div className="mb-1 hidden items-center justify-between md:flex">
        <h1 className="font-marketing text-[26px] font-semibold text-fg">Store Settings</h1>
        <button className="rounded-lg bg-brand-primary px-5 py-[9px] text-sm font-semibold text-surface transition-transform active:scale-95">Save Changes</button>
      </div>

      {/* Tab bar */}
      <div className="-mx-4 flex gap-0 overflow-x-auto border-b border-border px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:px-0">
        {[...TABS, 'Delete Store' as const].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 cursor-pointer px-4 py-3 text-sm font-medium transition-colors ${
              tab === activeTab
                ? tab === 'Delete Store'
                  ? 'border-b-2 border-danger text-danger'
                  : 'border-b-2 border-brand-primary text-fg'
                : tab === 'Delete Store'
                  ? 'text-danger/60 hover:text-danger'
                  : 'text-muted-warm hover:text-fg'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-4 py-6 md:px-0">
        {activeTab === 'About' && <AboutTab />}
        {activeTab === 'Store' && <StoreTab />}
        {activeTab === 'Alerts' && <AlertsTab />}
        {activeTab === 'Promotions' && <PromotionsTab />}
        {activeTab === 'Subscription' && <SubscriptionTab />}
        {activeTab === 'Payments' && <PaymentsTab />}
        {activeTab === 'Contact Info' && <ContactInfoTab />}
        {activeTab === 'Delete Store' && <DeleteStoreTab />}
      </div>
    </div>
  )
}
