import type { TenantStorefront } from '@/lib/data/tenant'
import type { Department } from '@/lib/departments'
import { StoreLink, StoreIconButton } from './store-context'
import { CartBadge } from './cart-badge'
import { AccountMenu } from './account-menu'
import { SearchButton } from './search-button'

type Props = {
  tenant: Pick<TenantStorefront, 'name' | 'logoUrl' | 'ownerId' | 'freeDeliveryAbove' | 'returnWindowDays'>
  departments: { value: Department; label: string }[]
}

function AnnouncementBar({ tenant }: { tenant: Props['tenant'] }) {
  const items = [
    tenant.freeDeliveryAbove ? `Free shipping on orders over ₹${tenant.freeDeliveryAbove.toLocaleString('en-IN')}` : null,
    tenant.returnWindowDays ? `${tenant.returnWindowDays}-day easy returns` : null,
  ].filter((x): x is string => Boolean(x))
  if (items.length === 0) return null

  return (
    <div className="hidden h-9 items-center justify-center gap-10 bg-[#1E1A19] sm:flex">
      {items.map((text, i) => (
        <span key={i} className="flex items-center gap-10">
          {i > 0 && <span className="size-[3px] rounded-full bg-white/25" />}
          <span className="font-body text-xs tracking-[0.03em] text-white/70">{text}</span>
        </span>
      ))}
    </div>
  )
}

export function StoreHeader({ tenant, departments }: Props) {
  return (
    <>
      <AnnouncementBar tenant={tenant} />
      <header className="sticky top-0 z-40 flex items-center justify-between bg-[#FBF8F3]/90 px-4 py-2.5 backdrop-blur-xl sm:border-b sm:border-[#E7E0D6] sm:bg-[#FBF8F3] sm:px-12 sm:py-4 sm:backdrop-blur-none border-b border-border/50">
        <StoreLink href="/" className="font-heading text-xl font-bold text-fg sm:text-2xl">
          {tenant.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- tenant-hosted logo, arbitrary remote host
            <img src={tenant.logoUrl} alt={tenant.name} className="h-8 object-contain sm:h-8" />
          ) : (
            tenant.name
          )}
        </StoreLink>

        <nav className="hidden gap-5 lg:flex lg:gap-9">
          {departments.map((dept) => (
            <StoreLink key={dept.value} href={`/${dept.value}`} className="font-body font-medium text-fg text-md/snug">
              {dept.label}
            </StoreLink>
          ))}
          <StoreLink href="/offers" className="font-body font-semibold text-store-primary text-md/snug">
            Offers
          </StoreLink>
        </nav>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <SearchButton />
          <StoreIconButton href="/wishlist">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="#4A423F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </StoreIconButton>
          <CartBadge />
          <AccountMenu ownerId={tenant.ownerId} />
        </div>
      </header>
    </>
  )
}
