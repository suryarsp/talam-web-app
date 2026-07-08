'use client'

import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Step = 'phone' | 'otp'

export function OtpForm() {
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = createBrowserClient()

  async function handleSendOtp(e: React.FormEvent) {
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

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.verifyOtp({
      phone: `+91${phone.replace(/\D/g, '')}`,
      token: otp,
      type: 'sms',
    })
    setLoading(false)

    if (error) {
      setError(error.message)
    }
    // On success, Supabase sets the session cookie and redirects via the auth state listener
  }

  if (step === 'otp') {
    return (
      <form onSubmit={handleVerifyOtp} className="flex flex-col gap-[6px]">
        <Label htmlFor="otp" className="font-body font-medium text-fg text-[13px]">
          Enter OTP
        </Label>
        <Input
          id="otp"
          placeholder="6-digit OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          maxLength={6}
          inputMode="numeric"
          autoComplete="one-time-code"
          className="h-auto rounded-md border-[1.5px] border-border px-3 py-[11px] font-body text-md transition-colors focus-visible:border-store-primary focus-visible:ring-0 focus-visible:outline-none"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          type="submit"
          disabled={loading}
          className="w-full h-auto rounded-[8px] p-[14px] mt-[14px] bg-store-primary text-surface text-[15px] font-semibold hover:bg-store-primary/90"
        >
          {loading ? 'Verifying…' : 'Verify OTP'}
        </Button>
        <button
          type="button"
          onClick={() => {
            setStep('phone')
            setError('')
          }}
          className="text-[13px] text-muted-warm underline w-full text-center pt-1"
        >
          Change number
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={handleSendOtp} className="flex flex-col gap-[6px]">
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
      <Button
        type="submit"
        disabled={loading}
        className="w-full h-auto rounded-[8px] p-[14px] mt-[14px] bg-store-primary text-surface text-[15px] font-semibold hover:bg-store-primary/90"
      >
        {loading ? 'Sending…' : 'Continue'}
      </Button>
    </form>
  )
}
