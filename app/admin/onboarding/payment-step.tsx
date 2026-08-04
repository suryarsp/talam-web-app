import { useState } from 'react'
import { Controller, type Control, useWatch } from 'react-hook-form'

import { PAYMENTS, UPI_HANDLES, type PaymentId } from './onboarding-data'
import { Field, FieldHint, StepTitle, TextInput } from './onboarding-fields'
import type { OnboardingValues } from './onboarding-schema'

export function PaymentStep({ control }: { readonly control: Control<OnboardingValues> }) {
  const paymentIds = useWatch({ control, name: 'paymentIds' }) ?? []
  const [showHandles, setShowHandles] = useState(false)
  const needsUpiAddress = paymentIds.includes('upi') || paymentIds.includes('razorpay')

  return (
    <div className="animate-[fadeIn_0.2s_ease-out]">
      <StepTitle
        step={6}
        title="Connect payments"
        description="Choose how you want to receive payments from customers — you can enable more than one."
      />
      <Controller
        control={control}
        name="paymentIds"
        render={({ field, fieldState }) => (
          <div>
            <div className="space-y-[10px]">
              {PAYMENTS.map((payment) => {
                const selected = field.value?.includes(payment.id)
                // Razorpay routes UPI itself, so selecting it implies (and locks) UPI too.
                const lockedOn = payment.id === 'upi' && field.value?.includes('razorpay')

                function toggle() {
                  if (lockedOn) return
                  const current: PaymentId[] = field.value ?? []
                  if (selected) {
                    field.onChange(current.filter((id: PaymentId) => id !== payment.id))
                  } else if (payment.id === 'razorpay') {
                    field.onChange(Array.from(new Set([...current, 'razorpay', 'upi'])))
                  } else {
                    field.onChange([...current, payment.id])
                  }
                }

                return (
                  <label
                    key={payment.id}
                    className={[
                      'block rounded-xl border-[1.5px] bg-surface p-4 transition-colors',
                      selected ? 'border-brand-primary bg-brand-primary/5' : 'border-border',
                      lockedOn ? 'cursor-not-allowed' : 'cursor-pointer',
                    ].join(' ')}
                  >
                    <span className="flex items-start gap-3">
                      <input
                        className="mt-1 size-5 accent-brand-primary"
                        type="checkbox"
                        checked={Boolean(selected)}
                        disabled={lockedOn}
                        onChange={toggle}
                      />
                      <span className={`flex h-7 w-10 items-center justify-center rounded-[5px] text-[10px] font-bold ${payment.markClassName}`}>
                        {payment.mark}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-bold text-fg">{payment.name}</span>
                        <span className="mt-1 block text-xs leading-snug text-muted-warm">{payment.description}</span>
                        <span className="mt-1 block text-2xs font-medium text-amber">{payment.commission}</span>
                        {lockedOn ? <span className="mt-1 block text-2xs text-muted-warm">Included automatically with Razorpay</span> : null}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
            {fieldState.error ? (
              <span className="mt-2 block font-body text-xs font-medium text-danger">{fieldState.error.message}</span>
            ) : null}
          </div>
        )}
      />

      {needsUpiAddress ? (
        <Controller
          control={control}
          name="upiAddress"
          render={({ field, fieldState }) => (
            <div className="relative mt-5">
              <Field label="UPI address" error={fieldState.error?.message}>
                <FieldHint>Where payouts are sent — e.g. yourname@paytm or 9876543210@upi</FieldHint>
                <TextInput
                  value={field.value ?? ''}
                  onChange={(e) => {
                    field.onChange(e)
                    setShowHandles(e.target.value.includes('@'))
                  }}
                  onBlur={field.onBlur}
                  invalid={Boolean(fieldState.error)}
                />
              </Field>
              {showHandles ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {UPI_HANDLES.map((handle) => (
                    <button
                      key={handle}
                      type="button"
                      onClick={() => {
                        const base = (field.value ?? '').split('@')[0]
                        field.onChange(`${base}${handle}`)
                        setShowHandles(false)
                      }}
                      className="cursor-pointer rounded-full border border-[#E5E7EB] px-3 py-1 font-body text-xs text-[#374151] hover:border-brand-primary hover:text-brand-primary"
                    >
                      {handle}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        />
      ) : null}

      <div className="mt-5 rounded-lg border border-border bg-bg p-4">
        <p className="text-sm font-bold text-fg">💡 Pro tip</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-warm">
          You can add or change payment methods anytime from Settings → Payments.
        </p>
      </div>
    </div>
  )
}
