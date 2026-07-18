'use client'

import { Suspense, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import { StoreLink, useStoreBase } from '@/components/store/store-context'
import Image from 'next/image'
import { hapticError } from '@/lib/haptics'

type BannerData = {
  headline: string
  subtitle: string
  slug: string
  price: number
  comparePrice: number | null
  sizes: string[]
  reviewCount: number
  averageRating: number
}

type PromotionData = {
  offerText: string
  subtitle: string | null
  endsAt: string | null
}

type TagData = {
  id: string
  name: string
  slug: string
  emoji: string | null
  productCount: number
}

type CategoryData = { id: string; name: string; slug: string }

type ProductData = {
  name: string
  slug: string
  price: number
  comparePrice: number | null
  category: string
  sizes: string[]
  images: string[]
  reviewCount: number
  averageRating: number
  isNew: boolean
}

type StorePageClientProps = {
  banners: BannerData[]
  promotions: PromotionData[]
  countdownTarget: string | null
  tags: TagData[]
  categories: CategoryData[]
  products: ProductData[]
  offers: ProductData[]
}

// ponytail: fixed palette cycled by index for category card backgrounds — no per-category color field in schema.
const CATEGORY_GRADIENTS = [
  'linear-gradient(135deg, oklab(53.1% 0.201 0.020), oklab(41.5% 0.160 -0.012))',
  'linear-gradient(135deg, #1565c0, #0d47a1)',
  'linear-gradient(135deg, #e65100, #bf360c)',
  'linear-gradient(135deg, #2e7d32, #1b5e20)',
  'linear-gradient(135deg, #1565c0, #283593)',
  'linear-gradient(135deg, #4a148c, #311b92)',
]

const SORT_OPTIONS = ['Newest First', 'Price: Low to High', 'Price: High to Low', 'Rating'] as const

const PRODUCTS_PER_PAGE = 6

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
      <polyline points="2,6 5,9 10,3" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function HeartIcon({ size = 12, color = '#8B7D7A' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="none" stroke={color} strokeWidth="1.8" />
    </svg>
  )
}

function CartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="21" r="1" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      <circle cx="20" cy="21" r="1" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function ImagePlaceholder() {
  return (
    <svg width="64" height="64" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="rgb(255 255 255 / 20%)" />
      <circle cx="8.5" cy="8.5" r="1.5" fill="none" stroke="rgb(255 255 255 / 20%)" />
      <path d="M21 15l-5-5L5 21" fill="none" stroke="rgb(255 255 255 / 20%)" />
    </svg>
  )
}

function useCountdown(targetIso: string | null) {
  // ponytail: `now` starts null so server and first client render agree (both skip
  // the timer). Date.now() only runs after mount, avoiding a hydration mismatch.
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    if (!targetIso) return
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [targetIso])

  if (!targetIso || now === null) return null
  const target = new Date(targetIso).getTime()
  const seconds = Math.max(0, Math.floor((target - now) / 1000))
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [String(h).padStart(2, '0'), String(m).padStart(2, '0'), String(s).padStart(2, '0')] as const
}

function toggle<T>(set: Set<T>, val: T): Set<T> {
  const next = new Set(set)
  next.has(val) ? next.delete(val) : next.add(val)
  return next
}

function discountLabel(price: number, comparePrice: number | null) {
  if (!comparePrice || comparePrice <= price) return null
  const pct = Math.round((1 - price / comparePrice) * 100)
  return `${pct}% OFF`
}

export function StorePageClient(props: StorePageClientProps) {
  return (
    <Suspense fallback={null}>
      <StorePageInner {...props} />
    </Suspense>
  )
}

