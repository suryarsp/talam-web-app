'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Tour as ReactourTour, type StepType } from '@reactour/tour'
import { useTourStore } from '@/lib/store/tour'

// ponytail: fixed poll ceiling (~3s) — fine for the handful of known go-live targets, swap for a
// MutationObserver if steps needing cross-page navigation ever grow to watch many more targets.
const POLL_INTERVAL_MS = 100
const MAX_POLL_ATTEMPTS = 30

/**
 * `step.target` is either a plain CSS selector, or a resolver function from `visibleTarget()`
 * (lib/tours.ts) — used where the same `data-tour` attribute exists twice in the DOM (desktop
 * sidebar + mobile bottom nav, one hidden via CSS) and only the on-screen copy should be picked.
 * `@reactour/tour`'s `selector` field wants a resolved `Element`, never a selector string built
 * from a stringified function — passing the resolver through unresolved was the previous bug:
 * it stringified into `document.querySelector`, throwing `SyntaxError: ... not a valid selector`.
 */
function resolveTarget(target: string | (() => HTMLElement | null)): HTMLElement | null {
  return typeof target === 'function' ? target() : document.querySelector<HTMLElement>(target)
}

/** Shared engine for both tours: the fixed admin orientation tour and the go-live checklist tour. */
export function Tour() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchParamsKey = searchParams.toString()

  const active = useTourStore((s) => s.active)
  const steps = useTourStore((s) => s.steps)
  const stepIndex = useTourStore((s) => s.stepIndex)
  const stop = useTourStore((s) => s.stop)
  const setStepIndex = useTourStore((s) => s.setStepIndex)

  const [run, setRun] = useState(false)
  const [resolvedTarget, setResolvedTarget] = useState<HTMLElement | null>(null)
  const [disabledActions, setDisabledActions] = useState(false)

  useEffect(() => {
    if (!active) return
    const step = steps[stepIndex]
    if (!step) {
      stop()
      return
    }

    // Orientation steps have no route — their target lives in the always-mounted nav shell,
    // so there's nothing to navigate to or wait for.
    if (!step.route) {
      requestAnimationFrame(() => {
        setResolvedTarget(resolveTarget(step.target))
        setRun(true)
      })
      return
    }

    const [stepPath, stepQuery] = step.route.split('?')
    const stepTab = stepQuery ? new URLSearchParams(stepQuery).get('tab') : null
    const onRightPage = pathname === stepPath && searchParams.get('tab') === stepTab

    if (!onRightPage) {
      queueMicrotask(() => setRun(false))
      router.push(step.route)
      return
    }

    let attempts = 0
    const id = setInterval(() => {
      attempts++
      const el = resolveTarget(step.target)
      if (el) {
        clearInterval(id)
        setResolvedTarget(el)
        setRun(true)
        return
      }
      if (attempts >= MAX_POLL_ATTEMPTS) {
        clearInterval(id)
        // Target never showed up (e.g. slower layout/hydration) — skip the step instead of
        // running the tour against nothing, which renders as a blank full-page overlay.
        if (stepIndex + 1 < steps.length) setStepIndex(stepIndex + 1)
        else stop()
      }
    }, POLL_INTERVAL_MS)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepIndex, pathname, searchParamsKey, steps])

  if (!active || steps.length === 0 || !run || !resolvedTarget) return null

  const current = steps[stepIndex]
  const isLast = stepIndex === steps.length - 1

  // Progression is entirely driven by our own zustand store (stepIndex can jump across page
  // navigations mid-tour), so the library's own Navigation/dots are switched off and this
  // renders a single-step tour each time, with our own back/next/skip footer inside the popover.
  const tourSteps: StepType[] = [
    {
      selector: resolvedTarget,
      content: () => (
        <div className="flex flex-col gap-3">
          <p className="text-2xs font-semibold uppercase tracking-wide text-muted-warm">
            Step {stepIndex + 1} of {steps.length}
          </p>
          <p className="font-heading text-sm font-bold text-fg">{current.label}</p>
          <p className="text-sm text-muted-warm">{current.description}</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <button type="button" onClick={stop} className="text-xs font-semibold text-muted-warm hover:text-fg">
              Skip
            </button>
            <div className="flex items-center gap-2">
              {stepIndex > 0 && (
                <button
                  type="button"
                  onClick={() => setStepIndex(stepIndex - 1)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-fg"
                >
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={() => (isLast ? stop() : setStepIndex(stepIndex + 1))}
                className="rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white"
              >
                {isLast ? 'Done' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      ),
    },
  ]

  return (
    <ReactourTour
      steps={tourSteps}
      isOpen={run}
      currentStep={0}
      setCurrentStep={() => {}}
      setIsOpen={(value) => {
        const next = typeof value === 'function' ? value(run) : value
        if (!next) {
          setRun(false)
          stop()
        }
      }}
      disabledActions={disabledActions}
      setDisabledActions={setDisabledActions}
      showNavigation={false}
      showDots={false}
      showBadge={false}
      showCloseButton
      padding={6}
      styles={{
        maskArea: (base) => ({ ...base, fill: 'rgba(0,0,0,0.6)' }),
      }}
    />
  )
}
