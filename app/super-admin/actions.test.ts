import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequireSuperAdmin, mockWithSuperAdmin, mockUpdate } = vi.hoisted(() => ({
  mockRequireSuperAdmin: vi.fn(async () => ({ email: 'ops@talam.com' })),
  mockWithSuperAdmin: vi.fn(),
  mockUpdate: vi.fn(),
}))

vi.mock('@/lib/auth-guard', () => ({ requireSuperAdmin: mockRequireSuperAdmin }))
vi.mock('@/lib/prisma', () => ({ withSuperAdmin: mockWithSuperAdmin }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { updateOnboardingStageAction, suspendTenantAction, unsuspendTenantAction } from './actions'

beforeEach(() => {
  vi.clearAllMocks()
  mockWithSuperAdmin.mockImplementation((fn: (db: unknown) => unknown) => fn({ tenant: { update: mockUpdate } }))
})

describe('updateOnboardingStageAction', () => {
  it('rejects manual edits to the razorpay stage', async () => {
    const result = await updateOnboardingStageAction('t1', 'razorpay', 'in_progress')
    expect(result).toEqual({ error: expect.any(String) })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('updates business_setup and license stages', async () => {
    mockUpdate.mockResolvedValue(undefined)
    const result = await updateOnboardingStageAction('t1', 'license', 'in_progress')
    expect(result).toEqual({ success: true })
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: { onboardingStage: 'license', onboardingStageStatus: 'in_progress' },
    })
  })

  it('requires super-admin auth', async () => {
    await updateOnboardingStageAction('t1', 'business_setup', 'done')
    expect(mockRequireSuperAdmin).toHaveBeenCalled()
  })
})

describe('suspendTenantAction / unsuspendTenantAction', () => {
  it('sets suspendedAt on suspend', async () => {
    mockUpdate.mockResolvedValue(undefined)
    const result = await suspendTenantAction('t1')
    expect(result).toEqual({ success: true })
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 't1' }, data: { suspendedAt: expect.any(Date) } })
  })

  it('clears suspendedAt on unsuspend', async () => {
    mockUpdate.mockResolvedValue(undefined)
    const result = await unsuspendTenantAction('t1')
    expect(result).toEqual({ success: true })
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 't1' }, data: { suspendedAt: null } })
  })
})
