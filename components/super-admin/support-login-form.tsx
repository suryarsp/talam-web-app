'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Step = 'email' | 'otp'

/**
 * Email-only OTP sign-in, purpose-built for /super-admin — unlike the generic OtpForm
 * (phone + email, tenant/customer sync) this has no phone method and no Prisma sync step:
 * requireSuperAdmin() only checks the Supabase auth email against AdminStaff/the env
 * allow-list, there's no super-admin "profile" row to create.
 */
export function SupportLoginForm() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifiedPendingSmtp, setVerifiedPendingSmtp] = useState(false)

  const supabase = createBrowserClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/super-admin'

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid work email address.')
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

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    // Same feature flag the general OtpForm gates on — email OTP delivery depends on SMTP
    // being configured in the Supabase Dashboard. requireSuperAdmin() itself does the real
    // allow-list check on the next request; this is just where to send someone next.
    if (process.env.NEXT_PUBLIC_EMAIL_OTP_ENABLED === 'true') {
      router.push(next)
    } else {
      setVerifiedPendingSmtp(true)
    }
  }

  if (verifiedPendingSmtp) {
    return (
      <p className="text-center text-sm text-muted-foreground" role="status">
        Signed in, but email sign-in isn&apos;t fully enabled in this environment yet. Ask an admin to finish SMTP setup, then reload.
      </p>
    )
  }

  if (step === 'otp') {
    return (
      <form onSubmit={handleVerify} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="otp">Enter code</Label>
          <Input
            id="otp"
            placeholder="6-digit code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={6}
            inputMode="numeric"
            autoComplete="one-time-code"
          />
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Verifying…' : 'Verify code'}
        </Button>
        <button
          type="button"
          onClick={() => {
            setStep('email')
            setOtp('')
            setError('')
          }}
          className="text-center text-xs text-muted-foreground underline"
        >
          Change email
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={handleSendCode} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Work email</Label>
        <Input
          id="email"
          placeholder="you@talam.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          inputMode="email"
          autoComplete="email"
        />
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Sending…' : 'Send sign-in code'}
      </Button>
    </form>
  )
}
