import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { SupportLoginForm } from '@/components/super-admin/support-login-form'

export default async function SuperAdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Already signed in — let the (protected) layout's requireSuperAdmin() decide whether
  // this session is actually allow-listed (bounces to /not-found itself if it isn't),
  // rather than duplicating that check here.
  if (user) {
    const { next } = await searchParams
    redirect(next && next.startsWith('/super-admin') ? next : '/super-admin')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4">
      <div className="mb-6 flex flex-col items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-lg bg-brand-primary/10">
          <div className="size-3.5 rounded-sm bg-brand-primary" />
        </div>
        <span className="text-sm font-medium text-fg">talam ops</span>
      </div>

      <div className="w-full max-w-[400px] rounded-lg border border-border bg-surface p-6">
        <div className="mb-5">
          <h1 className="text-lg font-semibold text-fg">Sign in to Ops Console</h1>
          <p className="mt-1 text-sm text-muted-foreground">Access is restricted to authorized Talam support staff.</p>
        </div>
        <SupportLoginForm />
      </div>

      <p className="mt-5 max-w-[400px] text-center text-xs text-muted-foreground">
        Not on the allow-list? Ask an admin to add your email.
      </p>
    </div>
  )
}
