import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { getTenantBySlug } from '@/lib/tenant'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'talam4shop.com'
const LOCALHOST_NAMES: string[] = ['localhost', '127.0.0.1']

type TenantSurface = 'admin' | 'checkout' | 'storefront'

type RouteDecision =
  | { readonly kind: 'passThrough' }
  | { readonly kind: 'superAdmin'; readonly pathname: string }
  | { readonly kind: 'tenant'; readonly slug: string; readonly pathname: string; readonly surface: TenantSurface }

export async function proxy(request: NextRequest) {
  const hostname = request.headers.get('host') ?? ''
  const pathname = request.nextUrl.pathname
  const host = hostname.split(':')[0]
  const sessionResponse = await updateSession(request)
  const decision = getRouteDecision(host, pathname)

  switch (decision.kind) {
    case 'passThrough':
      return sessionResponse

    case 'superAdmin':
      return rewriteWithSession(request, sessionResponse, `/super-admin${decision.pathname}`)

    case 'tenant':
      return createTenantResponse(request, sessionResponse, decision)
  }
}

function getRouteDecision(host: string, pathname: string): RouteDecision {
  const devRoute = getDevRouteDecision(host, pathname)
  if (devRoute) return devRoute

  if (isRootHost(host)) return { kind: 'passThrough' }

  if (host === `admin.${ROOT_DOMAIN}`) {
    return { kind: 'superAdmin', pathname: pathname === '/' ? '' : pathname }
  }

  const slug = getTenantSlug(host)
  if (!slug) return { kind: 'passThrough' }

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return { kind: 'tenant', slug, pathname, surface: 'admin' }
  }

  if (pathname === '/checkout' || pathname.startsWith('/checkout/')) {
    return { kind: 'tenant', slug, pathname, surface: 'checkout' }
  }

  return { kind: 'tenant', slug, pathname, surface: 'storefront' }
}

function getDevRouteDecision(host: string, pathname: string): RouteDecision | null {
  if (!isLocalhost(host)) return null

  if (pathname === '/dev/super-admin' || pathname.startsWith('/dev/super-admin/')) {
    const superAdminPath = pathname.slice('/dev/super-admin'.length)
    return { kind: 'superAdmin', pathname: superAdminPath || '' }
  }

  if (pathname !== '/dev/store' && !pathname.startsWith('/dev/store/')) return null

  const [, , , slug = '', ...rest] = pathname.split('/')
  if (!slug) return { kind: 'passThrough' }

  const remainingPath = `/${rest.join('/')}`
  if (remainingPath === '/admin' || remainingPath.startsWith('/admin/')) {
    return { kind: 'tenant', slug, pathname: remainingPath, surface: 'admin' }
  }

  return {
    kind: 'tenant',
    slug,
    pathname: remainingPath === '/' ? '/' : remainingPath,
    surface: remainingPath === '/checkout' || remainingPath.startsWith('/checkout/') ? 'checkout' : 'storefront',
  }
}

function isRootHost(host: string) {
  return host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}` || isLocalhost(host)
}

function isLocalhost(host: string) {
  return LOCALHOST_NAMES.includes(host)
}

function getTenantSlug(host: string) {
  if (host.endsWith('.localhost')) return host.slice(0, -'.localhost'.length)
  if (!host.endsWith(`.${ROOT_DOMAIN}`)) return null
  return host.slice(0, -`.${ROOT_DOMAIN}`.length)
}

async function createTenantResponse(
  request: NextRequest,
  sessionResponse: NextResponse,
  decision: Extract<RouteDecision, { readonly kind: 'tenant' }>
) {
  const tenant = await getTenantBySlug(decision.slug)
  if (!tenant) return NextResponse.rewrite(new URL('/not-found', request.url))

  const response =
    decision.surface === 'storefront'
      ? rewriteWithSession(request, sessionResponse, `/store${decision.pathname === '/' ? '' : decision.pathname}`)
      : decision.surface === 'admin'
        ? createAdminResponse(request, sessionResponse, decision.pathname)
        : sessionResponse

  response.headers.set('x-subdomain', decision.slug)
  response.headers.set('x-tenant-id', tenant.id)
  response.headers.set('x-tenant-tier', tenant.tier)
  return response
}

function rewriteWithSession(request: NextRequest, sessionResponse: NextResponse, pathname: string) {
  return NextResponse.rewrite(new URL(pathname || '/', request.url), { headers: sessionResponse.headers })
}

function createAdminResponse(request: NextRequest, sessionResponse: NextResponse, pathname: string) {
  return request.nextUrl.pathname === pathname ? sessionResponse : rewriteWithSession(request, sessionResponse, pathname)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
