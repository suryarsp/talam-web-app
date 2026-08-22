import { NextRequest, NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getTenantBySlugMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: vi.fn(() => Promise.resolve(NextResponse.next())),
}))

vi.mock('@/lib/tenant', () => ({
  getTenantBySlug: getTenantBySlugMock,
}))

function createRequest(host: string, pathname: string) {
  return new NextRequest(new URL(pathname, `http://${host}`), {
    headers: { host },
  })
}

function rewritePath(response: Response) {
  const rewriteUrl = response.headers.get('x-middleware-rewrite')
  return rewriteUrl ? new URL(rewriteUrl).pathname : null
}

describe('proxy host-aware routing', () => {
  beforeEach(() => {
    getTenantBySlugMock.mockReset()
    getTenantBySlugMock.mockResolvedValue({
      id: 'tenant-silk',
      slug: 'silk',
      tier: 'starter',
    })
  })

  it('passes through root production host to marketing when visiting /', async () => {
    const { proxy } = await import('./proxy')

    const response = await proxy(createRequest('talam4shop.com', '/'))

    expect(rewritePath(response)).toBeNull()
    expect(getTenantBySlugMock).not.toHaveBeenCalled()
  })

  it('rewrites tenant production root to storefront when visiting /', async () => {
    const { proxy } = await import('./proxy')

    const response = await proxy(createRequest('silk.talam4shop.com', '/'))

    expect(rewritePath(response)).toBe('/store')
    expect(response.headers.get('x-tenant-id')).toBe('tenant-silk')
    expect(getTenantBySlugMock).toHaveBeenCalledWith('silk')
  })

  it('rewrites tenant storefront category paths under /store', async () => {
    const { proxy } = await import('./proxy')

    const response = await proxy(createRequest('silk.talam4shop.com', '/category/sarees'))

    expect(rewritePath(response)).toBe('/store/category/sarees')
    expect(response.headers.get('x-tenant-tier')).toBe('starter')
  })

  it('keeps tenant admin paths on app admin routes with tenant headers', async () => {
    const { proxy } = await import('./proxy')

    const response = await proxy(createRequest('silk.talam4shop.com', '/admin/products'))

    expect(rewritePath(response)).toBeNull()
    expect(response.headers.get('x-tenant-id')).toBe('tenant-silk')
  })

  it('passes API routes through untouched on a tenant subdomain, not rewritten under /store', async () => {
    // Regression: there is no app/store/api tree, so an API path (e.g. a per-tenant
    // Shiprocket webhook) hit via the tenant's own subdomain 404ed until this was excluded
    // from tenant rewriting.
    const { proxy } = await import('./proxy')

    const response = await proxy(createRequest('silk.talam4shop.com', '/api/webhooks/delivery-status'))

    expect(rewritePath(response)).toBeNull()
    expect(getTenantBySlugMock).not.toHaveBeenCalled()
  })

  it('rewrites production admin host to super admin routes', async () => {
    const { proxy } = await import('./proxy')

    const response = await proxy(createRequest('admin.talam4shop.com', '/tenants'))

    expect(rewritePath(response)).toBe('/super-admin/tenants')
    expect(getTenantBySlugMock).not.toHaveBeenCalled()
  })

  it('rewrites local dev store aliases to storefront routes', async () => {
    const { proxy } = await import('./proxy')

    const response = await proxy(createRequest('localhost:3000', '/dev/store/silk/product/demo'))

    expect(rewritePath(response)).toBe('/store/product/demo')
    expect(response.headers.get('x-subdomain')).toBe('silk')
  })

  it('rewrites local dev tenant admin aliases to admin routes with tenant headers', async () => {
    const { proxy } = await import('./proxy')

    const response = await proxy(createRequest('localhost:3000', '/dev/store/silk/admin/orders'))

    expect(rewritePath(response)).toBe('/admin/orders')
    expect(response.headers.get('x-tenant-id')).toBe('tenant-silk')
  })
})
