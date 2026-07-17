import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export async function requireOwnerSession(nextPath = '/admin/onboarding'): Promise<{ userId: string }> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth?next=${nextPath}`)
  }

  return { userId: user.id }
}
