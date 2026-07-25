'use client'

import { useEffect, useState } from 'react'
import { ChevronRight, Clock, Package, AlertTriangle, TrendingUp, TrendingDown, Rocket } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { getTenantLiveStateAction } from './actions'

type MockStat = { label: string; value: string; change: string; up: boolean }
const MOCK_STATS: MockStat[] = [
  { label: 'Revenue', value: '₹24,500', change: '+18%', up: true },
  { label: 'Orders', value: '38', change: '-5%', up: false },
  { label: 'Customers', value: '142', change: '+3', up: true },
  { label: 'Avg Order', value: '₹645', change: '+₹120', up: true },
]

type MockAlert = { text: string; sub: string; tone: 'amber' | 'danger'; icon: typeof Clock }
const MOCK_ALERTS: MockAlert[] = [
  { text: '3 orders awaiting confirmation', sub: 'Pending for over 2 hours', tone: 'amber', icon: Clock },
  { text: '2 items running low', sub: 'Less than 5 units remaining', tone: 'amber', icon: Package },
  { text: '1 payment failed — Razorpay', sub: 'Order #1042 · ₹1,850', tone: 'danger', icon: AlertTriangle },
]

type MockOrder = { code: string; time: string; customer: string; items: string; price: string; status: 'Pending' | 'Confirmed' | 'Delivered'; statusColor: string }
const MOCK_ORDERS: MockOrder[] = [
  { code: '#1045', time: '3h ago', customer: 'Priya Sharma', items: '2× Kurta Set, 1× Dupatta', price: '₹1,850', status: 'Pending', statusColor: 'bg-[#FEF3C7] text-[#92400E]' },
  { code: '#1044', time: '1h ago', customer: 'Rahul Verma', items: '1× Silk Banarasi Saree', price: '₹3,200', status: 'Confirmed', statusColor: 'bg-[#DBEAFE] text-[#1D4ED8]' },
  { code: '#1043', time: 'Yesterday', customer: 'Ananya Patel', items: '3× Cotton Kurta', price: '₹2,100', status: 'Delivered', statusColor: 'bg-success-bg text-[#065F46]' },
]

type MockProduct = { name: string; sold: string; stock: string; stockColor: string }
const MOCK_PRODUCTS: MockProduct[] = [
  { name: 'Cotton Kurta Set', sold: '24 sold', stock: 'In stock', stockColor: 'text-success' },
  { name: 'Silk Banarasi Saree', sold: '18 sold', stock: 'Low (3 left)', stockColor: 'text-amber' },
  { name: 'Anarkali Suit', sold: '15 sold', stock: 'In stock', stockColor: 'text-success' },
]

const TABS = ['Today', 'Yesterday', 'This Week', 'This Month']

type TrendPoint = { day: string; value: number }

type ChartMetric = { key: 'revenue' | 'orders' | 'customers'; label: string; data: TrendPoint[]; format: (v: number) => string }

const CHART_METRICS: ChartMetric[] = [
  {
    key: 'revenue',
    label: 'Revenue',
    format: (v) => `₹${v.toLocaleString('en-IN')}`,
    data: [
      { day: 'Mon', value: 4000 },
      { day: 'Tue', value: 9000 },
      { day: 'Wed', value: 17000 },
      { day: 'Thu', value: 19000 },
      { day: 'Fri', value: 22400 },
      { day: 'Sat', value: 23000 },
      { day: 'Sun', value: 27000 },
    ],
  },
  {
    key: 'orders',
    label: 'Orders',
    format: (v) => `${v}`,
    data: [
      { day: 'Mon', value: 5 },
      { day: 'Tue', value: 9 },
      { day: 'Wed', value: 14 },
      { day: 'Thu', value: 12 },
      { day: 'Fri', value: 18 },
      { day: 'Sat', value: 22 },
      { day: 'Sun', value: 38 },
    ],
  },
  {
    key: 'customers',
    label: 'Customers',
    format: (v) => `${v}`,
    data: [
      { day: 'Mon', value: 12 },
      { day: 'Tue', value: 20 },
      { day: 'Wed', value: 35 },
      { day: 'Thu', value: 48 },
      { day: 'Fri', value: 70 },
      { day: 'Sat', value: 96 },
      { day: 'Sun', value: 142 },
    ],
  },
]

