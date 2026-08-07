import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequireOwnerTenant, mockFindFirst, mockCreate, mockUpdate, mockDelete, mockDeleteManyAssignment } = vi.hoisted(() => ({
  mockRequireOwnerTenant: vi.fn(async () => ({ userId: 'u1', tenantId: 'tenant-1' })),
  mockFindFirst: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
  mockDeleteManyAssignment: vi.fn(),
}))

vi.mock('@/lib/admin-guard', () => ({ requireOwnerTenant: mockRequireOwnerTenant }))

vi.mock('@/lib/prisma', () => ({
  withTenant: vi.fn(async (_tenantId: string, fn: (client: unknown) => Promise<unknown>) =>
    fn({
      productTag: { findFirst: mockFindFirst, create: mockCreate, update: mockUpdate, delete: mockDelete },
      productTagAssignment: { deleteMany: mockDeleteManyAssignment },
    })
  ),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }))

import { createOccasionAction, setOccasionStatusAction, deleteOccasion } from './actions'

describe('createOccasionAction', () => {
  beforeEach(() => {
    mockCreate.mockReset()
  })

  it('creates the occasion with no products required', async () => {
    mockCreate.mockResolvedValueOnce({ id: 'occasion-1' })

    const result = await createOccasionAction({ name: 'Wedding', themeKey: 'wedding-gold', layout: 'grid' })

    expect(result.error).toBeUndefined()
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        name: 'Wedding',
        slug: 'wedding',
        emoji: null,
        themeKey: 'wedding-gold',
        layout: 'grid',
        status: 'draft',
      },
    })
  })
})

describe('setOccasionStatusAction', () => {
  beforeEach(() => {
    mockFindFirst.mockReset()
    mockUpdate.mockReset()
  })

  it('turns an occasion on even with zero products', async () => {
    mockFindFirst.mockResolvedValueOnce({ id: 'occasion-1' })

    const result = await setOccasionStatusAction('occasion-1', true)

    expect(result.error).toBeUndefined()
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'occasion-1', tenantId: 'tenant-1' }, data: { status: 'published' } })
  })

  it('turns an occasion off', async () => {
    mockFindFirst.mockResolvedValueOnce({ id: 'occasion-1' })

    const result = await setOccasionStatusAction('occasion-1', false)

    expect(result.error).toBeUndefined()
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'occasion-1', tenantId: 'tenant-1' }, data: { status: 'draft' } })
  })

  it('rejects an unknown occasion', async () => {
    mockFindFirst.mockResolvedValueOnce(null)

    const result = await setOccasionStatusAction('occasion-1', true)

    expect(result.error).toBe('Occasion not found.')
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})

describe('deleteOccasion', () => {
  beforeEach(() => {
    mockFindFirst.mockReset()
    mockDelete.mockReset()
    mockDeleteManyAssignment.mockReset()
  })

  it('rejects deleting a default occasion', async () => {
    mockFindFirst.mockResolvedValueOnce({ isDefault: true })

    const result = await deleteOccasion('occasion-1')

    expect(result.error).toBe('Default occasions cannot be deleted.')
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('deletes a non-default occasion', async () => {
    mockFindFirst.mockResolvedValueOnce({ isDefault: false })

    const result = await deleteOccasion('occasion-1')

    expect(result.error).toBeUndefined()
    expect(mockDeleteManyAssignment).toHaveBeenCalledWith({ where: { tenantId: 'tenant-1', tagId: 'occasion-1' } })
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'occasion-1' } })
  })
})
