import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderHook } from '@testing-library/react'
import { isValidIndianMobile, isValidUpiId, Toggle, useSavedFlash } from './settings-shared'

describe('isValidIndianMobile', () => {
  it.each(['9876543210', '6000000000', '  9876543210  '])('accepts %s', (v) => {
    expect(isValidIndianMobile(v)).toBe(true)
  })

  it.each(['5876543210', '987654321', '98765432100', 'abcdefghij', ''])('rejects %s', (v) => {
    expect(isValidIndianMobile(v)).toBe(false)
  })
})

describe('isValidUpiId', () => {
  it.each(['owner@upi', 'priya.shop@okhdfcbank'])('accepts %s', (v) => {
    expect(isValidUpiId(v)).toBe(true)
  })

  it.each(['not-a-upi-id', '@okhdfcbank', 'owner@', ''])('rejects %s', (v) => {
    expect(isValidUpiId(v)).toBe(false)
  })
})

describe('Toggle', () => {
  it('calls onChange with the flipped value', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Toggle checked={false} onChange={onChange} />)
    await user.click(screen.getByRole('button'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('does not respond when disabled', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Toggle checked={false} onChange={onChange} disabled />)
    await user.click(screen.getByRole('button'))
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('useSavedFlash', () => {
  it('flips to true then back to false after 1500ms', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useSavedFlash())
    expect(result.current[0]).toBe(false)

    act(() => { result.current[1]() })
    expect(result.current[0]).toBe(true)

    act(() => { vi.advanceTimersByTime(1500) })
    expect(result.current[0]).toBe(false)
    vi.useRealTimers()
  })
})
