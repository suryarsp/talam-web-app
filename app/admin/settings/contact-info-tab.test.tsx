import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContactInfoTab } from './contact-info-tab'

const getContactSettingsAction = vi.fn()
const updateContactSettingsAction = vi.fn().mockResolvedValue(undefined)

vi.mock('./actions', () => ({
  getContactSettingsAction: (...args: unknown[]) => getContactSettingsAction(...args),
  updateContactSettingsAction: (...args: unknown[]) => updateContactSettingsAction(...args),
  addGalleryPhotoAction: vi.fn(),
  removeGalleryPhotoAction: vi.fn(),
}))

const baseData = {
  contactPhone: '9876543210',
  contactEmail: 'owner@store.com',
  address: '123 Market St',
  city: 'Mumbai',
  ownerName: 'Priya',
  ownerTitle: 'Founder',
  whatsappNumber: '9123456789',
  showWhatsappButton: true,
  hours: 'Mon-Sat: 10-7',
  galleryUrls: [] as string[],
}

describe('ContactInfoTab', () => {
  beforeEach(() => {
    getContactSettingsAction.mockReset().mockResolvedValue(baseData)
    updateContactSettingsAction.mockClear()
  })

  it('loads and displays existing contact details', async () => {
    render(<ContactInfoTab />)
    expect(await screen.findByDisplayValue('owner@store.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('9876543210')).toBeInTheDocument()
  })

  it('shows required-field errors when phone and email are cleared', async () => {
    const user = userEvent.setup()
    render(<ContactInfoTab />)
    await screen.findByDisplayValue('owner@store.com')

    await user.clear(screen.getByLabelText(/^contact phone/i))
    await user.clear(screen.getByLabelText(/^contact email/i))
    await user.click(screen.getByRole('button', { name: /save contact info/i }))

    await waitFor(() => {
      expect(screen.getByText(/contact phone is required/i)).toBeInTheDocument()
      expect(screen.getByText(/contact email is required/i)).toBeInTheDocument()
    })
    expect(updateContactSettingsAction).not.toHaveBeenCalled()
  })

  it('submits valid changes', async () => {
    const user = userEvent.setup()
    render(<ContactInfoTab />)
    await screen.findByDisplayValue('owner@store.com')

    await user.click(screen.getByRole('button', { name: /save contact info/i }))

    await waitFor(() => {
      expect(updateContactSettingsAction).toHaveBeenCalledWith(
        expect.objectContaining({ contactPhone: '9876543210', contactEmail: 'owner@store.com' })
      )
    })
  })
})
