import type { TenantStorefront } from '@/lib/data/tenant'
import type { Department } from '@/lib/departments'
import { StoreLink, StoreIconButton } from './store-context'
import { CartBadge } from './cart-badge'
import { AccountMenu } from './account-menu'
import { SearchButton } from './search-button'

type Props = {
  tenant: Pick<TenantStorefront, 'name' | 'logoUrl' | 'ownerId'>
  departments: { value: Department; label: string }[]
}

export function StoreHeader({ tenant, departments }: Props) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between bg-surface/80 px-4 py-2.5 backdrop-blur-xl sm:border-b sm:border-border sm:bg-surface sm:px-12 sm:py-4 sm:backdrop-blur-none border-b border-border/50">
      <StoreLink href="/" className="font-heading text-xl font-bold text-fg sm:text-2xl">
        {tenant.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- tenant-hosted logo, arbitrary remote host
          <img src={tenant.logoUrl} alt={tenant.name} className="h-8 object-contain sm:h-8" />
        ) : (
          tenant.name
        )}
      </StoreLink>

      <nav className="hidden gap-5 lg:flex lg:gap-12">
        {departments.map((dept) => (
          <StoreLink key={dept.value} href={`/${dept.value}`} className="font-body font-medium text-fg text-md/snug">
            {dept.label}
          </StoreLink>
        ))}
        <StoreLink href="/offers" className="font-body font-medium text-fg text-md/snug">
          Offers
        </StoreLink>
      </nav>

      <div className="flex items-center gap-2 sm:gap-3">
        <SearchButton />
        <StoreIconButton href="/wishlist">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="#8B7D7A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </StoreIconButton>
        <CartBadge />
        <AccountMenu ownerId={tenant.ownerId} />
      </div>
    </header>
  )
}
