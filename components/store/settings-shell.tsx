'use client'

import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { StoreLink, useStoreBase } from '@/components/store/store-context'

const sidebarItems = [
  { label: 'Profile', href: '/account/profile' },
  { label: 'Addresses', href: '/account/addresses' },
  { label: 'Payments', href: '/account/payment-method' },
  { label: 'Notifications', href: '/account/notifications' },
  { label: 'Account', href: '/account/actions' },
]

type SidebarUser = { name: string; phone: string; initial: string; avatarUrl?: string | null }

export function SettingsShell({ children, user: sidebarUser }: { children: React.ReactNode; user: SidebarUser }) {
  const pathname = usePathname()
  const storeBase = useStoreBase()
  const rel = storeBase ? pathname.replace(storeBase, '') || '/' : pathname

  return (
    <div className="hidden lg:block min-h-screen bg-bg py-10 px-12">
      <div className="mx-auto max-w-[1100px] flex gap-8">
        <div className="w-[280px] shrink-0">
          <div className="rounded-xl border border-border bg-surface p-6 mb-6">
            <div className="flex flex-col items-center">
              <div className="flex size-16 items-center justify-center overflow-hidden rounded-full bg-store-primary/15 text-2xl font-bold text-store-primary font-body mb-3">
                {sidebarUser.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sidebarUser.avatarUrl} alt="" className="size-full object-cover" />
                ) : (
                  sidebarUser.initial
                )}
              </div>
              <div className="font-body text-base font-bold text-fg">{sidebarUser.name}</div>
              <div className="font-body text-sm text-muted-warm">{sidebarUser.phone}</div>
            </div>
          </div>
          <nav className="rounded-xl border border-border bg-surface overflow-hidden">
            {sidebarItems.map((item) => (
              <StoreLink
                key={item.href}
                href={item.href}
                className={`flex w-full items-center justify-between px-5 py-3.5 font-body text-md transition-colors border-l-[3px] ${
                  rel === item.href
                    ? 'text-fg font-semibold border-store-primary bg-bg'
                    : 'text-muted-warm border-transparent hover:bg-bg hover:border-store-primary'
                }`}
              >
                {item.label}
                <ChevronRight className="h-4 w-4" />
              </StoreLink>
            ))}
          </nav>
        </div>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  )
}
