'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2, AlertTriangle } from 'lucide-react'
import { getOnboardingStepperAction, type OnboardingStepInfo } from '@/app/admin/dashboard/actions'

const STATUS_LABEL: Record<OnboardingStepInfo['status'], string> = {
  done: 'Done',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  not_started: 'Not Started',
}

function StepIcon({ status }: { status: OnboardingStepInfo['status'] }) {
  if (status === 'done') return <Check className="size-4" strokeWidth={2.5} />
  if (status === 'in_progress') return <Loader2 className="size-4" strokeWidth={2.5} />
  if (status === 'blocked') return <AlertTriangle className="size-4" strokeWidth={2.5} />
  return <span className="size-2 rounded-full bg-current" />
}

const STATUS_COLOR: Record<OnboardingStepInfo['status'], string> = {
  done: 'border-success bg-success/10 text-success',
  in_progress: 'border-amber bg-amber/10 text-amber',
  blocked: 'border-danger bg-danger/10 text-danger',
  not_started: 'border-border bg-bg text-muted-warm',
}

export function OnboardingStepper() {
  const [steps, setSteps] = useState<OnboardingStepInfo[] | null>(null)

  useEffect(() => {
    getOnboardingStepperAction().then(setSteps)
  }, [])

  // All done — nothing useful left to show the tenant.
  if (steps && steps.every((s) => s.status === 'done')) return null

  return (
    <section className="mb-6 rounded-lg bg-surface p-4">
      <p className="mb-3 text-2xs font-medium uppercase tracking-[0.06em] text-muted-warm">Setup Progress</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(steps ?? []).map((step) => (
          <div key={step.stage} className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 ${STATUS_COLOR[step.status]}`}>
            <StepIcon status={step.status} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{step.label}</p>
              <p className="truncate text-2xs opacity-80">{STATUS_LABEL[step.status]}</p>
            </div>
          </div>
        ))}
        {!steps && <p className="col-span-full text-sm text-muted-warm">Loading…</p>}
      </div>
    </section>
  )
}
