'use client'

import { useEffect, useState } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { getPendingChangeCountAction, publishChangesAction, type PublishConflict } from '@/app/admin/actions'

export function PublishButton() {
  const [count, setCount] = useState(0)
  const [publishing, setPublishing] = useState(false)
  const [conflicts, setConflicts] = useState<PublishConflict[] | null>(null)

  useEffect(() => {
    getPendingChangeCountAction().then(setCount)
    // ponytail: draft writes happen from same-route dialogs across products/settings/occasions,
    // so nothing signals this header button to refetch — poll instead of threading a callback
    // through every write path.
    const interval = setInterval(() => {
      getPendingChangeCountAction().then(setCount)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  async function handlePublish(force: boolean) {
    setPublishing(true)
    const result = await publishChangesAction({ force })
    setPublishing(false)

    if (result.conflicts && result.conflicts.length > 0) {
      setConflicts(result.conflicts)
      return
    }

    setConflicts(null)
    setCount(0)
  }

  return (
    <>
      <button
        type="button"
        disabled={count === 0 || publishing}
        onClick={() => handlePublish(false)}
        className="flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        Publish
        {count > 0 && (
          <span className="flex size-5 items-center justify-center rounded-full bg-white/20 text-2xs font-bold">
            {count}
          </span>
        )}
      </button>

      <Dialog open={conflicts !== null} onClose={() => setConflicts(null)}>
        <div className="p-6">
          <h2 className="font-marketing text-lg font-semibold text-fg">Publishing may affect existing orders</h2>
          <p className="mt-2 font-body text-sm text-muted-warm">
            These products have unpublished changes and open orders. Customers already ordered them as currently
            listed — publishing could create a mismatch between what they ordered and the live listing.
          </p>
          <ul className="mt-3 flex flex-col gap-1.5">
            {conflicts?.map((c) => (
              <li key={c.productName} className="font-body text-sm text-fg">
                <span className="font-semibold">{c.productName}</span> — {c.openOrderCount} open order
                {c.openOrderCount === 1 ? '' : 's'}
              </li>
            ))}
          </ul>
          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setConflicts(null)}
              className="rounded-lg px-4 py-2 font-body text-sm font-semibold text-muted-warm hover:bg-bg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handlePublish(true)}
              className="rounded-lg bg-danger px-4 py-2 font-body text-sm font-semibold text-white hover:opacity-90"
            >
              Publish anyway
            </button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
