import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CartPage from './page'
import { useCartStore } from '@/lib/store/cart'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

function summary() {
  return screen.getByText('Order Summary').closest('div') as HTMLElement
}

beforeEach(() => {
  useCartStore.setState({
    items: [
      { productId: 'p1', name: 'Saree', slug: 'saree', price: 500, comparePrice: 600, image: '', tenantId: 't1', quantity: 1 },
      { productId: 'p2', name: 'Kurta', slug: 'kurta', price: 300, comparePrice: null, image: '', tenantId: 't1', quantity: 1 },
    ],
  })
})

describe('CartPage totals', () => {
  it('computes subtotal, MRP discount, and shipping fee below the free-delivery threshold', () => {
    render(<CartPage />)

    expect(within(summary()).getByText('₹900')).toBeInTheDocument() // subtotal: 600 + 300
    expect(within(summary()).getByText('−₹100')).toBeInTheDocument() // MRP discount: 600-500
    expect(within(summary()).getByText('₹99')).toBeInTheDocument() // shipping: below ₹999 threshold
    expect(within(summary()).getByText('₹899')).toBeInTheDocument() // grand total: 500+300+99
  })

  it('recalculates the total and unlocks free delivery when quantity crosses the threshold', async () => {
    const user = userEvent.setup()
    render(<CartPage />)

    await user.click(screen.getAllByLabelText('Increase quantity')[1]) // Kurta 1 -> 2 (saleTotal 500+600=1100 >= 999)

    expect(within(summary()).getByText('Free')).toBeInTheDocument()
    expect(within(summary()).getByText('₹1,100')).toBeInTheDocument()
  })

  it('removes an item and recalculates the total', async () => {
    const user = userEvent.setup()
    render(<CartPage />)

    await user.click(screen.getAllByLabelText('Remove item')[1]) // remove Kurta

    expect(useCartStore.getState().items).toHaveLength(1)
    // Only the Saree remains: subtotal uses its comparePrice (600), sale total 500 + ₹99 shipping = ₹599
    expect(within(summary()).getByText('₹599')).toBeInTheDocument()
  })
})
