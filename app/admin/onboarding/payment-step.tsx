import { PAYMENTS, type PaymentId } from './onboarding-data'
import { StepTitle } from './onboarding-fields'

export function PaymentStep({
  paymentId,
  setPaymentId,
}: {
  readonly paymentId: PaymentId
  readonly setPaymentId: (value: PaymentId) => void
}) {
  return (
    <div className="animate-[fadeIn_0.2s_ease-out]">
      <StepTitle
        step={4}
        title="Connect payments"
        description="Choose how you want to receive payments from customers."
      />
      <div className="space-y-[10px]">
        {PAYMENTS.map((payment) => {
          const selected = payment.id === paymentId

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
                  onChange={() => setPaymentId(payment.id)}
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
      <div className="mt-5 rounded-lg border border-border bg-bg p-4">
        <p className="text-sm font-bold text-fg">💡 Pro tip</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-warm">
          You can add multiple payment methods after setup. Start with one and expand later.
        </p>
      </div>
    </div>
  )
}
