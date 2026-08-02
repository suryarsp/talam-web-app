import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { resolveSignedInDestination } from '@/app/auth/page'
import { MarketingNav } from '@/components/marketing/nav'
import { Hero } from '@/components/marketing/hero'
import { TextileStrip } from '@/components/marketing/textile-strip'
import { ProblemStrip } from '@/components/marketing/problem-strip'
import { Features } from '@/components/marketing/features'
import { HowItWorks } from '@/components/marketing/how-it-works'
import { Integrations } from '@/components/marketing/integrations'
import { Pricing } from '@/components/marketing/pricing'
import { Faq } from '@/components/marketing/faq'
import { CtaBand } from '@/components/marketing/cta-band'
import { MarketingFooter } from '@/components/marketing/footer'
import { Analytics } from '@vercel/analytics/next';

export default async function MarketingHome() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const tenant = await prisma.tenant.findUnique({ where: { ownerId: user.id }, select: { slug: true, isOnboarded: true } })
    const host = (await headers()).get('host')
    redirect(resolveSignedInDestination(tenant, host?.includes('localhost') ?? false))
  }

  return (
    <main className="w-full overflow-x-clip">
      <MarketingNav />
      <Hero />
      <TextileStrip />
      <ProblemStrip />
      <Features />
      <HowItWorks />
      <Integrations />
      <Pricing />
      <Faq />
      <CtaBand />
      <MarketingFooter />
      <Analytics />
    </main>
  )
}
