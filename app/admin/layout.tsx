import { headers } from 'next/headers'
import { StoreBaseProvider } from '@/components/store/store-context'
import { AdminNavShell } from '@/components/admin/admin-nav-shell'
import { createServerClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const hdrs = await headers()
  const storeBase = hdrs.get('x-store-base') ?? ''
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <StoreBaseProvider base={storeBase}>
      <AdminNavShell user={user}>{children}</AdminNavShell>
    </StoreBaseProvider>
  )
}
