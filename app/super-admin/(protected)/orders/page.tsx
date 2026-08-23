import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import { requireSuperAdminSection } from '@/lib/auth-guard'
import { getFlaggedOrders, getOrderInsights } from '@/lib/data/super-admin'
import { TIER_LABEL } from '@/lib/billing/tier-pricing'
import { StatTile } from '@/components/super-admin/stat-tile'
import { MonthlyBarChart } from '@/components/super-admin/monthly-bar-chart'

export default async function OrdersPage() {
  await requireSuperAdminSection('orders')
  const [orders, insights] = await Promise.all([getFlaggedOrders(), getOrderInsights()])
  const zeroOrderStores = insights.totalStores - insights.storesWithOrders

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Orders</h1>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Order Insights</h2>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatTile label="Total Orders" value={insights.totalOrders} />
          <StatTile label="GMV (this month)" value={formatCurrency(insights.gmv)} />
          <StatTile label="Avg Order Value" value={formatCurrency(insights.aov)} />
          <StatTile
            label="Stores w/ Orders"
            value={`${insights.storesWithOrders} / ${insights.totalStores}`}
            sub={zeroOrderStores > 0 ? `${zeroOrderStores} stores with zero orders` : undefined}
          />
        </div>

        <div className="mt-4 rounded-lg border border-border p-4">
          <h3 className="mb-3 text-xs text-muted-foreground">Monthly GMV Trend</h3>
          <MonthlyBarChart
            data={insights.monthlyTrend.map((m) => ({
              label: m.label,
              value: m.gmv,
              tooltip: `${formatCurrency(m.gmv)} · ${m.orders} orders`,
            }))}
            renderValue={(v) => formatCurrency(v)}
          />
        </div>

        <div className="mt-4 rounded-lg border border-border p-4">
          <h3 className="mb-3 text-xs text-muted-foreground">By Store — This Month</h3>
          {insights.byStore.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stores yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Store</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>GMV</TableHead>
                  <TableHead>AOV</TableHead>
                  <TableHead>% of GMV</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {insights.byStore.map((store) => (
                  <TableRow key={store.tenantId}>
                    <TableCell>
                      <Link href={`/super-admin/tenants/${store.tenantId}`} className="font-medium text-foreground hover:underline">
                        {store.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {store.slug} · {TIER_LABEL[store.tier]}
                      </p>
                    </TableCell>
                    <TableCell>{store.orders}</TableCell>
                    <TableCell>{formatCurrency(store.gmv)}</TableCell>
                    <TableCell>{formatCurrency(store.aov)}</TableCell>
                    <TableCell>{store.pctOfGmv}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Disputes</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders currently flagged for dispute.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>UTR</TableHead>
                <TableHead>Days Pending</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium text-foreground">{order.tenantName}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{order.id}</TableCell>
                  <TableCell>{formatCurrency(order.total)}</TableCell>
                  <TableCell>{order.paymentProvider ?? '—'}</TableCell>
                  <TableCell>{order.utr ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={order.daysPending >= 3 ? 'destructive' : 'secondary'}>{order.daysPending}d</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  )
}
