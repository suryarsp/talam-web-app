import Link from 'next/link'
import type { TenantStorefront } from '@/lib/data/tenant'

type Props = {
  tenant: Pick<TenantStorefront, 'name' | 'logoUrl'>
}

function IconButton({ children, href }: { children: React.ReactNode; href: string }) {
  return (
    <Link
      href={href}
      className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-border-light sm:size-10"
    >
      {children}
    </Link>
  )
}

export function StoreHeader({ tenant }: Props) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-surface px-4 py-3 sm:px-12 sm:py-4">
      <Link href="/" className="font-heading text-lg font-bold text-fg sm:text-2xl">
        {tenant.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- tenant-hosted logo, arbitrary remote host
          <img src={tenant.logoUrl} alt={tenant.name} className="h-7 object-contain sm:h-8" />
        ) : (
          tenant.name
        )}
      </Link>

      <nav className="hidden gap-12 sm:flex">
        <Link href="/shop" className="font-body font-medium text-fg text-md/snug">
          Shop
        </Link>
        <Link href="/about" className="font-body font-medium text-fg text-md/snug">
          About
        </Link>
      </nav>

      <div className="flex gap-2.5 sm:gap-4">
        <IconButton href="/shop">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="#8B7D7A" strokeWidth="2" />
            <path d="m21 21-4.35-4.35" stroke="#8B7D7A" strokeWidth="2" />
          </svg>
        </IconButton>
        <IconButton href="/cart">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="9" cy="21" r="1" stroke="#8B7D7A" strokeWidth="2" />
            <circle cx="20" cy="21" r="1" stroke="#8B7D7A" strokeWidth="2" />
            <path
              d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"
              stroke="#8B7D7A"
              strokeWidth="2"
            />
          </svg>
        </IconButton>
        <IconButton href="/account">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#8B7D7A" strokeWidth="2" />
            <circle cx="12" cy="7" r="4" stroke="#8B7D7A" strokeWidth="2" />
          </svg>
        </IconButton>
      </div>
    </header>
  )
}
