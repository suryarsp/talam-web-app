import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { syncStoreCustomer } from '@/lib/auth/sync-store-customer'

// Email-OTP sign-in verifies client-side (no OAuth code round-trip), so unlike
// app/store/auth/callback/route.ts there is no server hop that would otherwise create
// the Prisma Customer row. The client calls this right after a successful verifyOtp.
// Lives under app/store/api/... (not app/api/store/...) because proxy.ts rewrites
// storefront requests by prepending /store to the pathname — the client calls this
// via a relative `${storeBase}/api/auth/sync`, same as GoogleButton's redirectPath.
export async function POST() {
  const tenantId = (await headers()).get('x-tenant-id')
  if (!tenantId) {
    return NextResponse.json({ error: 'no_tenant' }, { status: 400 })
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  }

  const customer = await syncStoreCustomer(tenantId, user)
  return NextResponse.json({ ok: true, onboardingComplete: customer.onboardingComplete })
}
