'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { OnboardingProgress } from '@/components/store/onboarding-progress'
import { saveOnboardingAction } from './actions'

export function OnboardingWizard({
  categories,
  sizes,
  storeBase,
}: {
  categories: string[]
  sizes: string[]
  storeBase: string
}) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set())
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()

  function toggleCat(name: string) {
    setSelectedCats((prev) => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  function handleFinish() {
    startSaving(async () => {
      await saveOnboardingAction({
        preferredCategories: [...selectedCats],
        preferredSize: selectedSize,
      })
      router.push(storeBase || '/')
    })
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <OnboardingProgress current={step} />

      <div className="mx-auto w-full max-w-md flex-1 px-4 pb-8">
        {step === 1 && (
          <div className="animate-[fadeIn_0.3s_ease-out]">
            <h1 className="mb-2 font-heading text-2xl font-bold text-fg">Pick your style</h1>
            <p className="mb-6 font-body text-sm text-muted-warm">
              Choose categories you love — we&apos;ll personalize your feed.
            </p>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const active = selectedCats.has(cat)
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCat(cat)}
                    className={`rounded-full border-[1.5px] px-4 py-2 font-body text-sm font-medium transition-colors ${
                      active
                        ? 'border-store-primary bg-store-primary/10 text-store-primary'
                        : 'border-border text-muted-warm hover:border-fg/30'
                    }`}
                  >
                    {active && '✓ '}{cat}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={selectedCats.size === 0}
              className="mt-8 flex h-12 w-full items-center justify-center rounded-xl bg-store-primary font-body text-sm font-bold text-surface transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Continue
            </button>
            <button
              onClick={() => { setStep(2) }}
              className="mt-3 w-full font-body text-sm text-muted-warm hover:text-fg"
            >
              Skip for now
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-[fadeIn_0.3s_ease-out]">
            <h1 className="mb-2 font-heading text-2xl font-bold text-fg">Your perfect fit</h1>
            <p className="mb-6 font-body text-sm text-muted-warm">
              Pick your usual size — we&apos;ll highlight it on product pages.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {sizes.map((size) => {
                const active = selectedSize === size
                return (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(active ? null : size)}
                    className={`flex h-14 items-center justify-center rounded-xl border-[1.5px] font-body text-base font-semibold transition-colors ${
                      active
                        ? 'border-store-primary bg-store-primary/10 text-store-primary'
                        : 'border-border text-fg hover:border-fg/30'
                    }`}
                  >
                    {size}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => setStep(3)}
              className="mt-8 flex h-12 w-full items-center justify-center rounded-xl bg-store-primary font-body text-sm font-bold text-surface transition-opacity hover:opacity-90"
            >
              Continue
            </button>
            <button
              onClick={() => setStep(3)}
              className="mt-3 w-full font-body text-sm text-muted-warm hover:text-fg"
            >
              Skip for now
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="animate-[fadeIn_0.3s_ease-out] text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
              <span className="text-4xl">🎉</span>
            </div>
            <h1 className="mb-2 font-heading text-2xl font-bold text-fg">You&apos;re all set!</h1>
            <p className="mb-2 font-body text-sm text-muted-warm">
              Your preferences are saved. We&apos;ll curate your shopping experience.
            </p>
            {(selectedCats.size > 0 || selectedSize) && (
              <div className="mx-auto mb-6 flex flex-wrap justify-center gap-2">
                {[...selectedCats].map((c) => (
                  <span key={c} className="rounded-full bg-store-primary/10 px-3 py-1 font-body text-xs font-medium text-store-primary">
                    {c}
                  </span>
                ))}
                {selectedSize && (
                  <span className="rounded-full bg-fg/10 px-3 py-1 font-body text-xs font-medium text-fg">
                    Size {selectedSize}
                  </span>
                )}
              </div>
            )}
            <button
              onClick={handleFinish}
              disabled={saving}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-store-primary font-body text-sm font-bold text-surface transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Start Shopping'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
