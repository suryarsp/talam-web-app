import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AboutHero } from './about-hero'

describe('AboutHero monogram', () => {
  it('uses the soft/ink theme tokens instead of raw accent + opacity', () => {
    render(<AboutHero tenant={{ name: 'Meera Textiles', about: null }} />)
    const monogram = screen.getByText('M')
    expect(monogram.className).toContain('bg-store-primary-soft')
    expect(monogram.className).toContain('text-store-primary-ink')
    expect(monogram.className).not.toContain('bg-store-primary/10')
  })
})
