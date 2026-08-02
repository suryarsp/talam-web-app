import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendOnboardingReminderEmail } from '@/lib/resend'
import { getOnboardingUrl } from '@/lib/tenant-url'

const THRESHOLDS_DAYS = [1, 3, 7] as const
const DAY_MS = 86_400_000

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const candidates = await prisma.tenant.findMany({
    where: { isOnboarded: false, contactEmail: { not: null }, onboardingReminderCount: { lt: 3 } },
    select: { id: true, contactEmail: true, createdAt: true, onboardingReminderCount: true },
  })

  const now = Date.now()
  let sent = 0
  for (const tenant of candidates) {
    const ageDays = Math.floor((now - tenant.createdAt.getTime()) / DAY_MS)
    const threshold = THRESHOLDS_DAYS[tenant.onboardingReminderCount]
    if (ageDays < threshold) continue

    await sendOnboardingReminderEmail(tenant.contactEmail!, {
      onboardingUrl: getOnboardingUrl(),
      reminderNumber: (tenant.onboardingReminderCount + 1) as 1 | 2 | 3,
    })
    await prisma.tenant.update({ where: { id: tenant.id }, data: { onboardingReminderCount: { increment: 1 } } })
    sent++
  }

  return NextResponse.json({ checked: candidates.length, sent })
}
