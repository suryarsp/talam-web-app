'use client'

import { Printer } from 'lucide-react'

/** The browser's own print dialog doubles as "Save as PDF" — no PDF dependency needed. */
export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-1.5 rounded-lg bg-store-primary px-4 py-2 font-body text-sm font-semibold text-surface hover:opacity-90"
    >
      <Printer className="h-4 w-4" /> Print / Save PDF
    </button>
  )
}
