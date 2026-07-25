'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import {
  checkSlugAvailability,
  completeOnboarding,
  getOnboardingCategories,
  saveBrandStep,
  saveContactStep,
  savePaymentStep,
  saveProductStep,
  saveStoreStep,
  saveStoryStep,
} from './actions'
import { BrandStep } from './brand-step'
import { ContactStep } from './contact-step'
import { LaunchOverlay } from './launch-overlay'
import { STEP_ACCENTS, STEPS, type BrandColor, type PaymentId } from './onboarding-data'
import { onboardingSchema, STEP_FIELDS, type OnboardingValues } from './onboarding-schema'
import { PaymentStep } from './payment-step'
import { ProductStep } from './product-step'
import { StoreStep } from './store-step'
import { StoryStep } from './story-step'

type InitialTenant = {
  name: string
  slug: string
  storeType: string | null
  brandColor: string | null
  logoUrl: string | null
  contactPhone: string | null
  contactEmail: string | null
  tagline: string | null
  paymentProvider: string
  onboardingStep: number
  about: { description: string | null } | null
} | null

type InitialBranch = { name: string; address: string | null; city: string | null } | null
type InitialProduct = { name: string; price: unknown; stockBySize: unknown; images: string[] } | null

function firstStockValue(stockBySize: unknown): string {
  if (!stockBySize || typeof stockBySize !== 'object') return ''
  const values = Object.values(stockBySize as Record<string, number>)
  return values.length > 0 ? String(values[0]) : ''
}

const PAYMENT_ID_BY_PROVIDER: Record<string, PaymentId> = {
  upi_manual: 'upi',
  razorpay: 'razorpay',
  instamojo: 'instamojo',
}

