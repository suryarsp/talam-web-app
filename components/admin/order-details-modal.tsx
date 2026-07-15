'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

import type { MockOrder } from '@/app/admin/orders/page'

type Order = MockOrder

type Props = {
  order: Order
  onClose: () => void
}

const STATUS_COLOR: Record<string, { border: string; bg: string; text: string }> = {
  Pending:   { border: '#FB923C', bg: '#FB923C1A', text: '#9A3412' },
  Confirmed: { border: '#6366F1', bg: '#6366F11A', text: '#4338CA' },
  Shipped:   { border: '#3B82F6', bg: '#3B82F61A', text: '#1D4ED8' },
  Delivered: { border: '#22C55E', bg: '#22C55E1A', text: '#166534' },
}

const STATUS_LABEL: Record<string, string> = {
  Pending: 'Pending Confirmation',
  Confirmed: 'Confirmed',
  Shipped: 'Shipped',
  Delivered: 'Delivered',
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
  const statusIdx: Record<string, number> = { Pending: 1, Confirmed: 2, Shipped: 3, Delivered: 5 }
  const currentIdx = statusIdx[status] ?? 1
  return TIMELINE.map((step, i) => ({
    ...step,
    done: i < currentIdx,
    current: i === currentIdx,
    pending: i > currentIdx,
  }))
}

export function OrderDetailsModal({ order, onClose }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 250)
  }

  const sc = STATUS_COLOR[order.status] ?? STATUS_COLOR.Pending
  const timeline = getTimeline(order.status)
  const itemName = order.items.split('·')[0].trim()

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end overflow-y-auto bg-black/40 transition-opacity duration-250 md:items-start md:justify-center md:py-10 ${visible ? 'opacity-100' : 'opacity-0'}`}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div
        className={`w-full rounded-t-2xl bg-surface shadow-lg transition-transform duration-250 ease-out md:max-w-[640px] md:rounded-2xl ${
          visible ? 'translate-y-0 md:scale-100' : 'translate-y-full md:translate-y-0 md:scale-95'
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface p-5 md:rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-fg">Order Details</h2>
            <p className="text-xs text-muted-warm">{order.code}</p>
          </div>
          <button onClick={handleClose} className="cursor-pointer transition-transform active:scale-90">
            <X className="size-6 text-muted-warm" />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-5 md:max-h-[70vh]">
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
              <p className="text-sm font-semibold text-fg">{order.time}</p>
            </div>
          </div>

          {/* Customer Information */}
          <div className="mb-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-fg">Customer Information</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xs text-muted-warm">Customer Name</p>
                <p className="text-sm font-semibold text-fg">{order.customer}</p>
              </div>
              <div>
                <p className="text-2xs text-muted-warm">Email Address</p>
                <p className="text-sm font-semibold text-fg">{order.email}</p>
              </div>
              <div>
                <p className="text-2xs text-muted-warm">Mobile Number</p>
                <p className="text-sm font-semibold text-fg">{order.mobile}</p>
              </div>
              <div>
                <p className="text-2xs text-muted-warm">Order Total</p>
                <p className="text-sm font-bold text-fg">{order.price}</p>
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="mb-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-fg">Delivery Address</p>
            <div className="rounded-xl border border-border p-4">
              <p className="mb-1 text-sm font-semibold text-fg">{order.customer}</p>
              {order.address.split('\n').map((line, i) => (
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
                    <th className="px-4 py-2 text-left text-2xs font-semibold uppercase tracking-wide text-muted-warm">Image</th>
                    <th className="px-4 py-2 text-left text-2xs font-semibold uppercase tracking-wide text-muted-warm">Product</th>
                    <th className="px-4 py-2 text-center text-2xs font-semibold uppercase tracking-wide text-muted-warm">Qty</th>
                    <th className="px-4 py-2 text-right text-2xs font-semibold uppercase tracking-wide text-muted-warm">Price</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-3">
                      <div className="flex size-12 items-center justify-center rounded-lg bg-[#E8577E]/20">
                        <div className="size-8 rounded bg-[#E8577E]/40" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-fg">{itemName}</p>
                      <p className="text-xs text-muted-warm">Size: L | Color: Pink</p>
                    </td>
                    <td className="px-4 py-3 text-center text-fg">{order.count ?? 1}</td>
                    <td className="px-4 py-3 text-right font-semibold text-fg">{order.price}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-brand-primary transition-all"
              style={{ width: order.status === 'Pending' ? '20%' : order.status === 'Confirmed' ? '40%' : order.status === 'Shipped' ? '60%' : '100%' }}
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
                      {step.done ? order.time.split('·')[0].trim() + ', 08:14 AM' : step.current ? 'Waiting for merchant action' : 'Pending'}
                    </p>
                    {step.current && <span className="mt-1 inline-block text-2xs font-bold uppercase tracking-wide text-[#FB923C]">Current</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex gap-3 border-t border-border bg-surface p-5 md:rounded-b-2xl">
          <button onClick={handleClose} className="grow cursor-pointer rounded-lg border border-border p-3 text-md font-semibold text-fg transition-colors active:bg-bg">Close</button>
          <button className="grow cursor-pointer rounded-lg bg-brand-primary p-3 text-md font-semibold text-surface transition-transform active:scale-[0.98]">Print Invoice</button>
        </div>
      </div>
    </div>
  )
}
