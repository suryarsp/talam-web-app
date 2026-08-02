import { Controller, type Control } from 'react-hook-form'

import { PAYMENTS } from './onboarding-data'
import { Field, FieldHint, StepTitle, TextInput } from './onboarding-fields'
import type { OnboardingValues } from './onboarding-schema'

export function PaymentStep({ control }: { readonly control: Control<OnboardingValues> }) {
  return (
    <div className="animate-[fadeIn_0.2s_ease-out]">
      <StepTitle
        step={6}
        title="Connect payments"
        description="Choose how you want to receive payments from customers."
      />
      <Controller
        control={control}
        name="paymentId"
        render={({ field }) => (
          <div className="space-y-[10px]">
            {PAYMENTS.map((payment) => {
              const selected = payment.id === field.value

              return (
                <label
                  key={payment.id}
                  className={[
                    'block cursor-pointer rounded-xl border-[1.5px] bg-surface p-4 transition-colors',
                    selected ? 'border-brand-primary bg-brand-primary/5' : 'border-border',
                  ].join(' ')}
                >
                  <span className="flex items-start gap-3">
                    <input
                      className="mt-1 size-5 accent-brand-primary"
                      type="radio"
                      name="payment"
                      checked={selected}
                      onChange={() => field.onChange(payment.id)}
                    />
                    <span className={`flex h-7 w-10 items-center justify-center rounded-[5px] text-[10px] font-bold ${payment.markClassName}`}>
                      {payment.mark}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-bold text-fg">{payment.name}</span>
                      <span className="mt-1 block text-xs leading-snug text-muted-warm">{payment.description}</span>
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
        )}
      />
      <Controller
        control={control}
        name="upiAddress"
        render={({ field, fieldState }) => (
          <div className="mt-5">
            <Field label="UPI address" error={fieldState.error?.message}>
              <FieldHint>Where payouts are sent — e.g. yourname@paytm or 9876543210@upi</FieldHint>
              <TextInput
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalid={Boolean(fieldState.error)}
              />
            </Field>
          </div>
        )}
      />

      <div className="mt-5 rounded-lg border border-border bg-bg p-4">
        <p className="text-sm font-bold text-fg">💡 Pro tip</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-warm">
          You can add multiple payment methods after setup. Start with one and expand later.
        </p>
      </div>
    </div>
  )
}
