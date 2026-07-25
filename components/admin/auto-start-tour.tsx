'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useTourStore } from '@/lib/store/tour'
import { markSetupTourSeenAction } from '@/app/admin/dashboard/actions'
import { ORIENTATION_TOUR } from '@/lib/tours'

/**
 * Auto-starts the fixed orientation tour the first time a tenant lands on the Dashboard.
 * `firedRef` guards against re-firing if they navigate away and back before `shouldStart`
 * (server-computed once per page load) catches up with the just-marked "seen" flag.
 */
export function AutoStartTour({ shouldStart }: { readonly shouldStart: boolean }) {
  const pathname = usePathname()
  const start = useTourStore((s) => s.start)
  const firedRef = useRef(false)

  useEffect(() => {
    if (!shouldStart || firedRef.current) return
    if (!pathname.endsWith('/admin/dashboard')) return
    firedRef.current = true
    start(ORIENTATION_TOUR)
    markSetupTourSeenAction()
  }, [shouldStart, pathname, start])

  return null
}
