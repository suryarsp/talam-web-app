import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OccasionsClient } from './occasions-client'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

const createOccasionAction = vi.fn(async (..._args: unknown[]) => ({ id: 'occasion-2' }) as { error?: string; id?: string })
const deleteOccasion = vi.fn(async (..._args: unknown[]) => ({}) as { error?: string })
const setOccasionSettings = vi.fn(async (..._args: unknown[]) => ({}) as { error?: string })
const setOccasionStatusAction = vi.fn(async (..._args: unknown[]) => ({}) as { error?: string })

vi.mock('./actions', () => ({
  createOccasionAction: (...args: unknown[]) => createOccasionAction(...args),
  deleteOccasion: (...args: unknown[]) => deleteOccasion(...args),
  setOccasionSettings: (...args: unknown[]) => setOccasionSettings(...args),
  setOccasionStatusAction: (...args: unknown[]) => setOccasionStatusAction(...args),
}))

const wedding = {
  id: 'occasion-1',
  name: 'Wedding Season',
  slug: 'wedding-season',
  emoji: '💍',
  isDefault: false,
  themeKey: 'wedding-gold',
  layout: 'grid' as const,
  status: 'published',
  _count: { products: 4 },
}

const diwali = {
  id: 'occasion-2',
  name: 'Diwali',
  slug: 'diwali',
  emoji: '🪔',
  isDefault: true,
  themeKey: null,
  layout: 'carousel' as const,
  status: 'draft',
  _count: { products: 0 },
}

describe('OccasionsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders every occasion passed in', () => {
    render(<OccasionsClient initialOccasions={[wedding, diwali]} />)
    expect(screen.getByText('Wedding Season')).toBeInTheDocument()
    expect(screen.getByText('Diwali')).toBeInTheDocument()
  })

  it('filters occasions by the search box', async () => {
    const user = userEvent.setup()
    render(<OccasionsClient initialOccasions={[wedding, diwali]} />)
    await user.type(screen.getByPlaceholderText('Search occasions...'), 'wedding')
    expect(screen.getByText('Wedding Season')).toBeInTheDocument()
    expect(screen.queryByText('Diwali')).not.toBeInTheDocument()
  })

  it('shows the empty state when no occasion matches the search', async () => {
    const user = userEvent.setup()
    render(<OccasionsClient initialOccasions={[wedding, diwali]} />)
    await user.type(screen.getByPlaceholderText('Search occasions...'), 'holi')
    expect(screen.getByText('No occasions found.')).toBeInTheDocument()
  })

  function findToggleButton(container: HTMLElement) {
    return Array.from(container.querySelectorAll('button')).find((b) => b.className.includes('rounded-full') && b.className.includes('px-[2px]'))!
  }

  it('toggles status and refreshes on success', async () => {
    const user = userEvent.setup()
    const { container } = render(<OccasionsClient initialOccasions={[wedding]} />)
    await user.click(findToggleButton(container))
    await waitFor(() => expect(setOccasionStatusAction).toHaveBeenCalledWith('occasion-1', false))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
  })

  it('shows an error and does not refresh when toggling status fails', async () => {
    setOccasionStatusAction.mockResolvedValueOnce({ error: 'Could not update.' })
    const user = userEvent.setup()
    const { container } = render(<OccasionsClient initialOccasions={[wedding]} />)
    await user.click(findToggleButton(container))
    await waitFor(() => expect(screen.getByText('Could not update.')).toBeInTheDocument())
    expect(refresh).not.toHaveBeenCalled()
  })

  it('does not offer a delete button for default occasions', () => {
    render(<OccasionsClient initialOccasions={[diwali]} />)
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })

  it('deletes a non-default occasion and refreshes', async () => {
    const user = userEvent.setup()
    render(<OccasionsClient initialOccasions={[wedding]} />)
    const buttons = screen.getAllByRole('button')
    const deleteButton = buttons.find((b) => b.querySelector('svg') && b.className.includes('hover:border-danger'))!
    await user.click(deleteButton)
    await waitFor(() => expect(deleteOccasion).toHaveBeenCalledWith('occasion-1'))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
  })

  it('requires a name before creating a new occasion', async () => {
    const user = userEvent.setup()
    render(<OccasionsClient initialOccasions={[]} />)
    const addButton = screen.getAllByRole('button').find((b) => b.className.includes('fixed bottom-24'))!
    await user.click(addButton)
    await user.click(screen.getByRole('button', { name: 'Add Occasion' }))
    expect(await screen.findByText('Name is required.')).toBeInTheDocument()
    expect(createOccasionAction).not.toHaveBeenCalled()
  })

  it('creates a new occasion with the entered name', async () => {
    const user = userEvent.setup()
    render(<OccasionsClient initialOccasions={[]} />)
    const addButton = screen.getAllByRole('button').find((b) => b.className.includes('fixed bottom-24'))!
    await user.click(addButton)
    await user.type(screen.getByPlaceholderText('e.g., Wedding Season'), 'Holi')
    await user.click(screen.getByRole('button', { name: 'Add Occasion' }))
    await waitFor(() => expect(createOccasionAction).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Holi' })
    ))
  })
})
