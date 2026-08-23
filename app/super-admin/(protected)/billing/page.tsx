import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { requireSuperAdminSection } from '@/lib/auth-guard'
import { getBillingSnapshot } from '@/lib/data/super-admin'
import { TIER_LABEL, TIER_PRICE_INR } from '@/lib/billing/tier-pricing'
import { formatCurrency } from '@/lib/utils'
import { StatTile } from '@/components/super-admin/stat-tile'

const ALL_TIERS = ['trial', 'starter', 'growth', 'pro'] as const

export default async function BillingPage() {
  await requireSuperAdminSection('billing')
  const snapshot = await getBillingSnapshot()
  const maxPlanRevenue = Math.max(0, ...snapshot.revenueByPlan.map((row) => row.revenue))
  const payingPct = snapshot.totalStores === 0 ? 0 : Math.round((snapshot.payingStores / snapshot.totalStores) * 100)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Billing</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="MRR" value={formatCurrency(snapshot.mrr)} />
        <StatTile label="Projected ARR" value={formatCurrency(snapshot.projectedArr)} />
        <StatTile
          label="Paying Stores"
          value={`${snapshot.payingStores} / ${snapshot.totalStores}`}
          sub={snapshot.totalStores > 0 ? `${payingPct}% of all stores` : undefined}
        />
        <StatTile label="Trials at Risk" value={snapshot.trialsAtRiskCount} sub="expiring within 7 days" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-border p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Revenue by Plan</h2>
          {snapshot.revenueByPlan.length === 0 ? (
            <p className="text-sm text-muted-foreground">No revenue yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {snapshot.revenueByPlan.map((row) => (
                <div key={row.tier}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground">
                      {TIER_LABEL[row.tier]} — {row.storeCount} stores
                    </span>
                    <span className="text-foreground">{formatCurrency(row.revenue)}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                    <div
                      className="h-1.5 rounded-full bg-primary"
                      style={{ width: maxPlanRevenue === 0 ? '0%' : `${(row.revenue / maxPlanRevenue) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-border p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Plan Pricing</h2>
          <dl className="flex flex-col gap-2 text-sm">
            {ALL_TIERS.map((tier) => (
              <div key={tier} className="flex justify-between">
                <dt className="text-foreground">{TIER_LABEL[tier]}</dt>
                <dd className="text-muted-foreground">
                  {tier === 'trial' ? 'Free · 14 days' : `${formatCurrency(TIER_PRICE_INR[tier])}/mo`}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <section className="rounded-lg border border-border p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Trials Expiring Soon</h2>
        {snapshot.trialsExpiringSoon.length === 0 ? (
          <p className="text-sm text-muted-foreground">No trials expiring in the next 7 days</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Store</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Orders Placed</TableHead>
                <TableHead>Likely to Convert</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshot.trialsExpiringSoon.map((trial) => (
                <TableRow key={trial.tenantId}>
                  <TableCell>
                    <Link
                      href={`/super-admin/tenants/${trial.tenantId}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {trial.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{trial.slug}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={trial.expiresInDays <= 3 ? 'destructive' : 'secondary'}>
                      {trial.expiresInDays} days
                    </Badge>
                  </TableCell>
                  <TableCell>{trial.ordersPlaced}</TableCell>
                  <TableCell>
                    <Badge variant={trial.likelyToConvert === 'High' ? 'secondary' : 'outline'}>
                      {trial.likelyToConvert}
                    </Badge>
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
