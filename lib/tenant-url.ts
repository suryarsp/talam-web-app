const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'talam4shop.com'

export function getStoreUrl(slug: string, isLocalDev: boolean): string {
  return isLocalDev ? `/dev/store/${slug}` : `https://${slug}.${ROOT_DOMAIN}`
}

export function getAdminUrl(slug: string, isLocalDev: boolean): string {
  return isLocalDev ? `/dev/store/${slug}/admin/dashboard` : `https://${slug}.${ROOT_DOMAIN}/admin/dashboard`
}
