'use client'

import { useEffect, useState } from 'react'
import { ChevronRight, Clock, Package, ClipboardList, AlertTriangle, Rocket } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { StatCard } from '@/components/admin/stat-card'
import { EmptyState } from '@/components/admin/empty-state'
import { getTenantLiveStateAction, getDashboardDataAction } from './actions'
import type { DashboardData, DashboardStat } from '@/lib/data/dashboard'

const DEFAULT_STATS: DashboardStat[] = [
  { label: 'Revenue', value: '₹0', change: '0%', up: true },
  { label: 'Orders', value: '0', change: '0%', up: true },
  { label: 'Customers', value: '0', change: '0%', up: true },
  { label: 'Avg Order', value: '₹0', change: '0%', up: true },
]

type ChartMetricKey = 'revenue' | 'orders' | 'customers'

const CHART_LABEL: Record<ChartMetricKey, string> = { revenue: 'Revenue', orders: 'Orders', customers: 'Customers' }
const CHART_FORMAT: Record<ChartMetricKey, (v: number) => string> = {
  revenue: (v) => `₹${v.toLocaleString('en-IN')}`,
  orders: (v) => `${v}`,
  customers: (v) => `${v}`,
}

const TODAY = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

export default function AdminDashboardPage() {
  const [activeMetric, setActiveMetric] = useState<ChartMetricKey>('revenue')
  const [isLive, setIsLive] = useState<boolean | null>(null)
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    getTenantLiveStateAction().then((state) => setIsLive(state.isLive))
    getDashboardDataAction().then(setData)
  }, [])

  const chartData = data?.trends[activeMetric] ?? []

  return (
    <div className="px-4 pb-24 md:px-0 md:pb-0">

      {isLive === false ? (
        <div className="mb-5 flex items-center gap-3 rounded-lg border border-brand-primary/20 bg-brand-primary/5 p-4">
          <Rocket className="size-5 shrink-0 text-brand-primary" strokeWidth={2} />
          <p className="text-sm font-semibold text-fg">Your store isn&apos;t live yet — hit Go Live in the header when you&apos;re ready.</p>
        </div>
      ) : null}

      {/* ── Header ── */}
      <div className="pb-5 pt-1 md:pt-0">
        <p className="text-2xs font-medium uppercase tracking-[0.08em] text-muted-warm">{TODAY}</p>
        <h1 className="font-marketing mt-0.5 text-[24px] font-semibold leading-tight text-fg md:text-[28px]">
          Overview
        </h1>
        <p className="mt-1 text-sm text-muted-warm">Last 7 days</p>
      </div>

      {/* ── Desktop: two-column top section (stats+chart LEFT, alerts RIGHT) ── */}
      {/* ── Mobile: alerts first, then stats, then chart ── */}

      <div className="md:flex md:gap-8">

        {/* Left column: stats + chart */}
        <div className="min-w-0 md:flex-1">

          {/* Stats — mobile: 2×2 grid, desktop: 4-col */}
          <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {(data?.stats ?? DEFAULT_STATS).map((stat) => (
              <StatCard key={stat.label} label={stat.label} value={stat.value} change={stat.change} up={stat.up} />
            ))}
          </section>

          {/* Chart */}
          <section className="mb-6 rounded-lg bg-surface p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-2xs font-medium uppercase tracking-[0.06em] text-muted-warm">{CHART_LABEL[activeMetric]} Trend</p>
              <div className="flex shrink-0 gap-1 overflow-x-auto rounded-full bg-bg p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {(Object.keys(CHART_LABEL) as ChartMetricKey[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => setActiveMetric(key)}
                    className={`shrink-0 cursor-pointer rounded-full px-2.5 py-1 text-2xs font-semibold transition-colors ${
                      key === activeMetric ? 'bg-fg text-surface' : 'text-muted-warm hover:text-fg'
                    }`}
                  >
                    {CHART_LABEL[key]}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[160px] w-full md:h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#C1502E" stopOpacity="0.10" />
                      <stop offset="100%" stopColor="#C1502E" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8B7D7A' }} />
                  <YAxis hide />
                  <Tooltip
                    formatter={(value) => [CHART_FORMAT[activeMetric](Number(value)), CHART_LABEL[activeMetric]]}
                    contentStyle={{ borderRadius: 8, borderColor: '#E8E8E8', fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#C1502E" strokeWidth={2} fill="url(#chartGrad)" dot={false} activeDot={{ r: 4, fill: '#C1502E', stroke: 'white', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        {/* Right column: Needs Attention — vertical stack */}
        {data && data.alerts.length > 0 ? (
          <section className="order-first mb-6 md:order-none md:mb-0 md:w-[280px] md:shrink-0">
            <p className="mb-3 text-2xs font-medium uppercase tracking-[0.06em] text-danger">Needs Attention</p>
            <div className="flex flex-col gap-2">
              {data.alerts.map((alert) => {
                const Icon = alert.tone === 'danger' ? AlertTriangle : alert.text.includes('low') ? Package : Clock
                return (
                  <button
                    key={alert.text}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-lg p-3 text-left transition-colors hover:brightness-95 ${
                      alert.tone === 'amber' ? 'bg-[#FEF3C7]' : 'bg-[#FEE2E2]'
                    }`}
                  >
                    <Icon className={`size-4 shrink-0 ${alert.tone === 'amber' ? 'text-[#92400E]' : 'text-[#991B1B]'}`} strokeWidth={2} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold ${alert.tone === 'amber' ? 'text-[#92400E]' : 'text-[#991B1B]'}`}>{alert.text}</p>
                      <p className={`text-xs ${alert.tone === 'amber' ? 'text-[#92400E]/70' : 'text-[#991B1B]/70'}`}>{alert.sub}</p>
                    </div>
                    <ChevronRight className={`size-4 shrink-0 ${alert.tone === 'amber' ? 'text-[#92400E]/40' : 'text-[#991B1B]/40'}`} />
                  </button>
                )
              })}
            </div>
          </section>
        ) : null}
      </div>

      {/* ── Bottom: Orders + Top Sellers ── */}
      <div className="md:flex md:gap-8">

        {/* Orders */}
        <section className="min-w-0 flex-1">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-2xs font-medium uppercase tracking-[0.06em] text-muted-warm">Recent Orders</p>
            <a href="/admin/orders" className="cursor-pointer text-xs font-medium text-brand-primary">View all →</a>
          </div>

          {data && data.recentOrders.length === 0 ? (
            <EmptyState icon={ClipboardList} message="No orders have been placed yet." />
          ) : (
            <>
              {/* Desktop: table rows */}
              <div className="hidden rounded-lg bg-surface md:block">
                {(data?.recentOrders ?? []).map((order, i) => (
                  <div
                    key={order.code}
                    className={`grid cursor-pointer grid-cols-[1fr_2fr_auto_auto] items-center gap-x-5 px-4 py-3 transition-colors hover:bg-bg ${
                      i > 0 ? 'border-t border-border-light' : ''
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-fg">{order.customer}</p>
                      <p className="text-2xs text-muted-warm">{order.code} · {order.time}</p>
                    </div>
                    <p className="truncate text-sm text-muted-warm">{order.items}</p>
                    <p className="font-marketing text-right text-[15px] font-semibold text-fg">{order.price}</p>
                    <span className="rounded-full bg-bg px-2.5 py-0.5 text-2xs font-semibold text-fg">
                      {order.status}
                    </span>
                  </div>
                ))}
              </div>

              {/* Mobile: cards */}
              <div className="flex flex-col gap-2 md:hidden">
                {(data?.recentOrders ?? []).map((order) => (
                  <div key={order.code} className="cursor-pointer rounded-lg bg-surface p-3 transition-colors active:bg-bg">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-sm font-semibold text-fg">{order.customer}</p>
                      <span className="rounded-full bg-bg px-2 py-0.5 text-2xs font-semibold text-fg">
                        {order.status}
                      </span>
                    </div>
                    <p className="mb-2 truncate text-xs text-muted-warm">{order.items}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-marketing text-[15px] font-semibold text-fg">{order.price}</span>
                      <span className="flex items-center gap-1 text-2xs text-muted-warm">
                        {order.status === 'Pending' && <Clock className="size-3" />}
                        {order.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Top Sellers */}
        <section className="mt-6 md:mt-0 md:w-[280px] md:shrink-0">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-2xs font-medium uppercase tracking-[0.06em] text-muted-warm">Top Sellers</p>
            <a href="/admin/products" className="cursor-pointer text-xs font-medium text-brand-primary">View all →</a>
          </div>
          {data && data.topSellers.length === 0 ? (
            <EmptyState icon={Package} message="No sales yet." />
          ) : (
            <div className="rounded-lg bg-surface">
              {(data?.topSellers ?? []).map((product, i) => (
                <div
                  key={product.name}
                  className={`flex cursor-pointer items-center gap-3 px-3.5 py-3 transition-colors hover:bg-bg ${
                    i > 0 ? 'border-t border-border-light' : ''
                  }`}
                >
                  <span className="font-marketing w-5 text-center text-base font-semibold text-border">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-fg">{product.name}</p>
                    <p className="text-2xs text-muted-warm">{product.sold}</p>
                  </div>
                  <span className="text-2xs font-semibold text-success">{product.stock}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
