import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StepIndicator } from './step-indicator'

describe('StepIndicator', () => {
  it('marks all steps as done when current is 4 (order confirmed)', () => {
    render(<StepIndicator current={4} />)
    const details = screen.getByText('Details').previousElementSibling?.querySelector('div:nth-child(2)')
    const address = screen.getByText('Address').previousElementSibling?.querySelector('div:nth-child(2)')
    const payment = screen.getByText('Payment').previousElementSibling?.querySelector('div:nth-child(2)')

    for (const circle of [details, address, payment]) {
      expect(circle?.className).toContain('bg-store-primary')
      expect(circle?.querySelector('svg')).toBeTruthy()
    }
  })

  it('marks the current step as active (not done) mid-checkout', () => {
    render(<StepIndicator current={2} />)
    const details = screen.getByText('Details').previousElementSibling?.querySelector('div:nth-child(2)')
    const address = screen.getByText('Address').previousElementSibling?.querySelector('div:nth-child(2)')
    const payment = screen.getByText('Payment').previousElementSibling?.querySelector('div:nth-child(2)')

    expect(details?.className).toContain('bg-store-primary')
    expect(details?.querySelector('svg')).toBeTruthy()

    expect(address?.className).not.toContain('bg-store-primary')
    expect(address?.className).toContain('text-store-primary')
    expect(address?.querySelector('svg')).toBeFalsy()
    expect(address?.textContent).toBe('2')

    expect(payment?.className).toContain('border-border')
    expect(payment?.querySelector('svg')).toBeFalsy()
  })
})
