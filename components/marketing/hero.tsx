'use client'

import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import { useState, useEffect } from 'react'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { BlurFade } from '@/components/ui/blur-fade'
import { Particles } from '@/components/ui/particles'
import { AnimatedShinyText } from '@/components/ui/animated-shiny-text'
import { BorderBeam } from '@/components/ui/border-beam'
import { TypingAnimation } from '@/components/ui/typing-animation'
import { PhoneFrame } from '@/components/marketing/phone-frame'
import { ArrowRight, ShoppingBag, Star, CreditCard, Package, Bell, Search, User, Home } from 'lucide-react'

const WORDS = ['Sarees', 'Lehengas', 'Kurtas', 'Dupattas', 'Fabrics']

function StoreScreen() {
  return (
    <div className="w-full text-left">
      <div className="px-5 pb-3 border-b border-border-light">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-heading font-bold text-fg text-base leading-tight">Meena Silks</div>
            <div className="text-[9px] text-muted-warm font-body mt-0.5">meenasilks.talam4shop.com</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center">
            <ShoppingBag className="w-3.5 h-3.5 text-brand-primary" />
          </div>
        </div>
        <div className="h-[80px] rounded-xl bg-gradient-to-r from-brand-primary/20 via-amber/10 to-brand-primary/10 flex items-center px-4">
          <div>
            <div className="text-[9px] uppercase tracking-wider text-brand-primary font-body font-semibold">Wedding Collection</div>
            <div className="text-[13px] font-heading font-bold text-fg mt-0.5">Bridal Kanchipuram</div>
            <div className="text-[9px] text-muted-warm font-body mt-0.5">Starting ₹3,999</div>
          </div>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-[10px] font-semibold text-fg font-body">New Arrivals</span>
          <span className="text-[9px] text-brand-primary font-body">See all →</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { name: 'Kanchipuram Silk', price: '₹4,899', color: '#E8577E' },
            { name: 'Banarasi Saree', price: '₹3,299', color: '#4F3FF0' },
            { name: 'Cotton Kurta', price: '₹1,299', color: '#F59E0B' },
            { name: 'Patola Dupatta', price: '₹899', color: '#10B981' },
          ].map((p) => (
            <div key={p.name} className="rounded-xl bg-bg overflow-hidden border border-border-light">
              <div className="h-[72px] relative" style={{ background: `linear-gradient(145deg, ${p.color}18, ${p.color}08)` }}>
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/80 flex items-center justify-center">
                  <Star className="w-2.5 h-2.5 text-muted-warm" />
                </div>
              </div>
              <div className="p-2">
                <div className="text-[9px] font-medium text-fg font-body truncate leading-tight">{p.name}</div>
                <div className="text-[10px] font-bold text-fg font-body mt-0.5">{p.price}</div>
                <div className="flex gap-0.5 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-[7px] h-[7px] text-amber fill-amber" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CheckoutScreen() {
  return (
    <div className="w-full p-4 space-y-3 text-left">
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

function OrdersScreen() {
  return (
    <div className="w-full p-4 space-y-3 text-left">
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

function TrackingScreen() {
  return (
    <div className="w-full p-4 space-y-3 text-left">
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

const SCREENS = [
  { key: 'store', component: StoreScreen },
  { key: 'checkout', component: CheckoutScreen },
  { key: 'orders', component: OrdersScreen },
  { key: 'tracking', component: TrackingScreen },
]

function CyclingPhone() {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setIdx((i) => (i + 1) % SCREENS.length), 3500)
    return () => clearInterval(timer)
  }, [])

  const Screen = SCREENS[idx].component

  return (
    <PhoneFrame className="w-[260px] md:w-[300px] mx-auto">
      <BorderBeam size={150} duration={10} colorFrom="#c1502e" colorTo="#f59e0b" borderWidth={2} />
      {/* Status bar */}
      <div className="flex items-center justify-between px-5 pt-3 pb-1">
        <span className="text-[10px] font-medium text-fg/60 font-body">9:41</span>
        <div className="flex gap-1">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-[14px] h-[10px] rounded-sm bg-fg/20" />
          ))}
        </div>
      </div>
      <div className="relative min-h-[420px] overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={SCREENS[idx].key}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          >
            <Screen />
          </motion.div>
        </AnimatePresence>
      </div>
      {/* Bottom nav */}
      <div className="flex justify-around items-center py-3 px-4 border-t border-border-light">
        {[
          { icon: Home, label: 'Home', active: idx === 0 },
          { icon: Search, label: 'Search', active: false },
          { icon: ShoppingBag, label: 'Cart', active: idx === 1 },
          { icon: User, label: 'Account', active: false },
        ].map(({ icon: Icon, label, active }) => (
          <div key={label} className="flex flex-col items-center gap-0.5">
            <Icon className={`w-4 h-4 ${active ? 'text-brand-primary' : 'text-muted-warm'}`} />
            <span className={`text-[7px] font-body ${active ? 'text-brand-primary font-semibold' : 'text-muted-warm'}`}>{label}</span>
          </div>
        ))}
      </div>
    </PhoneFrame>
  )
}

export function Hero() {
  return (
    <section className="relative min-h-dvh bg-bg-dark overflow-hidden flex items-center">
      <Particles className="absolute inset-0 z-0" quantity={50} color="#c1502e" size={0.5} staticity={40} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] rounded-full bg-brand-primary/8 blur-[160px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-amber/6 blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[1280px] mx-auto px-6 md:px-16 pt-28 pb-20">
        <div className="grid lg:grid-cols-[1fr_380px] gap-16 lg:gap-20 items-center">
          {/* Left: Copy */}
          <div>
            <BlurFade delay={0.05} inView>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/[0.04] mb-8">
                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <AnimatedShinyText className="text-xs font-body text-white/60">
                  Now live — built for Indian textile retailers
                </AnimatedShinyText>
              </div>
            </BlurFade>

            <BlurFade delay={0.15} inView>
              <h1 className="font-marketing font-semibold text-white text-[44px] sm:text-[56px] md:text-[72px] leading-[1.02] tracking-[-0.03em]">
                Your own store
                <br />
                <span className="text-white/40">for{' '}</span>
                <TypingAnimation
                  words={WORDS}
                  className="text-amber font-marketing font-semibold text-[44px] sm:text-[56px] md:text-[72px] leading-[1.02] tracking-[-0.03em]"
                  duration={80}
                  deleteSpeed={50}
                  pauseDelay={1800}
                  loop
                  startOnView
                  showCursor
                  cursorStyle="line"
                />
              </h1>
            </BlurFade>

            <BlurFade delay={0.35} inView>
              <p className="mt-7 text-lg md:text-xl text-white/40 font-body leading-relaxed max-w-[520px]">
                Stop selling through DMs. Launch a professional online store
                for your textile business in 14 minutes — from your phone.
              </p>
            </BlurFade>

            <BlurFade delay={0.5} inView>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link href="/auth">
                  <ShimmerButton
                    shimmerColor="#ffffff"
                    background="rgba(193, 80, 46, 1)"
                    className="px-8 py-4 text-base font-semibold font-body"
                  >
                    Start free — no card needed
                  </ShimmerButton>
                </Link>
                <a
                  href="https://silk.talam4shop.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 px-6 py-4 text-white/50 text-base font-body hover:text-white/80 transition-colors"
                >
                  See live store
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </a>
              </div>
            </BlurFade>

            <BlurFade delay={0.65} inView>
              <div className="mt-8 flex items-center gap-6">
                {[
                  ['14 days', 'Free trial'],
                  ['₹0', 'Setup cost'],
                  ['14 min', 'To go live'],
                ].map(([val, label]) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white/70 font-body">{val}</span>
                    <span className="text-xs text-white/30 font-body">{label}</span>
                  </div>
                ))}
              </div>
            </BlurFade>
          </div>

          {/* Right: Phone with cycling screens */}
          <BlurFade delay={0.3} inView direction="right">
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <CyclingPhone />
            </motion.div>
          </BlurFade>
        </div>
      </div>
    </section>
  )
}
