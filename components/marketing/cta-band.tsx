'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { BlurFade } from '@/components/ui/blur-fade'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { Particles } from '@/components/ui/particles'
import { TextAnimate } from '@/components/ui/text-animate'

export function CtaBand() {
  return (
    <section className="relative bg-bg-dark py-36 md:py-48 overflow-hidden">
      <Particles className="absolute inset-0 z-0" quantity={35} color="#f59e0b" size={0.4} staticity={50} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full bg-brand-primary/6 blur-[150px] pointer-events-none" />

      <div className="relative z-10 max-w-[800px] mx-auto px-6 md:px-16 text-center">
        <BlurFade delay={0.1} inView>
          <TextAnimate
            as="h2"
            animation="blurInUp"
            by="word"
            once
            startOnView
            duration={0.8}
            className="font-marketing font-semibold text-white text-[40px] sm:text-[56px] md:text-[72px] leading-[1.02] tracking-[-0.03em]"
          >
            Your textile store deserves more than a DM inbox.
          </TextAnimate>
        </BlurFade>

        <BlurFade delay={0.4} inView>
          <p className="mt-6 text-lg text-white/35 font-body max-w-[480px] mx-auto">
            Join hundreds of textile retailers across India who&apos;ve moved their business online with Talam.
          </p>
        </BlurFade>

        <BlurFade delay={0.55} inView>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth">
              <ShimmerButton
                shimmerColor="#ffffff"
                background="rgba(193, 80, 46, 1)"
                className="px-10 py-4 text-base font-semibold font-body"
              >
                Start your free trial
              </ShimmerButton>
            </Link>
          </div>
          <p className="mt-5 text-xs text-white/25 font-body">
            14-day free trial · No credit card · No GST needed
          </p>
        </BlurFade>
      </div>
    </section>
  )
}
