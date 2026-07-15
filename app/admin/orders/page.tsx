'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { OrderActionSheet } from '@/components/admin/order-action-sheet'
import { OrderDetailsModal } from '@/components/admin/order-details-modal'

type OrderStatus = 'Pending' | 'Confirmed' | 'Shipped' | 'Delivered'

export type MockOrder = {
  code: string
  time: string
  customer: string
  customerShort: string
  email: string
  mobile: string
  category: string
  count: number
  items: string
  price: string
  priceNum: number
  date: string
  status: OrderStatus
  address: string
}

const STATUS_STYLE: Record<OrderStatus, { border: string; bg: string; text: string }> = {
  Pending:   { border: '#FB923C', bg: '#FB923C1A', text: '#9A3412' },
  Confirmed: { border: '#6366F1', bg: '#6366F11A', text: '#4338CA' },
  Shipped:   { border: '#3B82F6', bg: '#3B82F61A', text: '#1D4ED8' },
  Delivered: { border: '#22C55E', bg: '#22C55E1A', text: '#166534' },
}

const FILTER_STYLE: Record<OrderStatus | 'All', { border: string; bg: string; text: string }> = {
  All:       { border: '#4F3FF0', bg: '#4F3FF0',   text: '#FFFFFF' },
  Pending:   { border: '#FB923C', bg: '#FB923C26', text: '#9A3412' },
  Confirmed: { border: '#6366F1', bg: '#6366F126', text: '#4338CA' },
  Shipped:   { border: '#3B82F6', bg: '#3B82F626', text: '#1D4ED8' },
  Delivered: { border: '#22C55E', bg: '#22C55E26', text: '#166534' },
}

const ACTION_BTN: Record<OrderStatus, { label: string; bg: string; opacity?: string }> = {
  Pending:   { label: 'Update', bg: '#4F3FF0' },
  Confirmed: { label: 'Update', bg: '#4F3FF0' },
  Shipped:   { label: 'Track',  bg: '#6B7280' },
  Delivered: { label: 'Closed', bg: '#8B7D7A', opacity: '0.6' },
}

const MOCK_ORDERS: MockOrder[] = [
  { code: '#ORD-2648', time: 'Today · 08:14am', customer: 'Ananya Krishnan', customerShort: 'Ananya K.', email: 'ananya@mail.com', mobile: '+91 98765 43210', category: 'Ethnic Wear', count: 1, items: 'Block Print Kurti (L) · 1 item', price: '₹649', priceNum: 649, date: 'Today', status: 'Pending', address: 'Apartment 5, Building A\nPrestige Iris Heights\nBangalore, Karnataka 560034\nIndia' },
  { code: '#ORD-2646', time: 'Yesterday · 3:22pm', customer: 'Rekha Mohan', customerShort: 'Rekha M.', email: 'rekha.mohan@mail.com', mobile: '+91 87654 32109', category: 'Sarees', count: 1, items: 'Chanderi Saree (Free) · 1 item', price: '₹2,499', priceNum: 2499, date: 'Yesterday', status: 'Pending', address: '12, MG Road\nChennai, Tamil Nadu 600001\nIndia' },
  { code: '#ORD-2647', time: 'Yesterday · 6:55pm', customer: 'Deepa Subramanian', customerShort: 'Deepa S.', email: 'deepa.sub@mail.com', mobile: '+91 76543 21098', category: 'Kurtis', count: 2, items: 'Anarkali Set (S) + Dupatta · 2 items', price: '₹2,198', priceNum: 2198, date: 'Yesterday', status: 'Shipped', address: '45, Jubilee Hills\nHyderabad, Telangana 500033\nIndia' },
  { code: '#ORD-2645', time: '2 days ago', customer: 'Meera Verma', customerShort: 'Meera V.', email: 'meera.verma@mail.com', mobile: '+91 65432 10987', category: 'Dupattas', count: 2, items: 'Cotton Dupatta + Salwar · 2 items', price: '₹1,850', priceNum: 1850, date: '2 days ago', status: 'Delivered', address: '78, Sector 17\nChandigarh 160017\nIndia' },
  { code: '#ORD-2644', time: '3 days ago', customer: 'Priya Singh', customerShort: 'Priya S.', email: 'priya.singh@mail.com', mobile: '+91 54321 09876', category: 'Sarees', count: 1, items: 'Banarasi Silk Saree · 1 item', price: '₹3,299', priceNum: 3299, date: '3 days ago', status: 'Confirmed', address: '23, Lajpat Nagar\nNew Delhi 110024\nIndia' },
  { code: '#ORD-2643', time: '4 days ago', customer: 'Neha Desai', customerShort: 'Neha D.', email: 'neha.desai@mail.com', mobile: '+91 43210 98765', category: 'Kurtis', count: 2, items: 'Cotton Kurta Set · 2 items', price: '₹1,999', priceNum: 1999, date: '4 days ago', status: 'Shipped', address: '56, Koregaon Park\nPune, Maharashtra 411001\nIndia' },
  { code: '#ORD-2642', time: '5 days ago', customer: 'Anjali Patel', customerShort: 'Anjali P.', email: 'anjali.patel@mail.com', mobile: '+91 32109 87654', category: 'Ethnic Wear', count: 3, items: 'Anarkali Set + Dupatta · 3 items', price: '₹4,250', priceNum: 4250, date: '5 days ago', status: 'Delivered', address: '89, CG Road\nAhmedabad, Gujarat 380009\nIndia' },
]

