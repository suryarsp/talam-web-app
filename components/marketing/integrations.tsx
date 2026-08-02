'use client'

import { useRef } from 'react'
import { BlurFade } from '@/components/ui/blur-fade'
import { AnimatedBeam } from '@/components/ui/animated-beam'

function BeamDiagram() {
  const containerRef = useRef<HTMLDivElement>(null)
  const centerRef = useRef<HTMLDivElement>(null)
  const razorpayRef = useRef<HTMLDivElement>(null)
  const shiprocketRef = useRef<HTMLDivElement>(null)
  const whatsappRef = useRef<HTMLDivElement>(null)
  const upiRef = useRef<HTMLDivElement>(null)
  const codRef = useRef<HTMLDivElement>(null)
  const trackingRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={containerRef} className="relative flex w-full items-center justify-center h-[420px] md:h-[500px]">
      {/* Left column */}
      <div className="absolute left-0 md:left-12 flex flex-col gap-12 items-center">
        <div ref={razorpayRef} className="flex items-center gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-5 py-3.5 shadow-lg shadow-blue-500/5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-400" fill="currentColor"><path d="M7.076 0.5L2.586 12.596h3.032l.834-2.374h4.756l-.886-2.59H7.93l1.65-4.706L13.026 12.596h3.032L11.108 0.5H7.076z"/><path d="M14.832 0.5l-1.628 4.56 1.118 3.14L16.766 1.316h4.416l-4.49 12.096h-2.736l-.944-2.648-1.118-3.14-.72 2.082-.834 2.374-.628 1.77h-2.736L13.274 0.5h1.558z"/></svg>
          </div>
          <span className="text-sm font-semibold text-blue-400 font-body">Razorpay</span>
        </div>
        <div ref={shiprocketRef} className="flex items-center gap-3 rounded-2xl border border-orange-500/20 bg-orange-500/10 px-5 py-3.5 shadow-lg shadow-orange-500/5">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          </div>
          <span className="text-sm font-semibold text-orange-400 font-body">Shiprocket</span>
        </div>
        <div ref={whatsappRef} className="flex items-center gap-3 rounded-2xl border border-green-500/20 bg-green-500/10 px-5 py-3.5 shadow-lg shadow-green-500/5">
          <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-green-400" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          </div>
          <span className="text-sm font-semibold text-green-400 font-body">WhatsApp</span>
        </div>
      </div>

      {/* Center — Talam */}
      <div ref={centerRef} className="z-20 flex items-center justify-center w-20 h-20 rounded-2xl bg-brand-primary shadow-2xl shadow-brand-primary/40">
        <span className="font-marketing font-bold text-white text-2xl">T</span>
      </div>

      {/* Right column */}
      <div className="absolute right-0 md:right-12 flex flex-col gap-12 items-center">
        <div ref={upiRef} className="flex items-center gap-3 rounded-2xl border border-purple-500/20 bg-purple-500/10 px-5 py-3.5 shadow-lg shadow-purple-500/5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-purple-400" fill="currentColor"><path d="M10.5 13.5l2-8h2l-2 8h-2zm-3-8h2l-4 16h-2l4-16zm7 0h2l-4 16h-2l4-16z"/></svg>
          </div>
          <span className="text-sm font-semibold text-purple-400 font-body">UPI</span>
        </div>
        <div ref={codRef} className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-3.5 shadow-lg shadow-amber-500/5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 12h.01"/><path d="M17 12h.01"/><path d="M7 12h.01"/></svg>
          </div>
          <span className="text-sm font-semibold text-amber-400 font-body">COD</span>
        </div>
        <div ref={trackingRef} className="flex items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-3.5 shadow-lg shadow-rose-500/5">
          <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0116 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <span className="text-sm font-semibold text-rose-400 font-body">Tracking</span>
        </div>
      </div>

      {/* Beams: left → center */}
      <AnimatedBeam containerRef={containerRef} fromRef={razorpayRef} toRef={centerRef} gradientStartColor="#3b82f6" gradientStopColor="#c1502e" curvature={-50} duration={4} pathColor="rgba(255,255,255,0.08)" pathWidth={2} />
      <AnimatedBeam containerRef={containerRef} fromRef={shiprocketRef} toRef={centerRef} gradientStartColor="#f97316" gradientStopColor="#c1502e" duration={4} delay={0.5} pathColor="rgba(255,255,255,0.08)" pathWidth={2} />
      <AnimatedBeam containerRef={containerRef} fromRef={whatsappRef} toRef={centerRef} gradientStartColor="#22c55e" gradientStopColor="#c1502e" curvature={50} duration={4} delay={1} pathColor="rgba(255,255,255,0.08)" pathWidth={2} />

      {/* Beams: center → right */}
      <AnimatedBeam containerRef={containerRef} fromRef={centerRef} toRef={upiRef} gradientStartColor="#c1502e" gradientStopColor="#a855f7" curvature={-50} duration={4} delay={0.3} pathColor="rgba(255,255,255,0.08)" pathWidth={2} />
      <AnimatedBeam containerRef={containerRef} fromRef={centerRef} toRef={codRef} gradientStartColor="#c1502e" gradientStopColor="#f59e0b" duration={4} delay={0.8} pathColor="rgba(255,255,255,0.08)" pathWidth={2} />
      <AnimatedBeam containerRef={containerRef} fromRef={centerRef} toRef={trackingRef} gradientStartColor="#c1502e" gradientStopColor="#f43f5e" curvature={50} duration={4} delay={1.3} pathColor="rgba(255,255,255,0.08)" pathWidth={2} />
    </div>
  )
}

export function Integrations() {
  return (
    <section className="bg-bg-dark py-32 md:py-44 overflow-hidden border-t border-white/[0.06]">
      <div className="max-w-[1200px] mx-auto px-6 md:px-16">
        <BlurFade delay={0.1} inView>
          <p className="text-xs uppercase tracking-[0.25em] text-amber font-body font-medium text-center mb-4">Integrations</p>
          <h2 className="font-marketing font-semibold text-white text-[34px] md:text-[48px] leading-[1.08] tracking-[-0.02em] text-center max-w-[600px] mx-auto">
            Works with what India already uses.
          </h2>
          <p className="mt-5 text-base text-white/40 font-body leading-relaxed max-w-[500px] mx-auto text-center">
            Razorpay for payments. Shiprocket for logistics. WhatsApp for notifications. All pre-wired — you just flip the switch.
          </p>
        </BlurFade>

        <BlurFade delay={0.2} inView>
          <div className="mt-16">
            <BeamDiagram />
          </div>
        </BlurFade>

        {/* Integration rows */}
        <div className="mt-12 max-w-[700px] mx-auto space-y-4">
          {[
            { label: 'Payments', items: ['Razorpay', 'UPI', 'Cards', 'Net Banking', 'COD'], color: 'text-blue-400' },
            { label: 'Shipping', items: ['Shiprocket', 'Live Tracking', 'Auto Labels'], color: 'text-orange-400' },
            { label: 'Notifications', items: ['WhatsApp', 'SMS', 'Email'], color: 'text-green-400' },
          ].map((row, i) => (
            <BlurFade key={row.label} delay={0.3 + i * 0.1} inView>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2.5 sm:w-[130px] shrink-0">
                  <span className={`text-sm font-semibold ${row.color} font-body`}>{row.label}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {row.items.map((item) => (
                    <span key={item} className="px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.04] text-[11px] text-white/60 font-body">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  )
}
