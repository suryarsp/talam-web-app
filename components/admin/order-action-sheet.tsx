'use client'

import { useState, useEffect } from 'react'
import { Check, ArrowDown, Package, X as XIcon, RotateCcw, Plus } from 'lucide-react'
import type { AdminOrder } from '@/lib/data/orders'
import { updateOrderStatusAction, shipViaShiprocketAction } from '@/app/admin/orders/actions'
import { getAvailableActions, CANCEL_REASONS } from '@/lib/order-status'

type Props = {
  order: AdminOrder
  onClose: () => void
  onViewDetails: (order: AdminOrder) => void
  onUpdated: (order: AdminOrder) => void
}

const ACTIONS = [
  { key: 'confirmed', label: 'Confirm Order', sub: 'Mark as confirmed', icon: Check, color: 'bg-brand-primary' },
  { key: 'shipped', label: 'Ship Order', sub: 'Add tracking number', icon: ArrowDown, color: 'bg-[#3B82F6]' },
  { key: 'delivered', label: 'Mark Delivered', sub: 'Order received by customer', icon: Package, color: 'bg-[#22C55E]' },
  { key: 'cancelled', label: 'Cancel Order', sub: 'Permanently cancel this order', icon: XIcon, color: 'bg-danger' },
  { key: 'returned', label: 'Mark Returned', sub: 'Customer returned this order', icon: RotateCcw, color: 'bg-[#9CA3AF]' },
  { key: 'details', label: 'View Full Details', sub: 'See order history & timeline', icon: Plus, color: 'bg-muted-warm' },
] as const

export function OrderActionSheet({ order, onClose, onViewDetails, onUpdated }: Props) {
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const availableActions = getAvailableActions(order.status)
  const actions = ACTIONS.filter((a) => a.key === 'details' || availableActions.includes(a.key))

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 250)
  }

  async function applyStatus(status: 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'returned', trackingId?: string, cancelReason?: string) {
    setSaving(true)
    setSaveError('')
    const result = await updateOrderStatusAction(order.id, status, trackingId, cancelReason)
    setSaving(false)
    if (result.error) {
      setSaveError(result.error)
      return
    }
    onUpdated({ ...order, status, trackingId: trackingId ?? order.trackingId, cancelReason: cancelReason ?? order.cancelReason })
    handleClose()
  }

  async function shipViaShiprocket() {
    setSaving(true)
    setSaveError('')
    const result = await shipViaShiprocketAction(order.id)
    setSaving(false)
    if (result.error) {
      setSaveError(result.error)
      return
    }
    onUpdated({ ...order, status: 'shipped', trackingId: result.trackingId ?? order.trackingId })
    handleClose()
  }

  function handleAction(key: string) {
    if (key === 'details') {
      setVisible(false)
      setTimeout(() => onViewDetails(order), 250)
      return
    }
    if (key === 'shipped' || key === 'cancelled') {
      setPendingStatus(key)
      return
    }
    void applyStatus(key as 'confirmed' | 'delivered' | 'returned')
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end bg-black/40 transition-opacity duration-250 md:items-center md:justify-center ${visible ? 'opacity-100' : 'opacity-0'}`}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div
        className={`w-full rounded-t-2xl bg-surface py-5 shadow-lg transition-transform duration-250 ease-out md:max-w-sm md:rounded-2xl ${
          visible ? 'translate-y-0 md:scale-100' : 'translate-y-full md:translate-y-0 md:scale-95'
        }`}
      >
        <div className="mb-3 flex justify-center md:hidden">
          <div className="h-1 w-8 rounded-[2px] bg-border" />
        </div>
        <div className="mb-4 px-5">
          <p className="text-base font-bold text-fg">Order Actions</p>
        </div>
        {saveError && <p className="mb-3 px-5 text-xs text-danger">{saveError}</p>}
        <div className="flex flex-col">
          {actions.map((action) => (
            <div key={action.key}>
              <button
                type="button"
                onClick={() => handleAction(action.key)}
                className="flex w-full cursor-pointer items-center gap-3 border-b border-border px-5 py-4 text-left transition-colors active:bg-bg"
              >
                <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${action.color}`}>
                  <action.icon className="size-[14px] text-surface" strokeWidth={2.5} />
                </span>
                <span>
                  <span className="block text-md font-semibold text-fg">{action.label}</span>
                  <span className="block text-xs text-muted-warm">{action.sub}</span>
                </span>
              </button>
              {pendingStatus === action.key && action.key === 'shipped' && (
                <div className="flex flex-col gap-2 border-b border-border bg-bg px-5 py-3">
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault()
                      const trackingId = new FormData(e.currentTarget).get('trackingId') as string
                      void applyStatus('shipped', trackingId)
                    }}
                  >
                    <input name="trackingId" required placeholder="Tracking number" className="grow rounded-md border border-border px-2 py-1 text-sm" />
                    <button type="submit" disabled={saving} className="rounded-md bg-brand-primary px-3 py-1 text-sm font-semibold text-surface transition-transform active:scale-95 disabled:opacity-50">Save</button>
                  </form>
                  <button
                    type="button"
                    onClick={() => void shipViaShiprocket()}
                    disabled={saving}
                    className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold text-fg transition-colors active:bg-border disabled:opacity-50"
                  >
                    Or ship via Shiprocket (auto-fills tracking)
                  </button>
                </div>
              )}
              {pendingStatus === action.key && action.key === 'cancelled' && (
                <form
                  className="flex flex-col gap-2 border-b border-border bg-bg px-5 py-3"
                  onSubmit={(e) => {
                    e.preventDefault()
                    const data = new FormData(e.currentTarget)
                    const reason = data.get('reason') as string
                    const other = (data.get('reasonOther') as string)?.trim()
                    void applyStatus('cancelled', undefined, reason === 'Other' ? other : reason)
                  }}
                >
                  <select name="reason" defaultValue={CANCEL_REASONS[0]} className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm">
                    {CANCEL_REASONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <input name="reasonOther" placeholder="Reason (if Other)" className="w-full rounded-md border border-border px-2 py-1.5 text-sm" />
                  <button type="submit" disabled={saving} className="rounded-md bg-danger px-3 py-1.5 text-sm font-semibold text-surface transition-transform active:scale-95 disabled:opacity-50">Cancel Order</button>
                </form>
              )}
            </div>
          ))}
        </div>
        <div className="mt-2 border-t border-border px-5 pt-3">
          <button onClick={handleClose} className="w-full cursor-pointer rounded-lg bg-bg p-3 text-md font-semibold text-fg transition-colors active:bg-border">Close</button>
        </div>
      </div>
    </div>
  )
}
