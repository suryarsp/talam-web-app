'use client'

import { useState } from 'react'
import Image from 'next/image'
import { StoreLink } from '@/components/store/store-context'
import { ArrowLeft, Search, ChevronRight, X, FileText } from 'lucide-react'
import type { CustomerOrder } from '@/lib/data/storefront-orders'
import {
  ORDER_STATUS_BADGE,
  ORDER_STATUS_BORDER,
  ORDER_STATUS_DOT,
  ORDER_STATUS_LABEL,
  ORDER_TABS,
  matchesTab,
  type OrderTab,
} from '@/lib/order-status'
import { BuyAgainButton } from './buy-again-button'

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** One line of context under the product name — what the customer most wants to know per status. */
function statusDetail(order: CustomerOrder): string {
  if (order.status === 'shipped' && order.trackingId) return `Tracking #${order.trackingId}`
  if (order.status === 'pending') {
    return order.paymentStatus === 'paid' ? 'Payment received — awaiting confirmation' : 'Awaiting payment confirmation'
  }
  if (order.status === 'delivered') return `Delivered · ${formatDate(order.createdAt)}`
  if (order.status === 'cancelled') return 'Cancelled'
  if (order.status === 'returned') return 'Returned'
  return 'Confirmed — being prepared'
}

function OrderActions({ order, tenantId, compact }: { order: CustomerOrder; tenantId: string; compact?: boolean }) {
  const invoiceClass = compact
    ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-fg hover:bg-bg'
    : 'rounded-lg border border-border px-3 py-1.5 font-body text-xs font-medium text-fg hover:bg-bg'

  return (
    <div className="flex items-center gap-2">
      <BuyAgainButton order={order} tenantId={tenantId} compact={compact} />
      <StoreLink href={`/orders/${order.id}/invoice`} aria-label="View invoice" className={invoiceClass}>
        {compact ? <FileText className="h-4 w-4" /> : 'Invoice'}
      </StoreLink>
    </div>
  )
}

function OrderCardMobile({ order, tenantId }: { order: CustomerOrder; tenantId: string }) {
  const mainItem = order.items[0]
  const extraCount = order.items.length - 1

  return (
    <div className={`border-b border-l-4 border-border py-4 pl-3 last:border-b-0 ${ORDER_STATUS_BORDER[order.status]}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-body text-xs font-bold text-fg sm:text-sm">{order.code}</p>
        <span className="inline-flex shrink-0 items-center gap-1.5 font-body text-[11px] font-semibold text-fg">
          <span className={`h-1.5 w-1.5 rounded-full ${ORDER_STATUS_DOT[order.status]}`} />
          {ORDER_STATUS_LABEL[order.status]}
        </span>
      </div>
      <p className="mb-2 font-body text-[11px] text-muted-warm">{formatDate(order.createdAt)}</p>

      <StoreLink href={`/orders/${order.id}`} className="group flex items-center gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-bg">
          {mainItem?.image && <Image src={mainItem.image} alt={mainItem.productName} fill sizes="56px" className="object-cover" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 font-body text-sm font-semibold text-fg group-hover:text-store-primary">
            {mainItem?.productName ?? 'Order'}
            {extraCount > 0 ? ` + ${extraCount} more` : ''}
          </p>
          <p className="font-body text-xs text-muted-warm">{statusDetail(order)}</p>
          <p className="mt-0.5 font-body text-sm font-bold text-fg">₹{order.total.toLocaleString('en-IN')}</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-warm" />
      </StoreLink>

      <div className="mt-3">
        <OrderActions order={order} tenantId={tenantId} compact />
      </div>
    </div>
  )
}

function OrderRowDesktop({ order, tenantId }: { order: CustomerOrder; tenantId: string }) {
  const mainItem = order.items[0]
  const extraCount = order.items.length - 1

  return (
    <tr className="border-b border-border last:border-b-0 hover:bg-bg/50">
      <td className="py-4 pl-5 font-body text-sm font-bold text-fg">
        <StoreLink href={`/orders/${order.id}`} className="hover:text-store-primary">
          {order.code}
        </StoreLink>
      </td>
      <td className="py-4 font-body text-sm text-muted-warm">{formatDate(order.createdAt)}</td>
      <td className="py-4">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1">
            {order.items.slice(0, 2).map((item) => (
              <div key={item.id} className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border-2 border-surface bg-bg">
                {item.image && <Image src={item.image} alt={item.productName} fill sizes="40px" className="object-cover" />}
              </div>
            ))}
          </div>
          <span className="line-clamp-1 font-body text-sm text-fg">
            {mainItem?.productName ?? 'Order'}
            {extraCount > 0 ? ` + ${extraCount} more` : ''}
          </span>
        </div>
      </td>
      <td className="py-4">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-body text-xs font-semibold ${ORDER_STATUS_BADGE[order.status]}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${ORDER_STATUS_DOT[order.status]}`} />
          {ORDER_STATUS_LABEL[order.status]}
        </span>
      </td>
      <td className="py-4 font-body text-sm font-bold text-fg">₹{order.total.toLocaleString('en-IN')}</td>
      <td className="py-4 pr-5">
        <OrderActions order={order} tenantId={tenantId} />
      </td>
    </tr>
  )
}

