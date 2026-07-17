import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: { tenant: { findUnique: vi.fn() } },
}))

import { createServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getOwnerCtaState } from './owner-cta'

describe('getOwnerCtaState', () => {
  it('returns signed-out when there is no session', async () => {
    vi.mocked(createServerClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never)

    expect(await getOwnerCtaState()).toBe('signed-out')
  })

  it('returns in-progress when the tenant has not finished onboarding', async () => {
    vi.mocked(createServerClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    } as never)
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({ isOnboarded: false } as never)

    expect(await getOwnerCtaState()).toBe('in-progress')
  })

  it('returns in-progress when no tenant row exists yet', async () => {
    vi.mocked(createServerClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    } as never)
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue(null)

    expect(await getOwnerCtaState()).toBe('in-progress')
  })

  it('returns onboarded when the tenant has finished onboarding', async () => {
    vi.mocked(createServerClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    } as never)
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({ isOnboarded: true } as never)

    expect(await getOwnerCtaState()).toBe('onboarded')
  })
})
