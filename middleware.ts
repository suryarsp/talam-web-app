import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { getTenantBySlug } from '@/lib/tenant'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'mytalam.com'
// ponytail: plain localhost has no subdomain to resolve a tenant from, so pin it to one for local dev
const DEFAULT_TENANT_SLUG = process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG ?? 'silk'

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') ?? ''
  const pathname = request.nextUrl.pathname

  // Strip port (for local dev: localhost:3000)
  const host = hostname.split(':')[0]

  // Refresh Supabase session on every request
  const sessionResponse = await updateSession(request)

  // Main marketing domain → no rewrite, serve root route group
  // (skip for plain "localhost": .env.local sets ROOT_DOMAIN=localhost for dev,
  // but bare localhost:3000 should show the default tenant store, not the marketing page)
  if (host !== 'localhost' && (host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`)) {
    return sessionResponse
  }

  // Super admin subdomain → rewrite to /super-admin/*
  if (host === `admin.${ROOT_DOMAIN}`) {
    const url = new URL(`/super-admin${pathname === '/' ? '' : pathname}`, request.url)
    return NextResponse.rewrite(url, { headers: sessionResponse.headers })
  }

  // Tenant subdomain → resolve tenant and rewrite to /store/*
  // Plain localhost:3000 (no subdomain) resolves to the default dev tenant instead.
  const subdomain = host === 'localhost' ? DEFAULT_TENANT_SLUG : host.replace(`.${ROOT_DOMAIN}`, '')
  if (subdomain && subdomain !== host) {
    const tenant = await getTenantBySlug(subdomain)

    if (!tenant) {
      // Unknown tenant → 404
      return NextResponse.rewrite(new URL('/not-found', request.url))
    }

    const url = new URL(`/store${pathname === '/' ? '' : pathname}`, request.url)
    const response = NextResponse.rewrite(url, { headers: sessionResponse.headers })
    response.headers.set('x-subdomain', subdomain)
    response.headers.set('x-tenant-id', tenant.id)
    response.headers.set('x-tenant-tier', tenant.tier)
    return response
  }

  return sessionResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
