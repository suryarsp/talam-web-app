import { CheckCircle2 } from 'lucide-react'

import { StepTitle } from './onboarding-fields'

const CHECKLIST = [
  'Store & website created',
  'Brand & branding applied',
  'First product added',
  'Payment gateway connected',
]

export function GoLiveStep({ slug }: { readonly slug: string }) {
  return (
    <div className="animate-[fadeIn_0.2s_ease-out]">
      <div className="mb-11">
        <p className="font-body text-xs font-medium uppercase leading-tight tracking-[0.08em] text-emerald-600">Step 5 of 5</p>
        <h1 className="mt-2.5 font-heading text-[32px] font-bold leading-[36px] tracking-[-0.02em] text-[#1F2937] md:text-[36px] md:leading-[44px]">
          Your store is ready!
        </h1>
        <p className="mt-2 font-body text-base leading-6 text-[#6B7280]">
          You've successfully set up everything your store needs to launch.
        </p>
      </div>
      <div className="flex flex-col items-center gap-4">
        <CheckCircle2 className="size-16 text-emerald-500" strokeWidth={1.5} />
        <div className="w-full space-y-2.5">
          {CHECKLIST.map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                <svg className="size-3" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
              <p className="font-body text-sm font-medium text-emerald-900">{item}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-3">
        <button type="button" className="flex h-[52px] w-full cursor-pointer items-center justify-center rounded-xl bg-emerald-500 font-body text-[15px] font-semibold text-white transition-colors hover:bg-emerald-600">
          Go Live 🚀
        </button>
        <button type="button" className="flex h-[52px] w-full cursor-pointer items-center justify-center rounded-xl border-2 border-[#E5E7EB] font-body text-[15px] font-semibold text-[#374151] transition-colors hover:border-emerald-500 hover:text-emerald-600">
          View Store Preview
        </button>
      </div>
    </div>
  )
}
