import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequireSuperAdmin, mockWithSuperAdmin, mockUpdate, mockConnectShiprocket, mockGetShippingConfig } = vi.hoisted(() => ({
  mockRequireSuperAdmin: vi.fn(async () => ({ email: 'ops@talam.com' })),
  mockWithSuperAdmin: vi.fn(),
  mockUpdate: vi.fn(),
  mockConnectShiprocket: vi.fn(),
  mockGetShippingConfig: vi.fn(),
}))

vi.mock('@/lib/auth-guard', () => ({ requireSuperAdmin: mockRequireSuperAdmin }))
vi.mock('@/lib/prisma', () => ({ withSuperAdmin: mockWithSuperAdmin }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/shipping/shiprocket-account', () => ({
  connectShiprocketAccount: mockConnectShiprocket,
  getShippingConfig: mockGetShippingConfig,
}))

import {
  updateOnboardingStageAction,
  suspendTenantAction,
  unsuspendTenantAction,
  staffConnectShippingAction,
  markShippingAssistInProgressAction,
} from './actions'

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

describe('staffConnectShippingAction', () => {
  beforeEach(() => {
    mockConnectShiprocket.mockResolvedValue({})
  })

  it('requires super-admin auth', async () => {
    await staffConnectShippingAction('t1', 'shop@example.com', 'pw', 'Main Store')
    expect(mockRequireSuperAdmin).toHaveBeenCalled()
  })

  it('connects on the store’s behalf, recorded as staff rather than self', async () => {
    const result = await staffConnectShippingAction('t1', 'shop@example.com', 'pw', 'Main Store')

    expect(result).toEqual({ success: true })
    expect(mockConnectShiprocket).toHaveBeenCalledWith({
      tenantId: 't1',
      email: 'shop@example.com',
      password: 'pw',
      pickupLocation: 'Main Store',
      actor: 'staff',
    })
  })

  it('surfaces a verification failure without claiming success', async () => {
    mockConnectShiprocket.mockResolvedValue({ error: 'Could not verify that Shiprocket login' })

    const result = await staffConnectShippingAction('t1', 'shop@example.com', 'wrong', 'Main Store')

    expect(result).toEqual({ error: 'Could not verify that Shiprocket login' })
  })
})

describe('markShippingAssistInProgressAction', () => {
  it('claims an open request', async () => {
    mockGetShippingConfig.mockResolvedValue({ mode: 'assist_requested', pickupLocation: null })

    const result = await markShippingAssistInProgressAction('t1')

    expect(result).toEqual({ success: true })
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { shippingConfig: expect.objectContaining({ mode: 'assist_in_progress' }) },
      })
    )
  })

  it('refuses when there is no open request to claim', async () => {
    mockGetShippingConfig.mockResolvedValue({ mode: 'connected' })

    const result = await markShippingAssistInProgressAction('t1')

    expect(result).toEqual({ error: expect.any(String) })
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})
