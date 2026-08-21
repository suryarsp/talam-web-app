import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MicrosoftButton } from './microsoft-button'

const signInWithOAuthMock = vi.fn().mockResolvedValue({ data: {}, error: null })

vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: vi.fn(() => ({
    auth: {
      signInWithOAuth: signInWithOAuthMock,
    },
  })),
}))

describe('MicrosoftButton', () => {
  it('renders the Microsoft sign-in label', () => {
    render(<MicrosoftButton />)
    expect(screen.getByRole('button', { name: /continue with microsoft/i })).toBeInTheDocument()
  })

  it('calls signInWithOAuth with the azure provider and default redirect path', async () => {
    const user = userEvent.setup()
    render(<MicrosoftButton />)

    await user.click(screen.getByRole('button', { name: /continue with microsoft/i }))

    expect(signInWithOAuthMock).toHaveBeenCalledWith({
      provider: 'azure',
      options: { redirectTo: expect.stringContaining('/auth/callback') },
    })
  })

  it('appends next to the redirect target when provided', async () => {
    const user = userEvent.setup()
    render(<MicrosoftButton redirectPath="/store/auth/callback" next="/admin/onboarding" />)

    await user.click(screen.getByRole('button', { name: /continue with microsoft/i }))

    const call = signInWithOAuthMock.mock.calls.at(-1)?.[0]
    const redirectTo = new URL(call.options.redirectTo)
    expect(redirectTo.pathname).toBe('/store/auth/callback')
    expect(redirectTo.searchParams.get('next')).toBe('/admin/onboarding')
  })

  it('shows a loading state while redirecting', async () => {
    const user = userEvent.setup()
    signInWithOAuthMock.mockImplementationOnce(() => new Promise(() => {}))
    render(<MicrosoftButton />)

    await user.click(screen.getByRole('button', { name: /continue with microsoft/i }))

    expect(await screen.findByRole('button', { name: /redirecting/i })).toBeDisabled()
  })
})
