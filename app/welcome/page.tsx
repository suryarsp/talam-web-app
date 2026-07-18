import { headers } from 'next/headers'
import Link from 'next/link'
import { Logo } from '@/components/logo'
import { requireOwnerSession } from '@/lib/admin-guard'
import { prisma } from '@/lib/prisma'
import { getAdminUrl, getStoreUrl } from '@/lib/tenant-url'
import { createServerClient } from '@/lib/supabase/server'
import { getRecentPublishLogsAction } from '@/app/admin/actions'
import { SignOutButton } from './sign-out-button'

export const dynamic = 'force-dynamic'

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

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
  const avatarUrl = user?.user_metadata.avatar_url as string | undefined

  const publishLogs = tenant?.isOnboarded ? await getRecentPublishLogsAction() : []

  return (
    <div className="font-admin min-h-screen bg-bg px-4 py-8 md:px-8 md:py-10">
      <div className="mx-auto flex max-w-[720px] flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Logo className="text-fg text-lg" />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-brand-primary/15 font-body text-xs font-bold text-brand-primary">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="size-full object-cover" />
                ) : (
                  name.charAt(0).toUpperCase() || '?'
                )}
              </span>
              <span className="font-body text-sm font-semibold text-fg">{name}</span>
            </div>
            <SignOutButton />
          </div>
        </div>

        {tenant?.isOnboarded ? (
          <>
            {/* Recent publishes */}
            <section>
              <p className="mb-3 text-2xs font-medium uppercase tracking-[0.06em] text-muted-warm">
                Recent Publishes
              </p>
              <div className="rounded-lg bg-surface">
                {publishLogs.length === 0 ? (
                  <p className="px-4 py-4 font-body text-sm text-muted-warm">
                    No changes published yet.
                  </p>
                ) : (
                  publishLogs.map((log, i) => (
                    <div
                      key={`${log.summary}-${log.publishedAt.toISOString()}`}
                      className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-border-light' : ''}`}
                    >
                      <span className="font-body text-sm text-fg">{log.summary}</span>
                      <span className="text-2xs text-muted-warm">{formatRelativeTime(log.publishedAt)}</span>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Navigation */}
            <section>
              <p className="mb-3 text-2xs font-medium uppercase tracking-[0.06em] text-muted-warm">
                Go To
              </p>
              <div className="rounded-lg bg-surface">
                <Link
                  href={getStoreUrl(tenant.slug, isLocalDev)}
                  className="flex items-center justify-between px-4 py-3.5 font-body text-sm font-semibold text-fg hover:bg-bg"
                >
                  View My Store
                  <span className="text-muted-warm">→</span>
                </Link>
                <Link
                  href={getAdminUrl(tenant.slug, isLocalDev)}
                  className="flex items-center justify-between border-t border-border-light px-4 py-3.5 font-body text-sm font-semibold text-fg hover:bg-bg"
                >
                  View Admin
                  <span className="text-muted-warm">→</span>
                </Link>
              </div>
            </section>
          </>
        ) : (
          <section>
            <div className="rounded-lg bg-surface">
              <Link
                href="/admin/onboarding"
                className="flex items-center justify-between px-4 py-3.5 font-body text-sm font-semibold text-fg hover:bg-bg"
              >
                Continue setup
                <span className="text-muted-warm">→</span>
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
