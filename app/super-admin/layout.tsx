import Link from 'next/link'
import { requireSuperAdmin } from '@/lib/auth-guard'

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireSuperAdmin()
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <nav className="mb-6 flex items-center gap-4 border-b border-border pb-4 text-sm font-medium">
        <Link href="/super-admin" className="text-foreground hover:underline">
          Tenants
        </Link>
        <Link href="/super-admin/orders" className="text-muted-foreground hover:underline">
          Flagged Orders
        </Link>
      </nav>
      {children}
    </div>
  )
}
