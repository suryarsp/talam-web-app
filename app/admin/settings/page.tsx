'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, AlertTriangle, X, GripVertical, Pencil } from 'lucide-react'
import Link from 'next/link'
import {
  getAboutAction,
  updateAboutAction,
  getStoreSettingsAction,
  updateStoreSettingsAction,
  getCategoriesAction,
  addCategoryAction,
  deleteCategoryAction,
  reorderCategoriesAction,
  getAlertsAction,
  updateAlertsAction,
  getPromotionsAction,
  createPromotionAction,
  togglePromotionAction,
  deletePromotionAction,
  getBannersAction,
  getActiveProductsForBannerAction,
  createBannerAction,
  toggleBannerAction,
  deleteBannerAction,
  moveBannerAction,
  getSubscriptionAction,
  getPaymentsSettingsAction,
  updatePaymentsSettingsAction,
  deleteStoreAction,
  startRazorpayOnboardingAction,
  refreshRazorpayStatusAction,
  type StoreSettings,
  type StoreSettingsInput,
  type CategoryItem,
  type NotificationPreferences,
  type PromotionItem,
  type CreatePromotionInput,
  type BannerItem,
  type SubscriptionInfo,
  type PaymentGatewayConfig,
} from './actions'
import { RichTextEditor } from '@/components/admin/rich-text-editor'
import { Dialog } from '@/components/ui/dialog'
import { Attachment, AttachmentMedia, AttachmentTrigger } from '@/components/ui/attachment'
import { ROOT_DOMAIN } from '@/lib/tenant-url'
import { InstagramIcon, FacebookIcon, YoutubeIcon, WhatsappIcon } from '@/components/icons/social-icons'
import { DEPARTMENTS, type Department } from '@/lib/departments'
import type { SocialLink } from '@/lib/data/tenant'
import { ContactInfoTab } from './contact-info-tab'
import { ShippingTab } from './shipping-tab'
import { Toggle, SectionLabel, useSavedFlash, isValidIndianMobile, isValidUpiId } from './settings-shared'
import { STORE_THEMES } from '@/lib/store-themes'

const TABS = ['About', 'Store', 'Alerts', 'Promotions', 'Carousel', 'Subscription', 'Payments', 'Shipping', 'Contact Info'] as const
type Tab = (typeof TABS)[number] | 'Delete Store'

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
    <Attachment title="Click to change" orientation="vertical" className="group/logo size-12 rounded-xl border-none bg-brand-primary/10 p-0" state={src ? 'done' : 'idle'}>
      <AttachmentTrigger render={<label />}>
        <input type="file" accept="image/*" className="sr-only" onChange={handleFile} />
      </AttachmentTrigger>
      <AttachmentMedia variant={src ? 'image' : 'icon'} className="size-full rounded-xl bg-transparent">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" />
        ) : (
          <span className="text-sm font-bold tracking-[0.04em] text-brand-primary">{initialLabel}</span>
        )}
      </AttachmentMedia>
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 opacity-0 transition-opacity group-hover/logo:opacity-100">
        <Pencil className="size-4 text-white" />
      </span>
    </Attachment>
  )
}

// ── About Tab ──
const SOCIAL_PLATFORM_PRESETS = ['Instagram', 'Facebook', 'YouTube', 'WhatsApp for Business'] as const

const SOCIAL_PLATFORM_META: Record<(typeof SOCIAL_PLATFORM_PRESETS)[number], { Icon: typeof InstagramIcon; placeholder: string }> = {
  Instagram: { Icon: InstagramIcon, placeholder: 'https://instagram.com/yourstore' },
  Facebook: { Icon: FacebookIcon, placeholder: 'https://facebook.com/yourstore' },
  YouTube: { Icon: YoutubeIcon, placeholder: 'https://youtube.com/@yourstore' },
  'WhatsApp for Business': { Icon: WhatsappIcon, placeholder: 'https://wa.me/919876543210' },
}

function AddSocialLinkDialog({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (link: SocialLink) => void }) {
  return (
    <Dialog open={open} onClose={onClose} position="center">
      <AddSocialLinkForm key={open ? 'open' : 'closed'} onClose={onClose} onAdd={onAdd} />
    </Dialog>
  )
}

