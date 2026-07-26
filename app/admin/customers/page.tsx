'use client'

import { useEffect, useState } from 'react'
import { Search, Users } from 'lucide-react'
import { StatCard } from '@/components/admin/stat-card'
import { EmptyState } from '@/components/admin/empty-state'
import { getCustomersAction } from './actions'
import type { AdminCustomer } from '@/lib/data/customers'

function formatDate(date: Date) {
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    getCustomersAction()
      .then(setCustomers)
      .finally(() => setLoading(false))
  }, [])

  const filtered = customers.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.phone ?? '').includes(search)
  )

  return (
    <div className="px-4 pb-24 md:px-0 md:pb-0">

      {/* ── Header ── */}
      <div className="flex items-end justify-between gap-4 pb-5 pt-1 md:pt-0">
        <div className="min-w-0">
          <p className="text-2xs font-medium uppercase tracking-[0.08em] text-muted-warm">{customers.length} customers</p>
          <h1 className="font-marketing mt-1 text-[26px] font-semibold leading-tight text-fg md:text-[32px]">
            Customers
          </h1>
        </div>
        <div className="hidden shrink-0 items-center gap-3 md:flex">
          <div className="flex h-9 w-[220px] items-center gap-2 rounded-lg border border-border-light bg-surface px-3">
            <Search className="size-3.5 text-muted-warm" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="grow bg-transparent text-sm text-fg outline-none placeholder:text-muted-warm"
              placeholder="Search customers..."
            />
          </div>
        </div>
        <button className="flex size-8 items-center justify-center md:hidden">
          <Search className="size-5 text-fg" strokeWidth={2} />
        </button>
      </div>

      {/* Mobile search */}
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-border-light bg-surface px-3 py-2 md:hidden">
        <Search className="size-3.5 text-muted-warm" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="grow bg-transparent text-sm text-fg outline-none placeholder:text-muted-warm"
          placeholder="Search customers..."
        />
      </div>

      {/* ── Summary strip ── */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:gap-4">
        <StatCard label="Total Customers" value={`${customers.length}`} />
        <StatCard label="Total Spent" value={`₹${customers.reduce((s, c) => s + c.totalSpent, 0).toLocaleString('en-IN')}`} />
      </div>

      {!loading && filtered.length === 0 ? (
        <EmptyState icon={Users} message={customers.length === 0 ? 'No customers yet.' : 'No customers match your search.'} />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="flex flex-col gap-2 md:hidden">
            {filtered.map((customer) => (
              <div key={customer.id} className="rounded-lg border border-border-light p-3.5">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-sm font-bold text-fg">{customer.name}</p>
                  <span className="font-marketing text-sm font-semibold text-fg">₹{customer.totalSpent.toLocaleString('en-IN')}</span>
                </div>
                <p className="text-xs text-muted-warm">{customer.email ?? customer.phone ?? '—'}</p>
                <p className="mt-2 text-2xs text-muted-warm">{customer.orderCount} order{customer.orderCount === 1 ? '' : 's'} · Joined {formatDate(customer.createdAt)}</p>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-x-6 border-b border-border-light pb-2 text-xs font-medium uppercase tracking-[0.06em] text-muted-warm">
              <span>Customer</span>
              <span>Contact</span>
              <span className="text-center">Orders</span>
              <span className="text-right">Total Spent</span>
              <span>Joined</span>
            </div>
            {filtered.map((customer) => (
              <div
                key={customer.id}
                className="grid grid-cols-[1fr_1fr_auto_auto_auto] items-center gap-x-6 border-b border-border-light py-3.5 transition-colors hover:bg-bg"
              >
                <p className="text-sm font-semibold text-fg">{customer.name}</p>
                <div>
                  <p className="text-sm text-muted-warm">{customer.email ?? '—'}</p>
                  <p className="text-xs text-muted-warm">{customer.phone ?? ''}</p>
                </div>
                <p className="min-w-[70px] text-center text-sm text-fg">{customer.orderCount}</p>
                <p className="font-marketing min-w-[90px] text-right text-[15px] font-semibold text-fg">₹{customer.totalSpent.toLocaleString('en-IN')}</p>
                <span className="min-w-[100px] text-xs text-muted-warm">{formatDate(customer.createdAt)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
