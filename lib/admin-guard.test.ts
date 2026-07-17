import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

import { createServerClient } from '@/lib/supabase/server'
import { requireOwnerSession } from './admin-guard'

describe('requireOwnerSession', () => {
  it('redirects to /auth when there is no session', async () => {
    vi.mocked(createServerClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never)

    await expect(requireOwnerSession()).rejects.toThrow('REDIRECT:/auth?next=/admin/onboarding')
  })

  it('returns the userId when a session exists', async () => {
    vi.mocked(createServerClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    } as never)

    const result = await requireOwnerSession()
    expect(result).toEqual({ userId: 'user-1' })
  })
})
