import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminProductsClient } from './products-client'
import type { AdminProduct } from '@/lib/data/products'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

const toastSuccess = vi.fn()
vi.mock('sonner', () => ({ toast: { success: (...args: unknown[]) => toastSuccess(...args) } }))

const uploadProductImageAction = vi.fn(async (..._args: unknown[]) => 'https://cdn.example.com/upload.png')
const createProductAction = vi.fn(async (..._args: unknown[]) => ({ id: 'new-id', readyToGoLive: false }))
const updateProductAction = vi.fn(async (..._args: unknown[]) => ({}) as { error?: string })
const updateProductOccasionsAction = vi.fn(async (..._args: unknown[]) => ({}) as { error?: string })
const setProductActiveAction = vi.fn(async (..._args: unknown[]) => ({}) as { error?: string })
const bulkAssignToOccasionAction = vi.fn(async (..._args: unknown[]) => ({}) as { error?: string })
const bulkSetCategoryAction = vi.fn(async (..._args: unknown[]) => ({}) as { error?: string })
const bulkSetActiveAction = vi.fn(async (..._args: unknown[]) => ({}) as { error?: string })
const bulkDeleteAction = vi.fn(async (..._args: unknown[]) => ({}) as { error?: string })
const bulkResetToDefaultAction = vi.fn(async (..._args: unknown[]) => ({}) as { error?: string })

vi.mock('./actions', () => ({
  uploadProductImageAction: (...args: unknown[]) => uploadProductImageAction(...args),
  createProductAction: (...args: unknown[]) => createProductAction(...args),
  updateProductAction: (...args: unknown[]) => updateProductAction(...args),
  updateProductOccasionsAction: (...args: unknown[]) => updateProductOccasionsAction(...args),
  setProductActiveAction: (...args: unknown[]) => setProductActiveAction(...args),
  bulkAssignToOccasionAction: (...args: unknown[]) => bulkAssignToOccasionAction(...args),
  bulkSetCategoryAction: (...args: unknown[]) => bulkSetCategoryAction(...args),
  bulkSetActiveAction: (...args: unknown[]) => bulkSetActiveAction(...args),
  bulkDeleteAction: (...args: unknown[]) => bulkDeleteAction(...args),
  bulkResetToDefaultAction: (...args: unknown[]) => bulkResetToDefaultAction(...args),
}))

function product(overrides: Partial<AdminProduct> = {}): AdminProduct {
  return {
    id: 'p1',
    name: 'Silk Saree',
    slug: 'silk-saree',
    description: null,
    price: 1999,
    comparePrice: null,
    categoryId: 'cat-1',
    categoryName: 'Sarees',
    sizes: ['M'],
    unit: 'piece',
    images: [],
    stockBySize: { M: 5 },
    specifications: [],
    isActive: true,
    occasionIds: [],
    ...overrides,
  }
}

const products = [
  product({ id: 'p1', name: 'Silk Saree', price: 1999, stockBySize: { M: 5 } }),
  product({ id: 'p2', name: 'Cotton Kurta', price: 799, stockBySize: { M: 0 }, isActive: false }),
]

