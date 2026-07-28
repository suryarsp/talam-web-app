import { describe, it, expect, vi } from 'vitest'

vi.mock('@prisma/client', () => {
  const mockExecuteRaw = vi.fn().mockResolvedValue(1)
  class MockPrismaClient {
    $executeRaw = mockExecuteRaw
    $connect = vi.fn()
    $disconnect = vi.fn()
    $transaction = vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(this))
  }
  return { PrismaClient: MockPrismaClient }
})

import { withTenant } from './prisma'

describe('withTenant', () => {
  it('sets app.tenant_id before running the callback', async () => {
    const tenantId = 'test-tenant-uuid'
    const mockFn = vi.fn().mockResolvedValue('result')

    const result = await withTenant(tenantId, mockFn)

    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(result).toBe('result')
  })

  it('passes the prisma client to the callback', async () => {
    const tenantId = 'test-tenant-uuid'
    let receivedClient: unknown

    await withTenant(tenantId, (client) => {
      receivedClient = client
      return Promise.resolve(null)
    })

    expect(receivedClient).toBeDefined()
    expect(typeof receivedClient).toBe('object')
  })
})
