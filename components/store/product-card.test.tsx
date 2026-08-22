import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProductCard } from './product-card'
import { StoreBaseProvider } from './store-context'
import type { Product } from '@prisma/client'

function makeProduct(overrides: Partial<Product> = {}) {
  return {
    id: 'p1',
    tenantId: 't1',
    name: 'Kurtis',
    slug: 'kurtis',
    description: null,
    price: '1299' as unknown as Product['price'],
    comparePrice: null,
    categoryId: null,
    sizes: [],
    unit: 'piece',
    images: ['https://example.com/kurti.jpg'],
    stockBySize: {},
    specifications: [],
    isActive: true,
    isNew: false,
    occasionIds: [],
    status: 'published',
    deletedAt: null,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as Product & { category?: null; reviewCount: number; averageRating: number | null; isNew: boolean }
}

function renderCard(product: ReturnType<typeof makeProduct>) {
  return render(
    <StoreBaseProvider base="">
      <ProductCard product={{ ...product, reviewCount: 0, averageRating: null }} />
    </StoreBaseProvider>
  )
}

describe('ProductCard pricing', () => {
  it('does not show a strikethrough price or discount badge when comparePrice is lower than price', () => {
    const product = makeProduct({ price: '1299' as unknown as Product['price'], comparePrice: '999' as unknown as Product['comparePrice'] })
    renderCard(product)
    expect(screen.queryByText(/999/)).toBeNull()
    expect(screen.queryByText(/% OFF/)).toBeNull()
  })

  it('shows strikethrough price and discount badge when comparePrice is a genuine markdown', () => {
    const product = makeProduct({ price: '999' as unknown as Product['price'], comparePrice: '1299' as unknown as Product['comparePrice'] })
    renderCard(product)
    expect(screen.getByText(/1,299/)).toBeTruthy()
    expect(screen.getByText('23% OFF')).toBeTruthy()
  })
})

describe('ProductCard image URL', () => {
  it('requests the Cloudinary asset without a width cap', () => {
    const product = makeProduct({ images: ['https://res.cloudinary.com/demo/image/upload/kurti.jpg'] })
    renderCard(product)
    const img = screen.getByAltText('Kurtis') as HTMLImageElement
    const src = img.getAttribute('src') ?? ''
    expect(src).toContain('f_auto%2Cq_auto')
    expect(src).not.toContain('w_')
  })
})
