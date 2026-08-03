import { describe, expect, it } from 'vitest'
import { formatCurrency, formatDate } from './utils'

describe('formatCurrency', () => {
  it('formats whole rupees with en-IN grouping and no decimals', () => {
    expect(formatCurrency(1850)).toBe('₹1,850')
  })
  it('formats large amounts with Indian digit grouping', () => {
    expect(formatCurrency(125000)).toBe('₹1,25,000')
  })
  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('₹0')
  })
})

describe('formatDate', () => {
  it('formats a date as "21 Jul 2026"', () => {
    expect(formatDate(new Date('2026-07-21T00:00:00+05:30'))).toBe('21 Jul 2026')
  })
})
