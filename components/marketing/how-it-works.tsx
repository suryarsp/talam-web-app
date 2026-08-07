'use client'

import { motion } from 'motion/react'
import { BlurFade } from '@/components/ui/blur-fade'
import { LineShadowText } from '@/components/ui/line-shadow-text'
import { BorderBeam } from '@/components/ui/border-beam'

const STEPS = [
  {
    n: '01',
    title: 'Tell us about your business',
    desc: 'Share your store name, products, and a few basic details. That\'s all we need from you.',
    accent: '#c1502e',
    accentGlow: 'shadow-[0_0_60px_-15px_rgba(193,80,46,0.3)]',
  },
  {
    n: '02',
    title: 'We set everything up',
    desc: 'Our team gets your payments connected and your store built — branding, products, the works.',
    accent: '#f59e0b',
    accentGlow: 'shadow-[0_0_60px_-15px_rgba(245,158,11,0.3)]',
  },
  {
    n: '03',
    title: 'Your store goes live',
    desc: 'We hand you the keys to a store that\'s ready to take orders. You just sell.',
    accent: '#10b981',
    accentGlow: 'shadow-[0_0_60px_-15px_rgba(16,185,129,0.3)]',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-bg-dark py-32 md:py-44 overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6 md:px-16">
        <BlurFade delay={0.1} inView>
          <p className="text-xs uppercase tracking-[0.25em] text-amber font-body font-medium text-center mb-4">How it works</p>
          <h2 className="font-marketing font-semibold text-white text-[34px] md:text-[52px] leading-[1.08] tracking-[-0.02em] text-center max-w-[600px] mx-auto">
            We do the{' '}
            <LineShadowText shadowColor="rgba(245, 158, 11, 0.5)" className="text-amber">
              heavy lifting
            </LineShadowText>
            . You just sell.
          </h2>
        </BlurFade>

        <div className="mt-20 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {STEPS.map((step, i) => (
            <BlurFade key={step.n} delay={0.15 + i * 0.12} inView>
              <motion.div
                whileHover={{ y: -6 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className={`relative rounded-2xl bg-white/[0.03] border border-white/[0.08] overflow-hidden h-full ${step.accentGlow}`}
              >
                <BorderBeam size={80} duration={8} colorFrom={step.accent} colorTo="#ffffff20" borderWidth={1.5} />
                <div className="p-8 md:p-10">
                  <span
                    className="font-marketing font-bold text-[64px] leading-none block mb-6"
                    style={{ color: step.accent, opacity: 0.7 }}
                  >
                    {step.n}
                  </span>
                  <h3 className="font-marketing font-medium text-white text-[22px] md:text-[26px] leading-tight mb-3">
                    {step.title}
                  </h3>
                  <p className="font-body text-white/40 text-sm leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            </BlurFade>
          ))}
        </div>

        <BlurFade delay={0.5} inView>
          <div className="hidden lg:flex items-center justify-center mt-10 gap-4">
            {[0, 1].map((i) => (
              <div key={i} className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            ))}
          </div>
        </BlurFade>
      </div>
    </section>
  )
}
