'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, ClipboardList, Users, Settings, PartyPopper, History, ExternalLink, MoreHorizontal, ChevronsLeft, ChevronsRight } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { StoreLink, useStoreBase } from '@/components/store/store-context'
import { ProfileMenu } from '@/components/marketing/profile-menu'
import { Dialog } from '@/components/ui/dialog'
import { PublishButton } from './publish-button'
import { GoLiveButton } from './go-live-button'
import { NotificationsBell } from './notifications-bell'
import { getLiveStoreUrl, getTenantLiveStateAction } from '@/app/admin/dashboard/actions'
import { useTourStore } from '@/lib/store/tour'

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/occasions', label: 'Occasions', icon: PartyPopper },
  { href: '/admin/versions', label: 'Versions', icon: History },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

// Mobile bottom nav only has room for a handful of full-width labels before they truncate —
// the rest live behind the "More" sheet so every item still reads at a glance.
const MOBILE_PRIMARY = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

const MOBILE_OVERFLOW = [
  { href: '/admin/occasions', label: 'Occasions', icon: PartyPopper },
  { href: '/admin/versions', label: 'Versions', icon: History },
  { href: '/admin/customers', label: 'Customers', icon: Users },
]

/** Derives a stable `data-tour` id from the href so NAV/MOBILE_PRIMARY/MOBILE_OVERFLOW stay the single source of truth. */
function navTourId(href: string) {
  return `nav-${href.split('/').pop()}`
}

const MOBILE_OVERFLOW_TOUR_IDS = new Set(MOBILE_OVERFLOW.map((item) => navTourId(item.href)))

const SIDEBAR_COLLAPSED_KEY = 'talam-admin-sidebar-collapsed'

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
  const [moreOpen, setMoreOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const tourActive = useTourStore((s) => s.active)
  const tourStepKey = useTourStore((s) => s.steps[s.stepIndex]?.key)

  useEffect(() => {
    getLiveStoreUrl().then(setLiveStoreUrl)
    getTenantLiveStateAction().then((state) => setIsLive(state.isLive))
  }, [])

  // Server has no access to localStorage, so the sidebar always renders expanded on first
  // paint and flips to the persisted state right after mount — matches the SSR HTML, then
  // applies the user's preference a frame later instead of causing a hydration mismatch.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1')
  }, [])

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
      return next
    })
  }

  function handleGoLive() {
    setIsLive(true)
  }

  // The orientation tour targets nav items by their `data-tour` id — if the current step points
  // at one tucked inside the mobile "More" sheet, open it so the tour can find and spotlight it.
  const [prevTourState, setPrevTourState] = useState({ tourActive, tourStepKey })
  if (tourActive !== prevTourState.tourActive || tourStepKey !== prevTourState.tourStepKey) {
    setPrevTourState({ tourActive, tourStepKey })
    if (tourActive && tourStepKey && MOBILE_OVERFLOW_TOUR_IDS.has(tourStepKey)) setMoreOpen(true)
  }

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
        <aside
          className={`sticky top-0 flex h-screen shrink-0 flex-col bg-bg-dark px-3 pt-4 transition-[width] duration-200 ${collapsed ? 'w-[72px]' : 'w-[240px]'}`}
        >
          <div className="mb-5 flex items-center justify-between px-1">
            {!collapsed && <span className="font-marketing text-2xl italic text-white">talam.</span>}
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="flex size-7 shrink-0 items-center justify-center rounded-lg text-[#9CA3AF] transition-colors hover:bg-white/5 hover:text-white"
            >
              {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
            </button>
          </div>
          <nav className="flex flex-col gap-1">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = isActive(rel, href)
              return (
                <StoreLink
                  key={href}
                  href={href}
                  data-tour={navTourId(href)}
                  title={collapsed ? label : undefined}
                  className={`flex items-center gap-3 rounded-lg px-4 py-[10px] text-md font-medium transition-colors ${
                    active
                      ? 'bg-brand-primary/15 text-brand-primary'
                      : 'text-[#9CA3AF] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="size-5 shrink-0" strokeWidth={1.8} />
                  {!collapsed && <span>{label}</span>}
                </StoreLink>
              )
            })}
            {isLive && (
              <a
                href={liveStoreUrl ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                title={collapsed ? 'Live Store' : undefined}
                className="flex items-center gap-3 rounded-lg px-4 py-[10px] text-md font-medium text-[#9CA3AF] transition-colors hover:bg-white/5 hover:text-white"
              >
                <ExternalLink className="size-5 shrink-0" strokeWidth={1.8} />
                {!collapsed && <span>Live Store</span>}
              </a>
            )}
          </nav>
        </aside>
        <div ref={contentRef} className="flex-1 overflow-auto">
          <header className="flex h-[64px] items-center justify-between border-b border-border bg-surface px-8">
            <span className="font-marketing text-xl italic text-fg">talam.</span>
            <div className="flex items-center gap-4">
              {isLive ? <PublishButton /> : <GoLiveButton onGoLive={handleGoLive} />}
              <NotificationsBell />
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
            {isLive ? <PublishButton /> : <GoLiveButton onGoLive={handleGoLive} />}
            <NotificationsBell />
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
          style={{ gridTemplateColumns: `repeat(${MOBILE_PRIMARY.length + 1}, minmax(0, 1fr))` }}
        >
          {MOBILE_PRIMARY.map(({ href, label, icon: Icon }) => {
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
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={`flex min-w-0 flex-col items-center gap-1 px-0.5 ${MOBILE_OVERFLOW.some((item) => isActive(rel, item.href)) ? 'text-brand-primary' : 'text-muted-warm'}`}
          >
            <MoreHorizontal className="size-5 shrink-0" strokeWidth={1.8} />
            <span className="w-full truncate text-center text-2xs font-semibold tracking-[0.02em]">More</span>
          </button>
        </nav>

        <Dialog open={moreOpen} onClose={() => setMoreOpen(false)}>
          <div className="p-4 pb-6">
            <p className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.06em] text-muted-warm">More</p>
            <div className="flex flex-col gap-1">
              {MOBILE_OVERFLOW.map(({ href, label, icon: Icon }) => {
                const active = isActive(rel, href)
                return (
                  <StoreLink
                    key={href}
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 text-md font-medium ${active ? 'bg-brand-primary/10 text-brand-primary' : 'text-fg'}`}
                  >
                    <Icon className="size-5" strokeWidth={active ? 2 : 1.8} />
                    <span>{label}</span>
                  </StoreLink>
                )
              })}
            </div>
          </div>
        </Dialog>
      </div>
    </div>
  )
}
