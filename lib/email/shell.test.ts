import { describe, expect, it } from 'vitest'
import { EMAIL_BRAND, escapeHtml, renderEmailBody, renderEmailShell } from './shell'

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

describe('renderEmailBody', () => {
  it('includes the greeting, heading, and paragraphs when provided', () => {
    const html = renderEmailBody({
      greeting: 'Hi there,',
      heading: "You're in! 3 minutes to a live store",
      paragraphs: ['Thanks for signing up for Talam.'],
      ctas: [{ label: 'Finish setup →', href: 'https://talam4shop.com/admin/onboarding' }],
      signature: 'See you on the other side,<br/>The Talam Team',
    })
    expect(html).toContain('Hi there,')
    expect(html).toContain("You're in! 3 minutes to a live store")
    expect(html).toContain('Thanks for signing up for Talam.')
    expect(html).toContain('See you on the other side,<br/>The Talam Team')
  })

  it('renders every CTA as a link to its href with its label', () => {
    const html = renderEmailBody({
      paragraphs: ['Congrats!'],
      ctas: [
        { label: 'View your store', href: 'https://priya-boutique.talam4shop.com' },
        { label: 'Go to admin', href: 'https://priya-boutique.talam4shop.com/admin/dashboard' },
      ],
    })
    expect(html).toContain('href="https://priya-boutique.talam4shop.com"')
    expect(html).toContain('View your store')
    expect(html).toContain('href="https://priya-boutique.talam4shop.com/admin/dashboard"')
    expect(html).toContain('Go to admin')
  })

  it('renders list items as an ordered list when provided', () => {
    const html = renderEmailBody({
      paragraphs: ['Here is what to do next:'],
      list: ['Share your store link', 'Add a few more products'],
      ctas: [{ label: 'View your store', href: 'https://x' }],
    })
    expect(html).toContain('<ol')
    expect(html).toContain('Share your store link')
    expect(html).toContain('Add a few more products')
  })

  it('omits greeting, heading, list, and signature markup when not provided', () => {
    const html = renderEmailBody({
      paragraphs: ['You started setting up your Talam store but haven’t finished yet.'],
      ctas: [{ label: 'Resume setup', href: 'https://x' }],
    })
    expect(html).not.toContain('<ol')
  })

  it('appends extraHtml after the rest of the content when provided', () => {
    const html = renderEmailBody({
      paragraphs: ['Body copy.'],
      ctas: [{ label: 'Go', href: 'https://x' }],
      extraHtml: '<p data-testid="extra">Extra block</p>',
    })
    expect(html.indexOf('data-testid="extra"')).toBeGreaterThan(html.indexOf('Body copy.'))
  })
})

describe('renderEmailShell', () => {
  it('wraps the given bodyHtml unmodified', () => {
    const html = renderEmailShell('<p data-testid="marker">unique body content</p>')
    expect(html).toContain('<p data-testid="marker">unique body content</p>')
  })

  it('includes the footer copyright and fixed contact address', () => {
    const html = renderEmailShell('<p>body</p>')
    expect(html).toContain('All rights reserved')
    expect(html).toContain(EMAIL_BRAND.contactEmail)
    expect(html).toContain(EMAIL_BRAND.address)
  })

  it('includes the talam4shop wordmark in both header and footer', () => {
    const html = renderEmailShell('<p>body</p>')
    expect(html.match(/talam4shop/g)?.length).toBeGreaterThanOrEqual(2)
  })

  it('is a full HTML document', () => {
    const html = renderEmailShell('<p>body</p>')
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<html')
    expect(html).toContain('</html>')
  })
})
