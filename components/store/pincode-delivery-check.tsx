'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

/**
 * What the shopper is told after a pincode check. Deliberately carries no rate: the product
 * page promises serviceability and a date, never a delivery charge — the charge depends on the
 * whole cart's weight, so quoting it here would only contradict checkout later.
 */
export type DeliveryCheckResult =
  | { serviceable: true; deliveryBy: string | null }
  | { serviceable: false }
  | { error: string }

type State =
  | { kind: 'idle' }
  | { kind: 'invalid' }
  | { kind: 'checking' }
  | { kind: 'checked'; result: DeliveryCheckResult }

function message(result: DeliveryCheckResult): { text: string; tone: 'good' | 'bad' } {
  if ('error' in result) return { text: "Couldn't check delivery for this pincode right now.", tone: 'bad' }
  if (!result.serviceable) return { text: "We can't currently deliver to this pincode.", tone: 'bad' }
  return {
    text: result.deliveryBy ? `Delivery by ${result.deliveryBy}` : 'Delivers to this pincode',
    tone: 'good',
  }
}

export function PincodeDeliveryCheck({ onCheck }: { onCheck: (pincode: string) => Promise<DeliveryCheckResult> }) {
  const [pincode, setPincode] = useState('')
  const [state, setState] = useState<State>({ kind: 'idle' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pincode.length !== 6) {
      setState({ kind: 'invalid' })
      return
    }
    setState({ kind: 'checking' })
    setState({ kind: 'checked', result: await onCheck(pincode) })
  }

  const shown = state.kind === 'checked' ? message(state.result) : null

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded-lg bg-bg px-4 py-3">
      <label htmlFor="delivery-pincode" className="block font-body text-[13px] font-bold text-fg">
        Check delivery
      </label>
      <div className="flex gap-2">
        <Input
          id="delivery-pincode"
          value={pincode}
          inputMode="numeric"
          placeholder="Enter pincode"
          onChange={(e) => {
            setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))
            setState({ kind: 'idle' })
          }}
          className="h-10 flex-1 rounded-lg border-[1.5px] border-border bg-surface px-3 font-body text-sm text-fg focus-visible:border-store-primary focus-visible:ring-0"
        />
        <Button
          type="submit"
          disabled={state.kind === 'checking'}
          className="h-10 shrink-0 rounded-lg bg-fg px-4 font-body text-sm font-semibold text-surface hover:opacity-90"
        >
          {state.kind === 'checking' ? '…' : 'Check'}
        </Button>
      </div>
      {state.kind === 'invalid' && <p className="font-body text-xs text-danger">Enter a 6-digit pincode</p>}
      {shown && (
        <p className={`font-body text-xs font-medium ${shown.tone === 'good' ? 'text-success' : 'text-danger'}`}>
          {shown.text}
        </p>
      )}
    </form>
  )
}
