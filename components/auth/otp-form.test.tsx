import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OtpForm } from './otp-form'

const verifyOtpMock = vi.fn().mockResolvedValue({ data: {}, error: null })
const signInWithOtpMock = vi.fn().mockResolvedValue({ data: {}, error: null })

vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: vi.fn(() => ({
    auth: {
      signInWithOtp: signInWithOtpMock,
      verifyOtp: verifyOtpMock,
    },
  })),
}))

let mockSearchParams = new URLSearchParams()
vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}))

const fetchMock = vi.fn().mockResolvedValue({ ok: true })
vi.stubGlobal('fetch', fetchMock)

async function goToOtpStep(user: ReturnType<typeof userEvent.setup>) {
  render(<OtpForm />)
  await user.type(screen.getByLabelText(/mobile number/i), '9876543210')
  await user.click(screen.getByRole('button', { name: /continue/i }))
  await waitFor(() => {
    expect(screen.getByPlaceholderText(/6-digit otp/i)).toBeInTheDocument()
  })
}

async function goToEmailOtpStep(user: ReturnType<typeof userEvent.setup>, props?: { syncEndpoint?: string }) {
  render(<OtpForm {...props} />)
  await user.click(screen.getByRole('button', { name: /^email$/i }))
  await user.type(screen.getByLabelText(/email address/i), 'shopper@outlook.com')
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
    fetchMock.mockClear()
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

describe('OtpForm email method', () => {
  beforeEach(() => {
    signInWithOtpMock.mockClear()
    signInWithOtpMock.mockResolvedValue({ data: {}, error: null })
  })

  it('switches to the email tab and sends an email OTP for any address', async () => {
    const user = userEvent.setup()
    render(<OtpForm />)

    await user.click(screen.getByRole('button', { name: /^email$/i }))
    await user.type(screen.getByLabelText(/email address/i), 'shopper@outlook.com')
    await user.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(signInWithOtpMock).toHaveBeenCalledWith({ email: 'shopper@outlook.com' })
    })
  })

  it('rejects an invalid email address before sending', async () => {
    const user = userEvent.setup()
    render(<OtpForm />)

    await user.click(screen.getByRole('button', { name: /^email$/i }))
    await user.type(screen.getByLabelText(/email address/i), 'not-an-email')
    await user.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument()
    })
    expect(signInWithOtpMock).not.toHaveBeenCalled()
  })
})

describe('OtpForm email verify + sync', () => {
  const originalLocation = window.location

  beforeEach(() => {
    mockSearchParams = new URLSearchParams()
    signInWithOtpMock.mockResolvedValue({ data: {}, error: null })
    verifyOtpMock.mockResolvedValue({ data: {}, error: null })
    fetchMock.mockClear()
    Object.defineProperty(window, 'location', { value: { href: '' }, writable: true })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', { value: originalLocation, writable: true })
    vi.unstubAllEnvs()
  })

  it('verifies with type "email" and calls the sync endpoint before redirecting when enabled', async () => {
    vi.stubEnv('NEXT_PUBLIC_EMAIL_OTP_ENABLED', 'true')
    const user = userEvent.setup()
    await goToEmailOtpStep(user, { syncEndpoint: '/store/api/auth/sync' })

    await user.type(screen.getByPlaceholderText(/6-digit otp/i), '123456')
    await user.click(screen.getByRole('button', { name: /verify otp/i }))

    await waitFor(() => {
      expect(verifyOtpMock).toHaveBeenCalledWith({
        email: 'shopper@outlook.com',
        token: '123456',
        type: 'email',
      })
    })
    expect(fetchMock).toHaveBeenCalledWith('/store/api/auth/sync', { method: 'POST' })
    expect(window.location.href).toBe('/auth')
  })

  it('does not sync or navigate when the email-OTP flag is disabled', async () => {
    vi.stubEnv('NEXT_PUBLIC_EMAIL_OTP_ENABLED', 'false')
    const user = userEvent.setup()
    await goToEmailOtpStep(user)

    await user.type(screen.getByPlaceholderText(/6-digit otp/i), '123456')
    await user.click(screen.getByRole('button', { name: /verify otp/i }))

    await waitFor(() => {
      expect(verifyOtpMock).toHaveBeenCalled()
    })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(window.location.href).toBe('')
  })

  it('calls onVerified instead of navigating when provided (checkout inline flow)', async () => {
    vi.stubEnv('NEXT_PUBLIC_EMAIL_OTP_ENABLED', 'true')
    const onVerified = vi.fn()
    const user = userEvent.setup()
    render(<OtpForm onVerified={onVerified} syncEndpoint="/store/api/auth/sync" />)
    await user.click(screen.getByRole('button', { name: /^email$/i }))
    await user.type(screen.getByLabelText(/email address/i), 'shopper@outlook.com')
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => screen.getByPlaceholderText(/6-digit otp/i))

    await user.type(screen.getByPlaceholderText(/6-digit otp/i), '123456')
    await user.click(screen.getByRole('button', { name: /verify otp/i }))

    await waitFor(() => {
      expect(onVerified).toHaveBeenCalled()
    })
    expect(window.location.href).toBe('')
  })
})
