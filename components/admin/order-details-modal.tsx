'use client'

import { useState, useEffect } from 'react'
import { X, Check, ArrowDown, Package, XCircle, RotateCcw, ChevronRight } from 'lucide-react'

import type { AdminOrder, OrderStatus } from '@/lib/data/orders'
import { updateOrderStatusAction, markOrderPaidAction, shipViaShiprocketAction } from '@/app/admin/orders/actions'
import { getAvailableActions, timestampsFor, CANCEL_REASONS } from '@/lib/order-status'

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

// statusKey is null for steps with no real OrderStatus of their own ("Awaiting Confirmation" is
// just pending's "current" label; "Out for Delivery" doesn't exist in the schema) — those never
// get their own timestamp.
const TIMELINE: { label: string; statusKey: OrderStatus | null }[] = [
  { label: 'Order Placed', statusKey: null },
  { label: 'Awaiting Confirmation', statusKey: null },
  { label: 'Order Confirmed', statusKey: 'confirmed' },
  { label: 'Shipped', statusKey: 'shipped' },
  { label: 'Out for Delivery', statusKey: null },
  { label: 'Delivered', statusKey: 'delivered' },
]

function getTimeline(status: string, createdAt: Date, events: { status: OrderStatus; changedAt: Date }[]) {
  const statusIdx: Record<string, number> = { pending: 1, confirmed: 2, shipped: 3, delivered: 5 }
  const currentIdx = statusIdx[status] ?? 1
  const timestamps = timestampsFor(events)
  return TIMELINE.map((step, i) => ({
    ...step,
    done: i < currentIdx,
    current: i === currentIdx,
    pending: i > currentIdx,
    date: i === 0 ? createdAt : step.statusKey ? timestamps[step.statusKey] : undefined,
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
  { key: 'returned', label: 'Mark Returned', sub: 'Customer returned this order', icon: RotateCcw, color: 'bg-[#9CA3AF]' },
] as const

type ActionKey = (typeof ACTIONS)[number]['key']

export function OrderDetailsModal({ order, onClose, onUpdated }: Props) {
  const [visible, setVisible] = useState(false)
  const [confirmKey, setConfirmKey] = useState<ActionKey | null>(null)
  const [trackingId, setTrackingId] = useState('')
  const [cancelReason, setCancelReason] = useState<string>(CANCEL_REASONS[0])
  const [cancelReasonOther, setCancelReasonOther] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [markingPaid, setMarkingPaid] = useState(false)
  const [markPaidError, setMarkPaidError] = useState('')
  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 250)
  }

  async function confirm() {
    if (!confirmAction) return
    const reason = confirmAction.key === 'cancelled' ? (cancelReason === 'Other' ? cancelReasonOther.trim() : cancelReason) : undefined
    setSaving(true)
    setSaveError('')
    const result = await updateOrderStatusAction(
      order.id,
      confirmAction.key,
      confirmAction.key === 'shipped' ? trackingId : undefined,
      reason
    )
    setSaving(false)
    if (result.error) {
      setSaveError(result.error)
      return
    }
    onUpdated({
      ...order,
      status: confirmAction.key,
      trackingId: confirmAction.key === 'shipped' ? trackingId : order.trackingId,
      cancelReason: reason ?? order.cancelReason,
    })
    setConfirmKey(null)
    setTrackingId('')
    setCancelReason(CANCEL_REASONS[0])
    setCancelReasonOther('')
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
    setConfirmKey(null)
    setTrackingId('')
  }

  async function markPaid() {
    setMarkingPaid(true)
    setMarkPaidError('')
    const result = await markOrderPaidAction(order.id)
    setMarkingPaid(false)
    if (result.error) {
      setMarkPaidError(result.error)
      return
    }
    setPaymentStatus('paid')
  }

  const canMarkPaid = (order.paymentProvider === 'upi_manual' || order.paymentProvider === 'cod') && paymentStatus === 'pending'
  const sc = STATUS_COLOR[order.status] ?? STATUS_COLOR.pending
  const timeline = getTimeline(order.status, order.createdAt, order.statusEvents)
  const address = order.address
  const confirmAction = ACTIONS.find((a) => a.key === confirmKey)
  const availableActions = getAvailableActions(order.status)
  const actions = ACTIONS.filter((a) => availableActions.includes(a.key))

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

          {/* Payment */}
          <div className="mb-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-fg">Payment</p>
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xs text-muted-warm">Method</p>
                  <p className="text-sm font-semibold text-fg">
                    {order.paymentProvider === 'upi_manual' ? 'UPI' : order.paymentProvider === 'cod' ? 'Pay on Delivery' : 'Razorpay'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xs text-muted-warm">Status</p>
                  <p className={`text-sm font-semibold ${paymentStatus === 'paid' ? 'text-success' : 'text-fg'}`}>
                    {paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                  </p>
                </div>
              </div>
              {order.paymentProvider === 'upi_manual' && order.paymentId && (
                <p className="mt-2 text-xs text-muted-warm">UTR entered by customer: <span className="font-mono font-semibold text-fg">{order.paymentId}</span> — cross-check this against your UPI app before confirming.</p>
              )}
              {order.paymentProvider === 'upi_manual' && order.paymentProofUrl && (
                <a href={order.paymentProofUrl} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={order.paymentProofUrl} alt="Payment screenshot" className="h-12 w-12 rounded-md border border-border object-cover" />
                  <span className="text-xs font-semibold text-brand-primary">View payment screenshot</span>
                </a>
              )}
              {canMarkPaid && (
                <button
                  onClick={() => void markPaid()}
                  disabled={markingPaid}
                  className="mt-3 w-full cursor-pointer rounded-lg bg-brand-primary p-2.5 text-sm font-semibold text-surface transition-transform active:scale-[0.98] disabled:opacity-50"
                >
                  {markingPaid ? 'Marking Paid…' : 'Mark Paid'}
                </button>
              )}
              {markPaidError && <p className="mt-2 text-xs text-danger">{markPaidError}</p>}
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
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-fg">Order Tracking Timeline</p>
              {order.trackingId && (
                <a
                  href={`https://shiprocket.co/tracking/${order.trackingId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-brand-primary underline"
                >
                  Track {order.trackingId} →
                </a>
              )}
            </div>
            <div className="flex flex-col">
              {timeline.map((step, i) => (
                <div key={step.label} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="relative flex size-5 shrink-0 items-center justify-center">
                      {step.current && (
                        <span className="absolute inline-flex size-5 animate-ping rounded-full bg-[#FB923C] opacity-60" />
                      )}
                      <div
                        className={`relative size-5 shrink-0 rounded-full border-2 ${
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
                    </div>
                    {i < timeline.length - 1 && (
                      <div className={`h-6 w-[2px] ${step.done ? 'bg-brand-primary' : 'bg-border'}`} />
                    )}
                  </div>
                  <div className="-mt-[2px] pb-4">
                    <p className={`text-sm font-semibold ${step.pending ? 'text-muted-warm/50' : 'text-fg'}`}>{step.label}</p>
                    <p className={`text-xs ${step.pending ? 'text-muted-warm/40' : 'text-muted-warm'}`}>
                      {step.done && step.date ? formatDate(step.date) : step.current ? 'Waiting for merchant action' : step.done ? '' : 'Pending'}
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
            {saveError && <p className="mb-2 text-xs text-danger">{saveError}</p>}
            {confirmAction ? (
              <div className="rounded-xl border border-border p-4">
                <p className="text-sm font-semibold text-fg">
                  {confirmAction.key === 'cancelled'
                    ? 'Permanently cancel this order? This cannot be undone.'
                    : `Confirm: ${confirmAction.label}?`}
                </p>
                {confirmAction.key === 'shipped' && (
                  <div className="mt-3 flex flex-col gap-2">
                    <input
                      autoFocus
                      value={trackingId}
                      onChange={(e) => setTrackingId(e.target.value)}
                      placeholder="Tracking number"
                      className="w-full rounded-md border border-border px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => void shipViaShiprocket()}
                      disabled={saving}
                      className="w-full cursor-pointer rounded-lg border border-border p-2 text-sm font-semibold text-fg transition-colors active:bg-bg disabled:opacity-50"
                    >
                      Or ship via Shiprocket (auto-fills tracking)
                    </button>
                  </div>
                )}
                {confirmAction.key === 'cancelled' && (
                  <div className="mt-3 flex flex-col gap-2">
                    <select
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm"
                    >
                      {CANCEL_REASONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    {cancelReason === 'Other' && (
                      <input
                        autoFocus
                        value={cancelReasonOther}
                        onChange={(e) => setCancelReasonOther(e.target.value)}
                        placeholder="Reason for cancellation"
                        className="w-full rounded-md border border-border px-3 py-2 text-sm"
                      />
                    )}
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => { setConfirmKey(null); setTrackingId(''); setCancelReason(CANCEL_REASONS[0]); setCancelReasonOther('') }}
                    className="grow cursor-pointer rounded-lg border border-border p-2.5 text-sm font-semibold text-fg transition-colors active:bg-bg"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={
                      saving ||
                      (confirmAction.key === 'shipped' && !trackingId.trim()) ||
                      (confirmAction.key === 'cancelled' && cancelReason === 'Other' && !cancelReasonOther.trim())
                    }
                    onClick={() => void confirm()}
                    className="grow cursor-pointer rounded-lg bg-brand-primary p-2.5 text-sm font-semibold text-surface transition-transform active:scale-[0.98] disabled:opacity-40"
                  >
                    Yes, {confirmAction.label}
                  </button>
                </div>
              </div>
            ) : actions.length === 0 ? (
              <p className="rounded-xl border border-border p-4 text-sm text-muted-warm">No further actions — this order is {STATUS_LABEL[order.status].toLowerCase()}.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {actions.map((action) => (
                  <button
                    key={action.key}
                    onClick={() => setConfirmKey(action.key)}
                    className="group flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:border-brand-primary/40 hover:bg-brand-primary/3 active:bg-bg"
                  >
                    <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${action.color}`}>
                      <action.icon className="size-4 text-surface" strokeWidth={2.5} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-fg">{action.label}</span>
                      <span className="block text-xs text-muted-warm">{action.sub}</span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-warm transition-transform group-hover:translate-x-0.5" />
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
