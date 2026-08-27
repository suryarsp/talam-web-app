'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { confirmRefundVerificationAction } from './actions'

/**
 * Step B of a manual refund: signs off on the uploaded UPI screenshot, which is what
 * actually cancels the order (see lib/orders/cancellation.ts).
 *
 * `canVerify` only disables the control — the authoritative role check runs server-side in
 * confirmRefundVerification, so a rendered-stale page can't sign anything off.
 */
export function ConfirmRefundButton({
  tenantId,
  orderId,
  canVerify,
}: {
  tenantId: string
  orderId: string
  canVerify: boolean
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function confirm() {
    setError(null)
    startTransition(async () => {
      const result = await confirmRefundVerificationAction(tenantId, orderId)
      if (result.error) setError(result.error)
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        onClick={confirm}
        disabled={!canVerify || isPending}
        title={canVerify ? undefined : 'Only an owner or support agent can confirm a manual refund.'}
      >
        Confirm Refund
      </Button>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
