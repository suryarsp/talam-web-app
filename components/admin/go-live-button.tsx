'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { goLiveAction, getTenantLiveStateAction } from '@/app/admin/dashboard/actions'
import { useTourStore } from '@/lib/store/tour'
import { buildGoLiveSteps } from '@/lib/tours'

export function GoLiveButton({ onGoLive }: { onGoLive?: () => void }) {
  const router = useRouter()
  const startTour = useTourStore((s) => s.start)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [launching, setLaunching] = useState(false)

  async function handleClick() {
    // `missing` is fetched once on mount by the parent nav shell, so it goes stale the moment the
    // owner finishes a requirement elsewhere (settings, products) without a full remount — refetch here.
    const state = await getTenantLiveStateAction()
    if (state.missing.length > 0) {
      startTour(buildGoLiveSteps(state.missing))
      return
    }
    setDialogOpen(true)
  }

  async function handleGoLive() {
    setLaunching(true)
    const result = await goLiveAction()
    setLaunching(false)
    if (!result.error) {
      setDialogOpen(false)
      onGoLive?.()
      router.refresh()
    }
  }

  return (
    <>
      <button
        type="button"
        data-tour="go-live-button"
        onClick={handleClick}
        className="shrink-0 cursor-pointer rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        Go Live 🚀
      </button>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} position="center">
        <div className="p-6">
          <h2 className="font-marketing text-lg font-semibold text-fg">You&apos;re ready to go live</h2>
          <p className="mt-1 text-sm text-muted-warm">Publish your store so customers can start browsing and ordering.</p>

          <div className="mt-4 flex items-center gap-3 rounded-lg bg-success-bg p-3">
            <CheckCircle2 className="size-5 shrink-0 text-success" />
            <span className="text-sm font-semibold text-success">Everything&apos;s set — you&apos;re good to go.</span>
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDialogOpen(false)}
              className="rounded-lg px-4 py-2 font-body text-sm font-semibold text-muted-warm hover:bg-bg"
            >
              Close
            </button>
            <button
              type="button"
              disabled={launching}
              onClick={handleGoLive}
              className="rounded-lg bg-brand-primary px-4 py-2 font-body text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {launching ? 'Launching…' : 'Go Live 🚀'}
            </button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