type FilterKey = 'All' | OrderStatus
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'All', label: 'All (8)' },
  { key: 'Pending', label: 'Pending (2)' },
  { key: 'Confirmed', label: 'Confirmed (1)' },
  { key: 'Shipped', label: 'Shipped (3)' },
  { key: 'Delivered', label: 'Delivered (2)' },
]

export default function AdminOrdersPage() {
  const [actionOrder, setActionOrder] = useState<MockOrder | null>(null)
  const [detailOrder, setDetailOrder] = useState<MockOrder | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterKey>('All')
  const [sortAsc, setSortAsc] = useState(false)

  const filtered = MOCK_ORDERS.filter((o) => activeFilter === 'All' || o.status === activeFilter)
  const sorted = sortAsc ? [...filtered].reverse() : filtered

  return (
    <div className="mx-auto max-w-[390px] md:max-w-none">
      {/* Mobile header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
        <span className="text-base font-bold text-fg">Orders</span>
        <button className="flex size-8 cursor-pointer items-center justify-center">
          <Search className="size-5 text-fg" strokeWidth={2} />
        </button>
      </div>

      {/* Desktop header */}
      <div className="mb-4 hidden items-center justify-between md:flex">
        <h1 className="text-2xl font-bold text-fg">Orders</h1>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-[240px] items-center gap-2 rounded-lg border border-border px-3">
            <Search className="size-4 text-muted-warm" />
            <input className="grow bg-transparent text-sm outline-none" placeholder="Search orders..." />
          </div>
          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-bg"
          >
            Sort by: {sortAsc ? 'Oldest' : 'Latest'}
          </button>
          <button className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-bg">Filter</button>
        </div>
      </div>

      {/* Filter pills — hidden scrollbar */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-0 md:pb-4">
        {FILTERS.map(({ key, label }) => {
          const active = key === activeFilter
          const style = FILTER_STYLE[key]
          return (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className="shrink-0 cursor-pointer rounded-full px-[14px] py-[7px] text-xs font-semibold transition-colors"
              style={
                active
                  ? { backgroundColor: style.bg, color: style.text, border: `1.5px solid ${style.border}` }
                  : { backgroundColor: 'transparent', color: '#8B7D7A', border: '1.5px solid #E8E8E8' }
              }
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Mobile: order cards */}
      <div className="flex flex-col gap-3 p-4 md:hidden">
        {sorted.map((order) => {
          const ss = STATUS_STYLE[order.status]
          return (
            <button
              key={order.code}
              onClick={() => setDetailOrder(order)}
              className="cursor-pointer rounded-xl border border-border p-[14px] text-left shadow-sm transition-colors active:bg-bg"
            >
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <p className="mb-[2px] text-sm font-bold text-fg">{order.code}</p>
                  <p className="text-2xs text-muted-warm">{order.time}</p>
                </div>
                <span
                  className="rounded-[4px] px-2 py-[5px] text-[10px] font-bold"
                  style={{ backgroundColor: ss.bg, border: `1px solid ${ss.border}`, color: ss.text }}
                >
                  {order.status}
                </span>
              </div>
              <p className="mb-1 text-sm font-semibold text-fg">{order.customer}</p>
              <p className="mb-3 text-xs text-muted-warm">{order.items}</p>
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-bold text-fg">{order.price}</span>
                <span
                  onClick={(e) => { e.stopPropagation(); setActionOrder(order) }}
                  className="rounded-[4px] px-4 py-[6px] text-xs font-semibold text-surface transition-transform active:scale-95"
                  style={{ backgroundColor: '#4F3FF0' }}
                >
                  Action
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Desktop: data table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              {['ORDER ID', 'CUSTOMER', 'EMAIL', 'MOBILE', 'CATEGORY', 'COUNT', 'AMOUNT', 'STATUS', 'DATE', 'ACTION'].map((h) => (
                <th key={h} className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-warm">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((order) => {
              const ss = STATUS_STYLE[order.status]
              const ab = ACTION_BTN[order.status]
              return (
                <tr
                  key={order.code}
                  onClick={() => setDetailOrder(order)}
                  className="cursor-pointer border-b border-border transition-colors hover:bg-bg"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-bold text-fg">{order.code}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-fg">{order.customerShort}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-warm">{order.email}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-warm">{order.mobile}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-warm">{order.category}</td>
                  <td className="px-4 py-3 text-center text-muted-warm">{order.count}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-fg">{order.price}</td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-block w-[62px] rounded-[4px] px-2 py-[5px] text-center text-[10px] font-bold"
                      style={{ backgroundColor: ss.bg, border: `1px solid ${ss.border}`, color: ss.text }}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-warm">{order.date}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); setActionOrder(order) }}
                      className="min-w-[80px] cursor-pointer rounded-[4px] px-[10px] py-[5px] text-xs font-semibold text-surface transition-transform active:scale-95"
                      style={{ backgroundColor: ab.bg, opacity: ab.opacity ?? '1' }}
                    >
                      {ab.label}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {actionOrder && <OrderActionSheet order={actionOrder} onClose={() => setActionOrder(null)} onViewDetails={(o) => { setActionOrder(null); setDetailOrder(o) }} />}
      {detailOrder && <OrderDetailsModal order={detailOrder} onClose={() => setDetailOrder(null)} />}
    </div>
  )
}
