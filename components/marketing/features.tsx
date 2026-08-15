'use client'

import { motion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import { BlurFade } from '@/components/ui/blur-fade'
import { MagicCard } from '@/components/ui/magic-card'
import { AnimatedList, AnimatedListItem } from '@/components/ui/animated-list'
import { NumberTicker } from '@/components/ui/number-ticker'
import { PhoneFrame } from '@/components/marketing/phone-frame'
import {
  Store, ShoppingBag, CreditCard, Truck, Palette,
  Smartphone, Calendar, BarChart3, MessageCircle, Globe,
  Star, Package, Bell,
} from 'lucide-react'

function FeaturePhone({ children }: { children: React.ReactNode }) {
  return (
    <PhoneFrame className="w-[220px] md:w-[250px] mx-auto shrink-0">
      {children}
    </PhoneFrame>
  )
}

function DashboardMock() {
  return (
    <div className="p-4 space-y-3 text-left">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-heading font-bold text-fg">Dashboard</span>
        <Bell className="w-3.5 h-3.5 text-muted-warm" />
      </div>
      {[
        { label: "Today's Orders", val: '12', color: 'text-brand-primary' },
        { label: 'Revenue', val: '₹34,200', color: 'text-success' },
        { label: 'Pending', val: '3', color: 'text-amber' },
      ].map((s) => (
        <div key={s.label} className="flex items-center justify-between rounded-lg border border-border-light p-3">
          <span className="text-[9px] text-muted-warm font-body">{s.label}</span>
          <span className={`text-[12px] font-bold font-body ${s.color}`}>{s.val}</span>
        </div>
      ))}
      <div className="rounded-lg border border-border-light p-3">
        <span className="text-[9px] font-semibold text-fg font-body block mb-2">Recent Orders</span>
        {['Priya — Silk Saree', 'Meera — Dupatta Set', 'Anita — Kurta'].map((o, i) => (
          <div key={o} className="flex items-center justify-between py-1.5 border-t border-border-light first:border-0">
            <span className="text-[8px] text-fg font-body">{o}</span>
            <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-success' : 'bg-amber'}`} />
          </div>
        ))}
      </div>
    </div>
  )
}

function PaymentMock() {
  return (
    <div className="p-4 space-y-3 text-left">
      <span className="text-[11px] font-heading font-bold text-fg block">Checkout</span>
      <div className="rounded-xl border border-border-light p-3 space-y-2">
        <div className="flex justify-between">
          <span className="text-[9px] text-fg font-body">Kanchipuram Silk Saree</span>
          <span className="text-[9px] font-bold text-fg font-body">₹4,899</span>
        </div>
        <div className="border-t border-border-light pt-2 flex justify-between">
          <span className="text-[9px] font-semibold text-fg font-body">Total</span>
          <span className="text-[10px] font-bold text-brand-primary font-body">₹4,899</span>
        </div>
      </div>
      <div className="space-y-1.5">
        <span className="text-[9px] font-semibold text-fg font-body block">Pay with</span>
        {['UPI / Google Pay', 'Debit / Credit Card', 'Cash on Delivery'].map((m, i) => (
          <div key={m} className={`flex items-center gap-2 rounded-lg border p-2.5 ${i === 0 ? 'border-brand-primary bg-brand-primary/5' : 'border-border-light'}`}>
            <div className={`w-3 h-3 rounded-full border-2 ${i === 0 ? 'border-brand-primary bg-brand-primary' : 'border-border-light'}`} />
            <span className="text-[8px] text-fg font-body">{m}</span>
          </div>
        ))}
      </div>
      <div className="rounded-lg bg-brand-primary py-2.5 text-center">
        <span className="text-[9px] font-semibold text-white font-body">Pay ₹4,899</span>
      </div>
    </div>
  )
}

function ShippingMock() {
  return (
    <div className="p-4 space-y-3 text-left">
      <span className="text-[11px] font-heading font-bold text-fg block">Order #1042</span>
      <div className="rounded-xl border border-success/20 bg-success/5 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-3 h-3 text-success" />
          <span className="text-[9px] font-semibold text-success font-body">Shipped via Shiprocket</span>
        </div>
        <div className="space-y-2 ml-5">
          {[
            { s: 'Order placed', done: true },
            { s: 'Picked up', done: true },
            { s: 'In transit — Chennai', done: true },
            { s: 'Out for delivery', done: false },
          ].map((step) => (
            <div key={step.s} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${step.done ? 'bg-success' : 'bg-border-light'}`} />
              <span className={`text-[8px] font-body ${step.done ? 'text-fg' : 'text-muted-warm'}`}>{step.s}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-border-light p-3">
        <span className="text-[8px] text-muted-warm font-body">Tracking: SRK928374651</span>
        <div className="mt-1 text-[8px] text-fg font-body">Est. delivery: Tomorrow, 4 PM</div>
      </div>
    </div>
  )
}

const SHOWCASE_SECTIONS = [
  {
    tag: 'Storefront',
    title: 'A store that looks like yours, not ours.',
    desc: 'Your brand name, your colours, your logo. Customers see a professional online store — not a marketplace listing.',
    icon: Store,
    phone: null as React.ReactNode, // will be set below
  },
  {
    tag: 'Orders',
    title: 'Every order in one dashboard.',
    desc: 'No more DMs, no more screenshots. See all orders, update status, and track revenue from one screen.',
    icon: ShoppingBag,
    phone: <DashboardMock />,
  },
  {
    tag: 'Payments',
    title: 'UPI, cards, COD — all built in.',
    desc: 'Razorpay handles payments. Money goes directly to your bank account. Your customers pay the way they already know.',
    icon: CreditCard,
    phone: <PaymentMock />,
  },
  {
    tag: 'Shipping',
    title: 'Ship anywhere in India.',
    desc: 'Shiprocket is built in. Generate a label in one click. Your customer gets a tracking link via WhatsApp automatically.',
    icon: Truck,
    phone: <ShippingMock />,
  },
]

function FeatureShowcase({ section, index }: { section: typeof SHOWCASE_SECTIONS[number]; index: number }) {
  const reversed = index % 2 === 1
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [40, -40])

  return (
    <div ref={ref} className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center ${reversed ? 'lg:[direction:rtl]' : ''}`}>
      <div className={reversed ? 'lg:[direction:ltr]' : ''}>
        <BlurFade delay={0.1} inView>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center">
              <section.icon className="w-4 h-4 text-brand-primary" />
            </div>
            <span className="text-xs uppercase tracking-[0.2em] text-brand-primary font-body font-medium">{section.tag}</span>
          </div>
        </BlurFade>

        <BlurFade delay={0.2} inView>
          <h3 className="font-marketing font-semibold text-fg text-[28px] md:text-[40px] leading-[1.1] tracking-[-0.01em]">
            {section.title}
          </h3>
        </BlurFade>

        <BlurFade delay={0.3} inView>
          <p className="mt-4 text-base text-muted-warm font-body leading-relaxed max-w-[440px]">
            {section.desc}
          </p>
        </BlurFade>
      </div>

      <div className={`flex justify-center ${reversed ? 'lg:[direction:ltr]' : ''}`}>
        <BlurFade delay={0.25} inView direction={reversed ? 'left' : 'right'}>
          <motion.div style={{ y }}>
            <FeaturePhone>
              {section.phone ?? <StoreFrontMock />}
            </FeaturePhone>
          </motion.div>
        </BlurFade>
      </div>
    </div>
  )
}

function StoreFrontMock() {
  return (
    <div className="text-left">
      <div className="px-4 py-3 border-b border-border-light">
        <div className="font-heading font-bold text-fg text-[13px]">Meena Silks</div>
        <div className="text-[8px] text-muted-warm font-body">Premium Handloom Sarees</div>
      </div>
      <div className="h-[70px] bg-gradient-to-r from-brand-primary/15 to-amber/10 flex items-center px-4">
        <div>
          <div className="text-[8px] uppercase tracking-wider text-brand-primary font-body font-semibold">Wedding Season</div>
          <div className="text-[11px] font-heading font-bold text-fg mt-0.5">Bridal Collection 2026</div>
        </div>
      </div>
      <div className="px-3 py-2">
        <div className="flex gap-2 mb-2 overflow-hidden">
          {['All', 'Silk', 'Cotton', 'Bridal'].map((c, i) => (
            <span key={c} className={`px-2.5 py-1 rounded-full text-[7px] font-body whitespace-nowrap ${i === 0 ? 'bg-brand-primary text-white' : 'bg-bg text-fg border border-border-light'}`}>
              {c}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { n: 'Kanchipuram Silk', p: '₹4,899', c: '#E8577E' },
            { n: 'Banarasi Zari', p: '₹3,299', c: '#4F3FF0' },
            { n: 'Chanderi Cotton', p: '₹1,799', c: '#F59E0B' },
            { n: 'Gadwal Silk', p: '₹2,499', c: '#10B981' },
          ].map((p) => (
            <div key={p.n} className="rounded-lg overflow-hidden border border-border-light">
              <div className="h-[52px]" style={{ background: `linear-gradient(145deg, ${p.c}15, ${p.c}05)` }} />
              <div className="p-1.5">
                <div className="text-[7px] font-medium text-fg font-body truncate">{p.n}</div>
                <div className="text-[8px] font-bold text-fg font-body">{p.p}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const MORE_FEATURES = [
  { icon: Palette, title: 'White-label branding', desc: 'Your colours, logo, story.' },
  { icon: Smartphone, title: 'Mobile-first admin', desc: 'Manage from your phone.' },
  { icon: Calendar, title: 'Occasion collections', desc: 'Diwali, Wedding, Pongal.' },
  { icon: BarChart3, title: 'Sales analytics', desc: 'What sells, when, to whom.' },
  { icon: MessageCircle, title: 'WhatsApp alerts', desc: 'Auto order & shipping updates.' },
  { icon: Globe, title: 'Custom domain', desc: 'yoursilks.com — yours.' },
]

export function Features() {
  return (
    <section id="features" className="relative bg-surface overflow-hidden">
      {/* Showcase sections */}
      <div className="max-w-[1200px] mx-auto px-6 md:px-16">
        <div className="py-24 md:py-32 border-b border-border-light">
          <BlurFade delay={0.1} inView>
            <p className="text-xs uppercase tracking-[0.25em] text-brand-primary font-body font-medium text-center mb-4">Features</p>
            <h2 className="font-marketing font-semibold text-fg text-[34px] md:text-[52px] leading-[1.08] tracking-[-0.02em] text-center max-w-[700px] mx-auto">
              Everything your textile business needs. Nothing you have to build.
            </h2>
          </BlurFade>
        </div>

        <div className="divide-y divide-border-light">
          {SHOWCASE_SECTIONS.map((section, i) => (
            <div key={section.tag} className="py-24 md:py-32">
              <FeatureShowcase section={section} index={i} />
            </div>
          ))}
        </div>
      </div>

      {/* More features grid */}
      <div className="bg-bg py-24 md:py-32 border-t border-border-light">
        <div className="max-w-[1200px] mx-auto px-6 md:px-16">
          <BlurFade delay={0.1} inView>
            <h3 className="font-marketing font-semibold text-fg text-[28px] md:text-[36px] leading-[1.1] tracking-[-0.01em] text-center mb-14">
              And so much more.
            </h3>
          </BlurFade>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {MORE_FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <BlurFade key={title} delay={0.05 + i * 0.06} inView>
                <MagicCard
                  className="rounded-xl cursor-default h-full"
                  gradientColor="#c1502e08"
                  gradientFrom="#c1502e"
                  gradientTo="#f59e0b"
                >
                  <div className="p-5 md:p-6">
                    <Icon className="w-5 h-5 text-brand-primary mb-3" />
                    <h4 className="font-body font-semibold text-fg text-sm mb-1">{title}</h4>
                    <p className="font-body text-xs text-muted-warm leading-relaxed">{desc}</p>
                  </div>
                </MagicCard>
              </BlurFade>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
