'use client'

import { createBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { GoogleIcon } from '@/components/icons/google-icon'

export function GoogleButton() {
  const supabase = createBrowserClient()

  async function handleGoogleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full h-auto rounded-[8px] border-[1.5px] border-border p-[13px] gap-[10px] font-body font-medium text-fg text-md"
      onClick={handleGoogleSignIn}
    >
      <GoogleIcon />
      Continue with Google
    </Button>
  )
}