export function OnboardingWizard({
  initialTenant,
  initialBranch,
  initialProduct,
}: {
  readonly initialTenant: InitialTenant
  readonly initialBranch: InitialBranch
  readonly initialProduct: InitialProduct
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isLaunching, setIsLaunching] = useState(false)
  const [step, setStep] = useState(initialTenant?.onboardingStep ?? 0)
  const [serverError, setServerError] = useState<string | null>(null)
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [existingLogoUrl, setExistingLogoUrl] = useState(initialTenant?.logoUrl ?? null)
  const [existingProductPhotoUrl, setExistingProductPhotoUrl] = useState(initialProduct?.images[0] ?? null)

  const { control, trigger, getValues, setError, watch } = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    mode: 'onTouched',
    defaultValues: {
      storeName: initialTenant?.name ?? "Priya's Boutique",
      category: initialTenant?.storeType ?? 'Clothing',
      customCategory: '',
      brandColor: ((initialTenant?.brandColor as BrandColor) ?? '#4F3FF0') as string,
      brandLogo: undefined as unknown as File,
      contactPhone: initialTenant?.contactPhone ?? '',
      contactEmail: initialTenant?.contactEmail ?? '',
      branchName: initialBranch?.name ?? '',
      branchAddress: initialBranch?.address ?? '',
      branchCity: initialBranch?.city ?? '',
      tagline: initialTenant?.tagline ?? '',
      aboutDescription: initialTenant?.about?.description ?? '',
      productName: initialProduct?.name ?? '',
      productPrice: initialProduct ? String(initialProduct.price) : '',
      productStock: firstStockValue(initialProduct?.stockBySize),
      productPhoto: undefined as unknown as File,
      categoryId: '',
      paymentId: PAYMENT_ID_BY_PROVIDER[initialTenant?.paymentProvider ?? 'upi_manual'] ?? 'upi',
    },
  })

  const storeName = watch('storeName')

  const slug = useMemo(
    () =>
      storeName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'your-store',
    [storeName]
  )

  useEffect(() => {
    if (step === 4 && categories.length === 0) {
      getOnboardingCategories().then(setCategories)
    }
  }, [step, categories.length])

  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')

  useEffect(() => {
    if (step !== 0 || slug === 'your-store') {
      setSlugStatus('idle')
      return
    }
    if (slug === initialTenant?.slug) {
      setSlugStatus('available')
      return
    }
    setSlugStatus('checking')
    const timeout = setTimeout(() => {
      checkSlugAvailability(slug).then((result) => setSlugStatus(result.available ? 'available' : 'taken'))
    }, 400)
    return () => clearTimeout(timeout)
  }, [slug, step, initialTenant?.slug])

  async function runStepAction(current: number, values: OnboardingValues): Promise<{ error?: string }> {
    if (current === 0) {
      const category = values.category === 'Other' ? (values.customCategory ?? '').trim() : values.category
      return saveStoreStep({ storeName: values.storeName, slug, category })
    }
    if (current === 1) {
      const result = await saveBrandStep({ brandColor: values.brandColor, logo: values.brandLogo })
      if (result.logoUrl) setExistingLogoUrl(result.logoUrl)
      return result
    }
    if (current === 2)
      return saveContactStep({
        contactPhone: values.contactPhone,
        contactEmail: values.contactEmail,
        branchName: values.branchName,
        branchAddress: values.branchAddress,
        branchCity: values.branchCity,
      })
    if (current === 3) return saveStoryStep({ tagline: values.tagline, aboutDescription: values.aboutDescription })
    if (current === 4) {
      const result = await saveProductStep({
        productName: values.productName,
        productPrice: values.productPrice,
        productStock: values.productStock,
        categoryId: values.categoryId || undefined,
        photo: values.productPhoto,
      })
      if (result.photoUrl) setExistingProductPhotoUrl(result.photoUrl)
      return result
    }
    if (current === 5) return savePaymentStep({ paymentId: values.paymentId })
    return {}
  }

  function goNext() {
    trigger(STEP_FIELDS[step]).then((valid) => {
      if (!valid) return
      if (step === 0 && slugStatus === 'taken') {
        setServerError('That store URL is taken — try another.')
        return
      }
      if (step === 1 && !getValues('brandLogo') && !existingLogoUrl) {
        setError('brandLogo', { type: 'manual', message: 'Upload a store logo' })
        return
      }
      if (step === 4 && !getValues('productPhoto') && !existingProductPhotoUrl) {
        setError('productPhoto', { type: 'manual', message: 'Upload a product photo' })
        return
      }
      setServerError(null)
      const isLastStep = step === STEPS.length - 1
      if (isLastStep) setIsLaunching(true)
      startTransition(async () => {
        try {
          const values = getValues()
          const result = await runStepAction(step, values)
          if (result.error) {
            if (step === 0) setError('storeName', { type: 'server', message: result.error })
            setServerError(result.error)
            setIsLaunching(false)
            return
          }

          if (!isLastStep) {
            setStep((current) => Math.min(current + 1, STEPS.length - 1))
            return
          }

          const [completion] = await Promise.all([completeOnboarding(), new Promise((resolve) => setTimeout(resolve, 1200))])
          if (completion.error || !completion.adminUrl) {
            setServerError(completion.error ?? 'Something went wrong — try again.')
            setIsLaunching(false)
            return
          }
          router.push(completion.adminUrl)
        } catch {
          setServerError('Something went wrong — try again.')
          setIsLaunching(false)
        }
      })
    })
  }

  function goBack() {
    setServerError(null)
    setStep((current) => Math.max(current - 1, 0))
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-surface font-body text-fg">
      {isLaunching ? <LaunchOverlay /> : null}
      <BackgroundWash step={step} />
      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[560px] flex-col px-6 pb-32 pt-9 md:pb-16 md:pt-14">
        <ProgressHeader step={step} />
        <section className="relative mt-7 flex max-h-[calc(100dvh-140px)] flex-1 flex-col rounded-3xl border border-white/70 bg-surface/90 shadow-[0_24px_70px_-20px_rgba(31,41,55,0.25)] backdrop-blur-sm">
          <div className="flex-1 overflow-y-auto p-7 md:p-11">
            <BackNav step={step} goBack={goBack} />
            {serverError ? <p className="mb-4 font-body text-sm font-medium text-danger">{serverError}</p> : null}
            {step === 0 ? <StoreStep control={control} slug={slug} serverError={serverError} slugStatus={slugStatus} /> : null}
            {step === 1 ? <BrandStep control={control} existingLogoUrl={existingLogoUrl} /> : null}
            {step === 2 ? <ContactStep control={control} /> : null}
            {step === 3 ? <StoryStep control={control} /> : null}
            {step === 4 ? (
              <ProductStep control={control} categories={categories} existingPhotoUrl={existingProductPhotoUrl} />
            ) : null}
            {step === 5 ? <PaymentStep control={control} /> : null}
          </div>
          <DesktopFooter step={step} goNext={goNext} isPending={isPending} />
        </section>
      </div>
      <MobileFooter step={step} goNext={goNext} isPending={isPending} />
    </main>
  )
}