describe('AdminProductsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  // The component renders a desktop table and a mobile list simultaneously (CSS
  // media queries don't apply in jsdom), so every row's text appears twice.
  it('renders every product and the count', () => {
    render(<AdminProductsClient products={products} categories={[]} occasions={[]} />)
    expect(screen.getAllByText('Silk Saree').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Cotton Kurta').length).toBeGreaterThan(0)
    expect(screen.getByText('2 products')).toBeInTheDocument()
  })

  it('filters products by the search box', async () => {
    const user = userEvent.setup()
    render(<AdminProductsClient products={products} categories={[]} occasions={[]} />)
    await user.type(screen.getByPlaceholderText('Search products...'), 'silk')
    expect(screen.getAllByText('Silk Saree').length).toBeGreaterThan(0)
    expect(screen.queryByText('Cotton Kurta')).not.toBeInTheDocument()
    expect(screen.getByText('1 product')).toBeInTheDocument()
  })

  it('shows out-of-stock label for a product with zero stock', () => {
    render(<AdminProductsClient products={products} categories={[]} occasions={[]} />)
    expect(screen.getAllByText('Out of stock').length).toBeGreaterThan(0)
  })

  it('toggles product active state and refreshes', async () => {
    const user = userEvent.setup()
    render(<AdminProductsClient products={products} categories={[]} occasions={[]} />)
    const rowMenuButton = Array.from(document.querySelectorAll('button')).find((b) => b.className.includes('size-8'))!
    await user.click(rowMenuButton)
    await user.click(screen.getByText('Deactivate'))
    await waitFor(() => expect(setProductActiveAction).toHaveBeenCalledWith('p1', false))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
  })

  it('deletes a product after confirmation and refreshes', async () => {
    const user = userEvent.setup()
    render(<AdminProductsClient products={products} categories={[]} occasions={[]} />)
    const rowMenuButton = Array.from(document.querySelectorAll('button')).find((b) => b.className.includes('size-8'))!
    await user.click(rowMenuButton)
    await user.click(screen.getByText('Delete Product'))
    await waitFor(() => expect(bulkDeleteAction).toHaveBeenCalledWith(['p1']))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
  })

  it('does not delete when the confirm dialog is dismissed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    render(<AdminProductsClient products={products} categories={[]} occasions={[]} />)
    const rowMenuButton = Array.from(document.querySelectorAll('button')).find((b) => b.className.includes('size-8'))!
    await user.click(rowMenuButton)
    await user.click(screen.getByText('Delete Product'))
    expect(bulkDeleteAction).not.toHaveBeenCalled()
  })

  it('selects all visible products and runs a batch action', async () => {
    const user = userEvent.setup()
    render(<AdminProductsClient products={products} categories={[]} occasions={[]} />)
    const selectAllButton = document.querySelector('.grid.grid-cols-\\[auto_2fr_1fr_1fr_1fr_auto\\] button')!
    await user.click(selectAllButton)
    await user.click(screen.getByRole('button', { name: 'Mark Active' }))
    await waitFor(() => expect(bulkSetActiveAction).toHaveBeenCalledWith(['p1', 'p2'], true))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
  })

  it('does not run a confirm-kind batch action when dismissed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    render(<AdminProductsClient products={products} categories={[]} occasions={[]} />)
    const selectAllButton = document.querySelector('.grid.grid-cols-\\[auto_2fr_1fr_1fr_1fr_auto\\] button')!
    await user.click(selectAllButton)
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(bulkDeleteAction).not.toHaveBeenCalled()
  })

  it('shows a toast prompting go-live when the created product reaches the 3-product threshold', async () => {
    createProductAction.mockResolvedValueOnce({ id: 'new-id', readyToGoLive: true })
    const user = userEvent.setup()
    render(<AdminProductsClient products={products} categories={[{ id: 'cat-1', name: 'Sarees', slug: 'sarees', department: null }]} occasions={[]} />)

    await user.click(document.querySelector('[data-tour="add-product"]')!)
    await user.type(screen.getByPlaceholderText('e.g., Premium Cotton Kurta Set'), 'Silk Dupatta')
    await user.selectOptions(document.querySelector('select[name="categoryId"]')!, 'cat-1')
    await user.type(screen.getByPlaceholderText('999'), '999')
    await user.type(screen.getByPlaceholderText('e.g., 25'), '5')
    const file = new File(['x'], 'photo.png', { type: 'image/png' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, file)
    await waitFor(() => expect(uploadProductImageAction).toHaveBeenCalled())

    await user.click(screen.getByRole('button', { name: 'Add Product' }))

    await waitFor(() => expect(createProductAction).toHaveBeenCalled())
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith(
      'You have 3+ products!',
      expect.objectContaining({ description: expect.stringContaining('Go Live') })
    ))
  })

  it('does not toast when the created product does not reach the threshold', async () => {
    createProductAction.mockResolvedValueOnce({ id: 'new-id', readyToGoLive: false })
    const user = userEvent.setup()
    render(<AdminProductsClient products={products} categories={[{ id: 'cat-1', name: 'Sarees', slug: 'sarees', department: null }]} occasions={[]} />)

    await user.click(document.querySelector('[data-tour="add-product"]')!)
    await user.type(screen.getByPlaceholderText('e.g., Premium Cotton Kurta Set'), 'Silk Dupatta')
    await user.selectOptions(document.querySelector('select[name="categoryId"]')!, 'cat-1')
    await user.type(screen.getByPlaceholderText('999'), '999')
    await user.type(screen.getByPlaceholderText('e.g., 25'), '5')
    const file = new File(['x'], 'photo.png', { type: 'image/png' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, file)
    await waitFor(() => expect(uploadProductImageAction).toHaveBeenCalled())

    await user.click(screen.getByRole('button', { name: 'Add Product' }))

    await waitFor(() => expect(createProductAction).toHaveBeenCalled())
    expect(toastSuccess).not.toHaveBeenCalled()
  })
})
