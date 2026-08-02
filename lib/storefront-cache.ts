import { unstable_cache } from 'next/cache'

// One tag per tenant covers every storefront-facing read (home, category/occasion/department
// listings, product detail, about). Admin mutations call revalidateTag(storefrontTag(tenantId))
// rather than tracking which page shows which field — simplest thing that invalidates correctly
// at this scale (single-digit admin edits/day vs many customer page views).
export function storefrontTag(tenantId: string): string {
  return `storefront:${tenantId}`
}

// Wraps a storefront data read in Next's data cache, tagged per-tenant and time-bounded as a
// fallback in case a revalidateTag call is ever missed. `keyParts` must fully identify the
// request (tenantId + any params that affect the query) since the wrapped fn takes no args.
export function cacheForTenant<T>(fn: () => Promise<T>, keyParts: string[], tenantId: string, revalidateSeconds: number): Promise<T> {
  return unstable_cache(fn, keyParts, { revalidate: revalidateSeconds, tags: [storefrontTag(tenantId)] })()
}
