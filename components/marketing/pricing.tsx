'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOwnerCta } from './use-owner-cta'

const PLANS = [
  {
    name: 'Starter',
    price: 499,
    popular: false,
    features: ['Up to 100 products', 'UPI, cards & COD payments', 'Shiprocket shipping', 'Basic analytics'],
  },
  {
    name: 'Pro',
    price: 1499,
    popular: true,
    features: ['Unlimited products', 'Custom domain', 'Advanced analytics', 'Priority support'],
  },
]

export function Pricing() {
  const scope = useRef<HTMLElement>(null)
  const cta = useOwnerCta()

  useEffect(() => {
    if (!scope.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    gsap.registerPlugin(ScrollTrigger)
    const ctx = gsap.context(() => {
      gsap.from('[data-plan-card]', {
        opacity: 0,
        y: 40,
        duration: 0.7,
        stagger: 0.12,
        ease: 'power3.out',
        scrollTrigger: { trigger: scope.current, start: 'top 70%' },
      })
      gsap.utils.toArray<HTMLElement>('[data-price]').forEach((el) => {
        const target = Number(el.dataset.price)
        const obj = { v: 0 }
        gsap.to(obj, {
          v: target,
          duration: 1.2,
          ease: 'power2.out',
          snap: { v: 1 },
          scrollTrigger: { trigger: scope.current, start: 'top 70%' },
          onUpdate: () => {
            el.textContent = `₹${obj.v.toLocaleString('en-IN')}`
          },
        })
      })
    }, scope)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={scope} id="pricing" className="bg-bg py-24 md:py-32">
      <div className="max-w-[900px] mx-auto px-6 md:px-[60px]">
        <div className="text-center mb-14">
          <h2 className="font-marketing font-semibold text-fg text-[34px] md:text-[48px] leading-[1.1] tracking-[-0.01em]">
            Simple pricing. No surprises.
          </h2>
          <p className="mt-4 inline-block px-5 py-2 rounded-full bg-success-bg border border-success-border text-sm font-medium text-fg font-body">
            {cta?.subtext ?? 'Start free for 14 days — no credit card, no GST needed'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              data-plan-card
              className={cn(
                'relative rounded-xl bg-surface p-8 border',
                plan.popular ? 'border-brand-primary shadow-lg shadow-brand-primary/10' : 'border-border-light'
              )}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-8 px-3 py-1 rounded-full bg-brand-primary text-white text-xs font-semibold font-body">
                  Most popular
                </span>
              )}
              <h3 className="font-body font-semibold text-fg text-lg">{plan.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span data-price={plan.price} className="font-marketing font-semibold text-fg text-[44px] leading-none">
                  ₹{plan.price.toLocaleString('en-IN')}
                </span>
                <span className="text-sm text-muted-warm font-body">/month</span>
              </div>
              <ul className="mt-7 flex flex-col gap-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-fg font-body">
                    <Check className="w-4 h-4 text-success shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={cta?.href ?? '/auth'}
                className={cn(
                  'mt-8 block text-center px-6 py-3.5 rounded-full text-sm font-semibold font-body transition-opacity hover:opacity-90',
                  plan.popular
                    ? 'bg-brand-primary text-white'
                    : 'border border-fg/20 text-fg hover:bg-bg'
                )}
              >
                {cta?.label ?? 'Start free trial'}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
