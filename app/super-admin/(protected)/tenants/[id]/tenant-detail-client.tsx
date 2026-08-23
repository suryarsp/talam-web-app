'use client'

import { useState, useTransition } from 'react'
import type { OnboardingStage, OnboardingStageStatus, Tier } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { SuperAdminTenant, TenantStats } from '@/lib/data/super-admin'
import { TIER_LABEL, TIER_PRICE_INR } from '@/lib/billing/tier-pricing'
import { formatCurrency, formatDate } from '@/lib/utils'
import { StatTile } from '@/components/super-admin/stat-tile'
import {
  updateOnboardingStageAction,
  suspendTenantAction,
  unsuspendTenantAction,
  overrideTenantTierAction,
} from '@/app/super-admin/actions'
import { ShippingConnectForm } from './shipping-connect-form'

const TIERS: Tier[] = ['trial', 'starter', 'growth', 'pro']

const STAGES: { value: OnboardingStage; label: string }[] = [
  { value: 'business_setup', label: 'Business Setup' },
  { value: 'license', label: 'License' },
]

const STATUSES: { value: OnboardingStageStatus; label: string }[] = [
  { value: 'not_started', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'done', label: 'Done' },
]

export function TenantDetailClient({
  tenant,
  stats,
  ownerEmail,
  daysLeft,
}: {
  tenant: SuperAdminTenant
  stats: TenantStats
  ownerEmail: string | null
  /** Computed server-side from tenant.trialEndsAt — avoids calling Date.now() during render. */
  daysLeft: number | null
}) {
  const [stage, setStage] = useState<OnboardingStage>(
    tenant.onboardingStage && tenant.onboardingStage !== 'razorpay' && tenant.onboardingStage !== 'store_live'
      ? tenant.onboardingStage
      : 'business_setup'
  )
  const [status, setStatus] = useState<OnboardingStageStatus>(tenant.onboardingStageStatus ?? 'not_started')
  const [suspendedAt, setSuspendedAt] = useState(tenant.suspendedAt)
  const [tier, setTier] = useState<Tier>(tenant.tier)
  const [overrideTier, setOverrideTier] = useState<Tier>(tenant.tier)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function applyOverride() {
    setError(null)
    startTransition(async () => {
      const result = await overrideTenantTierAction(tenant.id, overrideTier)
      if ('error' in result) {
        setError(result.error)
        return
      }
      setTier(overrideTier)
    })
  }

  function saveStage() {
    setError(null)
    startTransition(async () => {
      const result = await updateOnboardingStageAction(tenant.id, stage, status)
      if ('error' in result) setError(result.error)
    })
  }

  function toggleSuspend() {
    const action = suspendedAt ? 'unsuspend' : 'suspend'
    const message = suspendedAt
      ? `Lift suspension for "${tenant.name}"? Their storefront will go back online.`
      : `Suspend "${tenant.name}"? This immediately takes their storefront offline.`
    if (!window.confirm(message)) return

    setError(null)
    startTransition(async () => {
      const result = suspendedAt ? await unsuspendTenantAction(tenant.id) : await suspendTenantAction(tenant.id)
      if ('error' in result) {
        setError(result.error)
        return
      }
      setSuspendedAt(action === 'suspend' ? new Date() : null)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {tier === 'trial' && daysLeft !== null && (
        <div>
          <Badge variant={daysLeft <= 3 ? 'destructive' : 'secondary'}>
            Trial · {daysLeft > 0 ? `${daysLeft} days left` : 'expired'}
          </Badge>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Orders" value={stats.orders} />
        <StatTile label="GMV" value={formatCurrency(stats.gmv)} />
        <StatTile label="Customers" value={stats.customers} />
        <StatTile label="Products" value={stats.products} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-border p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Store Facts</h2>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Owner email</dt>
              <dd className="text-foreground">{ownerEmail ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Created</dt>
              <dd className="text-foreground">{formatDate(tenant.createdAt)}</dd>
            </div>
            {tenant.trialEndsAt && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Trial ends</dt>
                <dd className="text-foreground">{formatDate(tenant.trialEndsAt)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Current plan</dt>
              <dd className="text-foreground">{TIER_LABEL[tier]}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-border p-4">
          <h2 className="mb-1 text-sm font-semibold text-foreground">Override Tier</h2>
          <p className="mb-3 text-xs text-muted-foreground">Manually change this store&apos;s plan — bypasses billing.</p>
          <Select value={overrideTier} onValueChange={(v) => setOverrideTier(v as Tier)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIERS.map((t) => (
                <SelectItem key={t} value={t}>
                  {TIER_LABEL[t]}
                  {TIER_PRICE_INR[t] > 0 ? ` — ${formatCurrency(TIER_PRICE_INR[t])}/mo` : ' — Free'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="mt-3 w-full" onClick={applyOverride} disabled={isPending || overrideTier === tier}>
            Apply Override
          </Button>
        </section>
      </div>

      <section className="rounded-lg border border-border p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Onboarding Stage</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Stage</span>
            <Select value={stage} onValueChange={(v) => setStage(v as OnboardingStage)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Status</span>
            <Select value={status} onValueChange={(v) => setStatus(v as OnboardingStageStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={saveStage} disabled={isPending}>
            Save
          </Button>
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Razorpay stage (read-only, driven by webhook):</span>
          <Badge variant="secondary">{tenant.razorpayStatus ?? 'not connected'}</Badge>
        </div>
      </section>

      <ShippingConnectForm tenant={tenant} />

      <section className="rounded-lg border border-border p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Store Access</h2>
        <div className="flex items-center gap-3">
          {suspendedAt ? <Badge variant="destructive">Suspended</Badge> : <Badge variant="secondary">Active</Badge>}
          <Button variant={suspendedAt ? 'outline' : 'destructive'} onClick={toggleSuspend} disabled={isPending}>
            {suspendedAt ? 'Unsuspend store' : 'Suspend store'}
          </Button>
        </div>
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
