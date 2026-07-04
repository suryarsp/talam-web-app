import { OtpForm } from '@/components/auth/otp-form'
import { GoogleButton } from '@/components/auth/google-button'
import { BackButton } from '@/components/auth/back-button'
import { Logo } from '@/components/logo'

export default function AuthPage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface md:items-center md:justify-center md:bg-bg">
      <div className="flex flex-col w-full p-6 bg-surface md:w-[420px] md:p-10 md:rounded-xl md:border md:border-border">
        <div className="-mx-6 -mt-6 mb-2 px-5 py-2 md:hidden">
          <BackButton />
        </div>

        <Logo className="hidden md:block" />

        <div className="flex flex-col gap-2 pt-8 md:pt-6">
          <h1 className="font-heading font-bold text-fg text-[28px] leading-[34px] md:text-[26px] md:leading-8">
            Log in or Sign up
          </h1>
          <p className="font-body text-md leading-5 text-muted-warm">
            Enter your mobile number — we&apos;ll text you a one-time code to continue.
          </p>
        </div>

        <div className="pt-7">
          <OtpForm />
        </div>

        <div className="flex items-center gap-3 pt-6">
          <span className="grow h-px bg-border-light" />
          <span className="font-body text-muted-warm text-2xs">or</span>
          <span className="grow h-px bg-border-light" />
        </div>

        <div className="pt-5">
          <GoogleButton />
        </div>

        <p className="font-body text-muted-warm text-2xs leading-[18px] pt-6">
          By continuing, you agree to Talam&apos;s Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}
