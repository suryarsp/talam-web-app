import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequireOwnerTenant, mockGetNotifications, mockGetUnreadCount, mockMarkAllRead } = vi.hoisted(() => ({
  mockRequireOwnerTenant: vi.fn(async () => ({ userId: 'u1', tenantId: 't1' })),
  mockGetNotifications: vi.fn(),
  mockGetUnreadCount: vi.fn(),
  mockMarkAllRead: vi.fn(),
}))

vi.mock('@/lib/admin-guard', () => ({ requireOwnerTenant: mockRequireOwnerTenant }))
vi.mock('@/lib/data/notifications', () => ({
  getNotifications: mockGetNotifications,
  getUnreadNotificationCount: mockGetUnreadCount,
  markAllNotificationsRead: mockMarkAllRead,
}))

import { getNotificationsAction, getUnreadNotificationCountAction, markAllNotificationsReadAction } from './actions'

beforeEach(() => vi.clearAllMocks())

describe('getNotificationsAction', () => {
  it('returns items and unreadCount', async () => {
    mockGetNotifications.mockResolvedValue([{ id: 'n1' }])
    mockGetUnreadCount.mockResolvedValue(1)
    expect(await getNotificationsAction()).toEqual({ items: [{ id: 'n1' }], unreadCount: 1 })
  })
})

describe('getUnreadNotificationCountAction', () => {
  it('delegates to getUnreadNotificationCount', async () => {
    mockGetUnreadCount.mockResolvedValue(5)
    expect(await getUnreadNotificationCountAction()).toBe(5)
  })
})

describe('markAllNotificationsReadAction', () => {
  it('calls markAllNotificationsRead', async () => {
    mockMarkAllRead.mockResolvedValue(undefined)
    await markAllNotificationsReadAction()
    expect(mockMarkAllRead).toHaveBeenCalledWith('t1')
  })
})
