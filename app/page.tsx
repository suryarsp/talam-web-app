import { MarketingNav } from '@/components/marketing/nav'
import { Hero } from '@/components/marketing/hero'
import { ProblemStrip } from '@/components/marketing/problem-strip'
import { Features } from '@/components/marketing/features'
import { HowItWorks } from '@/components/marketing/how-it-works'
import { Integrations } from '@/components/marketing/integrations'
import { Pricing } from '@/components/marketing/pricing'
import { Faq } from '@/components/marketing/faq'
import { CtaBand } from '@/components/marketing/cta-band'
import { MarketingFooter } from '@/components/marketing/footer'

export default function MarketingHome() {
  return (
    <main className="w-full overflow-x-clip">
      <MarketingNav />
      <Hero />
      <ProblemStrip />
      <Features />
      <HowItWorks />
      <Integrations />
      <Pricing />
      <Faq />
      <CtaBand />
      <MarketingFooter />
    </main>
  )
}
