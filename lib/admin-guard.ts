import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export async function requireOwnerSession(): Promise<{ userId: string }> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth?next=/admin/onboarding')
  }

  return { userId: user.id }
}
