import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { BrandStep } from './brand-step'
import { STORE_THEMES } from './onboarding-data'
import type { OnboardingValues } from './onboarding-schema'

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
})

function Harness({ existingLogoUrl }: { existingLogoUrl?: string | null }) {
  const { control } = useForm<Pick<OnboardingValues, 'brandLogo' | 'brandColor'>>({
    defaultValues: { brandLogo: undefined as unknown as File, brandColor: '#4F3FF0' },
  })
  return <BrandStep control={control as never} existingLogoUrl={existingLogoUrl} />
}

describe('BrandStep logo upload', () => {
  it('shows the upload prompt when there is no file or existing url', () => {
    render(<Harness />)
    expect(screen.getByText('Upload')).toBeInTheDocument()
  })

  it('shows the existing image when no new file is picked', () => {
    const { container } = render(<Harness existingLogoUrl="https://cdn.example.com/logo.png" />)
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://cdn.example.com/logo.png')
  })

  it('previews the file selected via the input', async () => {
    const user = userEvent.setup()
    const { container } = render(<Harness />)
    const file = new File(['x'], 'logo.png', { type: 'image/png' })
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, file)
    expect(container.querySelector('img')).toHaveAttribute('src', 'blob:mock-url')
  })
})

describe('BrandStep theme picker', () => {
  it('renders the 3 named storefront themes', () => {
    render(<Harness />)
    for (const theme of STORE_THEMES) {
      expect(screen.getByText(theme.name)).toBeInTheDocument()
    }
  })

  it('selects a theme color on click', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByText('Indigo'))
    expect(screen.getByText('#2C3E6B')).toBeInTheDocument()
  })
})
