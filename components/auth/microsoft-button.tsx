'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { MicrosoftIcon } from '@/components/icons/microsoft-icon'

export function MicrosoftButton({ redirectPath = '/auth/callback', next }: { redirectPath?: string; next?: string }) {
  const supabase = createBrowserClient()
  const [loading, setLoading] = useState(false)

  async function handleMicrosoftSignIn() {
    setLoading(true)
    const redirectTo = new URL(redirectPath, window.location.origin)
    if (next) redirectTo.searchParams.set('next', next)

    // Supabase's provider key for Microsoft/Entra ID (Azure AD) is 'azure'.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: redirectTo.toString(),
      },
    })
    if (error) setLoading(false)
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={loading}
      className="w-full h-auto rounded-[8px] border-[1.5px] border-border p-[13px] gap-[10px] font-body font-medium text-fg text-md disabled:opacity-70"
      onClick={handleMicrosoftSignIn}
    >
      {loading ? <Loader2 className="size-[18px] animate-spin" /> : <MicrosoftIcon />}
      {loading ? 'Redirecting…' : 'Continue with Microsoft'}
    </Button>
  )
}
