import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import type { AdminStaffRole } from '@prisma/client'
import type { FlaggedOrder, PendingRefundVerification } from '@/lib/data/super-admin'

const {
  mockRequireSuperAdminSection,
  mockGetFlaggedOrders,
  mockGetOrderInsights,
  mockGetPendingRefundVerifications,
} = vi.hoisted(() => ({
  mockRequireSuperAdminSection: vi.fn(),
  mockGetFlaggedOrders: vi.fn(),
  mockGetOrderInsights: vi.fn(),
  mockGetPendingRefundVerifications: vi.fn(),
}))

vi.mock('@/lib/auth-guard', () => ({ requireSuperAdminSection: mockRequireSuperAdminSection }))
vi.mock('@/lib/data/super-admin', () => ({
  getFlaggedOrders: mockGetFlaggedOrders,
  getOrderInsights: mockGetOrderInsights,
  getPendingRefundVerifications: mockGetPendingRefundVerifications,
}))
// The client components reach the server actions, which pull in Prisma's Node-only driver.
vi.mock('./actions', () => ({
  cancelOrderAction: vi.fn(),
  uploadRefundProofAction: vi.fn(),
  confirmRefundVerificationAction: vi.fn(),
}))

import OrdersPage from './page'

const EMPTY_INSIGHTS = {
  totalOrders: 0,
  gmv: 0,
  aov: 0,
  storesWithOrders: 0,
  totalStores: 0,
  monthlyTrend: [],
  byStore: [],
}

const DISPUTE: FlaggedOrder = {
  id: 'order-1111',
  tenantId: 't1',
  tenantName: 'Meena Silks',
  status: 'confirmed',
  paymentStatus: 'paid',
  total: 2699,
  paymentProvider: 'razorpay',
  utr: 'pay_1',
  daysPending: 2,
}

const PENDING: PendingRefundVerification = {
  id: 'order-2222',
  tenantId: 't2',
  tenantName: 'Anjali Weaves',
  total: 1499,
  cancelReason: 'Out of stock',
  refundProofUrl: 'https://cdn/proof.png',
  customerEmail: 'priya@example.com',
}

function signedInAs(role: AdminStaffRole) {
  mockRequireSuperAdminSection.mockResolvedValue({ user: { email: 'ops@talam.com' }, role })
}

async function renderPage() {
  render(await OrdersPage())
}

beforeEach(() => {
  vi.clearAllMocks()
  signedInAs('owner')
  mockGetOrderInsights.mockResolvedValue(EMPTY_INSIGHTS)
  mockGetFlaggedOrders.mockResolvedValue([])
  mockGetPendingRefundVerifications.mockResolvedValue([])
})

describe('OrdersPage — disputes', () => {
  it('offers to cancel a disputed order that has not shipped yet', async () => {
    mockGetFlaggedOrders.mockResolvedValue([DISPUTE])
    await renderPage()

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('offers no cancellation once the parcel is with the courier', async () => {
    mockGetFlaggedOrders.mockResolvedValue([{ ...DISPUTE, status: 'shipped' as const }])
    await renderPage()

    expect(screen.getByText('Meena Silks')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument()
  })
})

describe('OrdersPage — refund verification queue', () => {
  it('lists each waiting refund with its proof and the amount at stake', async () => {
    mockGetPendingRefundVerifications.mockResolvedValue([PENDING])
    await renderPage()

    const section = screen.getByRole('region', { name: 'Refund Verification Pending' })
    expect(within(section).getByText('Anjali Weaves')).toBeInTheDocument()
    expect(within(section).getByText('₹1,499')).toBeInTheDocument()
    expect(within(section).getByText('Out of stock')).toBeInTheDocument()
    expect(within(section).getByRole('link', { name: /proof/i })).toHaveAttribute('href', 'https://cdn/proof.png')
  })

  it('says so when nothing is waiting', async () => {
    await renderPage()

    const section = screen.getByRole('region', { name: 'Refund Verification Pending' })
    expect(within(section).getByText(/no refunds waiting/i)).toBeInTheDocument()
  })

  it('lets an owner sign a refund off', async () => {
    mockGetPendingRefundVerifications.mockResolvedValue([PENDING])
    await renderPage()

    expect(screen.getByRole('button', { name: 'Confirm Refund' })).toBeEnabled()
  })

  it('shows a growth analyst the queue but not the sign-off', async () => {
    signedInAs('growth_analyst')
    mockGetPendingRefundVerifications.mockResolvedValue([PENDING])
    await renderPage()

    expect(screen.getByText('Anjali Weaves')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm Refund' })).toBeDisabled()
  })
})
