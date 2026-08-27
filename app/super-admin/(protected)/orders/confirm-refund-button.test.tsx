import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mockConfirmRefundVerificationAction } = vi.hoisted(() => ({
  mockConfirmRefundVerificationAction: vi.fn(),
}))

vi.mock('./actions', () => ({ confirmRefundVerificationAction: mockConfirmRefundVerificationAction }))

import { ConfirmRefundButton } from './confirm-refund-button'

beforeEach(() => {
  vi.clearAllMocks()
  mockConfirmRefundVerificationAction.mockResolvedValue({})
})

describe('ConfirmRefundButton', () => {
  it('signs the refund off against the order it belongs to', async () => {
    const user = userEvent.setup()
    render(<ConfirmRefundButton tenantId="t1" orderId="o1" canVerify />)

    await user.click(screen.getByRole('button', { name: 'Confirm Refund' }))

    await waitFor(() => expect(mockConfirmRefundVerificationAction).toHaveBeenCalledWith('t1', 'o1'))
  })

  it('shows the server refusal instead of silently doing nothing', async () => {
    const user = userEvent.setup()
    mockConfirmRefundVerificationAction.mockResolvedValue({ error: 'This refund has already been verified.' })
    render(<ConfirmRefundButton tenantId="t1" orderId="o1" canVerify />)

    await user.click(screen.getByRole('button', { name: 'Confirm Refund' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('This refund has already been verified.')
  })

  // A growth analyst can read the orders section but must not close out money that has
  // already left a bank account — see canVerifyRefund in lib/data/admin-permissions.ts.
  it('is unusable for a role that may read the queue but not sign it off', async () => {
    const user = userEvent.setup()
    render(<ConfirmRefundButton tenantId="t1" orderId="o1" canVerify={false} />)

    const button = screen.getByRole('button', { name: 'Confirm Refund' })
    expect(button).toBeDisabled()

    await user.click(button)
    expect(mockConfirmRefundVerificationAction).not.toHaveBeenCalled()
  })
})
