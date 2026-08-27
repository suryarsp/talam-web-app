import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PincodeDeliveryCheck, type DeliveryCheckResult } from './pincode-delivery-check'

type CheckMock = ReturnType<typeof vi.fn<(pincode: string) => Promise<DeliveryCheckResult>>>

async function check(onCheck: CheckMock, pincode: string) {
  const user = userEvent.setup()
  render(<PincodeDeliveryCheck onCheck={onCheck} />)
  await user.type(screen.getByLabelText('Check delivery'), pincode)
  await user.click(screen.getByRole('button', { name: 'Check' }))
}

describe('PincodeDeliveryCheck', () => {
  it('shows the delivery date when the pincode is serviceable', async () => {
    const onCheck: CheckMock = vi.fn().mockResolvedValue({ serviceable: true, deliveryBy: 'Fri, 4 Sep' })

    await check(onCheck, '560001')

    expect(await screen.findByText('Delivery by Fri, 4 Sep')).toBeInTheDocument()
  })

  it('confirms delivery without a date when the courier gives no ETA', async () => {
    const onCheck: CheckMock = vi.fn().mockResolvedValue({ serviceable: true, deliveryBy: null })

    await check(onCheck, '560001')

    expect(await screen.findByText('Delivers to this pincode')).toBeInTheDocument()
  })

  it('says so when the pincode is not serviceable', async () => {
    const onCheck: CheckMock = vi.fn().mockResolvedValue({ serviceable: false })

    await check(onCheck, '190001')

    expect(await screen.findByText("We can't currently deliver to this pincode.")).toBeInTheDocument()
  })

  it('falls back to a generic message when the check fails', async () => {
    const onCheck: CheckMock = vi.fn().mockResolvedValue({ error: 'shiprocket unreachable' })

    await check(onCheck, '560001')

    expect(await screen.findByText("Couldn't check delivery for this pincode right now.")).toBeInTheDocument()
  })

  it('does not check a pincode shorter than 6 digits', async () => {
    const onCheck: CheckMock = vi.fn().mockResolvedValue({ serviceable: true, deliveryBy: 'Fri, 4 Sep' })

    await check(onCheck, '5600')

    expect(onCheck).not.toHaveBeenCalled()
    expect(await screen.findByText('Enter a 6-digit pincode')).toBeInTheDocument()
  })

  it('never shows a delivery charge', async () => {
    const onCheck: CheckMock = vi.fn().mockResolvedValue({ serviceable: true, deliveryBy: 'Fri, 4 Sep' })

    await check(onCheck, '560001')

    await screen.findByText('Delivery by Fri, 4 Sep')
    expect(screen.queryByText(/₹/)).toBeNull()
  })
})
