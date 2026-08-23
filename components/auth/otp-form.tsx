'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { ShinyButton } from '@/components/ui/shiny-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Method = 'phone' | 'email'
type Step = 'input' | 'otp'

/**
 * `onVerified` lets a caller that is already on the page it wants to stay on (checkout)
 * react in place instead of navigating away. Without it the form keeps its original
 * redirect behaviour.
 *
 * `syncEndpoint` is the API route that upserts the Prisma User/Customer row after a
 * successful email-OTP verify — OAuth gets this for free via its callback route
 * (app/auth/callback, app/store/auth/callback), but OTP verification happens entirely
 * client-side, so there's no server hop to do it otherwise. Defaults to the owner-side
 * route; store/checkout callers pass their tenant-scoped equivalent.
 */
export function OtpForm({
  onVerified,
  syncEndpoint = '/api/auth/sync',
}: { onVerified?: () => void; syncEndpoint?: string } = {}) {
  const [method, setMethod] = useState<Method>('phone')
  const [step, setStep] = useState<Step>('input')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = createBrowserClient()
  const searchParams = useSearchParams()
  const next = searchParams.get('next')

  function switchMethod(newMethod: Method) {
    setMethod(newMethod)
    setStep('input')
    setOtp('')
    setError('')
  }

  async function handleSendPhoneOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length !== 10) {
      setError('Enter a valid 10-digit mobile number')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      phone: `+91${cleaned}`,
    })
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setStep('otp')
  }

  async function handleSendEmailOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ email })
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setStep('otp')
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } =
      method === 'phone'
        ? await supabase.auth.verifyOtp({
            phone: `+91${phone.replace(/\D/g, '')}`,
            token: otp,
            type: 'sms',
          })
        : await supabase.auth.verifyOtp({
            email,
            token: otp,
            type: 'email',
          })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    // Gated behind this flag until phone-OTP delivery is fully configured (MSG91_TEMPLATE_ID
    // is currently empty) / email-OTP SMTP is configured in the Supabase Dashboard. Falls back
    // to /auth — that page already redirects a signed-in visitor to the right destination, so
    // no destination logic is duplicated here.
    const enabled =
      method === 'phone'
        ? process.env.NEXT_PUBLIC_OTP_SIGNIN_ENABLED === 'true'
        : process.env.NEXT_PUBLIC_EMAIL_OTP_ENABLED === 'true'

    if (enabled) {
      await fetch(syncEndpoint, { method: 'POST' })
      if (onVerified) onVerified()
      else window.location.href = next ?? '/auth'
    }
  }

  if (step === 'otp') {
    return (
      <form onSubmit={handleVerifyOtp} className="flex flex-col gap-[6px]">
        <Label htmlFor="otp" className="font-body font-medium text-fg text-[13px]">
          Enter OTP
        </Label>
        <Input
          id="otp"
          placeholder="Enter OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          className="h-auto rounded-md border-[1.5px] border-border px-3 py-[11px] font-body text-md transition-colors focus-visible:border-store-primary focus-visible:ring-0 focus-visible:outline-none"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <ShinyButton
          type="submit"
          disabled={loading}
          className="w-full rounded-[8px] p-[14px] mt-[14px] bg-store-primary text-surface text-[15px] font-semibold hover:bg-store-primary/90"
        >
          {loading ? 'Verifying…' : 'Verify OTP'}
        </ShinyButton>
        <button
          type="button"
          onClick={() => {
            setStep('input')
            setError('')
          }}
          className="text-[13px] text-muted-warm underline w-full text-center pt-1"
        >
          {method === 'phone' ? 'Change number' : 'Change email'}
        </button>
      </form>
    )
  }

  return (
    <div className="flex flex-col gap-[14px]">
      <div className="flex gap-4 border-b border-border-light">
        <button
          type="button"
          onClick={() => switchMethod('phone')}
          className={`pb-2 font-body text-[13px] font-medium ${
            method === 'phone' ? 'border-b-2 border-store-primary text-fg' : 'text-muted-warm'
          }`}
        >
          Phone
        </button>
        <button
          type="button"
          onClick={() => switchMethod('email')}
          className={`pb-2 font-body text-[13px] font-medium ${
            method === 'email' ? 'border-b-2 border-store-primary text-fg' : 'text-muted-warm'
          }`}
        >
          Email
        </button>
      </div>

      {method === 'phone' ? (
        <form onSubmit={handleSendPhoneOtp} className="flex flex-col gap-[6px]">
          <Label htmlFor="phone" className="font-body font-medium text-fg text-[13px]">
            Mobile Number
          </Label>
          <div className="flex items-center rounded-md overflow-clip border-[1.5px] border-border transition-colors focus-within:border-store-primary">
            <span className="flex items-center py-[11px] px-3 border-r-[1.5px] border-r-border font-body text-fg text-md shrink-0">
              +91
            </span>
            <Input
              id="phone"
              placeholder="98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              autoComplete="tel-national"
              maxLength={10}
              className="h-auto grow border-0 rounded-none px-3 py-[11px] font-body text-md focus-visible:ring-0 focus-visible:outline-none"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <ShinyButton
            type="submit"
            disabled={loading}
            className="w-full rounded-[8px] p-[14px] mt-[14px] bg-store-primary text-surface text-[15px] font-semibold hover:bg-store-primary/90"
          >
            {loading ? 'Sending…' : 'Continue'}
          </ShinyButton>
        </form>
      ) : (
        <form onSubmit={handleSendEmailOtp} className="flex flex-col gap-[6px]">
          <Label htmlFor="email" className="font-body font-medium text-fg text-[13px]">
            Email address
          </Label>
          <Input
            id="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            inputMode="email"
            autoComplete="email"
            className="h-auto rounded-md border-[1.5px] border-border px-3 py-[11px] font-body text-md transition-colors focus-visible:border-store-primary focus-visible:ring-0 focus-visible:outline-none"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <ShinyButton
            type="submit"
            disabled={loading}
            className="w-full rounded-[8px] p-[14px] mt-[14px] bg-store-primary text-surface text-[15px] font-semibold hover:bg-store-primary/90"
          >
            {loading ? 'Sending…' : 'Continue'}
          </ShinyButton>
        </form>
      )}
    </div>
  )
}
