import { describe, it, expect } from 'vitest'
import { contactInfoSchema } from './contact-info-schema'

const base = {
  ownerName: 'Priya',
  ownerTitle: 'Founder',
  contactPhone: '9876543210',
  contactEmail: 'owner@store.com',
  sameAsContact: true,
  whatsappNumber: '',
  showWhatsappButton: true,
  address: '123 Market St',
  city: 'Mumbai',
  hours: 'Mon-Sat: 10-7',
}

describe('contactInfoSchema', () => {
  it('accepts a valid payload', () => {
    expect(contactInfoSchema.safeParse(base).success).toBe(true)
  })

  it('rejects a missing contact phone', () => {
    expect(contactInfoSchema.safeParse({ ...base, contactPhone: '' }).success).toBe(false)
  })

  it('rejects an invalid contact email', () => {
    expect(contactInfoSchema.safeParse({ ...base, contactEmail: 'nope' }).success).toBe(false)
  })

  it('ignores an invalid whatsappNumber when sameAsContact is true', () => {
    const result = contactInfoSchema.safeParse({ ...base, sameAsContact: true, whatsappNumber: '123' })
    expect(result.success).toBe(true)
  })

  it('rejects an invalid whatsappNumber when sameAsContact is false', () => {
    const result = contactInfoSchema.safeParse({ ...base, sameAsContact: false, whatsappNumber: '123' })
    expect(result.success).toBe(false)
  })

  it('accepts a valid whatsappNumber when sameAsContact is false', () => {
    const result = contactInfoSchema.safeParse({ ...base, sameAsContact: false, whatsappNumber: '9123456789' })
    expect(result.success).toBe(true)
  })
})
