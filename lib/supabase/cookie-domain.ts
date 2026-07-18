const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'talam4shop.com'

// ponytail: shares the auth cookie across tenant subdomains (e.g. surya-silks.talam4shop.com) and
// the root domain. Skipped in dev since localhost has no shared parent domain to scope to.
export function cookieDomain(): string | undefined {
  return process.env.NODE_ENV === 'production' ? `.${ROOT_DOMAIN}` : undefined
}
