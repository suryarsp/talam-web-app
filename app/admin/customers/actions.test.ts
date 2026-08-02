import { describe, it, expect, vi } from 'vitest'

const { mockRequireOwnerTenant, mockListCustomers } = vi.hoisted(() => ({
  mockRequireOwnerTenant: vi.fn(async () => ({ userId: 'u1', tenantId: 't1' })),
  mockListCustomers: vi.fn(),
}))
vi.mock('@/lib/admin-guard', () => ({ requireOwnerTenant: mockRequireOwnerTenant }))
vi.mock('@/lib/data/customers', () => ({ listCustomersForAdmin: mockListCustomers }))

import { getCustomersAction } from './actions'

describe('getCustomersAction', () => {
  it('delegates to listCustomersForAdmin', async () => {
    mockListCustomers.mockResolvedValue([{ id: 'c1', name: 'Ravi' }])
    expect(await getCustomersAction()).toEqual([{ id: 'c1', name: 'Ravi' }])
    expect(mockListCustomers).toHaveBeenCalledWith('t1')
  })
})
