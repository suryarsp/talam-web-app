import { describe, expect, it } from 'vitest'
import { EMAIL_BRAND, escapeHtml } from './email-templates'

describe('EMAIL_BRAND', () => {
  it('matches the live theme brand color from app/globals.css', () => {
    expect(EMAIL_BRAND.primary).toBe('#C1502E')
  })

  it('has a fixed mailer contact address', () => {
    expect(EMAIL_BRAND.contactEmail).toBe('hello@mailer.talam4shop.com')
  })
})

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;')
  })

  it('escapes ampersands and single quotes', () => {
    expect(escapeHtml("Tom & Jerry's Shop")).toBe('Tom &amp; Jerry&#39;s Shop')
  })

  it('leaves plain text unchanged', () => {
    expect(escapeHtml('Priya Boutique')).toBe('Priya Boutique')
  })
})
