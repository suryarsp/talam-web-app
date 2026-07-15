'use client'

import { useState, useEffect } from 'react'
import { Check, ArrowDown, Package, X as XIcon, Plus } from 'lucide-react'
import type { MockOrder } from '@/app/admin/orders/page'

type Props = {
  order: MockOrder
  onClose: () => void
  onViewDetails: (order: MockOrder) => void
}

const ACTIONS = [
  { key: 'confirmed', label: 'Confirm Order', sub: 'Mark as confirmed', icon: Check, color: 'bg-brand-primary' },
  { key: 'shipped', label: 'Ship Order', sub: 'Add tracking number', icon: ArrowDown, color: 'bg-[#3B82F6]' },
  { key: 'delivered', label: 'Mark Delivered', sub: 'Order received by customer', icon: Package, color: 'bg-[#22C55E]' },
  { key: 'cancelled', label: 'Cancel Order', sub: 'Permanently cancel this order', icon: XIcon, color: 'bg-danger' },
  { key: 'details', label: 'View Full Details', sub: 'See order history & timeline', icon: Plus, color: 'bg-muted-warm' },
] as const

export function OrderActionSheet({ order, onClose, onViewDetails }: Props) {
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 250)
  }

  function handleAction(key: string) {
    if (key === 'details') {
      setVisible(false)
      setTimeout(() => onViewDetails(order), 250)
      return
    }
    setPendingStatus(key)
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
        <div className="flex flex-col">
          {ACTIONS.map((action) => (
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
                <form className="flex gap-2 border-b border-border bg-bg px-5 py-3">
                  <input name="trackingId" required placeholder="Tracking number" className="grow rounded-md border border-border px-2 py-1 text-sm" />
                  <button type="submit" className="rounded-md bg-brand-primary px-3 py-1 text-sm font-semibold text-surface transition-transform active:scale-95">Save</button>
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
