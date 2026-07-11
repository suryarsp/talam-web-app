'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, Check } from 'lucide-react'

import { BrandStep } from './brand-step'
import { GoLiveStep } from './go-live-step'
import { type BrandColor, type PaymentId, STEPS } from './onboarding-data'
import { PaymentStep } from './payment-step'
import { ProductStep } from './product-step'
import { StoreStep } from './store-step'

export const dynamic = 'force-dynamic'

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [storeName, setStoreName] = useState("Priya's Boutique")
  const [category, setCategory] = useState('Clothing')
  const [brandColor, setBrandColor] = useState<BrandColor>('#4F3FF0')
  const [brandLogo, setBrandLogo] = useState<File | null>(null)
  const [productName, setProductName] = useState('')
  const [productPrice, setProductPrice] = useState('')
  const [productStock, setProductStock] = useState('')
  const [productPhoto, setProductPhoto] = useState<File | null>(null)
  const [paymentId, setPaymentId] = useState<PaymentId>('upi')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const slug = useMemo(
    () =>
      storeName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'your-store',
    [storeName]
  )

  function validateStep(current: number): Record<string, string> {
    if (current === 0) {
      const stepErrors: Record<string, string> = {}
      if (!storeName.trim()) stepErrors.storeName = 'Store name is required'
      if (!category) stepErrors.category = 'Select a category'
      return stepErrors
    }
    if (current === 2) {
      const stepErrors: Record<string, string> = {}
      if (!productName.trim()) stepErrors.productName = 'Product name is required'
      if (!productPrice.trim() || Number(productPrice) <= 0) stepErrors.productPrice = 'Enter a valid price'
      if (!productStock.trim() || Number(productStock) < 0) stepErrors.productStock = 'Enter a valid stock quantity'
      return stepErrors
    }
    return {}
  }

  function goNext() {
    const stepErrors = validateStep(step)
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors)
      return
    }
    setErrors({})
    setStep((current) => Math.min(current + 1, STEPS.length - 1))
  }

  function goSkip() {
    setErrors({})
    setStep((current) => Math.min(current + 1, STEPS.length - 1))
  }

  function goBack() {
    setErrors({})
    setStep((current) => Math.max(current - 1, 0))
  }

  return (
    <main className="min-h-[100dvh] bg-surface font-body text-fg md:flex">
      <DesktopSidebar step={step} />
      <div className="flex min-h-[100dvh] flex-1 flex-col bg-surface md:h-[100dvh] md:min-h-0">
        <MobileHeader />
        <MobileStepIndicator step={step} />
        <section className="mx-auto flex w-full max-w-[408px] flex-1 flex-col px-7 pb-28 pt-11 md:max-w-[484px] md:min-h-[600px] md:justify-center md:px-0 md:pb-16 md:pt-16">
          <BackNav step={step} goBack={goBack} />
          {step === 0 ? (
            <StoreStep
              slug={slug}
              storeName={storeName}
              setStoreName={setStoreName}
              category={category}
              setCategory={setCategory}
              errors={errors}
            />
          ) : null}
          {step === 1 ? (
            <BrandStep brandColor={brandColor} setBrandColor={setBrandColor} brandLogo={brandLogo} setBrandLogo={setBrandLogo} />
          ) : null}
          {step === 2 ? (
            <ProductStep
              productName={productName}
              setProductName={setProductName}
              productPrice={productPrice}
              setProductPrice={setProductPrice}
              productStock={productStock}
              setProductStock={setProductStock}
              productPhoto={productPhoto}
              setProductPhoto={setProductPhoto}
              errors={errors}
            />
          ) : null}
          {step === 3 ? <PaymentStep paymentId={paymentId} setPaymentId={setPaymentId} /> : null}
          {step === 4 ? <GoLiveStep slug={slug} /> : null}
          <DesktopFooter step={step} goSkip={goSkip} goNext={goNext} />
        </section>
        <MobileFooter step={step} goSkip={goSkip} goNext={goNext} />
      </div>
    </main>
  )
}

function MobileHeader() {
  return (
    <header className="flex h-[130px] flex-col bg-surface md:hidden">
      <div className="flex h-[62px] items-start justify-between px-10 pt-[21px] font-body text-[15px] font-semibold leading-5 text-[#1F2937]">
        <span>9:41</span>
        <span className="font-body text-xs tracking-[0.04em]">5G 100%</span>
      </div>
      <span className="text-center font-heading text-[24px] font-bold leading-7 tracking-[-0.02em] text-[#1F2937]">
        talam<span className="text-brand-primary">.</span>
      </span>
      <span className="mt-1 text-center font-body text-xs uppercase leading-tight tracking-[0.06em] text-[#9CA3AF]">Set up your store</span>
    </header>
  )
}

