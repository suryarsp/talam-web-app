import { Badge } from '@/components/ui/badge'
import { requireSuperAdminSection } from '@/lib/auth-guard'
import { getGrowthMetrics } from '@/lib/data/super-admin'
import { StatTile } from '@/components/super-admin/stat-tile'
import { MonthlyBarChart } from '@/components/super-admin/monthly-bar-chart'

export default async function SuperAdminGrowthPage() {
  await requireSuperAdminSection('growth')
  const metrics = await getGrowthMetrics()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Growth</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-border p-4">
          <h2 className="text-sm font-semibold text-foreground">Store Sign-ups</h2>
          <p className="mb-4 text-xs text-muted-foreground">New tenants onboarded, last 6 months</p>
          <MonthlyBarChart data={metrics.storeSignupsByMonth.map((d) => ({ label: d.label, value: d.count }))} />
        </section>

        <section className="rounded-lg border border-border p-4">
          <div className="mb-1 flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">Active Customers</h2>
            <Badge variant="secondary">Pending</Badge>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">Distinct shoppers, last 30 days</p>
          <div className="flex h-32 flex-col items-center justify-center gap-1">
            <span className="text-lg font-semibold text-muted-foreground">—</span>
            <span className="text-xs text-muted-foreground">Wired once product analytics events go live.</span>
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold text-foreground">Customer Sign-ups (all stores)</h2>
        <p className="mb-4 text-xs text-muted-foreground">New customer accounts, last 6 months</p>
        <MonthlyBarChart data={metrics.customerSignupsByMonth.map((d) => ({ label: d.label, value: d.count }))} />

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile label="Total Registered" value={metrics.totalRegisteredCustomers} />
          <StatTile label="New this month" value={metrics.newCustomersThisMonth} />
          <StatTile label="Repeat buyers (30d)" value={metrics.repeatBuyers30d} />
        </div>
      </section>
    </div>
  )
}
