'use client'

import { Hand } from 'lucide-react'
import type { BeaconRenderProps } from 'react-joyride'

// Joyride mounts the beacon component inside its own <button> wrapper — this must render
// a single element (a <span>), not a <button>.
export function TourHandBeacon(_props: BeaconRenderProps) {
  return (
    <span
      className="tour-hand-beacon inline-flex items-center justify-center rounded-full bg-surface p-2 shadow-lg ring-2 ring-brand-primary"
      aria-hidden="true"
    >
      <Hand className="size-5 text-brand-primary" strokeWidth={2.2} />
    </span>
  )
}
