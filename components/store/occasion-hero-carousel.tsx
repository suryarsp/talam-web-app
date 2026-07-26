'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Product, ProductCategory } from '@prisma/client'
import { ProductCard } from './product-card'
import type { OccasionTheme } from '@/lib/occasion-themes'

type ProductWithCategory = Product & {
  category?: Pick<ProductCategory, 'name'> | null
  reviewCount: number
  averageRating: number | null
  isNew: boolean
}

type Props = {
  name: string
  emoji: string | null
  theme: OccasionTheme
  featuredProducts: ProductWithCategory[]
}

export function OccasionHeroCarousel({ name, emoji, theme, featuredProducts }: Props) {
  const productSlides = [featuredProducts.slice(0, 2), featuredProducts.slice(2, 4)].filter((s) => s.length > 0)
  const slideCount = 1 + productSlides.length

  const [index, setIndex] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (slideCount > 1) {
      timerRef.current = setInterval(() => setIndex((i) => (i + 1) % slideCount), 5000)
    }
  }, [slideCount])

  useEffect(() => {
    resetTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [resetTimer])

  const goTo = (i: number) => { setIndex(i); resetTimer() }

  const touchStart = useRef<number | null>(null)
  const handleTouchStart = (e: React.TouchEvent) => { touchStart.current = e.touches[0].clientX }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null) return
    const diff = touchStart.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      goTo(diff > 0 ? (index + 1) % slideCount : (index - 1 + slideCount) % slideCount)
    }
    touchStart.current = null
  }

  return (
    <div className="relative overflow-hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        <div
          className="flex w-full shrink-0 flex-col items-center justify-center gap-2 bg-cover bg-center px-4 py-14 text-center sm:py-20"
          style={theme.image ? { backgroundImage: `${theme.gradient}, url(${theme.image})`, backgroundBlendMode: 'multiply' } : { backgroundImage: theme.gradient }}
        >
          <span className="text-5xl leading-none">{emoji || '🎉'}</span>
          <h1 className="font-heading text-2xl font-bold text-white sm:text-3xl">{name}</h1>
          <p className="font-body text-sm text-white/80 sm:text-base">{theme.headline}</p>
        </div>

        {productSlides.map((slide, i) => (
          <div key={i} className="grid w-full shrink-0 grid-cols-2 gap-3 bg-bg p-4 sm:p-6">
            {slide.map((product, j) => (
              <ProductCard key={product.id} product={product} priority={index === i + 1 && j === 0} />
            ))}
          </div>
        ))}
      </div>

      {slideCount > 1 && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
          {Array.from({ length: slideCount }, (_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`View slide ${i + 1}`}
              className={`rounded-full shadow-sm transition-all ${i === index ? 'h-1.5 w-6 bg-store-primary' : 'h-1.5 w-1.5 bg-surface/80'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