function BackgroundWash({ step }: { readonly step: number }) {
  const accent = STEP_ACCENTS[step]
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute -left-32 -top-40 size-[420px] rounded-full opacity-30 blur-3xl transition-[background] duration-700 md:size-[520px]"
        style={{ background: accent.wash }}
      />
      <div
        className="absolute -bottom-44 -right-28 size-[460px] rounded-full opacity-25 blur-3xl transition-[background] duration-700 md:size-[560px]"
        style={{ background: accent.wash }}
      />
      <div className="absolute inset-0 bg-surface/75" />
    </div>
  )
}

function ProgressHeader({ step }: { readonly step: number }) {
  const accent = STEP_ACCENTS[step]
  return (
    <header>
      <div className="flex items-center justify-between">
        <span className="font-heading text-[22px] font-bold leading-7 tracking-[-0.02em] text-[#1F2937]">
          talam<span className={['transition-colors duration-500', accent.text].join(' ')}>.</span>
        </span>
        <span className="font-body text-xs font-semibold uppercase leading-tight tracking-[0.06em] text-[#9CA3AF]">
          Step {step + 1} of {STEPS.length}
        </span>
      </div>
      <div className="mt-4 flex gap-1.5">
        {STEPS.map((item, index) => (
          <div
            key={item.title}
            className={[
              'h-1.5 flex-1 rounded-full transition-colors duration-500',
              index <= step ? STEP_ACCENTS[index].solid : 'bg-[#E5E7EB]',
            ].join(' ')}
          />
        ))}
      </div>
    </header>
  )
}

function BackNav({ step, goBack }: { readonly step: number; readonly goBack: () => void }) {
  if (step === 0) return null

  return (
    <button
      type="button"
      onClick={goBack}
      className="mb-6 flex cursor-pointer items-center gap-1.5 self-start font-body text-sm font-semibold leading-[18px] text-[#374151] transition-colors hover:text-brand-primary"
    >
      <ArrowLeft className="size-4" strokeWidth={2.2} />
      Back
    </button>
  )
}

function DesktopFooter({ step, goNext, isPending }: { readonly step: number; readonly goNext: () => void; readonly isPending: boolean }) {
  const isLastStep = step === STEPS.length - 1
  const accent = STEP_ACCENTS[step]
  return (
    <footer className="hidden shrink-0 items-center justify-end border-t border-[#F3F4F6] bg-surface/95 px-7 py-6 md:flex md:px-11">
      <button
        type="button"
        disabled={isPending}
        className={[
          'flex h-[52px] w-[140px] cursor-pointer items-center justify-center rounded-xl font-body text-[15px] font-semibold leading-[18px] text-surface transition-colors duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60',
          accent.solid,
        ].join(' ')}
        onClick={goNext}
      >
        {isPending ? 'Saving…' : isLastStep ? 'Finish →' : 'Next →'}
      </button>
    </footer>
  )
}

function MobileFooter({ step, goNext, isPending }: { readonly step: number; readonly goNext: () => void; readonly isPending: boolean }) {
  const isLastStep = step === STEPS.length - 1
  const accent = STEP_ACCENTS[step]
  return (
    <footer className="fixed inset-x-0 bottom-0 z-30 flex h-[105px] items-center justify-end border-t border-[#F3F4F6] bg-surface/95 px-7 py-5 backdrop-blur-sm md:hidden">
      <button
        type="button"
        disabled={isPending}
        className={[
          'flex h-12 min-w-[120px] cursor-pointer items-center justify-center rounded-xl px-7 font-body text-[15px] font-semibold leading-[18px] text-surface transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-60',
          accent.solid,
        ].join(' ')}
        onClick={goNext}
      >
        {isPending ? 'Saving…' : isLastStep ? 'Finish →' : 'Next →'}
      </button>
    </footer>
  )
}
