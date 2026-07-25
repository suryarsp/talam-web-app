'use client'

import { Hand } from 'lucide-react'
import type { BeaconRenderProps } from 'react-joyride'

// Joyride mounts the beacon component inside its own <button> wrapper — this must render
// a single element (a <span>), not a <button>.
export function TourHandBeacon(_props: BeaconRenderProps) {
  return (
    <span className="tour-hand-beacon" aria-hidden="true">
      <Hand className="size-6 text-brand-primary drop-shadow-md" strokeWidth={2} fill="white" />
    </span>
  )
}
