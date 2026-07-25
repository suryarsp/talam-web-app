'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, ClipboardList, Users, Settings, PartyPopper, History, ExternalLink } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { StoreLink, useStoreBase } from '@/components/store/store-context'
import { ProfileMenu } from '@/components/marketing/profile-menu'
import { PublishButton } from './publish-button'
import { GoLiveButton } from './go-live-button'
import { getLiveStoreUrl, getTenantLiveStateAction } from '@/app/admin/dashboard/actions'
import type { MissingConfigItem } from '@/lib/data/tenant'

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/occasions', label: 'Occasions', icon: PartyPopper },
  { href: '/admin/versions', label: 'Versions', icon: History },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

const MOBILE_NAV = [
  { href: '/admin/dashboard', label: 'DASHBOARD', icon: LayoutDashboard },
  { href: '/admin/products', label: 'PRODUCTS', icon: Package },
  { href: '/admin/orders', label: 'ORDERS', icon: ClipboardList },
  { href: '/admin/occasions', label: 'OCCASIONS', icon: PartyPopper },
  { href: '/admin/versions', label: 'VERSIONS', icon: History },
  { href: '/admin/customers', label: 'CUSTOMERS', icon: Users },
  { href: '/admin/settings', label: 'SETTINGS', icon: Settings },
]

/** Derives a stable `data-tour` id from the href so NAV/MOBILE_NAV stay the single source of truth. */
function navTourId(href: string) {
  return `nav-${href.split('/').pop()}`
}

function isActive(rel: string, href: string) {
  return rel === href || (href !== '/admin/dashboard' && rel.startsWith(href))
    || (href === '/admin/dashboard' && (rel === '/admin/dashboard' || rel === '/admin'))
}

export function AdminNavShell({ children, user }: { children: React.ReactNode; user: User | null }) {
  const pathname = usePathname()
  const storeBase = useStoreBase()
  const rel = storeBase ? pathname.replace(storeBase, '') || '/' : pathname
  const [liveStoreUrl, setLiveStoreUrl] = useState<string | null>(null)
  const [isLive, setIsLive] = useState(false)
  const [missing, setMissing] = useState<MissingConfigItem[]>([])
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getLiveStoreUrl().then(setLiveStoreUrl)
    getTenantLiveStateAction().then((state) => {
      setIsLive(state.isLive)
      setMissing(state.missing)
    })
  }, [])

  // The desktop content pane scrolls independently of the window (`overflow-auto`
  // below), so Next's default scroll-to-top-on-navigate never touches it — reset it here.
  useEffect(() => {
    contentRef.current?.scrollTo(0, 0)
  }, [pathname])

  if (rel.startsWith('/admin/onboarding')) return <>{children}</>

  return (
    <div className="font-admin min-h-screen bg-bg">
      {/* Desktop: dark sidebar + content */}
      <div className="hidden md:flex">
        <aside className="sticky top-0 flex h-screen w-[240px] shrink-0 flex-col bg-bg-dark px-3 pt-4">
          <div className="mb-5 px-1">
            <span className="font-marketing text-2xl italic text-white">talam.</span>
          </div>
          <nav className="flex flex-col gap-1">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = isActive(rel, href)
              return (
                <StoreLink
                  key={href}
                  href={href}
                  data-tour={navTourId(href)}
                  className={`flex items-center gap-3 rounded-lg px-4 py-[10px] text-md font-medium transition-colors ${
                    active
                      ? 'bg-brand-primary/15 text-brand-primary'
                      : 'text-[#9CA3AF] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="size-5" strokeWidth={1.8} />
                  <span>{label}</span>
                </StoreLink>
              )
            })}
            <a
              href={liveStoreUrl ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg px-4 py-[10px] text-md font-medium text-[#9CA3AF] transition-colors hover:bg-white/5 hover:text-white"
            >
              <ExternalLink className="size-5" strokeWidth={1.8} />
              <span>Live Store</span>
            </a>
          </nav>
        </aside>
        <div ref={contentRef} className="flex-1 overflow-auto">
          <header className="flex h-[64px] items-center justify-between border-b border-border bg-surface px-8">
            <span className="font-marketing text-xl italic text-fg">talam.</span>
            <div className="flex items-center gap-4">
              {isLive ? <PublishButton /> : <GoLiveButton missing={missing} />}
              <button className="relative">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <div className="absolute -right-1 -top-1 size-2 rounded-full bg-danger" />
              </button>
              {user && (
                <ProfileMenu
                  user={user}
                  triggerClassName="flex size-8 items-center justify-center rounded-full bg-brand-primary text-xs font-semibold text-surface overflow-hidden hover:opacity-80 transition-opacity"
                />
              )}
            </div>
          </header>
          <main className="p-8">{children}</main>
        </div>
      </div>

      {/* Mobile: top header + content + fixed bottom nav */}
      <div className="md:hidden">
        <header className="flex h-[56px] items-center justify-between border-b border-border bg-surface px-4">
          <span className="font-marketing text-lg italic text-fg">talam.</span>
          <div className="flex items-center gap-3">
            {isLive ? <PublishButton /> : <GoLiveButton missing={missing} />}
            <button className="relative">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <div className="absolute -right-0.5 -top-0.5 size-[6px] rounded-full bg-danger" />
            </button>
            {user && (
              <ProfileMenu
                user={user}
                triggerClassName="flex size-8 items-center justify-center rounded-full bg-brand-primary text-xs font-semibold text-surface overflow-hidden hover:opacity-80 transition-opacity"
              />
            )}
          </div>
        </header>
        <main className="pt-4 pb-20">{children}</main>
        <nav
          className="fixed inset-x-0 bottom-0 z-40 grid h-[72px] items-center border-t border-border bg-surface"
          style={{ gridTemplateColumns: `repeat(${MOBILE_NAV.length}, minmax(0, 1fr))` }}
        >
          {MOBILE_NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(rel, href)
            return (
              <StoreLink
                key={href}
                href={href}
                data-tour={navTourId(href)}
                className={`flex min-w-0 flex-col items-center gap-1 px-0.5 ${active ? 'text-brand-primary' : 'text-muted-warm'}`}
              >
                <Icon className="size-5 shrink-0" strokeWidth={active ? 2 : 1.8} />
                <span className={`w-full truncate text-center text-2xs tracking-[0.02em] ${active ? 'font-bold' : 'font-semibold'}`}>{label}</span>
              </StoreLink>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
