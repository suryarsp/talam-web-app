import { Check } from 'lucide-react'

const STEPS = ['Details', 'Address', 'Payment']

export function StepIndicator({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <div className="mx-auto flex max-w-[480px] gap-0 px-4 py-4">
      {STEPS.map((label, i) => {
        const step = i + 1
        const done = step < current
        const active = step === current
        return (
          <div key={label} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <div className={`h-0.5 flex-1 ${i === 0 ? 'opacity-0' : step - 1 < current ? 'bg-store-primary' : 'bg-border'}`} />
              <div
                className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border font-body text-xs font-bold ${
                  done
                    ? 'border-store-primary bg-store-primary text-surface'
                    : active
                      ? 'border-store-primary text-store-primary'
                      : 'border-border text-muted-warm'
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : step}
              </div>
              <div className={`h-0.5 flex-1 ${i === STEPS.length - 1 ? 'opacity-0' : done ? 'bg-store-primary' : 'bg-border'}`} />
            </div>
            <p className={`mt-1.5 whitespace-nowrap font-body text-[11px] uppercase tracking-[0.04em] ${done || active ? 'text-store-primary' : 'text-muted-warm'}`}>
              {label}
            </p>
          </div>
        )
      })}
    </div>
  )
}
