'use client'

import { Marquee } from '@/components/ui/marquee'

const TEXTILES = ['Kanchipuram', 'Banarasi', 'Chanderi', 'Patola', 'Pochampally', 'Tussar', 'Muga', 'Bomkai', 'Gadwal', 'Paithani']

export function TextileStrip() {
  return (
    <section className="bg-bg-dark border-y border-white/[0.06] py-4 overflow-hidden">
      <Marquee pauseOnHover className="[--duration:30s] [--gap:2rem]">
        {TEXTILES.map((t) => (
          <span key={t} className="mx-4 text-2xl md:text-4xl font-marketing font-semibold text-white/[0.08] whitespace-nowrap select-none uppercase tracking-widest">
            {t}
          </span>
        ))}
      </Marquee>
    </section>
  )
}
