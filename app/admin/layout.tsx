'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, ClipboardList, Users, Settings } from 'lucide-react'

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

const MOBILE_NAV = [
  { href: '/admin/dashboard', label: 'DASHBOARD', icon: LayoutDashboard },
  { href: '/admin/products', label: 'PRODUCTS', icon: Package },
  { href: '/admin/orders', label: 'ORDERS', icon: ClipboardList },
  { href: '/admin/customers', label: 'CUSTOMERS', icon: Users },
  { href: '/admin/settings', label: 'SETTINGS', icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname.startsWith('/admin/onboarding')) return <>{children}</>

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
              const active = pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(href))
              || (href === '/admin/dashboard' && (pathname === '/admin/dashboard' || pathname === '/admin'))
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 rounded-lg px-4 py-[10px] text-md font-medium transition-colors ${
                    active
                      ? 'bg-brand-primary/15 text-brand-primary'
                      : 'text-[#9CA3AF] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="size-5" strokeWidth={1.8} />
                  <span>{label}</span>
                </Link>
              )
            })}
          </nav>
        </aside>
        <div className="flex-1 overflow-auto">
          <header className="flex h-[64px] items-center justify-between border-b border-border bg-surface px-8">
            <span className="font-marketing text-xl italic text-fg">talam.</span>
            <div className="flex items-center gap-4">
              <button className="relative">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <div className="absolute -right-1 -top-1 size-2 rounded-full bg-danger" />
              </button>
              <div className="flex size-8 items-center justify-center rounded-full bg-brand-primary">
                <span className="text-xs font-semibold text-surface">S</span>
              </div>
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
            <button className="relative">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <div className="absolute -right-0.5 -top-0.5 size-[6px] rounded-full bg-danger" />
            </button>
            <div className="flex size-8 items-center justify-center rounded-full bg-brand-primary">
              <span className="text-xs font-semibold text-surface">S</span>
            </div>
          </div>
        </header>
        <main className="pb-20">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[72px] items-center justify-around border-t border-border bg-surface">
          {MOBILE_NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(href))
              || (href === '/admin/dashboard' && (pathname === '/admin/dashboard' || pathname === '/admin'))
            return (
              <Link key={href} href={href} className={`flex flex-col items-center gap-1 ${active ? 'text-brand-primary' : 'text-muted-warm'}`}>
                <Icon className="size-5" strokeWidth={active ? 2 : 1.8} />
                <span className={`text-[10px] tracking-[0.04em] ${active ? 'font-bold' : 'font-semibold'}`}>{label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
