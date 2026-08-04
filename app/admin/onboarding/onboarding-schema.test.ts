import { describe, it, expect } from 'vitest'
import { onboardingSchema } from './onboarding-schema'

const validBase = {
  storeName: "Priya's Boutique",
  categories: ['Sarees'],
  customCategory: '',
  brandColor: '#4F3FF0',
  contactPhone: '9876543210',
  contactEmail: 'owner@store.com',
  branchName: 'Main Store',
  branchAddress: '123 Market Street, Bandra West, Mumbai, Maharashtra',
  branchState: 'Maharashtra',
  branchCity: 'Mumbai',
  tagline: 'Handmade with love, crafted for every occasion',
  aboutDescription: 'We make beautiful things by hand, with care and tradition.',
  subscriptionTier: 'starter' as const,
  paymentIds: ['upi'] as const,
  upiAddress: 'owner@upi',
}

describe('onboardingSchema', () => {
  it('accepts a fully valid payload', () => {
    const result = onboardingSchema.safeParse(validBase)
    expect(result.success).toBe(true)
  })

  it('rejects an invalid phone number', () => {
    const result = onboardingSchema.safeParse({ ...validBase, contactPhone: '12345' })
    expect(result.success).toBe(false)
  })

  it('rejects a phone number not starting 6-9', () => {
    const result = onboardingSchema.safeParse({ ...validBase, contactPhone: '5876543210' })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid email', () => {
    const result = onboardingSchema.safeParse({ ...validBase, contactEmail: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('requires customCategory when category is Other', () => {
    const result = onboardingSchema.safeParse({ ...validBase, categories: ['Other'], customCategory: '' })
    expect(result.success).toBe(false)
  })

  it('accepts Other category with a customCategory provided', () => {
    const result = onboardingSchema.safeParse({ ...validBase, categories: ['Other'], customCategory: 'Jewelry' })
    expect(result.success).toBe(true)
  })

  it('rejects an empty categories selection', () => {
    const result = onboardingSchema.safeParse({ ...validBase, categories: [] })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid UPI address', () => {
    const result = onboardingSchema.safeParse({ ...validBase, upiAddress: 'not-a-upi-address' })
    expect(result.success).toBe(false)
  })

  it('rejects a missing UPI address', () => {
    const result = onboardingSchema.safeParse({ ...validBase, upiAddress: '' })
    expect(result.success).toBe(false)
  })

  it('rejects a short branch address', () => {
    const result = onboardingSchema.safeParse({ ...validBase, branchAddress: 'abc' })
    expect(result.success).toBe(false)
  })
})
