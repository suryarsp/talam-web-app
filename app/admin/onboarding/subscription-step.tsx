import { Controller, type Control } from 'react-hook-form'
import { Check } from 'lucide-react'

import { SUBSCRIPTION_PLANS } from './onboarding-data'
import { StepTitle } from './onboarding-fields'
import type { OnboardingValues } from './onboarding-schema'

export function SubscriptionStep({ control }: { readonly control: Control<OnboardingValues> }) {
  return (
    <div className="animate-[fadeIn_0.2s_ease-out]">
      <StepTitle
        step={5}
        title="Choose your plan"
        description="Pick the subscription that fits your store. You can change this anytime."
      />
      <Controller
        control={control}
        name="subscriptionTier"
        render={({ field, fieldState }) => (
          <div>
            <div className="space-y-[10px]">
              {SUBSCRIPTION_PLANS.map((plan) => {
                const selected = plan.id === field.value

                return (
                  <label
                    key={plan.id}
                    className={[
                      'block cursor-pointer rounded-xl border-[1.5px] bg-surface p-4 transition-colors',
                      selected ? 'border-brand-primary bg-brand-primary/5' : 'border-border',
                    ].join(' ')}
                  >
                    <span className="flex items-start gap-3">
                      <input
                        className="mt-1 size-5 accent-brand-primary"
                        type="radio"
                        name="subscriptionTier"
                        checked={selected}
                        onChange={() => field.onChange(plan.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="block text-[15px] font-bold text-fg">{plan.name}</span>
                          <span className="shrink-0 text-sm font-bold text-fg">
                            {plan.price}
                            <span className="font-normal text-muted-warm">{plan.period}</span>
                          </span>
                        </span>
                        <span className="mt-1 block text-xs leading-snug text-muted-warm">{plan.description}</span>
                        <ul className="mt-2 flex flex-col gap-1">
                          {plan.features.map((feature) => (
                            <li key={feature} className="flex items-center gap-1.5 text-xs text-muted-warm">
                              <Check className="size-3 shrink-0 text-brand-primary" strokeWidth={2.5} />
                              {feature}
                            </li>
                          ))}
                        </ul>
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
    </div>
  )
}
