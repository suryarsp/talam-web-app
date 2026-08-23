import Link from 'next/link'
import { requireSuperAdminSection } from '@/lib/auth-guard'
import { getOverviewMetrics } from '@/lib/data/super-admin'
import { TIER_LABEL } from '@/lib/billing/tier-pricing'
import { formatCurrency, formatDate } from '@/lib/utils'
import { StatTile } from '@/components/super-admin/stat-tile'

export default async function SuperAdminOverviewPage() {
  await requireSuperAdminSection('overview')
  const metrics = await getOverviewMetrics()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Overview</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Total Stores" value={metrics.totalStores} sub={`${metrics.newStoresThisMonth} new this month`} />
        <StatTile label="MRR" value={formatCurrency(metrics.mrr)} />
        <StatTile label="Trial → Paid" value={`${metrics.trialToPaidPct}%`} sub="of stores on a paid plan" />
        <StatTile label="GMV (30d)" value={formatCurrency(metrics.gmv30d)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-border p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Plan Distribution</h2>
          {metrics.planDistribution.every((p) => p.count === 0) ? (
            <p className="text-sm text-muted-foreground">No stores yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {metrics.planDistribution
                .filter((p) => p.count > 0)
                .map((p) => (
                  <div key={p.tier} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{TIER_LABEL[p.tier]}</span>
                      <span className="text-muted-foreground">{p.count}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-brand-primary/60"
                        style={{
                          width: `${metrics.totalStores === 0 ? 0 : Math.round((p.count / metrics.totalStores) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-border p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Trial Health</h2>
          <p className="text-lg font-semibold text-foreground">{metrics.trialHealthPct}%</p>
          <p className="mt-1 text-xs text-muted-foreground">of stores are on trial</p>
        </section>

        <section className="rounded-lg border border-border p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Recent Signups</h2>
          {metrics.recentSignups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No signups yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {metrics.recentSignups.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/super-admin/tenants/${s.id}`}
                    className="flex items-center justify-between text-sm hover:underline"
                  >
                    <span>
                      <span className="text-foreground">{s.name}</span>{' '}
                      <span className="text-xs text-muted-foreground">{s.slug}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDate(s.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-border p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Activity</h2>
          {metrics.activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {metrics.activity.map((a, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span>
                    <span className="text-foreground">{a.label}</span>{' '}
                    <span className="text-xs text-muted-foreground">{a.sub}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDate(a.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-lg border border-border p-4">
        <h2 className="mb-1 text-sm font-semibold text-foreground">Growth Trend</h2>
        <p className="text-sm text-muted-foreground">Historical trend — coming soon</p>
      </section>
    </div>
  )
}
