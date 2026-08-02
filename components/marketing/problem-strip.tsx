'use client'

import { motion } from 'motion/react'
import { BlurFade } from '@/components/ui/blur-fade'
import { TextAnimate } from '@/components/ui/text-animate'
import { LineShadowText } from '@/components/ui/line-shadow-text'

export function ProblemStrip() {
  return (
    <section className="relative bg-bg py-32 md:py-44 overflow-hidden">
      <div className="max-w-[1000px] mx-auto px-6 md:px-16 text-center">
        <BlurFade delay={0.1} inView>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-warm font-body mb-6">The problem</p>
        </BlurFade>

        <TextAnimate
          as="h2"
          animation="blurInUp"
          by="word"
          once
          startOnView
          className="font-marketing font-semibold text-fg text-[32px] sm:text-[44px] md:text-[60px] leading-[1.08] tracking-[-0.02em]"
        >
          You sell silk worth lakhs through WhatsApp screenshots and UPI requests.
        </TextAnimate>

        <BlurFade delay={0.4} inView>
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6">
            <motion.div
              className="px-6 py-4 rounded-2xl bg-danger/5 border border-danger/10"
              whileHover={{ scale: 1.02 }}
            >
              <p className="text-sm font-body text-danger/80 line-through decoration-danger/40">Screenshots in gallery</p>
            </motion.div>
            <div className="text-2xl text-muted-warm">→</div>
            <motion.div
              className="px-6 py-4 rounded-2xl bg-success/5 border border-success/20"
              whileHover={{ scale: 1.02 }}
            >
              <p className="text-sm font-body">
                <LineShadowText shadowColor="rgba(16, 185, 129, 0.4)" className="text-success font-medium">
                  yoursilks.talam4shop.com
                </LineShadowText>
              </p>
            </motion.div>
          </div>
        </BlurFade>
      </div>
    </section>
  )
}
