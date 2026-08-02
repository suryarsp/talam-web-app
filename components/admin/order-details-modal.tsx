'use client'

import { useState, useEffect } from 'react'
import { X, Check, ArrowDown, Package, XCircle } from 'lucide-react'

import type { AdminOrder } from '@/lib/data/orders'
import { updateOrderStatusAction } from '@/app/admin/orders/actions'

type Order = AdminOrder

type Props = {
  order: Order
  onClose: () => void
  onUpdated: (order: Order) => void
}

const STATUS_COLOR: Record<string, { border: string; bg: string; text: string }> = {
  pending:   { border: '#FB923C', bg: '#FB923C1A', text: '#9A3412' },
  confirmed: { border: '#6366F1', bg: '#6366F11A', text: '#4338CA' },
  shipped:   { border: '#3B82F6', bg: '#3B82F61A', text: '#1D4ED8' },
  delivered: { border: '#22C55E', bg: '#22C55E1A', text: '#166534' },
  cancelled: { border: '#EF4444', bg: '#EF44441A', text: '#991B1B' },
  returned:  { border: '#9CA3AF', bg: '#9CA3AF1A', text: '#374151' },
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending Confirmation',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
}

const PROGRESS_WIDTH: Record<string, string> = {
  pending: '20%',
  confirmed: '40%',
  shipped: '60%',
  delivered: '100%',
  cancelled: '100%',
  returned: '100%',
}

const TIMELINE = [
  { label: 'Order Placed', done: true },
  { label: 'Awaiting Confirmation', current: false },
  { label: 'Order Confirmed', current: false },
  { label: 'Shipped', current: false },
  { label: 'Out for Delivery', current: false },
  { label: 'Delivered', current: false },
]

function getTimeline(status: string) {
  const statusIdx: Record<string, number> = { pending: 1, confirmed: 2, shipped: 3, delivered: 5 }
  const currentIdx = statusIdx[status] ?? 1
  return TIMELINE.map((step, i) => ({
    ...step,
    done: i < currentIdx,
    current: i === currentIdx,
    pending: i > currentIdx,
  }))
}

