import Link from 'next/link'

const tabs = [
  {
    label: 'Home',
    href: '/',
    icon: (
      <>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9,22 9,12 15,12 15,22" />
      </>
    ),
  },
  {
    label: 'Shop',
    href: '/shop',
    icon: (
      <>
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </>
    ),
  },
  {
    label: 'Wishlist',
    href: '/wishlist',
    icon: <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />,
  },
  {
    label: 'Orders',
    href: '/orders',
    icon: (
      <>
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="9" y1="16" x2="13" y2="16" />
      </>
    ),
  },
  {
    label: 'Account',
    href: '/account',
    icon: (
      <>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
  },
]

// ponytail: `active` defaults to Home since it's the only tab page that exists so far;
// switch to usePathname-based detection once /shop, /wishlist, /orders, /account land.
export function MobileTabBar({ active = 'Home' }: { active?: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 h-20 border-t border-border bg-surface sm:hidden">
      <div className="flex h-16 items-start justify-around pt-2.5">
        {tabs.map((tab) => {
          const isActive = tab.label === active
          const color = isActive ? 'var(--color-store-primary)' : 'var(--color-muted-warm)'
          return (
            <Link key={tab.label} href={tab.href} className="flex flex-col items-center gap-[3px]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                {tab.icon}
              </svg>
              <span
                className="text-[10px] leading-none font-semibold tracking-[0.04em] uppercase"
                style={{ color }}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
