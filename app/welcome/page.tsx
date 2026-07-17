import { headers } from 'next/headers'
import Link from 'next/link'
import { Logo } from '@/components/logo'
import { requireOwnerSession } from '@/lib/admin-guard'
import { prisma } from '@/lib/prisma'
import { getAdminUrl, getStoreUrl } from '@/lib/tenant-url'
import { createServerClient } from '@/lib/supabase/server'
import { SignOutButton } from './sign-out-button'

export const dynamic = 'force-dynamic'

export default async function WelcomePage() {
  const { userId } = await requireOwnerSession('/welcome')

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const tenant = await prisma.tenant.findUnique({
    where: { ownerId: userId },
    select: { slug: true, isOnboarded: true },
  })

  const host = (await headers()).get('host')
  const isLocalDev = host?.includes('localhost') ?? false
  const name = user?.user_metadata.full_name ?? user?.email ?? ''

  return (
    <main className="min-h-screen bg-bg-dark flex flex-col items-center justify-center gap-10 px-6 py-16">
      <Logo className="text-white text-[26px]" />
      <div className="text-center">
        <p className="font-body text-lg font-semibold text-white">{name}</p>
        {user?.email && <p className="font-body text-sm text-white/50">{user.email}</p>}
      </div>
      <div className="flex w-full max-w-[440px] flex-col gap-4">
        {tenant?.isOnboarded ? (
          <>
            <Link
              href={getStoreUrl(tenant.slug, isLocalDev)}
              className="block rounded-2xl bg-brand-primary px-8 py-5 text-center font-body text-base font-semibold text-white transition-opacity hover:opacity-90"
            >
              View My Store
            </Link>
            <Link
              href={getAdminUrl(tenant.slug, isLocalDev)}
              className="block rounded-2xl border border-white/20 px-8 py-5 text-center font-body text-base font-semibold text-white transition-colors hover:bg-white/10"
            >
              View Admin
            </Link>
          </>
        ) : (
          <Link
            href="/admin/onboarding"
            className="block rounded-2xl bg-brand-primary px-8 py-5 text-center font-body text-base font-semibold text-white transition-opacity hover:opacity-90"
          >
            Continue setup
          </Link>
        )}
      </div>
      <SignOutButton />
    </main>
  )
}
