'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, ArrowUpDown, ClipboardList } from 'lucide-react'
import { OrderActionSheet } from '@/components/admin/order-action-sheet'
import { OrderDetailsModal } from '@/components/admin/order-details-modal'
import { StatCard } from '@/components/admin/stat-card'
import { EmptyState } from '@/components/admin/empty-state'
import { getOrdersAction } from './actions'
import type { AdminOrder } from '@/lib/data/orders'

const STATUS_LABEL: Record<AdminOrder['status'], string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
}

const STATUS_DOT: Record<AdminOrder['status'], string> = {
  pending: '#FB923C',
  confirmed: '#6366F1',
  shipped: '#3B82F6',
  delivered: '#22C55E',
  cancelled: '#EF4444',
  returned: '#9CA3AF',
}

type FilterKey = 'All' | AdminOrder['status']
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'All', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
]

function relativeDate(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000))
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [actionOrder, setActionOrder] = useState<AdminOrder | null>(null)
  const [detailOrder, setDetailOrder] = useState<AdminOrder | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterKey>('All')
  const [sortAsc, setSortAsc] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    getOrdersAction()
      .then(setOrders)
      .finally(() => setLoading(false))
  }, [])

  function refreshOrder(updated: AdminOrder) {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
  }

  const filterCount = useMemo(() => (key: FilterKey) => (key === 'All' ? orders.length : orders.filter((o) => o.status === key).length), [orders])

  const filtered = orders
    .filter((o) => activeFilter === 'All' || o.status === activeFilter)
    .filter((o) => !search || o.customerName.toLowerCase().includes(search.toLowerCase()) || o.code.toLowerCase().includes(search.toLowerCase()))
  const sorted = sortAsc ? [...filtered].reverse() : filtered

  const totalValue = orders.reduce((s, o) => s + o.total, 0)
  const pendingCount = orders.filter((o) => o.status === 'pending').length

  return (
    <div className="px-4 pb-24 md:px-0 md:pb-0">

      {/* ── Header ── */}
      <div className="flex items-end justify-between gap-4 pb-5 pt-1 md:pt-0">
        <div className="min-w-0">
          <p className="text-2xs font-medium uppercase tracking-[0.08em] text-muted-warm">{orders.length} orders</p>
          <h1 className="font-marketing mt-1 text-[26px] font-semibold leading-tight text-fg md:text-[32px]">
            Orders
          </h1>
        </div>
        {/* Desktop search + sort */}
        <div className="hidden shrink-0 items-center gap-3 md:flex">
          <div className="flex h-9 w-[220px] items-center gap-2 rounded-lg border border-border-light bg-surface px-3">
            <Search className="size-3.5 text-muted-warm" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="grow bg-transparent text-sm text-fg outline-none placeholder:text-muted-warm"
              placeholder="Search orders..."
            />
          </div>
          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border-light px-3 py-[7px] text-xs font-medium text-muted-warm transition-colors hover:text-fg"
          >
            <ArrowUpDown className="size-3.5" />
            {sortAsc ? 'Oldest' : 'Latest'}
          </button>
        </div>
        {/* Mobile search */}
        <button className="flex size-8 items-center justify-center md:hidden">
          <Search className="size-5 text-fg" strokeWidth={2} />
        </button>
      </div>

      {/* ── Summary strip ── */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:gap-4">
        <StatCard label="Total Value" value={`₹${totalValue.toLocaleString('en-IN')}`} />
        <StatCard label="Needs Attention" value={`${pendingCount} pending`} />
      </div>

      {/* ── Filter pills ── */}
      <div className="mb-5 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map(({ key, label }) => {
          const active = key === activeFilter
          const count = filterCount(key)
          return (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`shrink-0 cursor-pointer rounded-full px-4 py-[6px] text-xs font-semibold transition-colors ${
                active
                  ? 'bg-fg text-surface'
                  : 'text-muted-warm hover:text-fg'
              }`}
            >
              {label} ({count})
            </button>
          )
        })}
      </div>

      {!loading && sorted.length === 0 ? (
        <EmptyState icon={ClipboardList} message={orders.length === 0 ? 'No orders have been placed yet.' : 'No orders match this filter.'} />
      ) : (
        <>
          {/* ── Mobile: order cards ── */}
          <div className="flex flex-col gap-3 md:hidden">
            {sorted.map((order) => (
              <button
                key={order.id}
                onClick={() => setDetailOrder(order)}
                className="cursor-pointer rounded-lg border border-border-light p-3.5 text-left transition-colors active:bg-bg"
              >
                <div className="mb-2.5 flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-fg">{order.customerName}</p>
                    <p className="mt-0.5 text-xs text-muted-warm">{order.code} · {relativeDate(order.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full" style={{ backgroundColor: STATUS_DOT[order.status] }} />
                    <span className="text-xs font-medium text-muted-warm">{STATUS_LABEL[order.status]}</span>
                  </div>
                </div>
                <p className="mb-3 truncate text-xs text-muted-warm">{order.itemsSummary}</p>
                <div className="flex items-center justify-between">
                  <span className="font-marketing text-lg font-semibold text-fg">₹{order.total.toLocaleString('en-IN')}</span>
                  <span
                    onClick={(e) => { e.stopPropagation(); setActionOrder(order) }}
                    className="rounded-md bg-brand-primary px-3.5 py-[5px] text-xs font-semibold text-surface transition-transform active:scale-95"
                  >
                    Action
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* ── Desktop: clean table ── */}
          <div className="hidden md:block">
            <div className="grid grid-cols-[1fr_2fr_auto_auto_auto_auto] gap-x-6 border-b border-border-light pb-2 text-xs font-medium uppercase tracking-[0.06em] text-muted-warm">
              <span>Customer</span>
              <span>Items</span>
              <span className="text-right">Amount</span>
              <span className="text-center">Status</span>
              <span>Date</span>
              <span />
            </div>
            {sorted.map((order) => (
              <div
                key={order.id}
                onClick={() => setDetailOrder(order)}
                className="grid cursor-pointer grid-cols-[1fr_2fr_auto_auto_auto_auto] items-center gap-x-6 border-b border-border-light py-3.5 transition-colors hover:bg-bg"
              >
                <div>
                  <p className="text-sm font-semibold text-fg">{order.customerName}</p>
                  <p className="text-xs text-muted-warm">{order.code}</p>
                </div>
                <p className="truncate text-sm text-muted-warm">{order.itemsSummary}</p>
                <p className="font-marketing min-w-[72px] text-right text-[15px] font-semibold text-fg">₹{order.total.toLocaleString('en-IN')}</p>
                <div className="flex min-w-[90px] items-center justify-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ backgroundColor: STATUS_DOT[order.status] }} />
                  <span className="text-xs font-medium text-fg">{STATUS_LABEL[order.status]}</span>
                </div>
                <span className="min-w-[80px] text-xs text-muted-warm">{relativeDate(order.createdAt)}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setActionOrder(order) }}
                  className="min-w-[72px] cursor-pointer rounded-md bg-brand-primary px-3 py-[5px] text-center text-xs font-semibold text-surface transition-transform active:scale-95"
                >
                  Action
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {actionOrder && (
        <OrderActionSheet
          order={actionOrder}
          onClose={() => setActionOrder(null)}
          onViewDetails={(o) => { setActionOrder(null); setDetailOrder(o) }}
          onUpdated={refreshOrder}
        />
      )}
      {detailOrder && <OrderDetailsModal order={detailOrder} onClose={() => setDetailOrder(null)} onUpdated={(o) => { refreshOrder(o); setDetailOrder(o) }} />}
    </div>
  )
}
