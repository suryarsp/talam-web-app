'use client'

import { useRef, type ReactNode } from 'react'

// Client-only shell for the scroll buttons — takes already-rendered server children,
// never raw product data, so Decimal fields never have to cross the RSC boundary.
export function CarouselScroller({ children }: { children: ReactNode }) {
  const scrollerRef = useRef<HTMLDivElement>(null)

  const scrollByCard = (direction: 1 | -1) => {
    scrollerRef.current?.scrollBy({ left: direction * 280, behavior: 'smooth' })
  }

  return (
    <div className="relative">
      <div className="mb-3 hidden justify-end gap-2 sm:flex">
        <button
          type="button"
          onClick={() => scrollByCard(-1)}
          aria-label="Scroll left"
          className="flex size-9 items-center justify-center rounded-full border border-border text-fg hover:bg-bg"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => scrollByCard(1)}
          aria-label="Scroll right"
          className="flex size-9 items-center justify-center rounded-full border border-border text-fg hover:bg-bg"
        >
          ›
        </button>
      </div>

      <div ref={scrollerRef} className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:gap-6">
        {children}
      </div>
    </div>
  )
}
