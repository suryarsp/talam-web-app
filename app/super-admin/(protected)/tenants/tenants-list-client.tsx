'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import type { SuperAdminTenant } from '@/lib/data/super-admin'
import { TIER_LABEL } from '@/lib/billing/tier-pricing'

const STAGE_LABEL: Record<string, string> = {
  business_setup: 'Business Setup',
  license: 'License',
  razorpay: 'Razorpay',
  store_live: 'Store Live',
}

const STATUS_LABEL: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  blocked: 'Blocked',
  done: 'Done',
}

type FilterKey = 'all' | 'trial' | 'starter' | 'pro' | 'expired'

function isExpiredTrial(t: SuperAdminTenant) {
  return t.tier === 'trial' && !!t.trialEndsAt && t.trialEndsAt.getTime() < Date.now()
}

export function TenantsListClient({ tenants }: { tenants: SuperAdminTenant[] }) {
  const [filter, setFilter] = useState<FilterKey>('all')
  const [query, setQuery] = useState('')

  const counts = useMemo(
    () => ({
      all: tenants.length,
      trial: tenants.filter((t) => t.tier === 'trial').length,
      starter: tenants.filter((t) => t.tier === 'starter').length,
      pro: tenants.filter((t) => t.tier === 'pro').length,
      expired: tenants.filter(isExpiredTrial).length,
    }),
    [tenants]
  )

  const filtered = useMemo(() => {
    let rows = tenants
    if (filter === 'expired') rows = rows.filter(isExpiredTrial)
    else if (filter !== 'all') rows = rows.filter((t) => t.tier === filter)

    const q = query.trim().toLowerCase()
    if (q) rows = rows.filter((t) => t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q))
    return rows
  }, [tenants, filter, query])

  const tabs: { key: FilterKey; label: string }[] = [
    { key: 'all', label: `All (${counts.all})` },
    { key: 'trial', label: `Trial (${counts.trial})` },
    { key: 'starter', label: `Starter (${counts.starter})` },
    { key: 'pro', label: `Pro (${counts.pro})` },
    { key: 'expired', label: `Expired (${counts.expired})` },
  ]

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">All Stores</h1>
        <Input
          placeholder="Search stores..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-64"
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === tab.key
                ? tab.key === 'expired'
                  ? 'bg-destructive/15 text-destructive'
                  : 'bg-brand-primary text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Store</TableHead>
            <TableHead>Onboarding</TableHead>
            <TableHead>Shiprocket</TableHead>
            <TableHead>Razorpay</TableHead>
            <TableHead>Suspended</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((tenant) => (
            <TableRow key={tenant.id}>
              <TableCell>
                <Link href={`/super-admin/tenants/${tenant.id}`} className="font-medium text-foreground hover:underline">
                  {tenant.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {tenant.slug} · {TIER_LABEL[tenant.tier]}
                </p>
              </TableCell>
              <TableCell>
                <span>{tenant.onboardingStage ? STAGE_LABEL[tenant.onboardingStage] : '—'}</span>
                {tenant.onboardingStageStatus && (
                  <Badge className="ml-2" variant={tenant.onboardingStageStatus === 'blocked' ? 'destructive' : 'secondary'}>
                    {STATUS_LABEL[tenant.onboardingStageStatus]}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {tenant.shippingMode === 'assist_requested' ? (
                  // The one state that needs someone to act — has to be scannable down the list.
                  <Badge variant="destructive">Needs help</Badge>
                ) : tenant.shippingMode === 'assist_in_progress' ? (
                  <Badge variant="secondary">In progress</Badge>
                ) : tenant.shippingMode === 'connected' ? (
                  <Badge variant="secondary">Connected</Badge>
                ) : (
                  <span className="text-muted-foreground">Not connected</span>
                )}
              </TableCell>
              <TableCell>{tenant.razorpayStatus ?? '—'}</TableCell>
              <TableCell>
                {tenant.suspendedAt ? <Badge variant="destructive">Suspended</Badge> : <span className="text-muted-foreground">—</span>}
              </TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                No stores match this filter.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
