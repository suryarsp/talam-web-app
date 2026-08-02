import { withTenant } from '@/lib/prisma'

export type DashboardStat = { label: string; value: string; change: string; up: boolean }
export type DashboardAlert = { text: string; sub: string; tone: 'amber' | 'danger' }
export type DashboardOrder = { code: string; time: string; customer: string; items: string; price: string; status: string }
export type DashboardProduct = { name: string; sold: string; stock: string; low: boolean }
export type TrendPoint = { day: string; value: number }

export type DashboardData = {
  stats: DashboardStat[]
  alerts: DashboardAlert[]
  recentOrders: DashboardOrder[]
  topSellers: DashboardProduct[]
  trends: { revenue: TrendPoint[]; orders: TrendPoint[]; customers: TrendPoint[] }
}

const DAY = 24 * 60 * 60 * 1000
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function pctChange(current: number, previous: number): { change: string; up: boolean } {
  if (previous === 0) return current === 0 ? { change: '0%', up: true } : { change: '+100%', up: true }
  const pct = Math.round(((current - previous) / previous) * 100)
  return { change: `${pct >= 0 ? '+' : ''}${pct}%`, up: pct >= 0 }
}

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const hours = Math.floor(diffMs / (60 * 60 * 1000))
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

export async function getDashboardData(tenantId: string): Promise<DashboardData> {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * DAY)
  const twoWeeksAgo = new Date(now.getTime() - 14 * DAY)

  const [ordersThisWeek, ordersPrevWeek, customersThisWeek, customersPrevWeek, recentOrders, activeProducts, failedPayments, pendingOrders, productSales] =
    await withTenant(tenantId, (db) =>
      Promise.all([
        db.order.findMany({ where: { tenantId, createdAt: { gte: weekAgo } }, select: { total: true, createdAt: true, customerId: true } }),
        db.order.findMany({ where: { tenantId, createdAt: { gte: twoWeeksAgo, lt: weekAgo } }, select: { total: true } }),
        db.customer.count({ where: { tenantId, createdAt: { gte: weekAgo } } }),
        db.customer.count({ where: { tenantId, createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
        db.order.findMany({
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: {
            id: true,
            total: true,
            status: true,
            createdAt: true,
            customer: { select: { name: true } },
            items: { select: { productName: true, size: true, quantity: true } },
          },
        }),
        db.product.findMany({ where: { tenantId, deletedAt: null, isActive: true }, select: { stockBySize: true } }),
        db.order.findFirst({ where: { tenantId, paymentStatus: 'failed' }, orderBy: { createdAt: 'desc' }, select: { id: true, total: true } }),
        db.order.count({ where: { tenantId, status: 'pending' } }),
        db.orderItem.groupBy({ by: ['productId', 'productName'], where: { tenantId }, _sum: { quantity: true }, orderBy: { _sum: { quantity: 'desc' } }, take: 3 }),
      ])
    )
  const lowStockCount = activeProducts.filter((p) => Object.values(p.stockBySize as Record<string, number>).some((qty) => qty > 0 && qty < 5)).length

  const revenueThisWeek = ordersThisWeek.reduce((s, o) => s + Number(o.total), 0)
  const revenuePrevWeek = ordersPrevWeek.reduce((s, o) => s + Number(o.total), 0)
  const avgOrderThisWeek = ordersThisWeek.length ? revenueThisWeek / ordersThisWeek.length : 0
  const avgOrderPrevWeek = ordersPrevWeek.length ? revenuePrevWeek / ordersPrevWeek.length : 0

  const revenueDelta = pctChange(revenueThisWeek, revenuePrevWeek)
  const ordersDelta = pctChange(ordersThisWeek.length, ordersPrevWeek.length)
  const customersDelta = pctChange(customersThisWeek, customersPrevWeek)
  const avgOrderDelta = pctChange(avgOrderThisWeek, avgOrderPrevWeek)

  const stats: DashboardStat[] = [
    { label: 'Revenue', value: `₹${revenueThisWeek.toLocaleString('en-IN')}`, ...revenueDelta },
    { label: 'Orders', value: `${ordersThisWeek.length}`, ...ordersDelta },
    { label: 'Customers', value: `${customersThisWeek}`, ...customersDelta },
    { label: 'Avg Order', value: `₹${Math.round(avgOrderThisWeek).toLocaleString('en-IN')}`, ...avgOrderDelta },
  ]

  const alerts: DashboardAlert[] = []
  if (pendingOrders > 0) alerts.push({ text: `${pendingOrders} order${pendingOrders === 1 ? '' : 's'} awaiting confirmation`, sub: 'Needs your attention', tone: 'amber' })
  if (lowStockCount > 0) alerts.push({ text: `${lowStockCount} item${lowStockCount === 1 ? '' : 's'} running low`, sub: 'Less than 5 units remaining', tone: 'amber' })
  if (failedPayments) alerts.push({ text: 'Payment failed', sub: `Order #${failedPayments.id.slice(0, 8).toUpperCase()} · ₹${Number(failedPayments.total).toLocaleString('en-IN')}`, tone: 'danger' })

  const statusLabel: Record<string, string> = { pending: 'Pending', confirmed: 'Confirmed', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled', returned: 'Returned' }
  const recentOrdersOut: DashboardOrder[] = recentOrders.map((o) => {
    const count = o.items.reduce((s, it) => s + it.quantity, 0)
    const first = o.items[0]
    const itemsLabel = first ? `${count}× ${first.productName}${o.items.length > 1 ? ` + ${o.items.length - 1} more` : ''}` : 'No items'
    return {
      code: `#${o.id.slice(0, 8).toUpperCase()}`,
      time: relativeTime(o.createdAt),
      customer: o.customer.name ?? 'Guest',
      items: itemsLabel,
      price: `₹${Number(o.total).toLocaleString('en-IN')}`,
      status: statusLabel[o.status] ?? 'Pending',
    }
  })

  const topSellers: DashboardProduct[] = productSales.map((p) => ({
    name: p.productName,
    sold: `${p._sum.quantity ?? 0} sold`,
    stock: 'In stock',
    low: false,
  }))

  const trendDays = Array.from({ length: 7 }, (_, i) => new Date(weekAgo.getTime() + i * DAY))
  function bucketFor(date: Date) {
    return Math.floor((date.getTime() - weekAgo.getTime()) / DAY)
  }
  const revenueByDay = Array(7).fill(0)
  const ordersByDay = Array(7).fill(0)
  const customersSeenByDay: Set<string>[] = Array.from({ length: 7 }, () => new Set())
  for (const o of ordersThisWeek) {
    const idx = Math.min(6, Math.max(0, bucketFor(o.createdAt)))
    revenueByDay[idx] += Number(o.total)
    ordersByDay[idx] += 1
    customersSeenByDay[idx].add(o.customerId)
  }
  let cumulativeCustomers = 0
  const customersByDay = customersSeenByDay.map((set) => (cumulativeCustomers += set.size))

  const trends = {
    revenue: trendDays.map((d, i) => ({ day: WEEKDAYS[d.getDay()], value: revenueByDay[i] })),
    orders: trendDays.map((d, i) => ({ day: WEEKDAYS[d.getDay()], value: ordersByDay[i] })),
    customers: trendDays.map((d, i) => ({ day: WEEKDAYS[d.getDay()], value: customersByDay[i] })),
  }

  return { stats, alerts, recentOrders: recentOrdersOut, topSellers, trends }
}
