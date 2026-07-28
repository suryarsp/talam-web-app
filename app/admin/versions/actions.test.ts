import { describe, it, expect, vi } from 'vitest'

const { mockRequireOwnerTenant, mockListPublishLogs } = vi.hoisted(() => ({
  mockRequireOwnerTenant: vi.fn(async () => ({ userId: 'u1', tenantId: 't1' })),
  mockListPublishLogs: vi.fn(),
}))
vi.mock('@/lib/admin-guard', () => ({ requireOwnerTenant: mockRequireOwnerTenant }))
vi.mock('@/lib/data/publish-logs', () => ({ listPublishLogs: mockListPublishLogs }))

import { getPublishLogsAction } from './actions'

describe('getPublishLogsAction', () => {
  it('delegates to listPublishLogs', async () => {
    mockListPublishLogs.mockResolvedValue([{ id: 'pl1', summary: '2 products' }])
    expect(await getPublishLogsAction()).toEqual([{ id: 'pl1', summary: '2 products' }])
    expect(mockListPublishLogs).toHaveBeenCalledWith('t1')
  })
})
