import { describe, it, expect } from 'vitest'
import { onboardingSchema } from './onboarding-schema'

const validBase = {
  storeName: "Priya's Boutique",
  category: 'Clothing',
  customCategory: '',
  brandColor: '#4F3FF0',
  contactPhone: '9876543210',
  contactEmail: 'owner@store.com',
  branchName: 'Main Store',
  branchAddress: '123 Market Street, Mumbai',
  branchCity: 'Mumbai',
  tagline: 'Handmade with love',
  aboutDescription: 'We make beautiful things.',
  productName: 'Silk Saree',
  productPrice: '1999',
  productStock: '5',
  categoryId: '',
  paymentId: 'upi' as const,
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
    const result = onboardingSchema.safeParse({ ...validBase, category: 'Other', customCategory: '' })
    expect(result.success).toBe(false)
  })

  it('accepts Other category with a customCategory provided', () => {
    const result = onboardingSchema.safeParse({ ...validBase, category: 'Other', customCategory: 'Jewelry' })
    expect(result.success).toBe(true)
  })

  it('rejects a zero or negative product price', () => {
    expect(onboardingSchema.safeParse({ ...validBase, productPrice: '0' }).success).toBe(false)
    expect(onboardingSchema.safeParse({ ...validBase, productPrice: '-5' }).success).toBe(false)
  })

  it('rejects a negative product stock but accepts zero', () => {
    expect(onboardingSchema.safeParse({ ...validBase, productStock: '-1' }).success).toBe(false)
    expect(onboardingSchema.safeParse({ ...validBase, productStock: '0' }).success).toBe(true)
  })

  it('rejects a short branch address', () => {
    const result = onboardingSchema.safeParse({ ...validBase, branchAddress: 'abc' })
    expect(result.success).toBe(false)
  })
})
