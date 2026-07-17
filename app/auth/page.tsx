import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { OtpForm } from '@/components/auth/otp-form'
import { GoogleButton } from '@/components/auth/google-button'
import { Logo } from '@/components/logo'
import { createServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export function resolveSignedInDestination(
  tenant: { slug: string; isOnboarded: boolean } | null,
  isLocalDev: boolean
): string {
  if (!tenant || !tenant.isOnboarded) return '/admin/onboarding'
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'talam4shop.com'
  return isLocalDev ? `/dev/store/${tenant.slug}/admin/dashboard` : `https://${tenant.slug}.${rootDomain}/admin/dashboard`
}

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const tenant = await prisma.tenant.findUnique({ where: { ownerId: user.id }, select: { slug: true, isOnboarded: true } })
    const host = (await headers()).get('host')
    redirect(resolveSignedInDestination(tenant, host?.includes('localhost') ?? false))
  }

  const { error } = await searchParams
  const errorMessage =
    error === 'oauth_cancelled' || error === 'oauth_failed'
      ? "Google sign-in didn't complete — please try again."
      : null

  return (
    <div className="min-h-screen flex flex-col bg-surface md:items-center md:justify-center md:bg-bg">
      <div className="flex flex-col w-full p-6 bg-surface md:w-[420px] md:p-10 md:rounded-xl md:border md:border-border">
        <Logo className="hidden md:block" />

        <div className="flex flex-col gap-2 pt-8 md:pt-6">
          <h1 className="font-heading font-bold text-fg text-[28px] leading-[34px] md:text-[26px] md:leading-8">
            Log in or Sign up
          </h1>
          <p className="font-body text-md leading-5 text-fg/70">
            Enter your mobile number — we&apos;ll text you a one-time code to continue.
          </p>
        </div>

        {errorMessage && (
          <p className="font-body text-sm text-red-600 pt-4">{errorMessage}</p>
        )}

        <div className="pt-7">
          <OtpForm />
        </div>

        <div className="flex items-center gap-3 pt-6">
          <span className="grow h-px bg-border-light" />
          <span className="font-body text-fg/50 text-2xs">or</span>
          <span className="grow h-px bg-border-light" />
        </div>

        <div className="pt-5">
          <GoogleButton />
        </div>

        <p className="font-body text-fg/50 text-2xs leading-[18px] pt-6">
          By continuing, you agree to Talam&apos;s Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}
