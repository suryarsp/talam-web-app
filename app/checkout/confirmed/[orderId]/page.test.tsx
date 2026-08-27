import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { CustomerOrder } from '@/lib/data/storefront-orders'

const { mockRequireAuth, mockRequireTenant, mockGetCustomerOrder, mockGetTenantStorefront } = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(async () => ({ id: 'cust-1' })),
  mockRequireTenant: vi.fn(async () => ({ tenantId: 't1', subdomain: 'silk', tier: 'trial' })),
  mockGetCustomerOrder: vi.fn(),
  mockGetTenantStorefront: vi.fn(),
}))

vi.mock('@/lib/auth-guard', () => ({ requireAuth: mockRequireAuth, requireTenant: mockRequireTenant }))
vi.mock('@/lib/data/storefront-orders', () => ({ getCustomerOrder: mockGetCustomerOrder }))
vi.mock('@/lib/data/tenant', () => ({ getTenantStorefront: mockGetTenantStorefront }))
// Client-only, and it reaches for the store-context provider this test does not mount.
vi.mock('./confirmed-actions', () => ({ ConfirmedActions: () => null }))

import OrderConfirmedPage from './page'

const PLACED_AT = new Date('2026-09-01T12:00:00Z')

const ORDER = {
  id: 'order-1',
  code: '#ORDER-1',
  status: 'pending',
  paymentStatus: 'pending',
  paymentProvider: 'upi_manual',
  itemsTotal: 2000,
  discount: 0,
  shippingFee: 140,
  discountCode: null,
  total: 2140,
  trackingId: null,
  createdAt: PLACED_AT,
  estimatedDeliveryDays: null,
  disputeFlaggedAt: null,
  address: { name: 'Priya', line1: '42 Bharathi Nagar', city: 'Madurai', state: 'Tamil Nadu', pincode: '625001' },
  items: [],
  statusEvents: [],
} as unknown as CustomerOrder

const TENANT = { id: 't1', name: 'Meena Silks', deliveryEstimateText: null, returnWindowDays: 7, whatsappNumber: null }

async function renderPage() {
  render(await OrderConfirmedPage({ params: Promise.resolve({ orderId: 'order-1' }) }))
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetCustomerOrder.mockResolvedValue(ORDER)
  mockGetTenantStorefront.mockResolvedValue(TENANT)
})

describe('OrderConfirmedPage estimated delivery', () => {
  it('shows the date the courier quoted for this order', async () => {
    mockGetCustomerOrder.mockResolvedValue({ ...ORDER, estimatedDeliveryDays: 3 })
    await renderPage()

    expect(screen.getByText('Fri, 4 Sept · Standard delivery')).toBeInTheDocument()
  })

  it('prefers the order’s own estimate over the store’s typed-in blurb', async () => {
    mockGetCustomerOrder.mockResolvedValue({ ...ORDER, estimatedDeliveryDays: 3 })
    mockGetTenantStorefront.mockResolvedValue({ ...TENANT, deliveryEstimateText: '5-7 business days' })
    await renderPage()

    expect(screen.getByText('Fri, 4 Sept · Standard delivery')).toBeInTheDocument()
    expect(screen.queryByText('5-7 business days')).not.toBeInTheDocument()
  })

  it('falls back to the store’s blurb for an order placed with no courier estimate', async () => {
    mockGetTenantStorefront.mockResolvedValue({ ...TENANT, deliveryEstimateText: '5-7 business days' })
    await renderPage()

    expect(screen.getByText('5-7 business days')).toBeInTheDocument()
  })

  it('falls back to a four-day guess when the store never typed a blurb either', async () => {
    await renderPage()

    expect(screen.getByText('Sat, 5 Sept · Standard delivery')).toBeInTheDocument()
  })
})
