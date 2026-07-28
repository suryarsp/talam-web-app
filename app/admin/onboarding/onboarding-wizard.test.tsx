import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OnboardingWizard } from './onboarding-wizard'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const saveStoreStep = vi.fn(async (..._args: unknown[]) => ({}) as { error?: string })
const saveBrandStep = vi.fn(async (..._args: unknown[]) => ({}) as { error?: string; logoUrl?: string })
const saveContactStep = vi.fn(async (..._args: unknown[]) => ({}) as { error?: string })
const saveStoryStep = vi.fn(async (..._args: unknown[]) => ({}) as { error?: string })
const saveProductStep = vi.fn(async (..._args: unknown[]) => ({}) as { error?: string; photoUrl?: string })
const savePaymentStep = vi.fn(async (..._args: unknown[]) => ({}) as { error?: string })
const completeOnboarding = vi.fn(async (..._args: unknown[]) => ({ adminUrl: '/admin/dashboard' }) as { error?: string; adminUrl?: string })
const checkSlugAvailability = vi.fn(async (..._args: unknown[]) => ({ available: true }))
const getOnboardingCategories = vi.fn(async (..._args: unknown[]) => [] as { id: string; name: string }[])

vi.mock('./actions', () => ({
  saveStoreStep: (...args: unknown[]) => saveStoreStep(...args),
  saveBrandStep: (...args: unknown[]) => saveBrandStep(...args),
  saveContactStep: (...args: unknown[]) => saveContactStep(...args),
  saveStoryStep: (...args: unknown[]) => saveStoryStep(...args),
  saveProductStep: (...args: unknown[]) => saveProductStep(...args),
  savePaymentStep: (...args: unknown[]) => savePaymentStep(...args),
  completeOnboarding: (...args: unknown[]) => completeOnboarding(...args),
  checkSlugAvailability: (...args: unknown[]) => checkSlugAvailability(...args),
  getOnboardingCategories: (...args: unknown[]) => getOnboardingCategories(...args),
}))

// Every field defaults to an already-valid value so each step can advance with a
// single click on Next, isolating the wizard's navigation/save-per-step logic
// from the individual step forms' own field-level tests.
const initialTenant = {
  name: "Priya's Boutique",
  slug: 'priya-s-boutique',
  storeType: 'Clothing',
  brandColor: '#4F3FF0',
  logoUrl: 'https://cdn.example.com/logo.png',
  contactPhone: '9876543210',
  contactEmail: 'owner@store.com',
  tagline: 'Handmade with love',
  paymentProvider: 'upi_manual',
  onboardingStep: 0,
  about: { description: 'We make beautiful things.' },
}

const initialBranch = { name: 'Main Store', address: '123 Market Street, Mumbai', city: 'Mumbai' }
const initialProduct = { name: 'Silk Saree', price: 1999, stockBySize: { M: 5 }, images: ['https://cdn.example.com/product.png'] }

function renderWizard() {
  return render(
    <OnboardingWizard initialTenant={initialTenant} initialBranch={initialBranch} initialProduct={initialProduct} />
  )
}

// Both the desktop and mobile footers render their own Next/Finish button; only one is visible per breakpoint.
// The button also goes through a brief disabled "Saving…" state while the step's
// server action is in flight, so wait for it to re-enable before clicking again.
async function clickWhenReady(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  await waitFor(() => expect(screen.getAllByRole('button', { name })[0]).not.toBeDisabled())
  await user.click(screen.getAllByRole('button', { name })[0])
}
const clickNext = (user: ReturnType<typeof userEvent.setup>) => clickWhenReady(user, /next/i)
const clickFinish = (user: ReturnType<typeof userEvent.setup>) => clickWhenReady(user, /finish/i)

describe('OnboardingWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    checkSlugAvailability.mockResolvedValue({ available: true })
    getOnboardingCategories.mockResolvedValue([])
    completeOnboarding.mockResolvedValue({ adminUrl: '/admin/dashboard' })
    ;[saveStoreStep, saveBrandStep, saveContactStep, saveStoryStep, saveProductStep, savePaymentStep].forEach((fn) =>
      fn.mockResolvedValue({})
    )
  })

  it('starts on the store step', () => {
    renderWizard()
    expect(screen.getByRole('heading', { name: /Name your store/ })).toBeInTheDocument()
  })

  it('walks through every step, saving each one, then completes onboarding', async () => {
    const user = userEvent.setup()
    renderWizard()

    await clickNext(user)
    await waitFor(() => expect(saveStoreStep).toHaveBeenCalledWith(
      expect.objectContaining({ storeName: "Priya's Boutique", category: 'Clothing' })
    ))
    await screen.findByRole('heading', { name: 'Brand your store' })

    await clickNext(user)
    await waitFor(() => expect(saveBrandStep).toHaveBeenCalled())
    await screen.findByRole('heading', { name: 'Contact & address' })

    await clickNext(user)
    await waitFor(() => expect(saveContactStep).toHaveBeenCalledWith(
      expect.objectContaining({ contactPhone: '9876543210', contactEmail: 'owner@store.com' })
    ))
    await screen.findByRole('heading', { name: 'Your story' })

    await clickNext(user)
    await waitFor(() => expect(saveStoryStep).toHaveBeenCalled())
    await screen.findByRole('heading', { name: 'Add your first product' })

    await clickNext(user)
    await waitFor(() => expect(saveProductStep).toHaveBeenCalled())
    await screen.findByRole('heading', { name: 'Connect payments' })

    await clickFinish(user)
    await waitFor(() => expect(savePaymentStep).toHaveBeenCalledWith({ paymentId: 'upi' }))
    // completeOnboarding is deliberately held behind a 1.2s "launching" delay in the wizard.
    await waitFor(() => expect(completeOnboarding).toHaveBeenCalled(), { timeout: 3000 })
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/dashboard'), { timeout: 3000 })
  })

  it('blocks navigation and surfaces the error when a step save fails', async () => {
    saveStoreStep.mockResolvedValueOnce({ error: 'That name is already used.' })
    const user = userEvent.setup()
    renderWizard()

    await clickNext(user)

    await waitFor(() => expect(screen.getAllByText('That name is already used.').length).toBeGreaterThan(0))
    expect(screen.getByRole('heading', { name: /Name your store/ })).toBeInTheDocument()
  })

  it('surfaces the completion error and does not navigate away', async () => {
    completeOnboarding.mockResolvedValueOnce({ error: 'Something broke.' })
    const user = userEvent.setup()
    renderWizard()

    const stepHeadings = ['Brand your store', 'Contact & address', 'Your story', 'Add your first product', 'Connect payments']
    for (const heading of stepHeadings) {
      await clickNext(user)
      await screen.findByRole('heading', { name: heading })
    }
    await clickFinish(user)

    await waitFor(() => expect(screen.getByText('Something broke.')).toBeInTheDocument(), { timeout: 3000 })
    expect(push).not.toHaveBeenCalled()
  })
})