function StorePageInner({ banners, promotions, countdownTarget, tags, categories, products, offers }: StorePageClientProps) {
  // ── Header nav filter params (Women/Men/Festive/New Arrivals — see StoreHeader) ──
  const searchParams = useSearchParams()

  // ── Derived product display data ──
  const allProductsData = useMemo(
    () =>
      products.map((p) => ({
        ...p,
        badge: p.isNew ? 'NEW' : null,
        discount: discountLabel(p.price, p.comparePrice),
      })),
    [products]
  )

  const CATEGORY_OPTIONS = useMemo(() => categories.map((c) => c.name), [categories])
  const SIZE_OPTIONS = useMemo(() => Array.from(new Set(products.flatMap((p) => p.sizes))).sort(), [products])

  const newThisWeek = useMemo(() => allProductsData.filter((p) => p.isNew).slice(0, 5), [allProductsData])

  // ── Carousel ──
  const [heroIndex, setHeroIndex] = useState(0)
  const [activeSize, setActiveSize] = useState('XS')
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hero = banners[heroIndex]

  const startAutoplay = useCallback(() => {
    if (autoplayRef.current) clearInterval(autoplayRef.current)
    if (banners.length <= 1) return
    if (document.visibilityState !== 'visible') return
    autoplayRef.current = setInterval(() => setHeroIndex((i) => (i + 1) % banners.length), 5000)
  }, [banners.length])

  const stopAutoplay = useCallback(() => {
    if (autoplayRef.current) { clearInterval(autoplayRef.current); autoplayRef.current = null }
  }, [])

  useEffect(() => {
    startAutoplay()
    return stopAutoplay
  }, [startAutoplay, stopAutoplay])

  const goTo = (i: number) => { setHeroIndex(i); stopAutoplay() }
  const prevHero = () => goTo((heroIndex - 1 + banners.length) % banners.length)
  const nextHero = () => goTo((heroIndex + 1) % banners.length)

  // ── Hero swipe ──
  const heroTouchStart = useRef<number | null>(null)
  const handleHeroTouchStart = (e: React.TouchEvent) => { heroTouchStart.current = e.touches[0].clientX }
  const handleHeroTouchEnd = (e: React.TouchEvent) => {
    if (heroTouchStart.current === null) return
    const diff = heroTouchStart.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 40) diff > 0 ? nextHero() : prevHero()
    heroTouchStart.current = null
  }

  // ── Timer ──
  const countdown = useCountdown(countdownTarget)

  // ── Filters ──
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [selectedSizes, setSelectedSizes] = useState<Set<string>>(new Set())
  const [priceMin, setPriceMin] = useState('500')
  const [priceMax, setPriceMax] = useState('5000')
  const [sortBy, setSortBy] = useState<string>('Newest First')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PRODUCTS_PER_PAGE)

  useEffect(() => {
    if (searchParams.get('sort') === 'newest') setSortBy('Newest First')
  }, [searchParams])

  const activeFilterCount = (selectedCategories.size > 0 ? 1 : 0) + (selectedSizes.size > 0 ? 1 : 0)

  const priceRangeInvalid = Number(priceMin) > Number(priceMax) && Number(priceMax) > 0
  const priceErrorShown = useRef(false)
  useEffect(() => {
    if (priceRangeInvalid && !priceErrorShown.current) {
      hapticError()
      priceErrorShown.current = true
    } else if (!priceRangeInvalid) {
      priceErrorShown.current = false
    }
  }, [priceRangeInvalid])

  const filteredProducts = allProductsData.filter(p => {
    if (selectedCategories.size > 0 && !selectedCategories.has(p.category)) return false
    if (selectedSizes.size > 0 && !p.sizes.some(s => selectedSizes.has(s))) return false
    const min = Number(priceMin) || 0
    const max = Number(priceMax) || Infinity
    if (p.price < min || p.price > max) return false
    return true
  }).sort((a, b) => {
    if (sortBy === 'Price: Low to High') return a.price - b.price
    if (sortBy === 'Price: High to Low') return b.price - a.price
    if (sortBy === 'Rating') return b.averageRating - a.averageRating
    return 0
  })

  const visibleProducts = filteredProducts.slice(0, visibleCount)
  const hasMore = visibleCount < filteredProducts.length

  const handleReset = () => {
    setSelectedCategories(new Set())
    setSelectedSizes(new Set())
    setPriceMin('500')
    setPriceMax('5000')
    setVisibleCount(PRODUCTS_PER_PAGE)
  }

  const removeFilterChip = (type: 'category' | 'size', val: string) => {
    if (type === 'category') setSelectedCategories(s => { const n = new Set(s); n.delete(val); return n })
    if (type === 'size') setSelectedSizes(s => { const n = new Set(s); n.delete(val); return n })
  }

  const activeChips: { type: 'category' | 'size'; label: string; value: string }[] = [
    ...[...selectedCategories].map(v => ({ type: 'category' as const, label: v, value: v })),
    ...[...selectedSizes].map(v => ({ type: 'size' as const, label: `Size ${v}`, value: v })),
  ]

  // ── Filter sidebar (shared between desktop and mobile sheet) ──
  const filterPanel = (
    <>
      <p className="text-fg text-base font-bold font-body leading-5 mb-5">Filters</p>

      {/* Category */}
      <div className="border-b border-[#F0E8D8] mb-5 pb-5">
        <p className="text-[#8B7D7A] text-[11px] font-bold font-body uppercase tracking-[0.08em] leading-[14px] mb-3">Category</p>
        <div className="flex flex-col gap-2">
          {CATEGORY_OPTIONS.map(c => {
            const checked = selectedCategories.has(c)
            return (
              <label key={c} className="flex items-center gap-2 cursor-pointer" onClick={() => setSelectedCategories(s => toggle(s, c))}>
                <span className={`w-4 h-4 rounded shrink-0 border-[1.5px] flex items-center justify-center transition-colors ${checked ? 'bg-store-primary border-store-primary' : 'bg-white border-border'}`}>
                  {checked && <CheckIcon />}
                </span>
                <span className="text-fg text-[13px] font-body leading-4">{c}</span>
                <span className="text-[#B0A090] text-[11px] font-body ml-auto">({allProductsData.filter(p => p.category === c).length})</span>
              </label>
            )
          })}
        </div>
      </div>

      {/* Size */}
      <div className="border-b border-[#F0E8D8] mb-5 pb-5">
        <p className="text-[#8B7D7A] text-[11px] font-bold font-body uppercase tracking-[0.08em] leading-[14px] mb-3">Size</p>
        <div className="flex flex-wrap gap-1.5">
          {SIZE_OPTIONS.map(s => {
            const active = selectedSizes.has(s)
            return (
              <button key={s} onClick={() => setSelectedSizes(set => toggle(set, s))} className={`px-3 py-1.5 rounded-md border-[1.5px] text-[12px] font-body leading-4 transition-colors ${active ? 'bg-store-primary/6 border-store-primary text-store-primary font-semibold' : 'border-border text-[#8B7D7A] hover:border-[#8B7D7A]'}`}>
                {s}
              </button>
            )
          })}
        </div>
      </div>

      {/* Price Range */}
      <div className="mb-5">
        <p className="text-[#8B7D7A] text-[11px] font-bold font-body uppercase tracking-[0.08em] leading-[14px] mb-3">Price Range</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 border-[1.5px] border-border rounded-md px-2.5 py-[7px] focus-within:border-store-primary transition-colors">
            <input type="number" value={priceMin} onChange={e => setPriceMin(e.target.value)} className="text-fg text-[12px] font-body bg-transparent outline-none w-full" placeholder="Min" />
          </div>
          <span className="text-[#B0A090] text-[12px] font-body">–</span>
          <div className="flex-1 border-[1.5px] border-border rounded-md px-2.5 py-[7px] focus-within:border-store-primary transition-colors">
            <input type="number" value={priceMax} onChange={e => setPriceMax(e.target.value)} className="text-fg text-[12px] font-body bg-transparent outline-none w-full" placeholder="Max" />
          </div>
        </div>
        {priceRangeInvalid && (
          <p className="text-danger text-[10px] font-body mt-1">Min price cannot exceed max price</p>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <button onClick={() => { setVisibleCount(PRODUCTS_PER_PAGE); setShowMobileFilters(false) }} className="flex-1 py-2.5 rounded-lg border-[1.5px] border-store-primary text-store-primary text-[13px] font-semibold font-body text-center hover:bg-store-primary/5 transition-colors">
          Apply ({filteredProducts.length})
        </button>
        <button onClick={handleReset} className="px-3.5 py-2.5 rounded-lg border-[1.5px] border-border text-[#8B7D7A] text-[13px] font-body hover:bg-[#F9F9F9] transition-colors">Reset</button>
      </div>
    </>
  )

  return (
    <div className="flex flex-col min-h-screen bg-white font-body overflow-x-hidden scroll-smooth">
      <style>{`@keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
      {/* ─── Hero Carousel (fixed height, no layout shift) ─── */}
      {banners.length > 0 && hero && (
        <section
          className="relative overflow-hidden h-[440px] md:h-[420px] touch-pan-y -mx-0"
          style={{ backgroundImage: 'linear-gradient(120deg, oklab(22.1% 0.025 -0.083), oklab(26.4% 0.107 0.004) 45%, oklab(53.1% 0.201 0.020))' }}
          onTouchStart={handleHeroTouchStart}
          onTouchEnd={handleHeroTouchEnd}
        >
          <div className="absolute rounded-full" style={{ top: '-80px', left: '50%', width: '400px', height: '400px', backgroundColor: 'rgba(255,255,255,0.04)' }} />
          <div className="absolute rounded-full" style={{ bottom: '-60px', right: '200px', width: '240px', height: '240px', backgroundColor: 'rgba(255,255,255,0.03)' }} />
          {/* Bottom gradient overlay for text readability on mobile */}
          <div className="lg:hidden absolute inset-x-0 bottom-0 h-2/3 pointer-events-none" style={{ backgroundImage: 'linear-gradient(0deg, rgba(0,0,0,0.75), rgba(0,0,0,0.15) 55%, transparent)' }} />

          <div className="flex h-full">
            {/* Product image area */}
            <div className="w-[520px] shrink-0 hidden lg:flex items-center justify-center relative">
              <div className="w-[340px] h-[380px] rounded-2xl border border-white/10 flex items-center justify-center transition-opacity duration-500" style={{ backgroundImage: 'linear-gradient(160deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))' }}>
                <ImagePlaceholder />
              </div>
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
                {banners.map((_, i) => (
                  <button key={i} onClick={() => goTo(i)} className={`w-[52px] h-[52px] rounded-lg shrink-0 transition-all ${i === heroIndex ? 'border-2 border-white bg-white/15' : 'border border-white/30 bg-white/8'}`} />
                ))}
                <div className="w-[52px] h-[52px] rounded-lg border border-white/30 bg-white/8 shrink-0" />
              </div>
            </div>

            {/* Product info — key forces remount for clean transition */}
            <div key={heroIndex} className="flex-1 flex flex-col justify-end lg:justify-center px-5 md:pr-16 md:pl-5 pb-8 pt-6 md:py-12 relative animate-[fadeIn_0.4s_ease-out] lg:backdrop-blur-0 backdrop-blur-[2px] lg:bg-transparent">
              <div className="flex gap-2.5 mb-4 flex-wrap">
                {discountLabel(hero.price, hero.comparePrice) && <span className="px-3.5 py-1 bg-store-primary rounded-md text-white text-[13px] font-extrabold leading-4 font-body">{discountLabel(hero.price, hero.comparePrice)}</span>}
              </div>
              <p className="text-white/50 text-[11px] font-body uppercase tracking-[0.12em] leading-[14px] mb-2">{hero.subtitle}</p>
              <h1 className="text-white text-[22px] md:text-[36px] font-bold font-heading leading-[115%] mb-3 md:mb-4 whitespace-pre-line">{hero.headline}</h1>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-success text-[13px] font-body">★★★★★</span>
                <span className="text-white/60 text-[13px] font-body">{hero.averageRating.toFixed(1)} · {hero.reviewCount} reviews</span>
              </div>
              <div className="flex items-baseline gap-2 md:gap-3 mb-4 md:mb-6 flex-wrap">
                <span className="text-white text-[22px] md:text-[32px] font-extrabold font-body leading-8 md:leading-10">₹{hero.price.toLocaleString('en-IN')}</span>
                {hero.comparePrice && (
                  <>
                    <span className="text-white/40 text-[14px] md:text-[18px] font-body line-through">₹{hero.comparePrice.toLocaleString('en-IN')}</span>
                    <span className="px-2 py-0.5 md:px-2.5 md:py-1 bg-white/10 border border-white/20 rounded text-white/70 text-[10px] md:text-[12px] font-body leading-4">Save ₹{hero.comparePrice - hero.price}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1.5 md:gap-2 mb-4 md:mb-6 flex-wrap">
                <span className="text-white/50 text-[12px] font-body mr-1">Size:</span>
                {hero.sizes.map(s => (
                  <button key={s} onClick={() => setActiveSize(s)} className={`px-2.5 md:px-4 py-1 md:py-1.5 rounded-lg text-[12px] md:text-[13px] font-body transition-all ${s === activeSize ? 'border-2 border-white text-white font-bold' : 'border border-white/30 text-white/60'}`}>
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <StoreLink href={`/product/${hero.slug}`} className="inline-flex items-center gap-2 bg-store-primary rounded-[10px] px-5 md:px-8 py-3 md:py-3.5 hover:opacity-90 transition-opacity">
                  <CartIcon />
                  <span className="text-white text-[15px] font-bold font-body leading-[18px]">View Product</span>
                </StoreLink>
                <button className="w-12 h-12 shrink-0 rounded-[10px] border-[1.5px] border-white/40 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <HeartIcon size={20} color="#FFFFFF" />
                </button>
              </div>
            </div>

            {/* Carousel controls (desktop) */}
            <div className="hidden lg:flex items-center gap-2 absolute bottom-5 right-12">
              {banners.map((_, i) => (
                <span key={i} className={`rounded-full transition-all cursor-pointer ${i === heroIndex ? 'w-7 h-[5px] bg-white' : 'w-[5px] h-[5px] bg-white/35'}`} onClick={() => goTo(i)} />
              ))}
              <div className="flex gap-1.5 ml-3">
                <button onClick={prevHero} className="w-8 h-8 rounded-full bg-white/15 border border-white/25 flex items-center justify-center hover:bg-white/25 transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                </button>
                <button onClick={nextHero} className="w-8 h-8 rounded-full bg-white/15 border border-white/25 flex items-center justify-center hover:bg-white/25 transition-colors">
                  <ChevronRight className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Mobile carousel dots */}
            <div className="lg:hidden absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {banners.map((_, i) => (
                <span key={i} className={`rounded-full transition-all duration-300 ${i === heroIndex ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/40'}`} onClick={() => goTo(i)} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Flash Sale Bar ─── */}
      {promotions.length > 0 && (
        <div className="overflow-hidden" style={{ backgroundImage: 'linear-gradient(90deg, #0E0A1F, #1A1230, #0E0A1F)' }}>
          {/* Main row: timer + deals */}
          <div className="flex items-center justify-center lg:justify-start gap-3 lg:gap-8 h-12 lg:h-14 px-3 lg:px-12">
            <div className="flex items-center gap-1.5 lg:gap-2.5 shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#D4AF37]" style={{ animation: 'pulse-dot 1.4s ease-in-out infinite' }} />
              </span>
              <span className="text-sm lg:text-base">⚡</span>
              <span className="text-white text-[12px] lg:text-[13px] font-bold font-body uppercase tracking-[0.08em]">Flash Sale</span>
              {countdown && (
                <div className="flex items-center gap-[2px] lg:gap-[3px]">
                  {countdown.map((t, i) => (
                    <div key={i} className="flex items-center gap-[2px] lg:gap-[3px]">
                      {i > 0 && <span className="text-[#D4AF37]/60 text-[10px] lg:text-[11px] font-body">:</span>}
                      <span className="bg-[#D4AF37]/15 border border-[#D4AF37]/30 rounded px-1.5 lg:px-2 py-0.5 lg:py-1 text-[#D4AF37] text-[12px] lg:text-[13px] font-bold font-body leading-4 tabular-nums w-[30px] lg:w-[33px] text-center">{t}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="hidden lg:flex gap-2.5 flex-1 overflow-x-auto">
              {promotions.map((d, i) => (
                <span key={i} className="inline-flex items-center gap-2 shrink-0 px-4 py-1.5 rounded-lg border border-[#D4AF374D] bg-white/8">
                  <span className="text-[#D4AF37] text-[12px] font-bold font-body leading-4">{d.offerText}</span>
                  {d.subtitle && <span className="text-white/35 text-[11px] font-body">{d.subtitle}</span>}
                </span>
              ))}
            </div>
            <span className="text-[#D4AF37] text-[12px] font-semibold font-body shrink-0 hidden lg:block cursor-pointer hover:underline">View all deals →</span>
          </div>
          {/* Mobile/tablet marquee deals */}
          <div className="lg:hidden h-7 overflow-hidden border-t border-white/5">
            <div className="flex gap-6 animate-[marquee_15s_linear_infinite] whitespace-nowrap items-center h-full px-3">
              {[...promotions, ...promotions].map((d, i) => (
                <span key={i} className="text-[#D4AF37] text-[10px] font-bold font-body">{d.offerText} {d.subtitle && <span className="text-white/35 font-normal">on {d.subtitle}</span>}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Main content area ─── */}
      <div className="max-w-[1312px] mx-auto w-full px-4 md:px-16">
        {/* Shop by Occasion */}
        {tags.length > 0 && (
          <section className="py-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[18px] font-bold text-fg font-body leading-[22px]">Shop by Occasion</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {tags.map(tag => (
                <StoreLink key={tag.id} href={`/occasion/${tag.slug}`} className="flex items-center gap-3 shrink-0 pl-3 pr-5 py-2.5 rounded-full border border-store-primary/15 hover:border-store-primary/40 transition-colors" style={{ backgroundImage: 'linear-gradient(135deg, rgba(232,87,126,0.08), rgba(232,87,126,0.02))', boxShadow: '0 4px 14px rgba(232,87,126,0.12)' }}>
                  <span className="text-4xl leading-none">{tag.emoji}</span>
                  <span className="flex flex-col items-start">
                    <span className="text-fg text-[13px] font-semibold font-body">{tag.name}</span>
                    <span className="text-[#8B7D7A] text-[11px] font-body">{tag.productCount} items</span>
                  </span>
                </StoreLink>
              ))}
            </div>
          </section>
        )}

        {/* Shop by Offers */}
        {offers.length > 0 && (
          <section className="pb-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[18px] font-bold text-fg font-body leading-[22px]">Shop by Offers</h2>
              <StoreLink href="/offers" className="text-store-primary text-[13px] font-semibold font-body hover:underline">See all offers →</StoreLink>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {offers.slice(0, 5).map((p, i) => {
                const label = discountLabel(p.price, p.comparePrice)
                return (
                  <StoreLink key={i} href={`/product/${p.slug}`} className="bg-white rounded-xl border-[1.5px] border-[#F0E8D8] overflow-hidden block hover:border-store-primary hover:shadow-md transition">
                    <div className="aspect-[3/4] relative bg-bg">
                      {p.images[0] && <Image src={p.images[0]} alt={p.name} fill sizes="(min-width:768px) 20vw, 50vw" className="object-cover" priority={i === 0} />}
                      {label && <span className="absolute top-2 left-2 px-2 py-[3px] bg-danger rounded text-white text-[10px] font-bold font-body leading-3">{label}</span>}
                    </div>
                    <div className="p-2.5">
                      <p className="text-fg text-[13px] font-semibold font-body line-clamp-1">{p.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-fg text-[13px] font-bold font-body">₹{p.price.toLocaleString('en-IN')}</span>
                        {p.comparePrice && <span className="text-[#8B7D7A] text-[11px] font-body line-through">₹{p.comparePrice.toLocaleString('en-IN')}</span>}
                      </div>
                    </div>
                  </StoreLink>
                )
              })}
            </div>
          </section>
        )}

        {/* New This Week */}
        {newThisWeek.length > 0 && (
          <section className="pb-10">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <h2 className="text-[18px] font-bold text-fg font-body leading-[22px]">New This Week</h2>
                <span className="ml-1 px-2.5 py-0.5 bg-success text-white text-[10px] font-bold rounded font-body leading-3">{newThisWeek.length} items</span>
              </div>
              <span className="text-store-primary text-[13px] font-semibold font-body cursor-pointer hover:underline">View all new arrivals</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {newThisWeek.map((p, i) => (
                <StoreLink key={i} href={`/product/${p.slug}`} className="bg-white rounded-xl border-[1.5px] border-[#F0E8D8] overflow-hidden block hover:border-store-primary hover:shadow-md transition">
                  <div className="aspect-[3/4] relative bg-bg">
                    {p.images[0] && <Image src={p.images[0]} alt={p.name} fill sizes="(min-width:768px) 20vw, 50vw" className="object-cover" />}
                    <span className="absolute top-2 left-2 px-2 py-[3px] bg-success rounded text-white text-[10px] font-bold font-body leading-3">NEW</span>
                    <span className="absolute top-2 right-2 w-7 h-7 bg-white/70 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <HeartIcon />
                    </span>
                    <span className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-[3px] bg-success rounded text-white text-[10px] font-bold font-body leading-3">
                      {p.averageRating.toFixed(1)} ★ <span className="font-normal opacity-80">| {p.reviewCount}</span>
                    </span>
                  </div>
                  <div className="p-2.5">
                    <p className="text-[#8B7D7A] text-[10px] font-bold font-body uppercase tracking-[0.08em] leading-3 mb-1">{p.category}</p>
                    <h3 className="text-fg text-[13px] font-bold font-heading leading-[130%] mb-1">{p.name}</h3>
                    <p className="text-fg text-[14px] font-extrabold font-body leading-[18px]">₹{p.price.toLocaleString('en-IN')}</p>
                  </div>
                </StoreLink>
              ))}
            </div>
          </section>
        )}

        {/* Browse Categories */}
        {categories.length > 0 && (
          <section className="pb-10">
            <h2 className="text-[18px] font-bold text-fg font-body leading-[22px] mb-5">Browse Categories</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar md:grid md:grid-cols-6 md:overflow-visible">
              {categories.map((cat, i) => (
                <div key={cat.id} className="w-[130px] md:w-auto h-[160px] shrink-0 rounded-2xl overflow-hidden relative flex items-end p-3.5 cursor-pointer group" style={{ backgroundImage: CATEGORY_GRADIENTS[i % CATEGORY_GRADIENTS.length] }}>
                  <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(0deg, rgba(0,0,0,0.6), rgba(0,0,0,0) 55%)' }} />
                  <div className="relative">
                    <p className="text-white text-[14px] font-bold font-body leading-4" style={{ textShadow: '0 2px 6px rgba(0,0,0,0.4)' }}>{cat.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Divider */}
      <div className="h-2 bg-[#F0E8D8]" />

      {/* ─── Filters + Product Grid ─── */}
      <div className="max-w-[1312px] mx-auto w-full px-4 md:px-16 py-8">
        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-[240px] shrink-0">
            {filterPanel}
          </aside>

          {/* Product grid area */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-fg text-[16px] font-bold font-body leading-5">All Products</h2>
                <span className="text-[#8B7D7A] text-[13px] font-body">{filteredProducts.length} items</span>
              </div>
              <div className="hidden lg:flex items-center gap-2">
                {activeChips.map(c => (
                  <button key={c.label} onClick={() => removeFilterChip(c.type, c.value)} className="flex items-center gap-1 px-3 py-1 bg-store-primary/10 rounded-full text-store-primary text-[12px] font-body hover:bg-store-primary/20 transition-colors">
                    {c.label} <X className="w-3 h-3" />
                  </button>
                ))}
                <div className="relative ml-2">
                  <button onClick={() => setShowSortMenu(v => !v)} className="flex items-center gap-1 text-[13px] text-fg font-body">
                    Sort: <strong>{sortBy}</strong> <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  {showSortMenu && (
                    <div className="absolute top-8 right-0 bg-white rounded-lg border border-border shadow-lg py-1 z-20 w-48">
                      {SORT_OPTIONS.map(opt => (
                        <button key={opt} onClick={() => { setSortBy(opt); setShowSortMenu(false) }} className={`w-full text-left px-4 py-2 text-[13px] font-body transition-colors ${opt === sortBy ? 'text-store-primary bg-store-primary/5 font-semibold' : 'text-fg hover:bg-[#F9F9F9]'}`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* Mobile filter button */}
              <button onClick={() => setShowMobileFilters(true)} className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[13px] text-fg font-body">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filter & Sort
                {activeFilterCount > 0 && <span className="w-4 h-4 bg-store-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center">{activeFilterCount}</span>}
              </button>
            </div>

            {/* Active filter chips (mobile) */}
            {activeChips.length > 0 && (
              <div className="lg:hidden flex gap-2 mb-4 flex-wrap">
                {activeChips.map(c => (
                  <button key={c.label} onClick={() => removeFilterChip(c.type, c.value)} className="flex items-center gap-1 px-2.5 py-1 bg-store-primary/10 rounded-full text-store-primary text-[11px] font-body">
                    {c.label} <X className="w-2.5 h-2.5" />
                  </button>
                ))}
              </div>
            )}

            {/* Grid */}
            {visibleProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-fg text-[16px] font-semibold font-body mb-2">No products found</p>
                <p className="text-[#8B7D7A] text-[13px] font-body mb-4">Try adjusting your filters</p>
                <button onClick={handleReset} className="px-6 py-2 rounded-lg border-[1.5px] border-store-primary text-store-primary text-[13px] font-semibold font-body">Clear all filters</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {visibleProducts.map((p, i) => (
                  <StoreLink key={`${p.name}-${i}`} href={`/product/${p.slug}`} className="bg-white rounded-xl border-[1.5px] border-[#F0E8D8] overflow-hidden group cursor-pointer block hover:border-store-primary hover:shadow-md transition">
                    <div className="aspect-[3/4] relative bg-bg">
                      {p.images[0] && <Image src={p.images[0]} alt={p.name} fill sizes="(min-width:768px) 30vw, 50vw" className="object-cover" />}
                      {p.discount && <span className="absolute top-2 left-2 px-2.5 py-[3px] bg-store-primary rounded-full text-white text-[10px] font-bold font-body leading-3">{p.discount}</span>}
                      {p.badge && !p.discount && <span className="absolute top-2 left-2 px-2.5 py-[3px] rounded-full text-white text-[10px] font-bold font-body leading-3 bg-success">{p.badge}</span>}
                      <span className="absolute top-2 right-2 w-7 h-7 bg-white/70 backdrop-blur-sm rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                        <HeartIcon />
                      </span>
                      <span className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-[3px] bg-success rounded text-white text-[10px] font-bold font-body leading-3">
                        {p.averageRating.toFixed(1)} ★ <span className="font-normal opacity-80">| {p.reviewCount}</span>
                      </span>
                    </div>
                    <div className="p-2">
                      <h3 className="text-fg text-[13px] font-bold font-heading leading-[130%] mb-1">{p.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-store-primary text-[14px] font-extrabold font-body leading-[18px]">₹{p.price.toLocaleString('en-IN')}</span>
                        {p.comparePrice && <span className="text-[#B0A090] text-[11px] font-body line-through">₹{p.comparePrice.toLocaleString('en-IN')}</span>}
                        <span className="ml-auto w-7 h-7 bg-store-primary rounded-full flex items-center justify-center">
                          <CartIcon />
                        </span>
                      </div>
                    </div>
                  </StoreLink>
                ))}
              </div>
            )}

            {/* Show more */}
            {filteredProducts.length > 0 && (
              <div className="flex flex-col items-center gap-3 mt-8">
                {hasMore ? (
                  <button onClick={() => setVisibleCount(c => c + PRODUCTS_PER_PAGE)} className="inline-flex items-center gap-2 px-10 py-3 bg-store-primary text-white text-[14px] font-semibold font-body rounded-full hover:opacity-90 transition-opacity">
                    Show more products
                    <ChevronDown className="w-4 h-4" />
                  </button>
                ) : visibleCount > PRODUCTS_PER_PAGE && (
                  <button onClick={() => { setVisibleCount(PRODUCTS_PER_PAGE); window.scrollTo({ top: document.querySelector('#product-grid-top')?.getBoundingClientRect().top! + window.scrollY - 80, behavior: 'smooth' }) }} className="inline-flex items-center gap-2 px-10 py-3 border-[1.5px] border-store-primary text-store-primary text-[14px] font-semibold font-body rounded-full hover:bg-store-primary/5 transition-colors">
                    Show less
                  </button>
                )}
                <span className="text-[#8B7D7A] text-[11px] font-body">Showing {Math.min(visibleCount, filteredProducts.length)} of {filteredProducts.length} products</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Mobile Filter Bottom Sheet ─── */}
      {showMobileFilters && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileFilters(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto p-6 animate-[slideUp_0.3s_ease-out] transition-transform duration-300 ease-out">
            <div className="w-10 h-1.5 bg-[#E5E0D5] rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-fg text-[16px] font-bold font-body">Filters</span>
              <button onClick={() => setShowMobileFilters(false)} className="w-8 h-8 rounded-full bg-[#F9F9F9] flex items-center justify-center">
                <X className="w-4 h-4 text-fg" />
              </button>
            </div>
            {/* Sort (mobile only) */}
            <div className="border-b border-[#F0E8D8] mb-5 pb-5">
              <p className="text-[#8B7D7A] text-[11px] font-bold font-body uppercase tracking-[0.08em] leading-[14px] mb-3">Sort By</p>
              <div className="flex flex-wrap gap-1.5">
                {SORT_OPTIONS.map(opt => (
                  <button key={opt} onClick={() => setSortBy(opt)} className={`px-3 py-1.5 rounded-md border-[1.5px] text-[12px] font-body leading-4 transition-colors ${opt === sortBy ? 'bg-store-primary/6 border-store-primary text-store-primary font-semibold' : 'border-border text-[#8B7D7A]'}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            {filterPanel}
          </div>
        </div>
      )}
    </div>
  )
}
