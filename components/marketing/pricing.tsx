'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BlurFade } from '@/components/ui/blur-fade'
import { ShimmerButton } from '@/components/ui/shimmer-button'

const PLANS = [
  {
    name: 'Starter',
    price: '499',
    popular: false,
    features: [
      'Up to 100 products',
      'UPI, cards & COD',
      'Shiprocket shipping',
      'WhatsApp notifications',
      'Occasion collections',
      'Basic analytics',
    ],
  },
  {
    name: 'Pro',
    price: '1,499',
    popular: true,
    features: [
      'Unlimited products',
      'Custom domain',
      'Advanced analytics',
      'Multiple staff accounts',
      'Priority support',
      'Everything in Starter',
    ],
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="bg-bg py-32 md:py-44">
      <div className="max-w-[900px] mx-auto px-6 md:px-16">
        <BlurFade delay={0.1} inView>
          <p className="text-xs uppercase tracking-[0.25em] text-brand-primary font-body font-medium text-center mb-4">Pricing</p>
          <h2 className="font-marketing font-semibold text-fg text-[34px] md:text-[52px] leading-[1.08] tracking-[-0.02em] text-center">
            Simple. Transparent. Fair.
          </h2>
          <p className="mt-5 text-center">
            <span className="inline-block px-5 py-2 rounded-full bg-success/8 border border-success/15 text-sm font-medium text-fg font-body">
              14-day free trial — no card, no GST needed
            </span>
          </p>
        </BlurFade>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6">
          {PLANS.map((plan, i) => (
            <BlurFade key={plan.name} delay={0.2 + i * 0.12} inView>
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className={cn(
                  'relative rounded-2xl bg-surface p-8 border overflow-hidden h-full flex flex-col',
                  plan.popular ? 'border-brand-primary/30 shadow-xl shadow-brand-primary/5' : 'border-border-light'
                )}
              >
                {plan.popular && (
                  <>
                    <span className="absolute -top-px left-8 px-3 py-1 rounded-b-lg bg-brand-primary text-white text-[10px] font-semibold font-body tracking-wide uppercase">
                      Popular
                    </span>
                  </>
                )}

                <h3 className="font-body font-semibold text-fg text-lg">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-marketing font-semibold text-fg text-[48px] leading-none tracking-tight">
                    ₹{plan.price}
                  </span>
                  <span className="text-sm text-muted-warm font-body">/mo</span>
                </div>

                <ul className="mt-8 flex flex-col gap-3 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-fg font-body">
                      <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  {plan.popular ? (
                    <Link href="/auth" className="block">
                      <ShimmerButton
                        shimmerColor="#ffffff"
                        background="rgba(193, 80, 46, 1)"
                        className="w-full py-3.5 text-sm font-semibold font-body"
                      >
                        Start free trial
                      </ShimmerButton>
                    </Link>
                  ) : (
                    <Link
                      href="/auth"
                      className="block text-center py-3.5 rounded-full border border-fg/15 text-fg text-sm font-semibold font-body hover:bg-bg transition-colors"
                    >
                      Start free trial
                    </Link>
                  )}
                </div>
              </motion.div>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  )
}
