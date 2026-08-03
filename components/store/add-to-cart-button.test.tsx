import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddToCartButton } from './add-to-cart-button'
import { useCartStore } from '@/lib/store/cart'

const baseProduct = {
  id: 'p1',
  tenantId: 't1',
  name: 'Cotton Kurta',
  slug: 'cotton-kurta',
  price: 999,
  comparePrice: null,
  sizes: [] as string[],
  images: ['/img.jpg'],
  description: 'Fabric: Cotton',
}

beforeEach(() => {
  useCartStore.setState({ items: [] })
})

describe('AddToCartButton', () => {
  it('adds a sizeless product straight to the cart', async () => {
    const user = userEvent.setup()
    render(<AddToCartButton product={baseProduct} stockBySize={{}} />)

    await user.click(screen.getByRole('button', { name: 'Add to Cart' }))

    expect(useCartStore.getState().items).toEqual([
      expect.objectContaining({ productId: 'p1', name: 'Cotton Kurta', quantity: 1, fabric: 'Cotton' }),
    ])
    expect(await screen.findByRole('button', { name: 'Added to Cart ✓' })).toBeInTheDocument()
  })

  it('blocks adding to cart when a size is required but not selected', async () => {
    const user = userEvent.setup()
    const product = { ...baseProduct, sizes: ['S', 'M'] }
    render(<AddToCartButton product={product} stockBySize={{ S: 5, M: 5 }} />)

    await user.click(screen.getByRole('button', { name: 'Add to Cart' }))

    expect(await screen.findByText('Please select a size')).toBeInTheDocument()
    expect(useCartStore.getState().items).toEqual([])
  })

  it('adds to cart once a size is selected', async () => {
    const user = userEvent.setup()
    const product = { ...baseProduct, sizes: ['S', 'M'] }
    render(<AddToCartButton product={product} stockBySize={{ S: 5, M: 5 }} />)

    await user.click(screen.getByRole('button', { name: 'M' }))
    await user.click(screen.getByRole('button', { name: 'Add to Cart' }))

    expect(useCartStore.getState().items).toEqual([
      expect.objectContaining({ productId: 'p1', size: 'M', quantity: 1 }),
    ])
  })
})