function AddSocialLinkForm({ onClose, onAdd }: { onClose: () => void; onAdd: (link: SocialLink) => void }) {
  const [platform, setPlatform] = useState<string>('')
  const [url, setUrl] = useState('')

  function handleAdd() {
    if (!platform || !url.trim()) return
    onAdd({ platform, url: url.trim() })
    onClose()
  }

  return (
      <div className="p-6">
        <h2 className="font-marketing text-lg font-semibold text-fg">Add social link</h2>
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-fg">Platform</span>
            <div className="grid grid-cols-2 gap-2">
              {SOCIAL_PLATFORM_PRESETS.map((p) => {
                const { Icon } = SOCIAL_PLATFORM_META[p]
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlatform(p)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                      platform === p ? 'border-brand-primary bg-brand-primary/10 text-brand-primary' : 'border-border text-fg hover:border-brand-primary/50'
                    }`}
                  >
                    <Icon className="shrink-0" />
                    {p}
                  </button>
                )
              })}
            </div>
          </div>
          <Input
            label="Profile / Page URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder={platform ? SOCIAL_PLATFORM_META[platform as keyof typeof SOCIAL_PLATFORM_META]?.placeholder : 'https://instagram.com/yourstore'}
            autoFocus
          />
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 font-body text-sm font-semibold text-muted-warm hover:bg-bg">
            Cancel
          </button>
          <button
            type="button"
            disabled={!platform || !url.trim()}
            onClick={handleAdd}
            className="rounded-lg bg-brand-primary px-4 py-2 font-body text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            Add link
          </button>
        </div>
      </div>
  )
}

function AboutTab() {
  const [loaded, setLoaded] = useState(false)
  const [description, setDescription] = useState('')
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)

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
        <SectionLabel right={<button type="button" onClick={() => setLinkDialogOpen(true)} className="cursor-pointer text-xs font-semibold text-brand-primary">+ Add link</button>}>
          Social Links
        </SectionLabel>
        <div className="flex flex-col gap-3">
          {socialLinks.length === 0 && <p className="text-sm text-muted-warm">No social links yet. Add Instagram, Facebook, YouTube — anything.</p>}
          {socialLinks.map((link, i) => {
            const meta = SOCIAL_PLATFORM_META[link.platform as keyof typeof SOCIAL_PLATFORM_META]
            return (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-[9px]">
              <span className="flex size-7 shrink-0 items-center justify-center rounded bg-bg text-[10px] font-bold uppercase text-muted-warm">
                {meta ? <meta.Icon /> : link.platform.slice(0, 2) || '—'}
              </span>
              <span className="w-[140px] shrink-0 border-r border-border pr-2 text-sm font-semibold text-fg">{link.platform}</span>
              <input
                value={link.url}
                onChange={(e) => updateLink(i, { url: e.target.value })}
                placeholder={meta?.placeholder ?? 'https://instagram.com/yourstore'}
                className="min-w-0 flex-1 bg-transparent text-md text-fg outline-none"
              />
              <button type="button" onClick={() => setSocialLinks((prev) => prev.filter((_, j) => j !== i))} className="text-muted-warm hover:text-danger">
                <X className="size-4" />
              </button>
            </div>
            )
          })}
        </div>
        <AddSocialLinkDialog open={linkDialogOpen} onClose={() => setLinkDialogOpen(false)} onAdd={(link) => setSocialLinks((prev) => [...prev, link])} />
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

/** Shared destructive-action confirm dialog, styled to match the other dialogs in this file. */
function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  busy?: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onClose={onClose} position="center">
      <div className="p-6">
        <h2 className="font-marketing text-lg font-semibold text-fg">{title}</h2>
        <p className="mt-2 text-sm text-muted-warm">{description}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 font-body text-sm font-semibold text-muted-warm hover:bg-bg">
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="rounded-lg bg-danger px-4 py-2 font-body text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  )
}

// ── Store Tab ──
function AddCategoryDialog({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (category: CategoryItem) => void }) {
  return (
    <Dialog open={open} onClose={onClose} position="center">
      <AddCategoryForm key={open ? 'open' : 'closed'} onClose={onClose} onAdded={onAdded} />
    </Dialog>
  )
}

function AddCategoryForm({ onClose, onAdded }: { onClose: () => void; onAdded: (category: CategoryItem) => void }) {
  const [name, setName] = useState('')
  const [department, setDepartment] = useState<Department | ''>('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

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
  )
}

function CategoriesEditor() {
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<CategoryItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const dragIndex = useRef<number | null>(null)

  useEffect(() => {
    getCategoriesAction().then((cats) => {
      setCategories(cats)
      setLoaded(true)
    })
  }, [])

  async function handleDelete() {
    if (!pendingDelete) return
    setError('')
    setDeleting(true)
    const result = await deleteCategoryAction(pendingDelete.id)
    setDeleting(false)
    if (result.error) {
      setError(result.error)
      setPendingDelete(null)
      return
    }
    setCategories((prev) => prev.filter((c) => c.id !== pendingDelete.id))
    setPendingDelete(null)
  }

  function handleDrop(dropIndex: number) {
    const from = dragIndex.current
    dragIndex.current = null
    setDraggingIndex(null)
    setDragOverIndex(null)
    if (from === null || from === dropIndex) return
    setCategories((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(dropIndex, 0, moved)
      reorderCategoriesAction(next.map((c) => c.id))
      return next
    })
  }

  if (!loaded) return <p className="py-6 text-center text-sm text-muted-warm">Loading…</p>

  const departmentLabel = (value: string | null) => DEPARTMENTS.find((d) => d.value === value)?.label

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      {categories.length === 0 && <p className="px-1 py-2 text-sm text-muted-warm">No categories yet — add one below.</p>}
      {categories.map((cat, i) => (
        <div
          key={cat.id}
          draggable
          onDragStart={() => {
            dragIndex.current = i
            setDraggingIndex(i)
          }}
          onDragOver={(e) => {
            e.preventDefault()
            if (dragOverIndex !== i) setDragOverIndex(i)
          }}
          onDragEnd={() => {
            dragIndex.current = null
            setDraggingIndex(null)
            setDragOverIndex(null)
          }}
          onDrop={() => handleDrop(i)}
          className={`flex items-center gap-2 rounded-lg border-b border-t-2 border-border-light py-2 pl-1 transition-colors last:border-b-0 ${
            draggingIndex === i ? 'opacity-40' : ''
          } ${dragOverIndex === i && draggingIndex !== i ? 'border-t-brand-primary' : 'border-t-transparent'}`}
        >
          <GripVertical className="size-4 shrink-0 cursor-grab text-muted-warm active:cursor-grabbing" />
          <span className="flex-1 text-md text-fg">{cat.name}</span>
          {departmentLabel(cat.department) && (
            <span className="rounded-full bg-bg px-2 py-0.5 text-2xs font-semibold text-muted-warm">{departmentLabel(cat.department)}</span>
          )}
          <button type="button" onClick={() => setPendingDelete(cat)} className="text-muted-warm hover:text-danger">
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
      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete "${pendingDelete?.name}"?`}
        description="Products in this category must be moved or deleted first. This can't be undone."
        confirmLabel="Delete category"
        busy={deleting}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}

function StoreTab() {
  const [loaded, setLoaded] = useState(false)
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [saved, flash] = useSavedFlash()
  const [error, setError] = useState('')
  const [whatsappError, setWhatsappError] = useState('')

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
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-warm">Store theme</p>
          <div className="flex flex-wrap items-center gap-4">
            {STORE_THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => save({ brandColor: theme.color })}
                className="flex flex-col items-center gap-1"
              >
                <span
                  className={`size-10 shrink-0 rounded-full transition-transform active:scale-90 ${theme.color === settings.brandColor ? 'ring-[3px] ring-fg ring-offset-2' : ''}`}
                  style={{ backgroundColor: theme.color }}
                />
                <span className="text-2xs font-medium text-muted-warm">{theme.name}</span>
              </button>
            ))}
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
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-fg">Default Shipping Weight (kg)</span>
            <input
              type="number"
              min="0"
              step="0.001"
              defaultValue={settings.defaultShippingWeight}
              onBlur={(e) => Number(e.target.value) !== settings.defaultShippingWeight && save({ defaultShippingWeight: Number(e.target.value) })}
              className="rounded-lg border border-border bg-bg px-3 py-[9px] text-md text-fg outline-none"
            />
            <span className="text-xs text-muted-warm">Used to quote delivery for products with no weight of their own.</span>
          </label>
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
                onBlur={(e) => {
                  const value = e.target.value.trim()
                  if (value && !isValidIndianMobile(value)) {
                    setWhatsappError('Enter a valid 10-digit mobile number.')
                    return
                  }
                  setWhatsappError('')
                  if (value !== settings.whatsappNumber) {
                    // A cleared/invalid number can't back a floating button — force the toggle
                    // off with it rather than leaving "Show WhatsApp Button" enabled with nothing behind it.
                    const patch: StoreSettingsInput = { whatsappNumber: value }
                    if (!value && settings.showWhatsappButton) patch.showWhatsappButton = false
                    save(patch)
                  }
                }}
                className={`min-w-0 flex-1 rounded-lg border bg-bg px-3 py-[9px] text-md text-fg outline-none focus:border-brand-primary ${whatsappError ? 'border-danger' : 'border-border'}`}
              />
            </div>
            {whatsappError && <span className="text-xs text-danger">{whatsappError}</span>}
          </label>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-md font-semibold text-fg">Show WhatsApp Button on Store</p>
              <p className="text-xs text-muted-warm">
                {settings.whatsappNumber ? 'Floating button visible to all visitors' : 'Add a WhatsApp number above to enable this'}
              </p>
            </div>
            <Toggle
              checked={settings.showWhatsappButton}
              disabled={!settings.showWhatsappButton && !settings.whatsappNumber}
              onChange={(checked) => {
                if (checked && !settings.whatsappNumber) return
                save({ showWhatsappButton: checked })
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Alerts Tab ──
const ALERT_SECTIONS: { label: string; items: { key: keyof NotificationPreferences; name: string; sub: string; critical?: boolean; offWarning?: string }[] }[] = [
  {
    label: 'Order Alerts',
    items: [
      { key: 'newOrder', name: 'New order placed', sub: 'Email you when a customer places an order' },
      { key: 'orderStatusUpdated', name: 'Order status updated', sub: "Confirmation when you update an order's status" },
      {
        key: 'orderCancelled',
        name: 'Order cancelled',
        sub: 'Alert when an order is cancelled by customer or you',
        critical: true,
        offWarning: "Cancellations won't reach you — a customer-cancelled order could sit unnoticed until you check the orders list yourself.",
      },
      {
        key: 'lowStock',
        name: 'Low stock warning',
        sub: 'When a product drops below 5 units',
        critical: true,
        offWarning: "You won't be warned before a product sells out — it can go out of stock without you knowing to restock it.",
      },
    ],
  },
  {
    label: 'Payment Alerts',
    items: [
      {
        key: 'paymentReceived',
        name: 'Payment received',
        sub: "Confirm when a customer's payment is verified",
        critical: true,
        offWarning: "You won't get confirmation that a payment cleared — you could end up shipping an order before verifying it was actually paid for.",
      },
      {
        key: 'paymentFailed',
        name: 'Payment failed / UTR pending',
        sub: "When UPI customer hasn't submitted UTR after 2 hours",
        critical: true,
        offWarning: "Stuck UPI payments won't be flagged — an order can sit unpaid for hours with no nudge to follow up with the customer.",
      },
      {
        key: 'refundInitiated',
        name: 'Refund initiated',
        sub: 'Alert when a refund is triggered via gateway',
        critical: true,
        offWarning: "You won't be told when money goes back to a customer — refunds could happen without your knowledge.",
      },
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
  const [pendingOff, setPendingOff] = useState<{ key: keyof NotificationPreferences; name: string; offWarning: string } | null>(null)

  useEffect(() => {
    getAlertsAction().then(setPrefs)
  }, [])

  function commitToggle(key: keyof NotificationPreferences, checked: boolean) {
    setPrefs((prev) => (prev ? { ...prev, [key]: checked } : prev))
    updateAlertsAction({ [key]: checked })
  }

  function handleToggle(key: keyof NotificationPreferences, checked: boolean, name: string, critical?: boolean, offWarning?: string) {
    if (!checked && critical) {
      setPendingOff({ key, name, offWarning: offWarning ?? '' })
      return
    }
    commitToggle(key, checked)
  }

  if (!prefs) return <p className="py-12 text-center text-sm text-muted-warm">Loading…</p>

  return (
    <div className="flex flex-col gap-8">
      {ALERT_SECTIONS.map((section) => (
        <div key={section.label}>
          <SectionLabel>{section.label}</SectionLabel>
          <div className="flex flex-col divide-y divide-border-light rounded-lg border border-border">
            {section.items.map((item) => (
              <AlertRow
                key={item.key}
                name={item.name}
                sub={item.sub}
                checked={prefs[item.key]}
                onChange={(v) => handleToggle(item.key, v, item.name, item.critical, item.offWarning)}
              />
            ))}
          </div>
        </div>
      ))}
      <ConfirmDialog
        open={pendingOff !== null}
        title={`Turn off "${pendingOff?.name}"?`}
        description={pendingOff?.offWarning ?? ''}
        confirmLabel="Turn off"
        onClose={() => setPendingOff(null)}
        onConfirm={() => {
          if (pendingOff) commitToggle(pendingOff.key, false)
          setPendingOff(null)
        }}
      />
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

function CreateBannerDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [products, setProducts] = useState<{ id: string; name: string }[]>([])
  const [productId, setProductId] = useState('')
  const [headline, setHeadline] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) getActiveProductsForBannerAction().then(setProducts)
  }, [open])

  function reset() {
    setProductId('')
    setHeadline('')
    setSubtitle('')
    setError('')
  }

  async function handleCreate() {
    setSaving(true)
    setError('')
    const result = await createBannerAction({ productId, headline: headline || undefined, subtitle: subtitle || undefined })
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
        <h2 className="font-marketing text-lg font-semibold text-fg">Feature a Product</h2>
        <div className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-fg">Product</span>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-[11px] text-md text-fg outline-none focus:border-brand-primary"
            >
              <option value="">Select a product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <Input label="Headline (optional)" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Defaults to the product name" />
          <Input label="Subtitle (optional)" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Defaults to the category" />
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={() => { reset(); onClose() }} className="rounded-lg px-4 py-2 font-body text-sm font-semibold text-muted-warm hover:bg-bg">
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || !productId}
            onClick={handleCreate}
            className="rounded-lg bg-brand-primary px-4 py-2 font-body text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'Adding…' : 'Add to Carousel'}
          </button>
        </div>
      </div>
    </Dialog>
  )
}

function CarouselTab() {
  const [banners, setBanners] = useState<BannerItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  const reload = useCallback(() => {
    getBannersAction().then((b) => {
      setBanners(b)
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  async function handleToggle(id: string, active: boolean) {
    setBanners((prev) => prev.map((b) => (b.id === id ? { ...b, isActive: active } : b)))
    await toggleBannerAction(id, active)
  }

  async function handleDelete(id: string) {
    setBanners((prev) => prev.filter((b) => b.id !== id))
    await deleteBannerAction(id)
  }

  async function handleMove(id: string, direction: 'up' | 'down') {
    await moveBannerAction(id, direction)
    reload()
  }

  if (!loaded) return <p className="py-12 text-center text-sm text-muted-warm">Loading…</p>

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-warm">Homepage Carousel</p>
          <button type="button" onClick={() => setDialogOpen(true)} className="rounded-lg border border-brand-primary px-4 py-2 text-sm font-semibold text-brand-primary">
            + Feature a Product
          </button>
        </div>
        <p className="mb-3 text-xs text-muted-warm">
          Products featured here appear in the homepage hero. If none are active, the storefront shows your most recent active products instead.
        </p>
        {banners.length === 0 && <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-warm">No products featured yet.</p>}
        {banners.length > 0 && (
          <div className="flex flex-col gap-3">
            {banners.map((b, i) => (
              <div key={b.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <div className="flex flex-col gap-0.5">
                  <button type="button" disabled={i === 0} onClick={() => handleMove(b.id, 'up')} className="text-muted-warm hover:text-fg disabled:opacity-30">
                    <ChevronLeft className="size-3.5 rotate-90" />
                  </button>
                  <button type="button" disabled={i === banners.length - 1} onClick={() => handleMove(b.id, 'down')} className="text-muted-warm hover:text-fg disabled:opacity-30">
                    <ChevronLeft className="size-3.5 -rotate-90" />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-fg">{b.headline || b.productName}</p>
                  <p className="truncate text-xs text-muted-warm">{b.productName}{b.subtitle ? ` · ${b.subtitle}` : ''}</p>
                </div>
                <Toggle checked={b.isActive} onChange={(v) => handleToggle(b.id, v)} />
                <button type="button" onClick={() => handleDelete(b.id)} className="text-muted-warm hover:text-danger">
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <CreateBannerDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreated={reload} />
    </div>
  )
}

// ── Subscription Tab (read-only: no billing provider wired up yet) ──
// `trial` and `growth` stay here so existing tenants on those tiers still render correctly —
// only `starter`/`pro` are offered as picks (see AVAILABLE_PLAN_KEYS below), matching the
// marketing page's two-plan model.
const PLAN_COPY: Record<'trial' | 'starter' | 'growth' | 'pro', { name: string; price: string; features: string[]; missing: string[]; note: string }> = {
  trial: { name: 'Trial', price: '14-day free trial', features: ['Full Starter features', 'No card required'], missing: [], note: 'Converts to Starter after 14 days' },
  starter: { name: 'Starter', price: '₹499 /mo', features: ['100 products', '500 OTP logins/mo', 'WhatsApp button', 'Discount codes', 'Wishlist'], missing: [], note: 'Badge hidden' },
  growth: { name: 'Growth', price: '₹999 /mo', features: ['250 products', '1,000 OTP logins/mo', 'WhatsApp button', 'Discount codes', 'Wishlist', 'Advanced analytics'], missing: [], note: 'Legacy plan — no longer offered' },
  pro: { name: 'Pro', price: '₹1,499 /mo', features: ['Unlimited products', '2,000 OTP logins/mo', 'WhatsApp button', 'Advanced analytics', 'Priority support'], missing: [], note: 'Badge hidden' },
}
const AVAILABLE_PLAN_KEYS = ['starter', 'pro'] as const

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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {AVAILABLE_PLAN_KEYS.map((key) => {
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
type RazorpayStatus = 'upi_manual' | 'pending' | 'needs_clarification' | 'activated' | 'rejected'

const RAZORPAY_STATUS_LABEL: Record<RazorpayStatus, string> = {
  upi_manual: 'Not connected',
  pending: 'Verification pending',
  needs_clarification: 'Needs more info',
  activated: 'Activated',
  rejected: 'Rejected',
}

function PaymentsTab() {
  const [loaded, setLoaded] = useState(false)
  const [config, setConfig] = useState<PaymentGatewayConfig | null>(null)
  const [locked, setLocked] = useState(false)
  const [lockedCount, setLockedCount] = useState(0)
  const [error, setError] = useState('')
  const [saved, flash] = useSavedFlash()
  const [razorpayStatus, setRazorpayStatus] = useState<RazorpayStatus>('upi_manual')
  const [connecting, setConnecting] = useState(false)
  const [razorpayError, setRazorpayError] = useState('')

  useEffect(() => {
    getPaymentsSettingsAction().then((r) => {
      setConfig(r.config)
      setLocked(r.locked)
      setLockedCount(r.lockedCount)
      // Previously never fetched — the status chip stayed hardcoded to "Not connected" even
      // when Razorpay was pending/activated, until a Connect/Refresh click happened to run.
      setRazorpayStatus(r.config.razorpay.status ?? 'upi_manual')
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

  const handleConnect = useCallback(async () => {
    setConnecting(true)
    setRazorpayError('')
    try {
      const result = await startRazorpayOnboardingAction()
      if ('error' in result) {
        setRazorpayError(result.error)
        return
      }
      setRazorpayStatus('pending')
      window.open(result.onboardingUrl, '_blank')
    } catch {
      // createLinkedAccount can throw (network error, Razorpay API error) — without this catch
      // the button was stuck on "Connecting…" forever with no feedback.
      setRazorpayError('Could not reach Razorpay. Please try again.')
    } finally {
      setConnecting(false)
    }
  }, [])

  const handleRefresh = useCallback(async () => {
    const result = await refreshRazorpayStatusAction()
    if ('error' in result) setRazorpayError(result.error)
    else setRazorpayStatus(result.status)
  }, [])

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
              <Toggle
                checked={config.upi.enabled}
                disabled={locked || (!config.upi.enabled && !isValidUpiId(config.upi.upiId))}
                onChange={(v) => {
                  if (locked) return
                  if (v && !isValidUpiId(config.upi.upiId)) return
                  save({ ...config, upi: { ...config.upi, enabled: v } })
                }}
              />
            </div>
          </div>
          <div>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-fg">UPI ID</span>
              <input
                defaultValue={config.upi.upiId}
                disabled={locked}
                onBlur={(e) => e.target.value !== config.upi.upiId && save({ ...config, upi: { ...config.upi, upiId: e.target.value } })}
                placeholder="name@bank"
                className="rounded-lg border border-border bg-surface px-3 py-[11px] text-md text-fg outline-none focus:border-brand-primary disabled:opacity-60"
              />
            </label>
            {config.upi.enabled ? (
              <p className="mt-1 text-xs text-muted-warm">Customers scan your QR and share UTR manually to confirm payment</p>
            ) : (
              <p className="mt-1 text-xs text-muted-warm">
                {isValidUpiId(config.upi.upiId) ? 'Looks good — flip the toggle to enable UPI.' : 'Enter a valid UPI ID (e.g. name@bank) to enable this gateway.'}
              </p>
            )}
          </div>
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
              <span className="flex h-10 w-14 items-center justify-center rounded-lg bg-[#1A1040] text-[9px] font-bold text-amber">COD</span>
              <div>
                <p className="text-md font-semibold text-fg">Pay on Delivery</p>
                <p className="text-xs text-muted-warm">0% fee · Customer pays the courier on arrival</p>
              </div>
            </div>
            <Toggle checked={config.cod.enabled} onChange={(v) => !locked && save({ ...config, cod: { enabled: v } })} />
          </div>
        </div>

        <div className="rounded-lg border border-border p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-14 items-center justify-center rounded-lg bg-[#072654] text-[9px] font-bold text-surface">RZRPAY</span>
              <div>
                <p className="text-md font-semibold text-fg">Razorpay</p>
                <p className="text-xs text-muted-warm">2% per transaction · Card, UPI, netbanking · KYC via Razorpay</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Toggle checked={config.razorpay.enabled} onChange={(v) => !locked && save({ ...config, razorpay: { enabled: v } })} />
              <span
                className={`rounded-full px-2 py-0.5 text-2xs font-semibold ${razorpayStatus === 'activated' ? 'bg-success-bg text-success' : 'bg-[#FEF3C7] text-[#92400E]'}`}
              >
                {RAZORPAY_STATUS_LABEL[razorpayStatus]}
              </span>
              {razorpayStatus === 'upi_manual' && (
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={connecting}
                  className="rounded-lg bg-brand-primary px-3 py-2 text-sm font-semibold text-surface disabled:opacity-50"
                >
                  {connecting ? 'Connecting…' : 'Connect Razorpay'}
                </button>
              )}
              {(razorpayStatus === 'pending' || razorpayStatus === 'needs_clarification') && (
                <button type="button" onClick={handleRefresh} className="text-sm font-semibold text-fg underline">
                  Refresh status
                </button>
              )}
            </div>
          </div>
          {razorpayError && <p className="mt-2 text-xs text-danger">{razorpayError}</p>}
        </div>
      </div>

      {saved && <p className="text-center text-xs font-medium text-success">✓ Saved</p>}
      {locked && <p className="text-center text-xs text-muted-warm">🔒 Settings are locked while you have pending orders.</p>}
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
  const searchParams = useSearchParams()
  const urlTab = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<Tab>('Store')
  const [syncedUrlTab, setSyncedUrlTab] = useState(urlTab)

  if (urlTab !== syncedUrlTab) {
    setSyncedUrlTab(urlTab)
    if (urlTab && ([...TABS, 'Delete Store'] as readonly string[]).includes(urlTab)) setActiveTab(urlTab as Tab)
  }

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
        {activeTab === 'Carousel' && <CarouselTab />}
        {activeTab === 'Subscription' && <SubscriptionTab />}
        {activeTab === 'Payments' && <PaymentsTab />}
        {activeTab === 'Shipping' && <ShippingTab />}
        {activeTab === 'Contact Info' && <ContactInfoTab />}
        {activeTab === 'Delete Store' && <DeleteStoreTab />}
      </div>
    </div>
  )
}
