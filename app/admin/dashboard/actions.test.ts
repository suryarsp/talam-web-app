import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockRequireOwnerSession,
  mockRequireOwnerTenant,
  mockGetDashboardData,
  mockGetMissingStoreConfig,
  mockSendStoreLiveEmail,
  mockTenantFindUnique,
  mockTenantUpdate,
} = vi.hoisted(() => ({
  mockRequireOwnerSession: vi.fn(async () => ({ userId: 'u1', email: 'o@e.com' })),
  mockRequireOwnerTenant: vi.fn(async () => ({ userId: 'u1', tenantId: 't1' })),
  mockGetDashboardData: vi.fn(),
  mockGetMissingStoreConfig: vi.fn(async () => [] as { key: string }[]),
  mockSendStoreLiveEmail: vi.fn(),
  mockTenantFindUnique: vi.fn(),
  mockTenantUpdate: vi.fn(),
}))

vi.mock('@/lib/admin-guard', () => ({
  requireOwnerSession: mockRequireOwnerSession,
  requireOwnerTenant: mockRequireOwnerTenant,
}))
vi.mock('@/lib/prisma', () => ({
  prisma: { tenant: { findUnique: mockTenantFindUnique, update: mockTenantUpdate } },
}))
vi.mock('@/lib/data/dashboard', () => ({ getDashboardData: mockGetDashboardData }))
vi.mock('@/lib/data/tenant', () => ({ getMissingStoreConfig: mockGetMissingStoreConfig }))
vi.mock('@/lib/resend', () => ({ sendStoreLiveEmail: mockSendStoreLiveEmail }))
vi.mock('@/lib/tenant-url', () => ({ getStoreUrl: (slug: string, local: boolean) => local ? `/dev/store/${slug}` : `https://${slug}.talam.co` }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Map([['host', 'localhost:3000']])) }))

import {
  getDashboardDataAction,
  getLiveStoreUrl,
  getOnboardingStepperAction,
  getTenantLiveStateAction,
  goLiveAction,
  markSetupTourSeenAction,
} from './actions'

beforeEach(() => vi.clearAllMocks())

describe('getDashboardDataAction', () => {
  it('delegates to getDashboardData with tenantId', async () => {
    mockGetDashboardData.mockResolvedValue({ orders: 0 })
    const result = await getDashboardDataAction()
    expect(result).toEqual({ orders: 0 })
    expect(mockGetDashboardData).toHaveBeenCalledWith('t1')
  })
})

describe('getLiveStoreUrl', () => {
  it('returns dev URL on localhost', async () => {
    mockTenantFindUnique.mockResolvedValue({ slug: 'silk' })
    expect(await getLiveStoreUrl()).toBe('/dev/store/silk')
  })

  it('returns null when tenant not found', async () => {
    mockTenantFindUnique.mockResolvedValue(null)
    expect(await getLiveStoreUrl()).toBeNull()
  })
})

describe('getTenantLiveStateAction', () => {
  it('returns isLive and missing config', async () => {
    mockTenantFindUnique.mockResolvedValue({ isLive: true })
    mockGetMissingStoreConfig.mockResolvedValue([])
    const result = await getTenantLiveStateAction()
    expect(result).toEqual({ isLive: true, missing: [] })
  })
})

describe('goLiveAction', () => {
  it('blocks go-live when config is missing', async () => {
    mockGetMissingStoreConfig.mockResolvedValue([{ key: 'phone' }])
    const result = await goLiveAction()
    expect(result.error).toBeTruthy()
    expect(mockTenantUpdate).not.toHaveBeenCalled()
  })

  it('sets isLive and sends email', async () => {
    mockGetMissingStoreConfig.mockResolvedValue([])
    mockTenantUpdate.mockResolvedValue({ name: 'Silk', slug: 'silk', contactEmail: 'o@e.com' })
    const result = await goLiveAction()
    expect(result).toEqual({})
    expect(mockTenantUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: { isLive: true } }))
    expect(mockSendStoreLiveEmail).toHaveBeenCalled()
  })

  it('skips email when contactEmail is null', async () => {
    mockGetMissingStoreConfig.mockResolvedValue([])
    mockTenantUpdate.mockResolvedValue({ name: 'Silk', slug: 'silk', contactEmail: null })
    await goLiveAction()
    expect(mockSendStoreLiveEmail).not.toHaveBeenCalled()
  })
})

describe('getOnboardingStepperAction', () => {
  it('defaults every stage to not_started for a brand-new tenant', async () => {
    mockTenantFindUnique.mockResolvedValue(null)
    const steps = await getOnboardingStepperAction()
    expect(steps).toEqual([
      { stage: 'business_setup', label: 'Business Setup', status: 'not_started' },
      { stage: 'license', label: 'License', status: 'not_started' },
      { stage: 'razorpay', label: 'Razorpay', status: 'not_started' },
      { stage: 'store_live', label: 'Store Live', status: 'not_started' },
    ])
  })

  it('marks stages before the current one done and the current one in_progress', async () => {
    mockTenantFindUnique.mockResolvedValue({
      onboardingStage: 'license',
      onboardingStageStatus: 'in_progress',
      paymentConfig: null,
    })
    const steps = await getOnboardingStepperAction()
    expect(steps.find((s) => s.stage === 'business_setup')?.status).toBe('done')
    expect(steps.find((s) => s.stage === 'license')?.status).toBe('in_progress')
    expect(steps.find((s) => s.stage === 'store_live')?.status).toBe('not_started')
  })

  it("derives the razorpay stage from paymentConfig.razorpay.status, not onboardingStage", async () => {
    mockTenantFindUnique.mockResolvedValue({
      onboardingStage: 'business_setup',
      onboardingStageStatus: 'not_started',
      paymentConfig: { razorpay: { enabled: true, accountId: 'acc_1', status: 'activated' } },
    })
    const steps = await getOnboardingStepperAction()
    expect(steps.find((s) => s.stage === 'razorpay')?.status).toBe('done')
  })

  it('maps a rejected razorpay status to blocked', async () => {
    mockTenantFindUnique.mockResolvedValue({
      onboardingStage: 'business_setup',
      onboardingStageStatus: 'not_started',
      paymentConfig: { razorpay: { enabled: true, accountId: 'acc_1', status: 'rejected' } },
    })
    const steps = await getOnboardingStepperAction()
    expect(steps.find((s) => s.stage === 'razorpay')?.status).toBe('blocked')
  })
})

describe('markSetupTourSeenAction', () => {
  it('updates hasSeenSetupTour', async () => {
    mockTenantUpdate.mockResolvedValue({})
    await markSetupTourSeenAction()
    expect(mockTenantUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: { hasSeenSetupTour: true } }))
  })
})
