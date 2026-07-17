import { describe, expect, it } from 'vitest'
import { getAdminUrl, getStoreUrl } from './tenant-url'

describe('getStoreUrl', () => {
  it('returns the dev proxy path in local dev', () => {
    expect(getStoreUrl('priya-boutique', true)).toBe('/dev/store/priya-boutique')
  })

  it('returns the subdomain URL in prod', () => {
    expect(getStoreUrl('priya-boutique', false)).toBe('https://priya-boutique.talam4shop.com')
  })
})

describe('getAdminUrl', () => {
  it('returns the dev proxy admin path in local dev', () => {
    expect(getAdminUrl('priya-boutique', true)).toBe('/dev/store/priya-boutique/admin/dashboard')
  })

  it('returns the subdomain admin URL in prod', () => {
    expect(getAdminUrl('priya-boutique', false)).toBe('https://priya-boutique.talam4shop.com/admin/dashboard')
  })
})