function formatDate(date: Date) {
  return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

const ACTIONS = [
  { key: 'confirmed', label: 'Confirm Order', sub: 'Mark as confirmed', icon: Check, color: 'bg-brand-primary' },
  { key: 'shipped', label: 'Ship Order', sub: 'Add tracking number', icon: ArrowDown, color: 'bg-[#3B82F6]' },
  { key: 'delivered', label: 'Mark Delivered', sub: 'Order received by customer', icon: Package, color: 'bg-[#22C55E]' },
  { key: 'cancelled', label: 'Cancel Order', sub: 'Permanently cancel this order', icon: XCircle, color: 'bg-danger' },
] as const

type ActionKey = (typeof ACTIONS)[number]['key']

export function OrderDetailsModal({ order, onClose, onUpdated }: Props) {
  const [visible, setVisible] = useState(false)
  const [confirmKey, setConfirmKey] = useState<ActionKey | null>(null)
  const [trackingId, setTrackingId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 250)
  }

  async function confirm() {
    if (!confirmAction) return
    setSaving(true)
    await updateOrderStatusAction(order.id, confirmAction.key, confirmAction.key === 'shipped' ? trackingId : undefined)
    setSaving(false)
    onUpdated({ ...order, status: confirmAction.key, trackingId: confirmAction.key === 'shipped' ? trackingId : order.trackingId })
    setConfirmKey(null)
    setTrackingId('')
  }

  const sc = STATUS_COLOR[order.status] ?? STATUS_COLOR.pending
  const timeline = getTimeline(order.status)
  const address = order.address
  const confirmAction = ACTIONS.find((a) => a.key === confirmKey)

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end bg-black/40 transition-opacity duration-250 md:items-center md:justify-center md:py-10 ${visible ? 'opacity-100' : 'opacity-0'}`}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div
        className={`flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-surface shadow-lg transition-transform duration-250 ease-out md:max-h-[85vh] md:max-w-[640px] md:rounded-2xl ${
          visible ? 'translate-y-0 md:scale-100' : 'translate-y-full md:translate-y-0 md:scale-95'
        }`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border p-5 md:rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-fg">Order Details</h2>
            <p className="text-xs text-muted-warm">{order.code}</p>
          </div>
          <button onClick={handleClose} className="cursor-pointer transition-transform active:scale-90">
            <X className="size-6 text-muted-warm" />
          </button>
        </div>

        <div className="grow overflow-y-auto p-5">
          {/* Status + Date */}
          <div className="mb-6 flex items-center justify-between rounded-xl bg-bg p-4">
            <div>
              <p className="mb-1 text-2xs font-bold uppercase tracking-wide text-muted-warm">Current Status</p>
              <span
                className="inline-block rounded-[4px] px-2 py-[5px] text-xs font-bold"
                style={{ backgroundColor: sc.bg, border: `1px solid ${sc.border}`, color: sc.text }}
              >
                {STATUS_LABEL[order.status]}
              </span>
            </div>
            <div className="text-right">
              <p className="mb-1 text-2xs font-bold uppercase tracking-wide text-muted-warm">Order Date</p>
              <p className="text-sm font-semibold text-fg">{formatDate(order.createdAt)}</p>
            </div>
          </div>

          {/* Customer Information */}
          <div className="mb-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-fg">Customer Information</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xs text-muted-warm">Customer Name</p>
                <p className="text-sm font-semibold text-fg">{order.customerName}</p>
              </div>
              <div>
                <p className="text-2xs text-muted-warm">Email Address</p>
                <p className="text-sm font-semibold text-fg">{order.email ?? '—'}</p>
              </div>
              <div>
                <p className="text-2xs text-muted-warm">Mobile Number</p>
                <p className="text-sm font-semibold text-fg">{order.phone ?? '—'}</p>
              </div>
              <div>
                <p className="text-2xs text-muted-warm">Order Total</p>
                <p className="text-sm font-bold text-fg">₹{order.total.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="mb-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-fg">Delivery Address</p>
            <div className="rounded-xl border border-border p-4">
              <p className="mb-1 text-sm font-semibold text-fg">{address.name ?? order.customerName}</p>
              {[address.line1, address.line2, [address.city, address.state, address.pincode].filter(Boolean).join(', ')]
                .filter(Boolean)
                .map((line, i) => (
                  <p key={i} className="text-xs text-muted-warm">{line}</p>
                ))}
            </div>
          </div>

          {/* Order Items */}
          <div className="mb-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-fg">Order Items</p>
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg">
                    <th className="px-4 py-2 text-left text-2xs font-semibold uppercase tracking-wide text-muted-warm">Product</th>
                    <th className="px-4 py-2 text-center text-2xs font-semibold uppercase tracking-wide text-muted-warm">Qty</th>
                    <th className="px-4 py-2 text-right text-2xs font-semibold uppercase tracking-wide text-muted-warm">Price</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-fg">{order.itemsSummary}</p>
                    </td>
                    <td className="px-4 py-3 text-center text-fg">{order.itemCount}</td>
                    <td className="px-4 py-3 text-right font-semibold text-fg">₹{order.total.toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-brand-primary transition-all"
              style={{ width: PROGRESS_WIDTH[order.status] ?? '20%' }}
            />
          </div>

          {/* Order Tracking Timeline */}
          <div className="mb-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-fg">Order Tracking Timeline</p>
            <div className="flex flex-col">
              {timeline.map((step, i) => (
                <div key={step.label} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`size-5 shrink-0 rounded-full border-2 ${
                        step.done
                          ? 'border-brand-primary bg-brand-primary'
                          : step.current
                            ? 'border-[#FB923C] bg-[#FB923C]'
                            : 'border-border bg-surface'
                      }`}
                    >
                      {step.done && (
                        <svg viewBox="0 0 20 20" className="size-full text-surface"><path d="M6 10l3 3 5-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      )}
                    </div>
                    {i < timeline.length - 1 && (
                      <div className={`h-6 w-[2px] ${step.done ? 'bg-brand-primary' : 'bg-border'}`} />
                    )}
                  </div>
                  <div className="-mt-[2px] pb-4">
                    <p className={`text-sm font-semibold ${step.pending ? 'text-muted-warm/50' : 'text-fg'}`}>{step.label}</p>
                    <p className={`text-xs ${step.pending ? 'text-muted-warm/40' : 'text-muted-warm'}`}>
                      {step.done ? formatDate(order.createdAt) : step.current ? 'Waiting for merchant action' : 'Pending'}
                    </p>
                    {step.current && <span className="mt-1 inline-block text-2xs font-bold uppercase tracking-wide text-[#FB923C]">Current</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Actions */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-fg">Order Actions</p>
            {confirmAction ? (
              <div className="rounded-xl border border-border p-4">
                <p className="text-sm font-semibold text-fg">
                  {confirmAction.key === 'cancelled'
                    ? 'Permanently cancel this order? This cannot be undone.'
                    : `Confirm: ${confirmAction.label}?`}
                </p>
                {confirmAction.key === 'shipped' && (
                  <input
                    autoFocus
                    value={trackingId}
                    onChange={(e) => setTrackingId(e.target.value)}
                    placeholder="Tracking number"
                    className="mt-3 w-full rounded-md border border-border px-3 py-2 text-sm"
                  />
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => { setConfirmKey(null); setTrackingId('') }}
                    className="grow cursor-pointer rounded-lg border border-border p-2.5 text-sm font-semibold text-fg transition-colors active:bg-bg"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={saving || (confirmAction.key === 'shipped' && !trackingId.trim())}
                    onClick={() => void confirm()}
                    className="grow cursor-pointer rounded-lg bg-brand-primary p-2.5 text-sm font-semibold text-surface transition-transform active:scale-[0.98] disabled:opacity-40"
                  >
                    Yes, {confirmAction.label}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {ACTIONS.map((action) => (
                  <button
                    key={action.key}
                    onClick={() => setConfirmKey(action.key)}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors active:bg-bg"
                  >
                    <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${action.color}`}>
                      <action.icon className="size-[14px] text-surface" strokeWidth={2.5} />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-fg">{action.label}</span>
                      <span className="block text-xs text-muted-warm">{action.sub}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 gap-3 border-t border-border p-5 md:rounded-b-2xl">
          <button onClick={handleClose} className="grow cursor-pointer rounded-lg border border-border p-3 text-md font-semibold text-fg transition-colors active:bg-bg">Close</button>
          <button className="grow cursor-pointer rounded-lg bg-brand-primary p-3 text-md font-semibold text-surface transition-transform active:scale-[0.98]">Print Invoice</button>
        </div>
      </div>
    </div>
  )
}
