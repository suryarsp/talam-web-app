import { createAdminClient } from '@/lib/supabase/admin'
import { withTenant } from '@/lib/prisma'
import { syncStoreCustomer } from './sync-store-customer'

export type ResolveGuestCustomerResult = { customerId: string } | { error: 'guest_account_exists' }

function last10Digits(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10)
}

function toE164(phone: string): string {
  return `+91${last10Digits(phone)}`
}

/**
 * Resolves a guest checkout's email/phone to a `Customer` on this tenant, creating a
 * passwordless Supabase account + Customer row if neither already exists. `Customer.id`
 * is a single-column primary key equal to the Supabase auth user id (not composite with
 * tenantId), so a matching account already registered under a different tenant can't get
 * a second Customer row here — that case surfaces as `guest_account_exists` instead of a
 * duplicate-key crash.
 */
export async function resolveOrCreateGuestCustomer(
  tenantId: string,
  { email, phone }: { email: string; phone: string }
): Promise<ResolveGuestCustomerResult> {
  const normalizedEmail = email.trim()
  const digits = last10Digits(phone)

  const matches = await withTenant(tenantId, (db) =>
    db.customer.findMany({
      where: {
        tenantId,
        OR: [{ email: { equals: normalizedEmail, mode: 'insensitive' } }, { phone: { endsWith: digits } }],
      },
      select: { id: true, email: true },
    })
  )
  const existing = matches.find((m) => m.email?.toLowerCase() === normalizedEmail.toLowerCase()) ?? matches[0]
  if (existing) return { customerId: existing.id }

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email: normalizedEmail,
    phone: toE164(phone),
    email_confirm: true,
    phone_confirm: true,
    user_metadata: { created_via: 'guest_checkout' },
  })

  if (error) {
    if (error.code === 'email_exists' || error.code === 'phone_exists') return { error: 'guest_account_exists' }
    throw error
  }

  await syncStoreCustomer(tenantId, data.user)
  return { customerId: data.user.id }
}
