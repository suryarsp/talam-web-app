import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { syncOwnerUser } from '@/lib/auth/sync-owner-user'
import { prisma } from '@/lib/prisma'
import { resolveSignedInDestination } from '@/app/auth/page'
import { isLocalDevHost } from '@/lib/tenant-url'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const explicitNext = searchParams.get('next')

  if (!code) {
    return NextResponse.redirect(new URL('/auth?error=oauth_cancelled', request.url))
  }

  const supabase = await createServerClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(new URL('/auth?error=oauth_failed', request.url))
  }

  const user = data.user
  await syncOwnerUser(user)

  let next = explicitNext
  if (!next) {
    const tenant = await prisma.tenant.findUnique({ where: { ownerId: user.id }, select: { slug: true, isOnboarded: true } })
    next = resolveSignedInDestination(tenant, isLocalDevHost(request.headers.get('host')))
  }

  return NextResponse.redirect(new URL(next, request.url))
}
