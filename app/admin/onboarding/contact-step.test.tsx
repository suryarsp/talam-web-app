import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { ContactStep } from './contact-step'
import type { OnboardingValues } from './onboarding-schema'

function Harness({ authProvider }: { authProvider?: string | null }) {
  const { control } = useForm<
    Pick<OnboardingValues, 'contactPhone' | 'contactEmail' | 'branchName' | 'branchState' | 'branchCity' | 'branchAddress'>
  >({
    defaultValues: {
      contactPhone: '9876543210',
      contactEmail: 'owner@store.com',
      branchName: 'Main branch',
      branchState: 'Maharashtra',
      branchCity: 'Mumbai',
      branchAddress: '123 Market Street, Bandra West, Mumbai',
    },
  })
  return <ContactStep control={control as never} authProvider={authProvider} />
}

describe('ContactStep email locking', () => {
  it('locks the email field for a Google sign-in', () => {
    render(<Harness authProvider="google" />)
    expect(screen.getByLabelText(/contact email/i)).toBeDisabled()
    expect(screen.getByText(/using your account email/i)).toBeInTheDocument()
  })

  it('locks the email field for an Azure (Microsoft) sign-in', () => {
    render(<Harness authProvider="azure" />)
    expect(screen.getByLabelText(/contact email/i)).toBeDisabled()
    expect(screen.getByText(/using your account email/i)).toBeInTheDocument()
  })

  it('leaves the email field editable for other/no provider', () => {
    render(<Harness authProvider={null} />)
    expect(screen.getByLabelText(/contact email/i)).not.toBeDisabled()
    expect(screen.getByText(/where customers and talam can reach you/i)).toBeInTheDocument()
  })
})
