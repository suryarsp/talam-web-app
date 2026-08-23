import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AdminStaffRow } from '@/lib/data/admin-staff'
import type { AdminStaffRole } from '@prisma/client'

const {
  mockRequireSuperAdmin,
  mockGetSuperAdminRole,
  mockWithSuperAdmin,
  mockUpdate,
  mockConnectShiprocket,
  mockGetShippingConfig,
  mockAddAdminStaff,
  mockRemoveAdminStaff,
  mockGetAdminStaff,
} = vi.hoisted(() => ({
  mockRequireSuperAdmin: vi.fn(async () => ({ email: 'ops@talam.com' })),
  mockGetSuperAdminRole: vi.fn(async (): Promise<AdminStaffRole> => 'owner'),
  mockWithSuperAdmin: vi.fn(),
  mockUpdate: vi.fn(),
  mockConnectShiprocket: vi.fn(),
  mockGetShippingConfig: vi.fn(),
  mockAddAdminStaff: vi.fn(),
  mockRemoveAdminStaff: vi.fn(),
  mockGetAdminStaff: vi.fn(async (): Promise<AdminStaffRow[]> => []),
}))

vi.mock('@/lib/auth-guard', () => ({
  requireSuperAdmin: mockRequireSuperAdmin,
  getSuperAdminRole: mockGetSuperAdminRole,
}))
vi.mock('@/lib/prisma', () => ({ withSuperAdmin: mockWithSuperAdmin }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/shipping/shiprocket-account', () => ({
  connectShiprocketAccount: mockConnectShiprocket,
  getShippingConfig: mockGetShippingConfig,
}))
// canAccessSection/SECTION_LABEL are pure lookups keyed off ROLE_SECTIONS — kept real via
// importActual so the RBAC assertions below exercise the actual permission map, not a stub.
vi.mock('@/lib/data/admin-staff', async () => {
  const actual = await vi.importActual<typeof import('@/lib/data/admin-staff')>('@/lib/data/admin-staff')
  return {
    ...actual,
    addAdminStaff: mockAddAdminStaff,
    removeAdminStaff: mockRemoveAdminStaff,
    getAdminStaff: mockGetAdminStaff,
  }
})

import {
  updateOnboardingStageAction,
  suspendTenantAction,
  unsuspendTenantAction,
  staffConnectShippingAction,
  markShippingAssistInProgressAction,
  inviteStaffAction,
  removeStaffAction,
} from './actions'

beforeEach(() => {
  vi.clearAllMocks()
  mockWithSuperAdmin.mockImplementation((fn: (db: unknown) => unknown) => fn({ tenant: { update: mockUpdate } }))
  // mockResolvedValue replaces the mock's implementation outright — clearAllMocks() only
  // clears call history, so these need re-establishing every test, same as mockWithSuperAdmin above.
  mockGetSuperAdminRole.mockResolvedValue('owner')
  mockGetAdminStaff.mockResolvedValue([])
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

  it('rejects a role without tenants access', async () => {
    mockGetSuperAdminRole.mockResolvedValue('billing_manager')

    const result = await updateOnboardingStageAction('t1', 'license', 'in_progress')

    expect(result).toEqual({ error: expect.any(String) })
    expect(mockUpdate).not.toHaveBeenCalled()
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

  it('rejects a role without tenants access', async () => {
    mockGetSuperAdminRole.mockResolvedValue('growth_analyst')

    const result = await suspendTenantAction('t1')

    expect(result).toEqual({ error: expect.any(String) })
    expect(mockUpdate).not.toHaveBeenCalled()
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

  it('rejects a role without tenants access', async () => {
    mockGetSuperAdminRole.mockResolvedValue('billing_manager')

    const result = await staffConnectShippingAction('t1', 'shop@example.com', 'pw', 'Main Store')

    expect(result).toEqual({ error: expect.any(String) })
    expect(mockConnectShiprocket).not.toHaveBeenCalled()
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

describe('inviteStaffAction', () => {
  it('requires super-admin auth', async () => {
    await inviteStaffAction('new@talam.com', 'New Person', 'support_agent')
    expect(mockRequireSuperAdmin).toHaveBeenCalled()
  })

  it('rejects an invalid email without adding staff', async () => {
    const result = await inviteStaffAction('not-an-email', 'New Person', 'support_agent')

    expect(result).toEqual({ error: expect.any(String) })
    expect(mockAddAdminStaff).not.toHaveBeenCalled()
  })

  it('rejects a blank name without adding staff', async () => {
    const result = await inviteStaffAction('new@talam.com', '   ', 'support_agent')

    expect(result).toEqual({ error: expect.any(String) })
    expect(mockAddAdminStaff).not.toHaveBeenCalled()
  })

  it('adds a valid invite', async () => {
    mockAddAdminStaff.mockResolvedValue({})

    const result = await inviteStaffAction('new@talam.com', 'New Person', 'support_agent')

    expect(result).toEqual({ success: true })
    expect(mockAddAdminStaff).toHaveBeenCalledWith('new@talam.com', 'New Person', 'support_agent')
  })

  it('surfaces a duplicate-email failure without claiming success', async () => {
    mockAddAdminStaff.mockRejectedValue(new Error('unique constraint'))

    const result = await inviteStaffAction('new@talam.com', 'New Person', 'support_agent')

    expect(result).toEqual({ error: expect.any(String) })
  })

  it.each(['support_agent', 'billing_manager', 'growth_analyst'] as const)(
    'rejects a %s role without adding staff (only owner has staff access)',
    async (role) => {
      mockGetSuperAdminRole.mockResolvedValue(role)

      const result = await inviteStaffAction('new@talam.com', 'New Person', 'support_agent')

      expect(result).toEqual({ error: expect.any(String) })
      expect(mockAddAdminStaff).not.toHaveBeenCalled()
    }
  )
})

describe('removeStaffAction', () => {
  it('requires super-admin auth', async () => {
    await removeStaffAction('staff-1')
    expect(mockRequireSuperAdmin).toHaveBeenCalled()
  })

  it('removes the staff row', async () => {
    const result = await removeStaffAction('staff-1')

    expect(result).toEqual({ success: true })
    expect(mockRemoveAdminStaff).toHaveBeenCalledWith('staff-1')
  })

  it('rejects a non-owner role without removing staff', async () => {
    mockGetSuperAdminRole.mockResolvedValue('support_agent')

    const result = await removeStaffAction('staff-1')

    expect(result).toEqual({ error: expect.any(String) })
    expect(mockRemoveAdminStaff).not.toHaveBeenCalled()
  })

  it('refuses to remove your own staff access', async () => {
    mockGetAdminStaff.mockResolvedValue([
      { id: 'staff-1', email: 'ops@talam.com', name: 'Ops', role: 'owner', addedAt: new Date(), lastActiveAt: null },
    ])

    const result = await removeStaffAction('staff-1')

    expect(result).toEqual({ error: expect.any(String) })
    expect(mockRemoveAdminStaff).not.toHaveBeenCalled()
  })
})
