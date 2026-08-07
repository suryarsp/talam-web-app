'use client'

import { useState, useTransition } from 'react'
import type { OnboardingStage, OnboardingStageStatus } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { SuperAdminTenant } from '@/lib/data/super-admin'
import { updateOnboardingStageAction, suspendTenantAction, unsuspendTenantAction } from '../../actions'

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

export function TenantDetailClient({ tenant }: { tenant: SuperAdminTenant }) {
  const [stage, setStage] = useState<OnboardingStage>(
    tenant.onboardingStage && tenant.onboardingStage !== 'razorpay' && tenant.onboardingStage !== 'store_live'
      ? tenant.onboardingStage
      : 'business_setup'
  )
  const [status, setStatus] = useState<OnboardingStageStatus>(tenant.onboardingStageStatus ?? 'not_started')
  const [suspendedAt, setSuspendedAt] = useState(tenant.suspendedAt)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

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
