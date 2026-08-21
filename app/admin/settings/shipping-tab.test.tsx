import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mockGet, mockConnect, mockDisconnect, mockRequestAssist } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockConnect: vi.fn(),
  mockDisconnect: vi.fn(),
  mockRequestAssist: vi.fn(),
}))

vi.mock('./actions', () => ({
  getShippingSettingsAction: mockGet,
  connectShippingAction: mockConnect,
  disconnectShippingAction: mockDisconnect,
  requestShippingAssistAction: mockRequestAssist,
}))

import { ShippingTab } from './shipping-tab'
import { DEFAULT_SHIPPING_CONFIG } from '@/lib/shipping/shipping-config'

function settings(overrides: Record<string, unknown> = {}, webhookToken: string | null = null) {
  return { config: { ...DEFAULT_SHIPPING_CONFIG, ...overrides }, webhookToken }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGet.mockResolvedValue(settings())
  mockConnect.mockResolvedValue({})
  mockDisconnect.mockResolvedValue({})
  mockRequestAssist.mockResolvedValue({})
})

describe('ShippingTab — not yet connected', () => {
  it('offers both the self-serve form and the assisted option', async () => {
    render(<ShippingTab />)

    expect(await screen.findByLabelText(/api user email/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /connect shiprocket/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /let talam set this up/i })).toBeInTheDocument()
  })

  it('submits the entered credentials', async () => {
    const user = userEvent.setup()
    render(<ShippingTab />)

    await user.type(await screen.findByLabelText(/api user email/i), 'shop@example.com')
    await user.type(screen.getByLabelText(/api user password/i), 'pw')
    await user.type(screen.getByLabelText(/pickup location/i), 'Main Store')
    await user.click(screen.getByRole('button', { name: /connect shiprocket/i }))

    await waitFor(() =>
      expect(mockConnect).toHaveBeenCalledWith('shop@example.com', 'pw', 'Main Store')
    )
  })

  it('validates before calling the server', async () => {
    const user = userEvent.setup()
    render(<ShippingTab />)

    await user.click(await screen.findByRole('button', { name: /connect shiprocket/i }))

    expect(await screen.findByText(/enter the api user email/i)).toBeInTheDocument()
    expect(mockConnect).not.toHaveBeenCalled()
  })

  it('shows the server error when Shiprocket rejects the credentials', async () => {
    const user = userEvent.setup()
    mockConnect.mockResolvedValue({ error: 'Could not verify that Shiprocket login — try again.' })
    render(<ShippingTab />)

    await user.type(await screen.findByLabelText(/api user email/i), 'shop@example.com')
    await user.type(screen.getByLabelText(/api user password/i), 'wrong')
    await user.type(screen.getByLabelText(/pickup location/i), 'Main Store')
    await user.click(screen.getByRole('button', { name: /connect shiprocket/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not verify/i)
  })

  it('prefills the pickup location kept from a previous connection', async () => {
    mockGet.mockResolvedValue(settings({ pickupLocation: 'Main Store' }))
    render(<ShippingTab />)

    expect(await screen.findByLabelText(/pickup location/i)).toHaveValue('Main Store')
  })

  it('warns the shop to reconnect when their stored credentials went stale', async () => {
    mockGet.mockResolvedValue(settings({ lastError: 'Shiprocket login failed (403)' }))
    render(<ShippingTab />)

    expect(await screen.findByRole('alert')).toHaveTextContent(/reconnect/i)
  })

  it('requests assisted setup', async () => {
    const user = userEvent.setup()
    render(<ShippingTab />)

    await user.click(await screen.findByRole('button', { name: /let talam set this up/i }))

    await waitFor(() => expect(mockRequestAssist).toHaveBeenCalled())
  })
})

describe('ShippingTab — awaiting Talam support', () => {
  beforeEach(() => {
    mockGet.mockResolvedValue(settings({ mode: 'assist_requested' }))
  })

  it('confirms the request instead of showing the form again', async () => {
    render(<ShippingTab />)

    expect(await screen.findByText(/talam is on it/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/api user email/i)).not.toBeInTheDocument()
  })

  it('still lets the shop switch to doing it themselves', async () => {
    const user = userEvent.setup()
    render(<ShippingTab />)

    await user.click(await screen.findByRole('button', { name: /do it myself/i }))

    expect(await screen.findByLabelText(/api user email/i)).toBeInTheDocument()
  })

  it('shows the same panel once staff have picked the request up', async () => {
    mockGet.mockResolvedValue(settings({ mode: 'assist_in_progress' }))
    render(<ShippingTab />)

    expect(await screen.findByText(/talam is on it/i)).toBeInTheDocument()
  })
})

describe('ShippingTab — connected', () => {
  const connected = () =>
    settings(
      {
        mode: 'connected',
        pickupLocation: 'Main Store',
        connectedAt: '2026-08-21T10:00:00.000Z',
        connectedBy: 'self',
      },
      'whtok_abc123'
    )

  beforeEach(() => {
    mockGet.mockResolvedValue(connected())
  })

  it('confirms the account is connected and names the pickup location', async () => {
    render(<ShippingTab />)

    expect(await screen.findByText('Connected')).toBeInTheDocument()
    expect(screen.getByText('Main Store')).toBeInTheDocument()
    expect(screen.queryByLabelText(/api user password/i)).not.toBeInTheDocument()
  })

  it("shows the shop's own webhook token so they can finish setup unassisted", async () => {
    render(<ShippingTab />)

    expect(await screen.findByText('whtok_abc123')).toBeInTheDocument()
  })

  it('credits Talam support when staff connected it on the shop’s behalf', async () => {
    mockGet.mockResolvedValue(settings({ ...connected().config, connectedBy: 'staff' }, 'whtok_abc123'))
    render(<ShippingTab />)

    expect(await screen.findByText(/by talam support/i)).toBeInTheDocument()
  })

  it('requires a confirmation step before disconnecting', async () => {
    const user = userEvent.setup()
    render(<ShippingTab />)

    await user.click(await screen.findByRole('button', { name: /disconnect shiprocket/i }))
    expect(mockDisconnect).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /yes, disconnect/i }))
    await waitFor(() => expect(mockDisconnect).toHaveBeenCalled())
  })
})