export function OrdersView({
  orders: allOrders,
  customerName,
  tenantId,
}: {
  orders: CustomerOrder[]
  customerName: string
  tenantId: string
}) {
  const [activeTab, setActiveTab] = useState<OrderTab>('All')
  const [search, setSearch] = useState('')
  const [mobileSearch, setMobileSearch] = useState(false)

  let orders = allOrders.filter((o) => matchesTab(o.status, activeTab))
  if (search.trim()) {
    const q = search.toLowerCase()
    orders = orders.filter(
      (o) => o.code.toLowerCase().includes(q) || o.items.some((i) => i.productName.toLowerCase().includes(q))
    )
  }

  return (
    <main className="mx-auto max-w-6xl overflow-x-hidden px-3 py-4 sm:px-12 sm:py-10">
      <div className="mb-1 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <StoreLink
            href="/"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border transition-colors hover:bg-bg lg:hidden"
          >
            <ArrowLeft className="h-4 w-4 text-fg" />
          </StoreLink>
          <div className="min-w-0">
            <h1 className="font-heading text-lg font-bold leading-7 text-fg sm:text-[22px]">My Orders</h1>
            <p className="mt-0.5 font-body text-xs text-muted-warm sm:text-sm">
              {allOrders.length} {allOrders.length === 1 ? 'order' : 'orders'} · {customerName}
            </p>
          </div>
        </div>
        <div className="relative hidden shrink-0 sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-warm" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders..."
            className="h-10 w-64 rounded-lg border border-border bg-surface pl-9 pr-3 font-body text-sm text-fg placeholder:text-muted-warm/60 focus:border-store-primary focus:outline-none"
          />
        </div>
        <button aria-label="Search orders" className="shrink-0 sm:hidden" onClick={() => setMobileSearch((v) => !v)}>
          <Search className="h-5 w-5 text-fg" />
        </button>
      </div>

      {mobileSearch && (
        <div className="relative mt-3 sm:hidden">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-warm" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders..."
            autoFocus
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-9 font-body text-sm text-fg placeholder:text-muted-warm/60 focus:border-store-primary focus:outline-none"
          />
          <button
            aria-label="Clear search"
            onClick={() => {
              setSearch('')
              setMobileSearch(false)
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="h-4 w-4 text-muted-warm" />
          </button>
        </div>
      )}

      <div className="-mx-3 mb-4 mt-3 border-b border-border px-3 sm:mx-0 sm:mb-5 sm:mt-4 sm:px-0">
        <div className="no-scrollbar flex gap-4 overflow-x-auto sm:gap-5">
          {ORDER_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 border-b-2 pb-2.5 font-body text-xs font-medium transition-colors sm:text-sm ${
                activeTab === tab
                  ? 'border-store-primary font-semibold text-fg'
                  : 'border-transparent text-muted-warm hover:text-fg'
              }`}
            >
              {tab} ({allOrders.filter((o) => matchesTab(o.status, tab)).length})
            </button>
          ))}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-body text-sm text-muted-warm">
            {allOrders.length === 0 ? "You haven't placed any orders yet." : 'No orders found.'}
          </p>
          {allOrders.length === 0 && (
            <StoreLink href="/" className="mt-3 inline-block font-body text-sm font-semibold text-store-primary">
              Start shopping →
            </StoreLink>
          )}
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-border bg-surface lg:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {['Order ID', 'Date', 'Items', 'Status', 'Total', 'Actions'].map((heading, i) => (
                    <th
                      key={heading}
                      className={`py-3 text-left font-body text-[11px] font-semibold uppercase tracking-wide text-muted-warm ${
                        i === 0 ? 'pl-5' : ''
                      } ${i === 5 ? 'pr-5' : ''}`}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <OrderRowDesktop key={order.id} order={order} tenantId={tenantId} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden">
            {orders.map((order) => (
              <OrderCardMobile key={order.id} order={order} tenantId={tenantId} />
            ))}
          </div>
        </>
      )}
    </main>
  )
}
