'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'

type Props = { images: string[]; name: string }

export function ProductImageCarousel({ images, name }: Props) {
  const [index, setIndex] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (images.length > 1) {
      timerRef.current = setInterval(() => setIndex(i => (i + 1) % images.length), 5000)
    }
  }, [images.length])

  useEffect(() => {
    resetTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [resetTimer])

  const goTo = (i: number) => { setIndex(i); resetTimer() }

  // Touch swipe
  const touchStart = useRef<number | null>(null)
  const handleTouchStart = (e: React.TouchEvent) => { touchStart.current = e.touches[0].clientX }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null) return
    const diff = touchStart.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      goTo(diff > 0 ? (index + 1) % images.length : (index - 1 + images.length) % images.length)
    }
    touchStart.current = null
  }

  if (images.length === 0) {
    return (
      <div className="flex aspect-[3/4] items-center justify-center rounded-xl bg-bg font-body text-sm text-muted-warm">
        No image
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-bg" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <Image
          key={images[index]}
          src={`${images[index]}?f_auto,q_auto,w_600`}
          alt={`${name} ${index + 1}`}
          fill
          sizes="(max-width: 640px) 100vw, 50vw"
          className="object-contain transition-opacity duration-500"
          priority={index === 0}
        />
        {images.length > 1 && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`View image ${i + 1}`}
                className={`rounded-full transition-all ${i === index ? 'h-1.5 w-6 bg-white' : 'h-1.5 w-1.5 bg-white/50'}`}
              />
            ))}
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((img, i) => (
            <button
              key={img}
              onClick={() => goTo(i)}
              className={`relative aspect-square overflow-hidden rounded-lg bg-bg ring-2 transition-all ${i === index ? 'ring-store-primary' : 'ring-transparent hover:ring-border'}`}
            >
              <Image
                src={`${img}?f_auto,q_auto,w_150`}
                alt={`${name} ${i + 1}`}
                fill
                sizes="25vw"
                className="object-contain"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
