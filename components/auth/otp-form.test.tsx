import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OtpForm } from './otp-form'

vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: vi.fn(() => ({
    auth: {
      signInWithOtp: vi.fn().mockResolvedValue({ data: {}, error: null }),
      verifyOtp: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  })),
}))

describe('OtpForm', () => {
  it('renders phone input in initial state', () => {
    render(<OtpForm />)
    expect(screen.getByLabelText(/mobile number/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument()
  })

  it('shows OTP input after phone submission', async () => {
    const user = userEvent.setup()
    render(<OtpForm />)

    await user.type(screen.getByLabelText(/mobile number/i), '9876543210')
    await user.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/6-digit otp/i)).toBeInTheDocument()
    })
  })

  it('displays error when phone is invalid', async () => {
    const user = userEvent.setup()
    render(<OtpForm />)

    await user.type(screen.getByLabelText(/mobile number/i), '123')
    await user.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(screen.getByText(/valid 10-digit/i)).toBeInTheDocument()
    })
  })
})
