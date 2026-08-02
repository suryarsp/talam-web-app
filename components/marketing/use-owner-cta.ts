'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createBrowserClient } from '@/lib/supabase/client'
import { getOwnerCtaState, type OwnerCtaState } from '@/app/actions/owner-cta'

type CtaCopy = { label: string; href: string; subtext?: string }

const CTA_COPY: Record<OwnerCtaState, CtaCopy> = {
  'signed-out': { label: 'Start free', href: '/auth' },
  'in-progress': { label: 'Finish Setting Up', href: '/auth', subtext: 'Pick up where you left off' },
  onboarded: { label: 'Go to Dashboard', href: '/auth', subtext: 'Takes you to your admin dashboard' },
}

export function useOwnerCta(): CtaCopy | null {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [state, setState] = useState<OwnerCtaState | null>(null)

  useEffect(() => {
    const supabase = createBrowserClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user === undefined) return
    if (user === null) {
      queueMicrotask(() => setState('signed-out'))
      return
    }
    getOwnerCtaState().then(setState)
  }, [user])

  if (state === null) return null
  return CTA_COPY[state]
}
