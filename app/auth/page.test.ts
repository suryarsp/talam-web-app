import { describe, expect, it } from 'vitest'
import { resolveSignedInDestination } from './page'

describe('resolveSignedInDestination', () => {
  it('sends a user with no tenant to onboarding', () => {
    expect(resolveSignedInDestination(null, false)).toBe('/admin/onboarding')
  })

  it('sends a user with an unfinished tenant to onboarding', () => {
    expect(resolveSignedInDestination({ slug: 'priya-boutique', isOnboarded: false }, false)).toBe('/admin/onboarding')
  })

  it('sends an onboarded user to their dev dashboard', () => {
    expect(resolveSignedInDestination({ slug: 'priya-boutique', isOnboarded: true }, true)).toBe(
      '/dev/store/priya-boutique/admin/dashboard'
    )
  })

  it('sends an onboarded user to their prod dashboard', () => {
    expect(resolveSignedInDestination({ slug: 'priya-boutique', isOnboarded: true }, false)).toBe(
      'https://priya-boutique.talam4shop.com/admin/dashboard'
    )
  })
})
