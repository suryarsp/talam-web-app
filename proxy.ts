import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { getTenantBySlug } from '@/lib/tenant'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'mytalam.com'
// ponytail: plain localhost has no subdomain to resolve a tenant from, so pin it to one for local dev
const DEFAULT_TENANT_SLUG = process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG ?? 'silk'

export async function proxy(request: NextRequest) {
  const hostname = request.headers.get('host') ?? ''
  const pathname = request.nextUrl.pathname

  // Strip port (for local dev: localhost:3000)
  const host = hostname.split(':')[0]

  // Refresh Supabase session on every request
  const sessionResponse = await updateSession(request)

  // Super admin subdomain → rewrite to /super-admin/*
  if (host === `admin.${ROOT_DOMAIN}`) {
    const url = new URL(`/super-admin${pathname === '/' ? '' : pathname}`, request.url)
    return NextResponse.rewrite(url, { headers: sessionResponse.headers })
  }

  // ponytail: marketing homepage temporarily disabled while the storefront is
  // being finished. Any host without a resolvable tenant subdomain (root
  // domain, the bare Vercel project URL, "www", localhost) falls back to the
  // default tenant store instead of the marketing page. To bring the
  // marketing page back, reinstate a passthrough here for ROOT_DOMAIN/www
  // that `return`s sessionResponse before the tenant resolution below.
  const parsedSubdomain = host.replace(`.${ROOT_DOMAIN}`, '')
  const isRootHost = parsedSubdomain === host || parsedSubdomain === 'www' || host === 'localhost'
  const subdomain = isRootHost ? DEFAULT_TENANT_SLUG : parsedSubdomain

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

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
