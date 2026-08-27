import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { FlaggedOrder } from '@/lib/data/super-admin'

const { mockCancelOrderAction, mockUploadRefundProofAction } = vi.hoisted(() => ({
  mockCancelOrderAction: vi.fn(),
  mockUploadRefundProofAction: vi.fn(),
}))

vi.mock('./actions', () => ({
  cancelOrderAction: mockCancelOrderAction,
  uploadRefundProofAction: mockUploadRefundProofAction,
}))

import { CancelOrderDialog } from './cancel-order-dialog'

const BASE: FlaggedOrder = {
  id: 'o1',
  tenantId: 't1',
  tenantName: 'Meena Silks',
  status: 'confirmed',
  paymentStatus: 'pending',
  total: 2699,
  paymentProvider: 'cod',
  utr: null,
  daysPending: 2,
}

function renderDialog(overrides: Partial<FlaggedOrder> = {}) {
  return render(<CancelOrderDialog order={{ ...BASE, ...overrides }} />)
}

async function open(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Cancel' }))
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCancelOrderAction.mockResolvedValue({})
  mockUploadRefundProofAction.mockResolvedValue({})
})

describe('CancelOrderDialog — an order that was never paid', () => {
  it('cancels outright, with nothing to refund', async () => {
    const user = userEvent.setup()
    renderDialog({ paymentStatus: 'pending' })
    await open(user)

    expect(screen.queryByLabelText(/screenshot/i)).not.toBeInTheDocument()
    await user.type(screen.getByLabelText(/reason/i), 'Out of stock')
    await user.click(screen.getByRole('button', { name: 'Cancel Order' }))

    await waitFor(() => expect(mockCancelOrderAction).toHaveBeenCalledWith('t1', 'o1', 'Out of stock'))
  })

  it('refuses to submit without a reason', async () => {
    const user = userEvent.setup()
    renderDialog({ paymentStatus: 'pending' })
    await open(user)

    await user.click(screen.getByRole('button', { name: 'Cancel Order' }))

    expect(await screen.findByText(/enter a reason/i)).toBeInTheDocument()
    expect(mockCancelOrderAction).not.toHaveBeenCalled()
  })
})

describe('CancelOrderDialog — an order paid through Razorpay', () => {
  it('offers the automatic refund, naming the amount going back', async () => {
    const user = userEvent.setup()
    renderDialog({ paymentStatus: 'paid', paymentProvider: 'razorpay' })
    await open(user)

    const submit = screen.getByRole('button', { name: /Cancel & Refund ₹2,699 via Razorpay/ })
    await user.type(screen.getByLabelText(/reason/i), 'Duplicate order')
    await user.click(submit)

    await waitFor(() => expect(mockCancelOrderAction).toHaveBeenCalledWith('t1', 'o1', 'Duplicate order'))
    expect(mockUploadRefundProofAction).not.toHaveBeenCalled()
  })
})

describe('CancelOrderDialog — an order paid outside Razorpay', () => {
  it('sends the UPI transfer screenshot for verification instead of cancelling directly', async () => {
    const user = userEvent.setup()
    renderDialog({ paymentStatus: 'paid', paymentProvider: 'cod' })
    await open(user)

    const proof = new File(['x'], 'upi.png', { type: 'image/png' })
    await user.type(screen.getByLabelText(/reason/i), 'Customer changed mind')
    await user.upload(screen.getByLabelText(/screenshot/i), proof)
    await user.click(screen.getByRole('button', { name: 'Submit for Verification' }))

    await waitFor(() =>
      expect(mockUploadRefundProofAction).toHaveBeenCalledWith('t1', 'o1', 'Customer changed mind', proof)
    )
    expect(mockCancelOrderAction).not.toHaveBeenCalled()
  })

  it('will not file a manual refund without the screenshot', async () => {
    const user = userEvent.setup()
    renderDialog({ paymentStatus: 'paid', paymentProvider: 'cod' })
    await open(user)

    await user.type(screen.getByLabelText(/reason/i), 'Customer changed mind')
    await user.click(screen.getByRole('button', { name: 'Submit for Verification' }))

    expect(await screen.findByText('Attach the UPI transfer screenshot.')).toBeInTheDocument()
    expect(mockUploadRefundProofAction).not.toHaveBeenCalled()
  })
})

describe('CancelOrderDialog — when the server refuses', () => {
  it('shows the reason and keeps the dialog open', async () => {
    const user = userEvent.setup()
    mockCancelOrderAction.mockResolvedValue({ error: 'This order has no Razorpay payment to refund.' })
    renderDialog({ paymentStatus: 'paid', paymentProvider: 'razorpay' })
    await open(user)

    await user.type(screen.getByLabelText(/reason/i), 'Duplicate order')
    await user.click(screen.getByRole('button', { name: /Cancel & Refund/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('This order has no Razorpay payment to refund.')
    expect(screen.getByLabelText(/reason/i)).toBeInTheDocument()
  })

  it('closes on success', async () => {
    const user = userEvent.setup()
    renderDialog({ paymentStatus: 'pending' })
    await open(user)

    await user.type(screen.getByLabelText(/reason/i), 'Out of stock')
    await user.click(screen.getByRole('button', { name: 'Cancel Order' }))

    await waitFor(() => expect(screen.queryByLabelText(/reason/i)).not.toBeInTheDocument())
  })
})
