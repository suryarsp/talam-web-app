'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { reportOrderProblemAction } from '../actions'

export function ReportProblemButton({ orderId, alreadyFlagged }: { orderId: string; alreadyFlagged: boolean }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [flagged, setFlagged] = useState(alreadyFlagged)

  if (flagged) {
    return (
      <div className="mb-5 flex items-center gap-2 rounded-xl border border-amber/30 bg-amber/10 p-4 font-body text-sm text-fg">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber" />
        We&apos;ve flagged this order for review. We&apos;ll be in touch shortly.
      </div>
    )
  }

  async function submit() {
    setSubmitting(true)
    setError('')
    const result = await reportOrderProblemAction(orderId, reason)
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setFlagged(true)
  }

  return (
    <div className="mb-5 rounded-xl border border-border bg-surface p-4 sm:p-6">
      {open ? (
        <>
          <h2 className="mb-2 font-heading text-sm font-bold text-fg">Report a problem</h2>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="What went wrong with this order?"
            rows={3}
            className="w-full rounded-lg border border-border bg-bg p-3 font-body text-sm text-fg outline-none focus:border-store-primary"
          />
          {error && <p className="mt-1 font-body text-xs text-danger">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setOpen(false)}
              className="flex-1 rounded-lg border border-border px-4 py-2.5 font-body text-sm font-medium text-fg hover:bg-bg"
            >
              Cancel
            </button>
            <button
              onClick={() => void submit()}
              disabled={submitting || !reason.trim()}
              className="flex-1 rounded-lg bg-store-primary px-4 py-2.5 font-body text-sm font-semibold text-surface disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="font-body text-sm font-semibold text-danger hover:underline"
        >
          Report a problem with this order
        </button>
      )}
    </div>
  )
}
