'use client'

import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'

export function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="text-sm text-white/60 hover:text-white transition-colors font-body"
    >
      Sign out
    </button>
  )
}
