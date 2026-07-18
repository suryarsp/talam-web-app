import { headers } from 'next/headers'
import { StoreBaseProvider } from '@/components/store/store-context'
import { AdminNavShell } from '@/components/admin/admin-nav-shell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const hdrs = await headers()
  const storeBase = hdrs.get('x-store-base') ?? ''

  return (
    <StoreBaseProvider base={storeBase}>
      <AdminNavShell>{children}</AdminNavShell>
    </StoreBaseProvider>
  )
}
