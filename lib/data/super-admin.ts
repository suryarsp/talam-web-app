import type { OnboardingStage, OnboardingStageStatus, Tier } from '@prisma/client'
import { withSuperAdmin } from '@/lib/prisma'
import { normalizePaymentConfig, type RazorpayStatus } from '@/lib/payments/config'
import { normalizeShippingConfig, type ShippingMode } from '@/lib/shipping/shipping-config'
import { TIER_PRICE_INR } from '@/lib/billing/tier-pricing'

const DAY_MS = 24 * 60 * 60 * 1000
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Builds the last `count` calendar months (oldest first) as {year, month, label}. */
function lastMonths(count: number, now = new Date()) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1)
    return { year: d.getFullYear(), month: d.getMonth(), label: MONTH_LABELS[d.getMonth()] }
  })
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}`
}

function bucketByMonth(dates: Date[], months: ReturnType<typeof lastMonths>) {
  const counts = new Map(months.map((m) => [`${m.year}-${m.month}`, 0]))
  for (const d of dates) {
    const key = monthKey(d)
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return months.map((m) => ({ label: m.label, count: counts.get(`${m.year}-${m.month}`) ?? 0 }))
}

const tenantSelect = {
  id: true,
  name: true,
  slug: true,
  tier: true,
  trialEndsAt: true,
  createdAt: true,
  onboardingStage: true,
  onboardingStageStatus: true,
  paymentConfig: true,
  shippingConfig: true,
  suspendedAt: true,
} as const

type TenantRow = {
  id: string
  name: string
  slug: string
  tier: Tier
  trialEndsAt: Date | null
  createdAt: Date
  onboardingStage: OnboardingStage | null
  onboardingStageStatus: OnboardingStageStatus | null
  paymentConfig: unknown
  shippingConfig: unknown
  suspendedAt: Date | null
}

export type SuperAdminTenant = {
  id: string
  name: string
  slug: string
  tier: Tier
  trialEndsAt: Date | null
  createdAt: Date
  onboardingStage: OnboardingStage | null
  onboardingStageStatus: OnboardingStageStatus | null
  razorpayStatus: RazorpayStatus | undefined
  shippingMode: ShippingMode
  // Unlike razorpayStatus, these carry timestamps: "how long has this shop been waiting
  // for us" is the thing staff actually need off the assist queue.
  shippingRequestedAt: string | null
  shippingConnectedAt: string | null
  suspendedAt: Date | null
}

function toSuperAdminTenant(t: TenantRow): SuperAdminTenant {
  const shipping = normalizeShippingConfig(t.shippingConfig)
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    tier: t.tier,
    trialEndsAt: t.trialEndsAt,
    createdAt: t.createdAt,
    onboardingStage: t.onboardingStage,
    onboardingStageStatus: t.onboardingStageStatus,
    razorpayStatus: normalizePaymentConfig(t.paymentConfig).razorpay.status,
    // Only the derived fields cross into the client component — the raw config stays here,
    // same as paymentConfig above.
    shippingMode: shipping.mode,
    shippingRequestedAt: shipping.requestedAt,
    shippingConnectedAt: shipping.connectedAt,
    suspendedAt: t.suspendedAt,
  }
}

export async function getAllTenants(): Promise<SuperAdminTenant[]> {
  const rows = await withSuperAdmin((db) =>
    db.tenant.findMany({ select: tenantSelect, orderBy: { createdAt: 'desc' } })
  )
  return rows.map(toSuperAdminTenant)
}

export async function getTenantDetail(tenantId: string): Promise<SuperAdminTenant | null> {
  const row = await withSuperAdmin((db) => db.tenant.findUnique({ where: { id: tenantId }, select: tenantSelect }))
  return row ? toSuperAdminTenant(row) : null
}

/** Tenant.ownerId has no declared Prisma relation to User (raw FK only), so this is a
 *  manual second lookup rather than an `include` — only Tenant Detail needs it, not the list. */
export async function getTenantOwnerEmail(tenantId: string): Promise<string | null> {
  const tenant = await withSuperAdmin((db) => db.tenant.findUnique({ where: { id: tenantId }, select: { ownerId: true } }))
  if (!tenant) return null
  const owner = await withSuperAdmin((db) => db.user.findUnique({ where: { id: tenant.ownerId }, select: { email: true } }))
  return owner?.email ?? null
}

export type FlaggedOrder = {
  id: string
  tenantName: string
  total: number
  paymentProvider: string | null
  utr: string | null
  daysPending: number
}

// ponytail: days-pending measured from disputeFlaggedAt (when ops picked it up for the queue),
// not order creation — that's what tells ops how stale their own follow-up is.
export async function getFlaggedOrders(): Promise<FlaggedOrder[]> {
  const rows = await withSuperAdmin((db) =>
    db.order.findMany({
      where: { disputeFlaggedAt: { not: null } },
      select: {
        id: true,
        total: true,
        paymentProvider: true,
        paymentId: true,
        disputeFlaggedAt: true,
        tenant: { select: { name: true } },
      },
      orderBy: { disputeFlaggedAt: 'asc' },
    })
  )
  const now = Date.now()
  return rows.map((o) => ({
    id: o.id,
    tenantName: o.tenant.name,
    total: Number(o.total),
    paymentProvider: o.paymentProvider,
    utr: o.paymentId,
    daysPending: Math.floor((now - o.disputeFlaggedAt!.getTime()) / (24 * 60 * 60 * 1000)),
  }))
}

// ── Overview ──

export type OverviewMetrics = {
  totalStores: number
  newStoresThisMonth: number
  /** Snapshot MRR: today's tier mix × TIER_PRICE_INR. Not derived from any billing history. */
  mrr: number
  gmv30d: number
  /** Share of *current* stores on a paid tier — a snapshot proxy, not a true trial→paid
   *  conversion rate (that needs tier-change history, which isn't tracked). */
  trialToPaidPct: number
  planDistribution: { tier: Tier; count: number }[]
  recentSignups: { id: string; name: string; slug: string; createdAt: Date }[]
  trialHealthPct: number
  activity: { label: string; sub: string; at: Date }[]
}

export async function getOverviewMetrics(): Promise<OverviewMetrics> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const gmv30dSince = new Date(now.getTime() - 30 * DAY_MS)

  const [tenants, gmv30dOrders, recentSuspensions] = await withSuperAdmin((db) =>
    Promise.all([
      db.tenant.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, slug: true, tier: true, createdAt: true, suspendedAt: true },
      }),
      db.order.aggregate({ where: { createdAt: { gte: gmv30dSince } }, _sum: { total: true } }),
      db.tenant.findMany({
        where: { suspendedAt: { not: null } },
        orderBy: { suspendedAt: 'desc' },
        take: 3,
        select: { name: true, suspendedAt: true },
      }),
    ])
  )

  const totalStores = tenants.length
  const paidCount = tenants.filter((t) => t.tier !== 'trial').length
  const trialCount = totalStores - paidCount

  const planDistribution: { tier: Tier; count: number }[] = (['trial', 'starter', 'growth', 'pro'] as const).map((tier) => ({
    tier,
    count: tenants.filter((t) => t.tier === tier).length,
  }))

  const activity = [
    ...tenants
      .filter((t) => t.createdAt >= gmv30dSince)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 3)
      .map((t) => ({ label: `${t.name} signed up`, sub: 'New store', at: t.createdAt })),
    ...recentSuspensions.map((t) => ({ label: `${t.name} was suspended`, sub: 'Store access', at: t.suspendedAt! })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 5)

  return {
    totalStores,
    newStoresThisMonth: tenants.filter((t) => t.createdAt >= startOfMonth).length,
    mrr: tenants.reduce((sum, t) => sum + TIER_PRICE_INR[t.tier], 0),
    gmv30d: Number(gmv30dOrders._sum.total ?? 0),
    trialToPaidPct: totalStores === 0 ? 0 : Math.round((paidCount / totalStores) * 100),
    planDistribution,
    recentSignups: [...tenants].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 3),
    trialHealthPct: totalStores === 0 ? 0 : Math.round((trialCount / totalStores) * 100),
    activity,
  }
}

// ── Order Insights ──

export type OrderInsightsByStore = {
  tenantId: string
  name: string
  slug: string
  tier: Tier
  orders: number
  gmv: number
  aov: number
  pctOfGmv: number
}

export type OrderInsights = {
  totalOrders: number
  gmv: number
  aov: number
  storesWithOrders: number
  totalStores: number
  monthlyTrend: { label: string; orders: number; gmv: number }[]
  byStore: OrderInsightsByStore[]
}

export async function getOrderInsights(): Promise<OrderInsights> {
  const months = lastMonths(6)
  const sixMonthsAgo = new Date(months[0].year, months[0].month, 1)
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [tenants, ordersThisMonth, ordersForTrend] = await withSuperAdmin((db) =>
    Promise.all([
      db.tenant.findMany({ where: { deletedAt: null }, select: { id: true, name: true, slug: true, tier: true } }),
      db.order.findMany({ where: { createdAt: { gte: startOfMonth } }, select: { tenantId: true, total: true } }),
      db.order.findMany({ where: { createdAt: { gte: sixMonthsAgo } }, select: { total: true, createdAt: true } }),
    ])
  )

  const totalOrders = ordersThisMonth.length
  const gmv = ordersThisMonth.reduce((s, o) => s + Number(o.total), 0)

  const byTenant = new Map<string, { orders: number; gmv: number }>()
  for (const o of ordersThisMonth) {
    const row = byTenant.get(o.tenantId) ?? { orders: 0, gmv: 0 }
    row.orders += 1
    row.gmv += Number(o.total)
    byTenant.set(o.tenantId, row)
  }

  const byStore: OrderInsightsByStore[] = tenants
    .map((t) => {
      const row = byTenant.get(t.id) ?? { orders: 0, gmv: 0 }
      return {
        tenantId: t.id,
        name: t.name,
        slug: t.slug,
        tier: t.tier,
        orders: row.orders,
        gmv: row.gmv,
        aov: row.orders === 0 ? 0 : row.gmv / row.orders,
        pctOfGmv: gmv === 0 ? 0 : Math.round((row.gmv / gmv) * 100),
      }
    })
    .sort((a, b) => b.gmv - a.gmv)

  const monthBuckets = new Map(months.map((m) => [`${m.year}-${m.month}`, { orders: 0, gmv: 0 }]))
  for (const o of ordersForTrend) {
    const bucket = monthBuckets.get(monthKey(o.createdAt))
    if (bucket) {
      bucket.orders += 1
      bucket.gmv += Number(o.total)
    }
  }

  return {
    totalOrders,
    gmv,
    aov: totalOrders === 0 ? 0 : gmv / totalOrders,
    storesWithOrders: byStore.filter((s) => s.orders > 0).length,
    totalStores: tenants.length,
    monthlyTrend: months.map((m) => ({ label: m.label, ...monthBuckets.get(`${m.year}-${m.month}`)! })),
    byStore,
  }
}

// ── Growth ──

export type GrowthMetrics = {
  storeSignupsByMonth: { label: string; count: number }[]
  customerSignupsByMonth: { label: string; count: number }[]
  totalRegisteredCustomers: number
  newCustomersThisMonth: number
  repeatBuyers30d: number
}

export async function getGrowthMetrics(): Promise<GrowthMetrics> {
  const months = lastMonths(6)
  const sixMonthsAgo = new Date(months[0].year, months[0].month, 1)
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS)

  const [tenantDates, customerDates, totalCustomers, newCustomers, repeatBuyerGroups] = await withSuperAdmin((db) =>
    Promise.all([
      db.tenant.findMany({ where: { deletedAt: null, createdAt: { gte: sixMonthsAgo } }, select: { createdAt: true } }),
      db.customer.findMany({ where: { deletedAt: null, createdAt: { gte: sixMonthsAgo } }, select: { createdAt: true } }),
      db.customer.count({ where: { deletedAt: null } }),
      db.customer.count({ where: { deletedAt: null, createdAt: { gte: startOfMonth } } }),
      db.order.groupBy({
        by: ['customerId'],
        where: { createdAt: { gte: thirtyDaysAgo } },
        having: { customerId: { _count: { gt: 1 } } },
      }),
    ])
  )

  return {
    storeSignupsByMonth: bucketByMonth(tenantDates.map((t) => t.createdAt), months),
    customerSignupsByMonth: bucketByMonth(customerDates.map((c) => c.createdAt), months),
    totalRegisteredCustomers: totalCustomers,
    newCustomersThisMonth: newCustomers,
    repeatBuyers30d: repeatBuyerGroups.length,
  }
}

// ── Billing ──

export type TrialAtRisk = {
  tenantId: string
  name: string
  slug: string
  expiresInDays: number
  ordersPlaced: number
  likelyToConvert: 'High' | 'Low'
}

export type BillingSnapshot = {
  mrr: number
  projectedArr: number
  payingStores: number
  totalStores: number
  trialsAtRiskCount: number
  revenueByPlan: { tier: Tier; storeCount: number; revenue: number }[]
  trialsExpiringSoon: TrialAtRisk[]
}

export async function getBillingSnapshot(): Promise<BillingSnapshot> {
  const now = new Date()
  const sevenDaysOut = new Date(now.getTime() + 7 * DAY_MS)

  const [tenants, trialTenants] = await withSuperAdmin((db) =>
    Promise.all([
      db.tenant.findMany({ where: { deletedAt: null }, select: { id: true, tier: true } }),
      db.tenant.findMany({
        where: { deletedAt: null, tier: 'trial', trialEndsAt: { not: null, lte: sevenDaysOut } },
        select: { id: true, name: true, slug: true, trialEndsAt: true, _count: { select: { orders: true } } },
        orderBy: { trialEndsAt: 'asc' },
      }),
    ])
  )

  const mrr = tenants.reduce((sum, t) => sum + TIER_PRICE_INR[t.tier], 0)
  const revenueByPlan = (['trial', 'starter', 'growth', 'pro'] as const)
    .map((tier) => {
      const storeCount = tenants.filter((t) => t.tier === tier).length
      return { tier, storeCount, revenue: storeCount * TIER_PRICE_INR[tier] }
    })
    .filter((row) => row.storeCount > 0)

  const trialsExpiringSoon: TrialAtRisk[] = trialTenants.map((t) => ({
    tenantId: t.id,
    name: t.name,
    slug: t.slug,
    expiresInDays: Math.max(0, Math.ceil((t.trialEndsAt!.getTime() - now.getTime()) / DAY_MS)),
    ordersPlaced: t._count.orders,
    // Heuristic, not a model: real order activity during the trial reads as high intent.
    likelyToConvert: t._count.orders >= 10 ? 'High' : 'Low',
  }))

  return {
    mrr,
    projectedArr: mrr * 12,
    payingStores: tenants.filter((t) => t.tier !== 'trial').length,
    totalStores: tenants.length,
    trialsAtRiskCount: trialsExpiringSoon.length,
    revenueByPlan,
    trialsExpiringSoon,
  }
}

// ── Tenant Detail stats ──

export type TenantStats = { orders: number; gmv: number; customers: number; products: number }

export async function getTenantStats(tenantId: string): Promise<TenantStats> {
  const [orderAgg, customers, products] = await withSuperAdmin((db) =>
    Promise.all([
      db.order.aggregate({ where: { tenantId }, _count: { _all: true }, _sum: { total: true } }),
      db.customer.count({ where: { tenantId, deletedAt: null } }),
      db.product.count({ where: { tenantId, deletedAt: null } }),
    ])
  )
  return {
    orders: orderAgg._count._all,
    gmv: Number(orderAgg._sum.total ?? 0),
    customers,
    products,
  }
}
