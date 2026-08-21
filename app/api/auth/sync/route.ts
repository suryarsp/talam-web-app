import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { syncOwnerUser } from '@/lib/auth/sync-owner-user'

// Email-OTP sign-in verifies client-side (no OAuth code round-trip), so unlike
// app/auth/callback/route.ts there is no server hop that would otherwise create
// the Prisma User row. The client calls this right after a successful verifyOtp.
export async function POST() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  }

  await syncOwnerUser(user)
  return NextResponse.json({ ok: true })
}
