import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getRequestTenantId, getTenantStorefront } from '@/lib/data/tenant'
import { getAddresses } from '@/lib/data/addresses'
import { withTenant } from '@/lib/prisma'
import { normalizePaymentConfig } from '@/lib/payments/config'
import { CheckoutClient } from './checkout-client'

export const dynamic = 'force-dynamic'

export type EnabledPaymentMethods = { upi: boolean; instamojo: boolean; razorpay: boolean; cod: boolean }

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

  const config = normalizePaymentConfig(paymentRow?.paymentConfig)

  const methods: EnabledPaymentMethods = {
    // UPI needs a VPA to be usable at all — an enabled toggle with no ID is not a payment method.
    upi: Boolean(config.upi.enabled && config.upi.upiId),
    instamojo: Boolean(config.instamojo.enabled),
    razorpay: Boolean(config.razorpay.enabled),
    cod: Boolean(config.cod.enabled),
  }

  // Fetch customer name so checkout can pre-fill the address form
  const customer = user
    ? await withTenant(tenantId, (db) =>
        db.customer.findUnique({ where: { id: user.id }, select: { name: true, phone: true, email: true } })
      )
    : null

  return (
    <CheckoutClient
      storeName={tenant.name}
      signedIn={Boolean(user)}
      signedInPhone={customer?.phone ?? user?.phone ?? null}
      signedInName={customer?.name ?? null}
      signedInEmail={customer?.email ?? user?.email ?? null}
      addresses={addresses}
      methods={methods}
    />
  )
}
