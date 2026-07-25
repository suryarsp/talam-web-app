import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OtpForm } from './otp-form'

const verifyOtpMock = vi.fn().mockResolvedValue({ data: {}, error: null })

vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: vi.fn(() => ({
    auth: {
      signInWithOtp: vi.fn().mockResolvedValue({ data: {}, error: null }),
      verifyOtp: verifyOtpMock,
    },
  })),
}))

let mockSearchParams = new URLSearchParams()
vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}))

async function goToOtpStep(user: ReturnType<typeof userEvent.setup>) {
  render(<OtpForm />)
  await user.type(screen.getByLabelText(/mobile number/i), '9876543210')
  await user.click(screen.getByRole('button', { name: /continue/i }))
  await waitFor(() => {
    expect(screen.getByPlaceholderText(/6-digit otp/i)).toBeInTheDocument()
  })
}

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

describe('OtpForm redirect after verify', () => {
  const originalLocation = window.location

  beforeEach(() => {
    mockSearchParams = new URLSearchParams()
    verifyOtpMock.mockResolvedValue({ data: {}, error: null })
    Object.defineProperty(window, 'location', { value: { href: '' }, writable: true })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', { value: originalLocation, writable: true })
    vi.unstubAllEnvs()
  })

  it('navigates to the next param when the flag is enabled', async () => {
    vi.stubEnv('NEXT_PUBLIC_OTP_SIGNIN_ENABLED', 'true')
    mockSearchParams = new URLSearchParams({ next: '/admin/onboarding' })
    const user = userEvent.setup()
    await goToOtpStep(user)

    await user.type(screen.getByPlaceholderText(/6-digit otp/i), '123456')
    await user.click(screen.getByRole('button', { name: /verify otp/i }))

    await waitFor(() => {
      expect(window.location.href).toBe('/admin/onboarding')
    })
  })

  it('falls back to /auth when the flag is enabled but there is no next param', async () => {
    vi.stubEnv('NEXT_PUBLIC_OTP_SIGNIN_ENABLED', 'true')
    const user = userEvent.setup()
    await goToOtpStep(user)

    await user.type(screen.getByPlaceholderText(/6-digit otp/i), '123456')
    await user.click(screen.getByRole('button', { name: /verify otp/i }))

    await waitFor(() => {
      expect(window.location.href).toBe('/auth')
    })
  })

  it('does not navigate when the flag is disabled', async () => {
    vi.stubEnv('NEXT_PUBLIC_OTP_SIGNIN_ENABLED', 'false')
    mockSearchParams = new URLSearchParams({ next: '/admin/onboarding' })
    const user = userEvent.setup()
    await goToOtpStep(user)

    await user.type(screen.getByPlaceholderText(/6-digit otp/i), '123456')
    await user.click(screen.getByRole('button', { name: /verify otp/i }))

    await waitFor(() => {
      expect(verifyOtpMock).toHaveBeenCalled()
    })
    expect(window.location.href).toBe('')
  })

  it('does not navigate when verifyOtp returns an error, regardless of the flag', async () => {
    vi.stubEnv('NEXT_PUBLIC_OTP_SIGNIN_ENABLED', 'true')
    verifyOtpMock.mockResolvedValueOnce({ data: {}, error: { message: 'Invalid OTP' } })
    const user = userEvent.setup()
    await goToOtpStep(user)

    await user.type(screen.getByPlaceholderText(/6-digit otp/i), '999999')
    await user.click(screen.getByRole('button', { name: /verify otp/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid otp/i)).toBeInTheDocument()
    })
    expect(window.location.href).toBe('')
  })
})
