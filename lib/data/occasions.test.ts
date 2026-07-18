import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFindMany, mockAggregate, mockCreateMany, mockCreate, mockDeleteMany } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockAggregate: vi.fn(),
  mockCreateMany: vi.fn(),
  mockCreate: vi.fn(),
  mockDeleteMany: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  withTenant: vi.fn(async (_tenantId: string, fn: (client: unknown) => unknown) =>
    fn({
      productTagAssignment: {
        findMany: mockFindMany,
        aggregate: mockAggregate,
        createMany: mockCreateMany,
        create: mockCreate,
        deleteMany: mockDeleteMany,
      },
    })
  ),
}))

import { assignProductsToOccasion, updateProductOccasions } from './occasions'

describe('assignProductsToOccasion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  it('skips products already assigned and appends the rest after the current max sortOrder', async () => {
    mockFindMany.mockResolvedValueOnce([{ productId: 'p1' }])
    mockAggregate.mockResolvedValueOnce({ _max: { sortOrder: 4 } })

    await assignProductsToOccasion('tenant-1', 'occasion-1', ['p1', 'p2', 'p3'])

    expect(mockCreateMany).toHaveBeenCalledWith({
      data: [
        { tenantId: 'tenant-1', tagId: 'occasion-1', productId: 'p2', sortOrder: 5 },
        { tenantId: 'tenant-1', tagId: 'occasion-1', productId: 'p3', sortOrder: 6 },
      ],
    })
  })

  it('does nothing when every product is already assigned', async () => {
    mockFindMany.mockResolvedValueOnce([{ productId: 'p1' }, { productId: 'p2' }])
    mockAggregate.mockResolvedValueOnce({ _max: { sortOrder: 4 } })

    await assignProductsToOccasion('tenant-1', 'occasion-1', ['p1', 'p2'])

    expect(mockCreateMany).not.toHaveBeenCalled()
  })

  it('starts sortOrder at 0 when the occasion has no existing assignments', async () => {
    mockFindMany.mockResolvedValueOnce([])
    mockAggregate.mockResolvedValueOnce({ _max: { sortOrder: null } })

    await assignProductsToOccasion('tenant-1', 'occasion-1', ['p1'])

    expect(mockCreateMany).toHaveBeenCalledWith({
      data: [{ tenantId: 'tenant-1', tagId: 'occasion-1', productId: 'p1', sortOrder: 0 }],
    })
  })
})

describe('updateProductOccasions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('removes unchecked occasions and adds newly-checked ones', async () => {
    mockFindMany.mockResolvedValueOnce([{ tagId: 'diwali' }, { tagId: 'pongal' }])
    mockAggregate.mockResolvedValueOnce({ _max: { sortOrder: 2 } })

    await updateProductOccasions('tenant-1', 'p1', ['diwali', 'festive'])

    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', productId: 'p1', tagId: { in: ['pongal'] } },
    })
    expect(mockCreate).toHaveBeenCalledWith({
      data: { tenantId: 'tenant-1', tagId: 'festive', productId: 'p1', sortOrder: 3 },
    })
  })

  it('does nothing when the selection is unchanged', async () => {
    mockFindMany.mockResolvedValueOnce([{ tagId: 'diwali' }])

    await updateProductOccasions('tenant-1', 'p1', ['diwali'])

    expect(mockDeleteMany).not.toHaveBeenCalled()
    expect(mockCreate).not.toHaveBeenCalled()
  })
})
