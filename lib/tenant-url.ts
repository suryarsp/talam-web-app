export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'talam4shop.com'

export function isLocalDevHost(host: string | null | undefined): boolean {
  if (!host) return false
  const hostname = host.split(':')[0]
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost') || hostname.endsWith('.local')
}

export function getStoreUrl(slug: string, isLocalDev: boolean): string {
  return isLocalDev ? `/dev/store/${slug}` : `https://${slug}.${ROOT_DOMAIN}`
}

export function getAdminUrl(slug: string, isLocalDev: boolean): string {
  return isLocalDev ? `/dev/store/${slug}/admin/dashboard` : `https://${slug}.${ROOT_DOMAIN}/admin/dashboard`
}

// No isLocalDev param unlike its siblings above — this is called from contexts with no
// request/host to read (e.g. the onboarding-reminders cron route), so NODE_ENV decides instead.
export function getOnboardingUrl(): string {
  return process.env.NODE_ENV === 'production' ? `https://${ROOT_DOMAIN}/admin/onboarding` : 'http://localhost:3000/admin/onboarding'
}