function MobileStepIndicator({ step }: { readonly step: number }) {
  const isLive = step === STEPS.length - 1
  return (
    <section className="bg-surface md:hidden">
      <ol className="mx-auto grid w-[320px] grid-cols-[repeat(9,minmax(0,auto))] items-start justify-center">
        {STEPS.map((label, index) => {
          const done = index < step
          const active = index === step

          return (
            <li key={label.title} className="contents">
              <span className="flex min-w-8 flex-col items-center gap-2" aria-current={active ? 'step' : undefined}>
                <span className={mobileCircleClassName(done, active, isLive)}>
                  {done ? <Check className="size-4" strokeWidth={2.4} /> : index + 1}
                </span>
                <span className={mobileLabelClassName(done, active, isLive)}>{label.mobile}</span>
              </span>
              {index < STEPS.length - 1 ? <span className={mobileLineClassName(index < step, isLive)} /> : null}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function DesktopSidebar({ step }: { readonly step: number }) {
  const isLive = step === STEPS.length - 1
  return (
    <aside className="hidden h-[100dvh] w-[340px] shrink-0 flex-col bg-[#1F2937] px-10 py-12 md:flex">
      <div className="font-heading text-[26px] font-bold leading-8 tracking-[-0.02em] text-surface">talam.</div>
      <div className="mt-1 font-body text-xs uppercase leading-tight tracking-[0.06em] text-[#6B7280]">Set up your store</div>

      <div className="mt-14 flex flex-1 flex-col">
        {STEPS.map((item, index) => {
          const active = index === step
          const done = index < step

          return (
            <div key={item.title} className="flex items-start gap-4">
              <div className="flex shrink-0 flex-col items-center">
                <div className={desktopCircleClassName(active, done, isLive)}>{done ? <Check className="size-4" /> : index + 1}</div>
                {index < STEPS.length - 1 ? <div className={done ? (isLive ? 'mt-1 h-[52px] w-0.5 bg-emerald-500' : 'mt-1 h-[52px] w-0.5 bg-brand-primary') : 'mt-1 h-[52px] w-0.5 bg-[#374151]'} /> : null}
              </div>
              <div className="pt-1.5">
                <div className={active || done ? 'font-body text-[15px] font-semibold leading-[18px] text-surface' : 'font-body text-[15px] font-medium leading-[18px] text-[#6B7280]'}>
                  {item.title}
                </div>
                <div className={active || done ? 'mt-0.5 font-body text-[13px] leading-[18px] text-[#9CA3AF]' : 'mt-0.5 font-body text-[13px] leading-[18px] text-[#4B5563]'}>
                  {item.description}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="border-t border-[#374151] pt-6 font-body text-xs leading-[18px] text-[#6B7280]">
        Takes less than 5 minutes. You can edit everything later.
      </div>
    </aside>
  )
}

function BackNav({ step, goBack }: { readonly step: number; readonly goBack: () => void }) {
  if (step === 0 || step === 4) return null

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

function DesktopFooter({ step, goSkip, goNext }: { readonly step: number; readonly goSkip: () => void; readonly goNext: () => void }) {
  if (step === STEPS.length - 1) return null
  return (
    <footer className="mt-10 hidden max-w-[484px] items-center justify-between border-t border-[#F3F4F6] pt-10 md:flex">
      {step < STEPS.length - 1 ? (
        <button type="button" className="cursor-pointer font-body text-sm leading-[18px] text-[#9CA3AF]" onClick={goSkip}>
          Skip
        </button>
      ) : (
        <span />
      )}
      <button type="button" className="flex h-[52px] w-[140px] cursor-pointer items-center justify-center rounded-xl bg-brand-primary font-body text-[15px] font-semibold leading-[18px] text-surface" onClick={goNext}>
        {step === STEPS.length - 1 ? 'Go Live →' : 'Next →'}
      </button>
    </footer>
  )
}

function MobileFooter({ step, goSkip, goNext }: { readonly step: number; readonly goSkip: () => void; readonly goNext: () => void }) {
  if (step === STEPS.length - 1) return null
  return (
    <footer className="fixed inset-x-0 bottom-0 z-30 flex h-[105px] items-start justify-between border-t border-[#F3F4F6] bg-surface px-7 py-5 md:hidden">
      {step < STEPS.length - 1 ? (
        <button type="button" className="h-12 cursor-pointer font-body text-sm leading-[18px] text-[#9CA3AF]" onClick={goSkip}>
          Skip
        </button>
      ) : (
        <span />
      )}
      <button type="button" className="flex h-12 min-w-[120px] cursor-pointer items-center justify-center rounded-xl bg-brand-primary px-7 font-body text-[15px] font-semibold leading-[18px] text-surface" onClick={goNext}>
        {step === STEPS.length - 1 ? 'Go Live →' : 'Next →'}
      </button>
    </footer>
  )
}

function mobileCircleClassName(done: boolean, active: boolean, isLive?: boolean) {
  const accent = isLive ? 'bg-emerald-500 text-surface' : 'bg-brand-primary text-surface'
  return [
    'flex size-8 items-center justify-center rounded-full font-body text-xs font-bold leading-tight transition-colors',
    done || active ? accent : 'bg-[#F3F4F6] text-[#9CA3AF]',
  ].join(' ')
}

function mobileLabelClassName(done: boolean, active: boolean, isLive?: boolean) {
  const accent = isLive ? 'text-emerald-500' : 'text-brand-primary'
  return [
    'font-body text-[11px] leading-tight',
    done || active ? accent : 'text-[#9CA3AF]',
  ].join(' ')
}

function mobileLineClassName(done: boolean, isLive?: boolean) {
  const accent = isLive ? 'bg-emerald-500' : 'bg-brand-primary'
  return ['mt-[15px] h-0.5 w-10', done ? accent : 'bg-[#F3F4F6]'].join(' ')
}

function desktopCircleClassName(active: boolean, done: boolean, isLive?: boolean) {
  const accent = isLive ? 'bg-emerald-500 text-surface' : 'bg-brand-primary text-surface'
  return [
    'flex size-9 items-center justify-center rounded-full font-body text-sm font-semibold leading-[18px]',
    active || done ? accent : 'bg-[#374151] text-[#6B7280]',
  ].join(' ')
}