const TODAY = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('This Week')
  const [activeMetric, setActiveMetric] = useState<ChartMetric['key']>('revenue')
  const metric = CHART_METRICS.find((m) => m.key === activeMetric)!
  const [isLive, setIsLive] = useState<boolean | null>(null)

  useEffect(() => {
    getTenantLiveStateAction().then((state) => setIsLive(state.isLive))
  }, [])

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
      </div>

      {/* ── Time pills ── */}
      <div className="mb-5 flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 cursor-pointer rounded-full px-3 py-[5px] text-2xs font-semibold transition-colors ${
              tab === activeTab ? 'bg-fg text-surface' : 'text-muted-warm hover:text-fg'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Desktop: two-column top section (stats+chart LEFT, alerts RIGHT) ── */}
      {/* ── Mobile: alerts first, then stats, then chart ── */}

      <div className="md:flex md:gap-8">

        {/* Left column: stats + chart */}
        <div className="min-w-0 md:flex-1">

          {/* Stats — mobile: 2×2 grid, desktop: 4-col */}
          <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {MOCK_STATS.map((stat) => (
              <div key={stat.label} className="rounded-lg bg-surface p-3.5 md:p-4">
                <p className="text-2xs font-medium uppercase tracking-[0.06em] text-muted-warm">{stat.label}</p>
                <p className="font-marketing mt-1.5 text-[28px] font-semibold leading-none tracking-[-0.02em] text-fg md:text-[32px]">
                  {stat.value}
                </p>
                <p className={`mt-1.5 flex items-center gap-1 text-2xs font-medium ${stat.up ? 'text-success' : 'text-danger'}`}>
                  {stat.up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                  {stat.change}
                </p>
              </div>
            ))}
          </section>

          {/* Chart */}
          <section className="mb-6 rounded-lg bg-surface p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-2xs font-medium uppercase tracking-[0.06em] text-muted-warm">{metric.label} Trend</p>
              <div className="flex shrink-0 gap-1 overflow-x-auto rounded-full bg-bg p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {CHART_METRICS.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setActiveMetric(m.key)}
                    className={`shrink-0 cursor-pointer rounded-full px-2.5 py-1 text-2xs font-semibold transition-colors ${
                      m.key === activeMetric ? 'bg-fg text-surface' : 'text-muted-warm hover:text-fg'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[160px] w-full md:h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metric.data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#C1502E" stopOpacity="0.10" />
                      <stop offset="100%" stopColor="#C1502E" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8B7D7A' }} />
                  <YAxis hide />
                  <Tooltip
                    formatter={(value) => [metric.format(Number(value)), metric.label]}
                    contentStyle={{ borderRadius: 8, borderColor: '#E8E8E8', fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#C1502E" strokeWidth={2} fill="url(#chartGrad)" dot={false} activeDot={{ r: 4, fill: '#C1502E', stroke: 'white', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        {/* Right column: Needs Attention — vertical stack */}
        <section className="order-first mb-6 md:order-none md:mb-0 md:w-[280px] md:shrink-0">
          <p className="mb-3 text-2xs font-medium uppercase tracking-[0.06em] text-danger">Needs Attention</p>
          <div className="flex flex-col gap-2">
            {MOCK_ALERTS.map((alert) => {
              const Icon = alert.icon
              return (
                <button
                  key={alert.text}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-lg p-3 text-left transition-colors hover:brightness-95 ${
                    alert.tone === 'amber'
                      ? 'bg-[#FEF3C7]'
                      : 'bg-[#FEE2E2]'
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
      </div>

      {/* ── Bottom: Orders + Top Sellers ── */}
      <div className="md:flex md:gap-8">

        {/* Orders */}
        <section className="min-w-0 flex-1">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-2xs font-medium uppercase tracking-[0.06em] text-muted-warm">Recent Orders</p>
            <button className="cursor-pointer text-xs font-medium text-brand-primary">View all →</button>
          </div>

          {/* Desktop: table rows */}
          <div className="hidden rounded-lg bg-surface md:block">
            {MOCK_ORDERS.map((order, i) => (
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
                <span className={`rounded-full px-2.5 py-0.5 text-2xs font-semibold ${order.statusColor}`}>
                  {order.status}
                </span>
              </div>
            ))}
          </div>

          {/* Mobile: cards */}
          <div className="flex flex-col gap-2 md:hidden">
            {MOCK_ORDERS.map((order) => (
              <div key={order.code} className="cursor-pointer rounded-lg bg-surface p-3 transition-colors active:bg-bg">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-sm font-semibold text-fg">{order.customer}</p>
                  <span className={`rounded-full px-2 py-0.5 text-2xs font-semibold ${order.statusColor}`}>
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
        </section>

        {/* Top Sellers */}
        <section className="mt-6 md:mt-0 md:w-[280px] md:shrink-0">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-2xs font-medium uppercase tracking-[0.06em] text-muted-warm">Top Sellers</p>
            <button className="cursor-pointer text-xs font-medium text-brand-primary">View all →</button>
          </div>
          <div className="rounded-lg bg-surface">
            {MOCK_PRODUCTS.map((product, i) => (
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
                <span className={`text-2xs font-semibold ${product.stockColor}`}>{product.stock}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
