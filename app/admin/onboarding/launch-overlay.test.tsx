import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { LaunchOverlay } from './launch-overlay'

describe('LaunchOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts on the first status line and advances every 700ms, stopping at the last', () => {
    render(<LaunchOverlay />)
    expect(screen.getByText('Packing your store…')).toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(700) })
    expect(screen.getByText('Clearing the launchpad…')).toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(700) })
    expect(screen.getByText('Liftoff! 🚀')).toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(700) })
    expect(screen.getByText('Liftoff! 🚀')).toBeInTheDocument()
  })
})
