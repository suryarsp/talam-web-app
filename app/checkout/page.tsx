import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getRequestTenantId, getTenantStorefront } from '@/lib/data/tenant'
import { getAddresses } from '@/lib/data/addresses'
import { withTenant } from '@/lib/prisma'
import { CheckoutClient } from './checkout-client'

export const dynamic = 'force-dynamic'

export type EnabledPaymentMethods = { upi: boolean; instamojo: boolean; razorpay: boolean }

export default async function CheckoutPage() {
  const tenantId = await getRequestTenantId()
  if (!tenantId) notFound()

  const [tenant, supabase] = await Promise.all([getTenantStorefront(tenantId), createServerClient()])
  if (!tenant) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Not signed in is a valid state here — the client renders step 1 (sign-in) rather
  // than bouncing to /auth, so the customer keeps their cart and their place in the flow.
  const [addresses, paymentRow] = await Promise.all([
    user ? getAddresses(tenantId, user.id) : Promise.resolve([]),
    withTenant(tenantId, (db) => db.tenant.findUnique({ where: { id: tenantId }, select: { paymentConfig: true } })),
  ])

  const config = (paymentRow?.paymentConfig ?? {}) as {
    upi?: { enabled?: boolean; upiId?: string }
    instamojo?: { enabled?: boolean }
    razorpay?: { enabled?: boolean }
  }

  const methods: EnabledPaymentMethods = {
    // UPI needs a VPA to be usable at all — an enabled toggle with no ID is not a payment method.
    upi: Boolean(config.upi?.enabled && config.upi?.upiId),
    instamojo: Boolean(config.instamojo?.enabled),
    razorpay: Boolean(config.razorpay?.enabled),
  }

  return (
    <CheckoutClient
      storeName={tenant.name}
      signedIn={Boolean(user)}
      signedInPhone={user?.phone ?? null}
      addresses={addresses}
      methods={methods}
    />
  )
}
