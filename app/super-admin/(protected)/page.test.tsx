import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const { mockGetOverviewMetrics, mockRequireSuperAdminSection } = vi.hoisted(() => ({
  mockGetOverviewMetrics: vi.fn(),
  mockRequireSuperAdminSection: vi.fn(async () => ({ user: { email: 'ops@talam.com' }, role: 'owner' as const })),
}))

vi.mock('@/lib/data/super-admin', () => ({ getOverviewMetrics: mockGetOverviewMetrics }))
vi.mock('@/lib/auth-guard', () => ({ requireSuperAdminSection: mockRequireSuperAdminSection }))

import SuperAdminOverviewPage from './page'

describe('SuperAdminOverviewPage', () => {
  it('renders metrics for stores with data', async () => {
    mockGetOverviewMetrics.mockResolvedValue({
      totalStores: 10,
      newStoresThisMonth: 2,
      mrr: 5000,
      gmv30d: 120000,
      trialToPaidPct: 40,
      planDistribution: [
        { tier: 'trial', count: 6 },
        { tier: 'starter', count: 2 },
        { tier: 'growth', count: 1 },
        { tier: 'pro', count: 1 },
      ],
      recentSignups: [{ id: 't1', name: 'Test Store', slug: 'test-store', createdAt: new Date('2026-08-01') }],
      trialHealthPct: 60,
      activity: [{ label: 'Test Store signed up', sub: 'New store', at: new Date('2026-08-01') }],
    })

    const jsx = await SuperAdminOverviewPage()
    render(jsx)

    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('₹5,000')).toBeInTheDocument()
    expect(screen.getByText('Test Store')).toBeInTheDocument()
    expect(screen.getByText('Test Store signed up')).toBeInTheDocument()
    expect(screen.queryByText(/vs last month/i)).not.toBeInTheDocument()
  })

  it('renders empty states without crashing when there are zero stores', async () => {
    mockGetOverviewMetrics.mockResolvedValue({
      totalStores: 0,
      newStoresThisMonth: 0,
      mrr: 0,
      gmv30d: 0,
      trialToPaidPct: 0,
      planDistribution: [
        { tier: 'trial', count: 0 },
        { tier: 'starter', count: 0 },
        { tier: 'growth', count: 0 },
        { tier: 'pro', count: 0 },
      ],
      recentSignups: [],
      trialHealthPct: 0,
      activity: [],
    })

    const jsx = await SuperAdminOverviewPage()
    render(jsx)

    expect(screen.getByText('No stores yet.')).toBeInTheDocument()
    expect(screen.getByText('No signups yet.')).toBeInTheDocument()
    expect(screen.getByText('No recent activity')).toBeInTheDocument()
  })
})
