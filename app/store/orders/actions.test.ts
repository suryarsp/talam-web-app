import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequireAuth, mockRequireTenant, mockDb } = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(async () => ({ id: 'cust-1' })),
  mockRequireTenant: vi.fn(async () => ({ tenantId: 't1' })),
  mockDb: { order: { findFirst: vi.fn(), update: vi.fn() } },
}))

vi.mock('@/lib/auth-guard', () => ({ requireAuth: mockRequireAuth, requireTenant: mockRequireTenant }))
vi.mock('@/lib/prisma', () => ({
  withTenant: (_tenantId: string, fn: (db: typeof mockDb) => unknown) => fn(mockDb),
}))

import { reportOrderProblemAction } from './actions'

beforeEach(() => vi.clearAllMocks())

describe('reportOrderProblemAction', () => {
  it('flags the order with a reason and timestamp', async () => {
    mockDb.order.findFirst.mockResolvedValue({ id: 'o1' })
    const result = await reportOrderProblemAction('o1', 'Never received it')
    expect(result).toEqual({})
    expect(mockDb.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'o1' },
        data: expect.objectContaining({ disputeReason: 'Never received it' }),
      })
    )
  })

  it('rejects an empty reason', async () => {
    const result = await reportOrderProblemAction('o1', '   ')
    expect(result.error).toBeTruthy()
    expect(mockDb.order.update).not.toHaveBeenCalled()
  })

  it('does not leak orders belonging to another customer', async () => {
    mockDb.order.findFirst.mockResolvedValue(null)
    const result = await reportOrderProblemAction('someone-elses', 'problem')
    expect(result.error).toBeTruthy()
    expect(mockDb.order.update).not.toHaveBeenCalled()
  })

  it('is idempotent — re-reporting an already-flagged order just updates the reason', async () => {
    mockDb.order.findFirst.mockResolvedValue({ id: 'o1' })
    await reportOrderProblemAction('o1', 'first reason')
    const result = await reportOrderProblemAction('o1', 'updated reason')
    expect(result).toEqual({})
    expect(mockDb.order.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ disputeReason: 'updated reason' }) })
    )
  })
})
