'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Joyride, ACTIONS, EVENTS, STATUS, type EventData, type Step } from 'react-joyride'
import { useTourStore } from '@/lib/store/tour'
import { TourHandBeacon } from './tour-hand-beacon'

// ponytail: fixed poll ceiling (~3s) — fine for the handful of known go-live targets, swap for a
// MutationObserver if steps needing cross-page navigation ever grow to watch many more targets.
const POLL_INTERVAL_MS = 100
const MAX_POLL_ATTEMPTS = 30

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
      setRun(true)
      return
    }

    const [stepPath, stepQuery] = step.route.split('?')
    const stepTab = stepQuery ? new URLSearchParams(stepQuery).get('tab') : null
    const onRightPage = pathname === stepPath && searchParams.get('tab') === stepTab

    if (!onRightPage) {
      setRun(false)
      router.push(step.route)
      return
    }

    let attempts = 0
    const id = setInterval(() => {
      attempts++
      if (document.querySelector(step.target as string)) {
        clearInterval(id)
        setRun(true)
        return
      }
      if (attempts >= MAX_POLL_ATTEMPTS) {
        clearInterval(id)
        // Target never showed up (e.g. slower layout/hydration) — skip the step instead of
        // running Joyride against nothing, which renders as a blank full-page overlay.
        if (stepIndex + 1 < steps.length) setStepIndex(stepIndex + 1)
        else stop()
      }
    }, POLL_INTERVAL_MS)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepIndex, pathname, searchParamsKey, steps])

  function handleEvent(data: EventData) {
    const { status, action, index, type } = data

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED || action === ACTIONS.CLOSE) {
      setRun(false)
      stop()
      return
    }

    if (type === EVENTS.STEP_AFTER) {
      setRun(false)
      setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1))
    }
  }

  if (!active || steps.length === 0) return null

  const joyrideSteps: Step[] = steps.map((s, i) => ({
    target: s.target,
    title: s.label,
    content: s.description,
    isFixed: s.isFixed,
    // Only the very first step needs a beacon click — this tour is externally controlled
    // (stepIndex driven by our own store, not Joyride's internal NEXT/PREV action), so
    // react-joyride's own continuous-tour beacon skip never kicks in on later steps.
    // Skipping it ourselves makes every step after the first jump straight to the tooltip.
    skipBeacon: i > 0,
  }))

  return (
    <Joyride
      steps={joyrideSteps}
      stepIndex={stepIndex}
      run={run}
      continuous
      beaconComponent={TourHandBeacon}
      onEvent={handleEvent}
      options={{
        showProgress: true,
        buttons: ['back', 'skip', 'close', 'primary'],
        // cancellable at any step: both the skip button and the × end the whole tour, not just the step
        closeButtonAction: 'skip',
        overlayColor: '#00000099',
        spotlightPadding: 6,
      }}
    />
  )
}
