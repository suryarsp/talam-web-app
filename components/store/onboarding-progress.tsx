'use client'

const STEPS = ['Account', 'Style', 'Size'] as const

export function OnboardingProgress({ current }: { current: 1 | 2 | 3 }) {
  const pct = Math.round((current / STEPS.length) * 100)

  return (
    <div className="mx-auto w-full max-w-md px-4 py-6">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-body text-sm font-bold text-fg">{pct}% complete</p>
        <p className="font-body text-xs text-muted-warm">Step {current} of {STEPS.length}</p>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-bg">
        <div
          className="rounded-full bg-store-primary transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-3 flex justify-between">
        {STEPS.map((label, i) => {
          const step = i + 1
          const done = step < current
          const active = step === current
          return (
            <span
              key={label}
              className={`font-body text-xs font-medium ${
                done ? 'text-store-primary' : active ? 'text-fg' : 'text-muted-warm'
              }`}
            >
              {done ? '✓ ' : ''}{label}
            </span>
          )
        })}
      </div>
    </div>
  )
}
