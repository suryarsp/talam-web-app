'use client'

import { Suspense, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import { StoreLink } from '@/components/store/store-context'
import Image from 'next/image'
import { hapticError } from '@/lib/haptics'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'

type BannerData = {
  headline: string
  subtitle: string
  slug: string
  price: number
  comparePrice: number | null
  sizes: string[]
  images: string[]
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

type CategoryData = { id: string; name: string; slug: string; image: string }

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

type OfferProductData = ProductData & { discountPct: number }

type PolicyData = {
  freeDeliveryAbove: number | null
  returnWindowDays: number | null
  trustBadgeText: string | null
  deliveryEstimateText: string | null
}

type StoryData = { title: string; description: string } | null

type StorePageClientProps = {
  banners: BannerData[]
  promotions: PromotionData[]
  countdownTarget: string | null
  tags: TagData[]
  categories: CategoryData[]
  products: ProductData[]
  offers: OfferProductData[]
  policy: PolicyData
  story: StoryData
}

const SORT_OPTIONS = ['Newest First', 'Price: Low to High', 'Price: High to Low', 'Rating'] as const

const OFFER_FILTERS = [
  { label: 'All', min: 0 },
  { label: '50%+ Off', min: 50 },
  { label: '30%+ Off', min: 30 },
  { label: '10%+ Off', min: 10 },
]

const PRODUCTS_PER_PAGE = 6

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
      <polyline points="2,6 5,9 10,3" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function HeartIcon({ size = 16, color = '#4A423F' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="none" stroke={color} strokeWidth="1.7" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

const TRUST_ICONS = {
  quality: (
    <path d="M16.5 9.4 7.5 4.21M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" />
  ),
  returns: <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5" />,
  shipping: (
    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2M15 18H9M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
  ),
  payment: <path d="M3 11h18M7 15h2" />,
} as const

function TrustIcon({ name }: { name: keyof typeof TRUST_ICONS }) {
  if (name === 'payment') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-store-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    )
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-store-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {TRUST_ICONS[name]}
    </svg>
  )
}

function useCountdown(targetIso: string | null) {
  // ponytail: `now` starts null so server and first client render agree (both skip
  // the timer). Date.now() only runs after mount, avoiding a hydration mismatch.
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    if (!targetIso) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [targetIso])

  if (!targetIso || now === null) return null
  const target = new Date(targetIso).getTime()
  const seconds = Math.max(0, Math.floor((target - now) / 1000))
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [
    { value: String(h).padStart(2, '0'), label: 'Hrs' },
    { value: String(m).padStart(2, '0'), label: 'Min' },
    { value: String(s).padStart(2, '0'), label: 'Sec' },
  ]
}

function toggle<T>(set: Set<T>, val: T): Set<T> {
  const next = new Set(set)
  next.has(val) ? next.delete(val) : next.add(val)
  return next
}

function discountLabel(price: number, comparePrice: number | null) {
  if (!comparePrice || comparePrice <= price) return null
  const pct = Math.round((1 - price / comparePrice) * 100)
  return `${pct}% off`
}

export function StorePageClient(props: StorePageClientProps) {
  return (
    <Suspense fallback={null}>
      <StorePageInner {...props} />
    </Suspense>
  )
}

function StorePageInner({ banners, promotions, countdownTarget, tags, categories, products, offers, policy, story }: StorePageClientProps) {
  const searchParams = useSearchParams()

  // ── Derived product display data ──
  const allProductsData = useMemo(
    () =>
      products.map((p) => ({
        ...p,
        badge: p.isNew ? 'New' : null,
        discount: discountLabel(p.price, p.comparePrice),
      })),
    [products]
  )

  const CATEGORY_OPTIONS = useMemo(() => categories.map((c) => c.name), [categories])
  const SIZE_OPTIONS = useMemo(() => Array.from(new Set(products.flatMap((p) => p.sizes))).sort(), [products])
  const categoryCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of products) m.set(p.category, (m.get(p.category) ?? 0) + 1)
    return m
  }, [products])

  const newThisWeek = useMemo(() => allProductsData.filter((p) => p.isNew).slice(0, 8), [allProductsData])

  // ── Shop by Offers filter (single-select, minimum discount %) ──
  const [offerFilterMin, setOfferFilterMin] = useState(0)
  const filteredOffers = useMemo(() => offers.filter((o) => o.discountPct >= offerFilterMin), [offers, offerFilterMin])
  const featureOffer = filteredOffers[0]
  const offerGrid = filteredOffers.slice(1, 5)

  // ── Carousel ──
  const [heroIndex, setHeroIndex] = useState(0)
  const [activeSize, setActiveSize] = useState('')
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hero = banners[heroIndex]

  const startAutoplay = useCallback(() => {
    if (autoplayRef.current) clearInterval(autoplayRef.current)
    if (banners.length <= 1) return
    if (document.visibilityState !== 'visible') return
    autoplayRef.current = setInterval(() => setHeroIndex((i) => (i + 1) % banners.length), 6000)
  }, [banners.length])

  const stopAutoplay = useCallback(() => {
    if (autoplayRef.current) { clearInterval(autoplayRef.current); autoplayRef.current = null }
  }, [])

  useEffect(() => {
    startAutoplay()
    return stopAutoplay
  }, [startAutoplay, stopAutoplay])

  const goTo = (i: number) => { setHeroIndex(i); setActiveSize(''); stopAutoplay() }
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
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const sortParam = searchParams.get('sort')
  const [sortBy, setSortBy] = useState<string>('Newest First')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PRODUCTS_PER_PAGE)

  const [prevSortParam, setPrevSortParam] = useState(sortParam)
  if (sortParam !== prevSortParam) {
    setPrevSortParam(sortParam)
    if (sortParam === 'newest') setSortBy('Newest First')
  }

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
    setPriceMin('')
    setPriceMax('')
    setVisibleCount(PRODUCTS_PER_PAGE)
  }

  // Carries the homepage's active price/size filters into the dedicated category page,
  // which reads minPrice/maxPrice/size from the querystring (lib/parse-listing-params.ts).
  const categoryHref = (slug: string) => {
    const params = new URLSearchParams()
    if (priceMin) params.set('minPrice', priceMin)
    if (priceMax) params.set('maxPrice', priceMax)
    const firstSize = selectedSizes.values().next().value
    if (firstSize) params.set('size', firstSize)
    const qs = params.toString()
    return qs ? `/category/${slug}?${qs}` : `/category/${slug}`
  }

  const removeFilterChip = (type: 'category' | 'size', val: string) => {
    if (type === 'category') setSelectedCategories(s => { const n = new Set(s); n.delete(val); return n })
    if (type === 'size') setSelectedSizes(s => { const n = new Set(s); n.delete(val); return n })
  }

  const activeChips: { type: 'category' | 'size'; label: string; value: string }[] = [
    ...[...selectedCategories].map(v => ({ type: 'category' as const, label: v, value: v })),
    ...[...selectedSizes].map(v => ({ type: 'size' as const, label: `Size ${v}`, value: v })),
  ]

  // ── Trust badges (real tenant policy, generic fallback copy) ──
  const trustItems: { icon: keyof typeof TRUST_ICONS; title: string; subtitle: string }[] = [
    { icon: 'quality', title: 'Quality checked', subtitle: policy.trustBadgeText ?? 'Every piece checked before it ships.' },
    { icon: 'returns', title: policy.returnWindowDays ? `${policy.returnWindowDays}-day returns` : 'Easy returns', subtitle: 'Changed your mind? Send it back.' },
    { icon: 'shipping', title: 'Fast dispatch', subtitle: policy.deliveryEstimateText ?? (policy.freeDeliveryAbove ? `Free above ₹${policy.freeDeliveryAbove.toLocaleString('en-IN')}` : 'Ships quickly, tracked all the way.') },
    { icon: 'payment', title: 'Pay your way', subtitle: 'UPI, cards, or cash on delivery.' },
  ]

  // ── Filter sidebar (shared between desktop and mobile sheet) ──
  const filterPanel = (
    <>
      <p className="mb-5 font-heading text-lg font-semibold text-[#1E1A19]">Refine</p>

      <div className="mb-5 border-b border-[#E7E0D6] pb-5">
        <p className="mb-3 font-body text-2xs font-bold uppercase tracking-[0.1em] text-[#7A6E6A]">Category</p>
        <div className="flex flex-col gap-2.5">
          {CATEGORY_OPTIONS.map(c => {
            const checked = selectedCategories.has(c)
            return (
              <label key={c} className="flex cursor-pointer items-center gap-2.5" onClick={() => setSelectedCategories(s => toggle(s, c))}>
                <span className={`flex size-[17px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] transition-colors ${checked ? 'border-store-primary bg-store-primary' : 'border-[#D8CFC2] bg-white'}`}>
                  {checked && <CheckIcon />}
                </span>
                <span className="font-body text-[13.5px] text-[#3A3331]">{c}</span>
                <span className="ml-auto font-body text-[11.5px] text-[#7A6E6A]">{categoryCounts.get(c) ?? 0}</span>
              </label>
            )
          })}
        </div>
      </div>

      <div className="mb-5 border-b border-[#E7E0D6] pb-5">
        <p className="mb-3 font-body text-2xs font-bold uppercase tracking-[0.1em] text-[#7A6E6A]">Size</p>
        <div className="flex flex-wrap gap-1.5">
          {SIZE_OPTIONS.map(s => {
            const active = selectedSizes.has(s)
            return (
              <button key={s} onClick={() => setSelectedSizes(set => toggle(set, s))} className={`rounded-lg border px-3 py-1.5 font-body text-xs font-medium transition-colors ${active ? 'border-[#1E1A19] bg-[#1E1A19] text-white' : 'border-[#D8CFC2] text-[#5C534F] hover:border-[#7A6E6A]'}`}>
                {s}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mb-5">
        <p className="mb-3 font-body text-2xs font-bold uppercase tracking-[0.1em] text-[#7A6E6A]">Price</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-lg border-[1.5px] border-[#D8CFC2] px-2.5 py-[7px] transition-colors focus-within:border-store-primary">
            <input type="number" value={priceMin} onChange={e => setPriceMin(e.target.value)} className="w-full bg-transparent font-body text-xs text-[#1E1A19] outline-none" placeholder="Min" />
          </div>
          <span className="font-body text-xs text-[#B0A090]">–</span>
          <div className="flex-1 rounded-lg border-[1.5px] border-[#D8CFC2] px-2.5 py-[7px] transition-colors focus-within:border-store-primary">
            <input type="number" value={priceMax} onChange={e => setPriceMax(e.target.value)} className="w-full bg-transparent font-body text-xs text-[#1E1A19] outline-none" placeholder="Max" />
          </div>
        </div>
        {priceRangeInvalid && (
          <p className="mt-1 font-body text-2xs text-danger">Min price cannot exceed max price</p>
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={() => { setVisibleCount(PRODUCTS_PER_PAGE); setShowMobileFilters(false) }} className="flex-1 rounded-full border-[1.5px] border-store-primary py-2.5 text-center font-body text-[13px] font-semibold text-store-primary transition-colors hover:bg-store-primary/5">
          Apply ({filteredProducts.length})
        </button>
        <button onClick={handleReset} className="rounded-full border-[1.5px] border-[#D8CFC2] px-3.5 py-2.5 font-body text-[13px] text-[#7A6E6A] transition-colors hover:bg-[#F9F9F9]">Reset</button>
      </div>
    </>
  )

  return (
    <div className="flex flex-col min-h-screen bg-[#FBF8F3] font-body overflow-x-hidden scroll-smooth">
      {/* ─── Hero ─── */}
      {banners.length === 0 && <div className="h-[420px] lg:h-[560px] animate-pulse bg-[#F2EDE4]" />}
      {banners.length > 0 && hero && (
        <section className="relative overflow-hidden bg-[#FBF8F3]">
          <div className="grid lg:h-[560px] lg:grid-cols-2">
            {/* Content */}
            <div className="order-2 flex flex-col justify-center px-5 py-8 sm:px-8 lg:order-1 lg:px-14 lg:py-0">
              <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-store-primary/15 bg-white px-3.5 py-[7px]">
                <span className="size-1.5 rounded-full bg-store-primary" />
                <span className="font-body text-[10px] font-bold uppercase tracking-[0.14em] text-store-primary">{hero.subtitle || 'Featured'}</span>
              </span>
              <h1 className="mb-3 whitespace-pre-line font-heading text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-[#1E1A19] sm:text-[40px] lg:mb-5 lg:text-[46px]">
                {hero.headline}
              </h1>
              {hero.reviewCount > 0 && (
                <div className="mb-4 flex items-center gap-1.5">
                  <span className="font-body text-[13px] text-store-primary">★★★★★</span>
                  <span className="font-body text-[13px] text-[#7A6E6A]">{hero.averageRating.toFixed(1)} · {hero.reviewCount} reviews</span>
                </div>
              )}
              <div className="mb-5 flex flex-wrap items-baseline gap-2.5 lg:mb-7">
                <span className="font-body text-[26px] font-bold text-[#1E1A19] lg:text-[32px]">₹{hero.price.toLocaleString('en-IN')}</span>
                {hero.comparePrice && hero.comparePrice > hero.price && (
                  <span className="font-body text-base text-[#7A6E6A] line-through">₹{hero.comparePrice.toLocaleString('en-IN')}</span>
                )}
              </div>
              {hero.sizes.length > 0 && (
                <div className="mb-5 flex flex-wrap items-center gap-2 lg:mb-7">
                  <span className="mr-1 font-body text-xs text-[#7A6E6A]">Size:</span>
                  {hero.sizes.map(s => (
                    <button key={s} onClick={() => setActiveSize(s)} className={`rounded-lg px-3.5 py-1.5 font-body text-[13px] transition-all ${s === activeSize ? 'border-2 border-[#1E1A19] font-bold text-[#1E1A19]' : 'border border-[#D8CFC2] text-[#5C534F]'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3">
                <StoreLink href={`/product/${hero.slug}`} className="inline-flex items-center gap-2.5 rounded-full bg-store-primary px-7 py-4 font-body text-[15px] font-semibold text-white transition-opacity hover:opacity-90">
                  View product
                  <ArrowIcon />
                </StoreLink>
                <button className="flex size-[52px] shrink-0 items-center justify-center rounded-full border border-[#D8CFC2] transition-colors hover:bg-white" aria-label="Add to wishlist">
                  <HeartIcon size={19} />
                </button>
              </div>
            </div>

            {/* Image */}
            <div
              className="relative order-1 h-[300px] overflow-hidden sm:h-[380px] lg:order-2 lg:h-full"
              onTouchStart={handleHeroTouchStart}
              onTouchEnd={handleHeroTouchEnd}
            >
              {hero.images[0] ? (
                <Image src={hero.images[0]} alt={hero.headline} fill sizes="(min-width:1024px) 50vw, 100vw" className="object-contain" priority />
              ) : (
                <div className="absolute inset-0 bg-[#F2EDE4]" />
              )}
              <div className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(90deg,#FBF8F3_0%,rgba(251,248,243,0)_18%)] lg:block" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(0deg,rgba(30,26,25,0.5),rgba(30,26,25,0)_60%)] lg:hidden" />

              {hero.images[0] && (
                <div className="absolute bottom-5 left-5 hidden items-center gap-3.5 rounded-2xl bg-white/95 py-3.5 pl-3.5 pr-5 shadow-[0_12px_34px_rgba(30,26,25,0.14)] lg:flex">
                  <div className="relative size-[52px] shrink-0 overflow-hidden rounded-[10px]">
                    <Image src={hero.images[0]} alt="" fill sizes="52px" className="object-cover" />
                  </div>
                  <span className="flex flex-col gap-0.5">
                    <span className="font-body text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#7A6E6A]">Featured</span>
                    <span className="font-heading text-[15px] font-semibold text-[#1E1A19] whitespace-nowrap">₹{hero.price.toLocaleString('en-IN')}</span>
                  </span>
                </div>
              )}

              {banners.length > 1 && (
                <>
                  <div className="absolute bottom-4 left-5 flex items-center gap-1.5 lg:hidden">
                    {banners.map((_, i) => (
                      <button key={i} onClick={() => goTo(i)} className={`h-1 rounded-full transition-all ${i === heroIndex ? 'w-7 bg-white' : 'w-2.5 bg-white/45'}`} />
                    ))}
                  </div>
                  <div className="absolute bottom-5 right-5 hidden items-center gap-2.5 lg:flex">
                    {banners.map((_, i) => (
                      <button key={i} onClick={() => goTo(i)} className={`h-1 rounded-full transition-all ${i === heroIndex ? 'w-7 bg-white' : 'w-2.5 bg-white/45'}`} />
                    ))}
                    <button onClick={prevHero} className="ml-2 flex size-9 items-center justify-center rounded-full border border-white/55 bg-white/20 backdrop-blur-md transition-colors hover:bg-white/30">
                      <ChevronLeft className="size-3.5 text-white" strokeWidth={2.5} />
                    </button>
                    <button onClick={nextHero} className="flex size-9 items-center justify-center rounded-full border border-white/55 bg-white/20 backdrop-blur-md transition-colors hover:bg-white/30">
                      <ChevronRight className="size-3.5 text-white" strokeWidth={2.5} />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ─── Trust badges ─── */}
      <div className="border-y border-[#EAE3D9] bg-white">
        <div className="mx-auto grid max-w-[1328px] grid-cols-2 gap-x-4 gap-y-5 px-5 py-6 sm:px-14 lg:grid-cols-4 lg:gap-y-0 lg:py-0">
          {trustItems.map((item, i) => (
            <div key={i} className="flex items-start gap-3 lg:py-6 lg:pr-7">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-store-primary/10">
                <TrustIcon name={item.icon} />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="font-body text-[13px] font-semibold text-[#1E1A19]">{item.title}</span>
                <span className="font-body text-[11.5px] leading-[1.4] text-[#7A6E6A]">{item.subtitle}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1328px] px-4 sm:px-8 lg:px-14">
        {/* ─── Shop by category ─── */}
        {categories.length > 0 && (
          <section className="py-10 lg:py-16">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <p className="mb-1.5 font-body text-[11px] font-bold uppercase tracking-[0.16em] text-store-primary">The wardrobe</p>
                <h2 className="font-heading text-[24px] font-semibold tracking-[-0.01em] text-[#1E1A19] lg:text-[30px]">Shop by category</h2>
              </div>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar lg:grid lg:grid-cols-[1.6fr_1fr_1fr] lg:auto-rows-[200px] lg:gap-4 lg:overflow-visible">
              {categories.map((cat, i) => (
                <StoreLink
                  key={cat.id}
                  href={categoryHref(cat.slug)}
                  className={`relative w-[150px] shrink-0 overflow-hidden rounded-2xl lg:w-auto ${i === 0 ? 'lg:row-span-2' : ''}`}
                >
                  <div className="relative h-[190px] w-full lg:h-full">
                    <Image src={cat.image} alt={cat.name} fill sizes="(min-width: 1024px) 33vw, 40vw" className="object-cover" />
                  </div>
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(30,26,25,0)_45%,rgba(30,26,25,0.72))]" />
                  <div className="absolute bottom-3.5 left-4 flex flex-col gap-0.5">
                    <span className="font-heading text-base font-semibold text-white lg:text-xl">{cat.name}</span>
                    <span className="font-body text-[11px] text-white/70">{categoryCounts.get(cat.name) ?? 0} pieces</span>
                  </div>
                </StoreLink>
              ))}
            </div>
          </section>
        )}

        {/* ─── Countdown promo ─── */}
        {promotions.length > 0 && countdown && (
          <section className="pb-10 lg:pb-16">
            <div className="rounded-2xl bg-[#1E1A19] p-5 lg:flex lg:items-center lg:justify-between lg:px-8 lg:py-5">
              <div className="mb-4 flex items-center gap-3 lg:mb-0 lg:gap-4">
                <span className="font-body text-[11px] font-bold uppercase tracking-[0.16em] text-amber">Limited time</span>
                <span className="hidden h-[22px] w-px bg-white/15 lg:block" />
                <span className="font-heading text-lg font-medium text-white lg:text-[22px]">{promotions[0].offerText}</span>
              </div>
              <div className="flex items-center justify-between gap-4 lg:gap-4">
                <span className="flex items-center gap-2.5">
                  {countdown.map((c, i) => (
                    <span key={i} className="flex min-w-[42px] flex-col items-center gap-1">
                      <span className="font-heading text-xl font-semibold tabular-nums text-white lg:text-2xl">{c.value}</span>
                      <span className="font-body text-[9px] uppercase tracking-[0.14em] text-white/40">{c.label}</span>
                    </span>
                  ))}
                </span>
                <StoreLink href="/offers" className="rounded-full bg-white px-5 py-2.5 font-body text-[13.5px] font-semibold text-[#1E1A19] lg:px-6 lg:py-3">
                  Shop the sale
                </StoreLink>
              </div>
            </div>
          </section>
        )}

        {/* ─── New this week ─── */}
        {newThisWeek.length > 0 && (
          <section className="pb-10 lg:pb-16">
            <div className="mb-5 flex items-end justify-between lg:mb-6">
              <div>
                <p className="mb-1.5 font-body text-[11px] font-bold uppercase tracking-[0.16em] text-store-primary">Off the shelf</p>
                <h2 className="font-heading text-[24px] font-semibold tracking-[-0.01em] text-[#1E1A19] lg:text-[30px]">New this week</h2>
              </div>
              <StoreLink href="/?sort=newest" className="hidden font-body text-[13.5px] font-semibold text-[#1E1A19] border-b border-[#C9BEB0] pb-0.5 sm:block">
                View all new arrivals
              </StoreLink>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-1 no-scrollbar sm:grid sm:grid-cols-3 lg:grid-cols-4 sm:overflow-visible sm:gap-5">
              {newThisWeek.map((p, i) => (
                <StoreLink key={i} href={`/product/${p.slug}`} className="w-[190px] shrink-0 cursor-pointer sm:w-auto">
                  <div className="relative overflow-hidden rounded-[14px] bg-[#F2EDE4]">
                    <div className="relative aspect-[4/5] w-full">
                      {p.images[0] && <Image src={p.images[0]} alt={p.name} fill sizes="(min-width:1024px) 22vw, 45vw" className="object-cover transition-transform duration-300 hover:scale-105" />}
                    </div>
                    <span className="absolute left-2.5 top-2.5 rounded-full bg-white/95 px-2.5 py-[5px] font-body text-[10px] font-bold uppercase tracking-[0.1em] text-[#1E1A19]">New</span>
                    <span className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-white/92">
                      <HeartIcon size={15} />
                    </span>
                  </div>
                  <div className="pt-3">
                    <p className="mb-1 font-body text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#7A6E6A]">{p.category}</p>
                    <h3 className="mb-1.5 line-clamp-1 font-heading text-[15.5px] font-semibold leading-[1.25] text-[#1E1A19]">{p.name}</h3>
                    <div className="flex items-baseline gap-2">
                      <span className="font-body text-sm font-bold text-[#1E1A19]">₹{p.price.toLocaleString('en-IN')}</span>
                      {p.comparePrice && p.comparePrice > p.price && <span className="font-body text-[11.5px] text-[#7A6E6A] line-through">₹{p.comparePrice.toLocaleString('en-IN')}</span>}
                    </div>
                  </div>
                </StoreLink>
              ))}
            </div>
          </section>
        )}

        {/* ─── Shop by offer ─── */}
        {offers.length > 0 && featureOffer && (
          <section className="pb-10 lg:pb-16">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mb-6">
              <div>
                <p className="mb-1.5 font-body text-[11px] font-bold uppercase tracking-[0.16em] text-store-primary">Marked down</p>
                <h2 className="font-heading text-[24px] font-semibold tracking-[-0.01em] text-[#1E1A19] lg:text-[30px]">Shop by offer</h2>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {OFFER_FILTERS.map((f) => (
                  <button
                    key={f.label}
                    onClick={() => setOfferFilterMin(f.min)}
                    className={`shrink-0 rounded-full border px-4 py-2 font-body text-xs font-semibold transition-colors ${offerFilterMin === f.min ? 'border-[#1E1A19] bg-[#1E1A19] text-white' : 'border-[#D8CFC2] text-[#5C534F]'}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr_1fr] lg:gap-5">
              <StoreLink href={`/product/${featureOffer.slug}`} className="relative min-h-[320px] overflow-hidden rounded-2xl lg:min-h-[400px]">
                {featureOffer.images[0] ? (
                  <Image src={featureOffer.images[0]} alt={featureOffer.name} fill sizes="(min-width:1024px) 45vw, 100vw" className="object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-[#F2EDE4]" />
                )}
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(30,26,25,0.05)_30%,rgba(30,26,25,0.82))]" />
                <div className="pointer-events-none absolute inset-x-6 bottom-6">
                  {discountLabel(featureOffer.price, featureOffer.comparePrice) && (
                    <span className="mb-3.5 inline-block rounded-full bg-store-primary px-3.5 py-1.5 font-body text-[11px] font-bold tracking-[0.08em] text-white">{discountLabel(featureOffer.price, featureOffer.comparePrice)}</span>
                  )}
                  <h3 className="mb-2 font-heading text-2xl font-semibold text-white">{featureOffer.name}</h3>
                  <div className="flex items-baseline gap-2.5">
                    <span className="font-body text-lg font-bold text-white">₹{featureOffer.price.toLocaleString('en-IN')}</span>
                    {featureOffer.comparePrice && featureOffer.comparePrice > featureOffer.price && <span className="font-body text-sm text-white/55 line-through">₹{featureOffer.comparePrice.toLocaleString('en-IN')}</span>}
                  </div>
                </div>
              </StoreLink>
              <div className="grid grid-cols-2 gap-4 lg:col-span-2 lg:gap-5">
                {offerGrid.map((p, i) => (
                  <StoreLink key={i} href={`/product/${p.slug}`} className="relative min-h-[132px] overflow-hidden rounded-[14px]">
                    {p.images[0] ? (
                      <Image src={p.images[0]} alt={p.name} fill sizes="(min-width:1024px) 22vw, 50vw" className="object-cover" />
                    ) : (
                      <div className="absolute inset-0 bg-[#F2EDE4]" />
                    )}
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(30,26,25,0.05)_30%,rgba(30,26,25,0.82))]" />
                    <div className="pointer-events-none absolute inset-x-4 bottom-4">
                      {discountLabel(p.price, p.comparePrice) && (
                        <span className="mb-2 inline-block rounded-full bg-store-primary px-3 py-1 font-body text-[10px] font-bold tracking-[0.08em] text-white">{discountLabel(p.price, p.comparePrice)}</span>
                      )}
                      <h3 className="mb-1 line-clamp-1 font-heading text-base font-semibold text-white">{p.name}</h3>
                      <div className="flex items-baseline gap-2">
                        <span className="font-body text-sm font-bold text-white">₹{p.price.toLocaleString('en-IN')}</span>
                        {p.comparePrice && p.comparePrice > p.price && <span className="font-body text-xs text-white/55 line-through">₹{p.comparePrice.toLocaleString('en-IN')}</span>}
                      </div>
                    </div>
                  </StoreLink>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── Shop by Occasion (existing tag data, kept intact) ─── */}
        {tags.length > 0 && (
          <section className="pb-10 lg:pb-16">
            <h2 className="mb-5 font-heading text-[24px] font-semibold tracking-[-0.01em] text-[#1E1A19] lg:text-[30px]">Shop by occasion</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {tags.map(tag => (
                <StoreLink key={tag.id} href={`/occasion/${tag.slug}`} className="flex shrink-0 items-center gap-3 rounded-full border border-store-primary/15 bg-white py-2.5 pl-3 pr-5 transition-colors hover:border-store-primary/40">
                  <span className="text-3xl leading-none">{tag.emoji}</span>
                  <span className="flex flex-col items-start">
                    <span className="font-body text-[13px] font-semibold text-[#1E1A19]">{tag.name}</span>
                    <span className="font-body text-[11px] text-[#7A6E6A]">{tag.productCount} items</span>
                  </span>
                </StoreLink>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ─── Our story ─── */}
      {story && (
        <section className="border-y border-[#EDE4D8] bg-white">
          <div className="mx-auto max-w-[900px] px-5 py-14 text-center lg:py-20">
            <p className="mb-3.5 font-body text-[11px] font-bold uppercase tracking-[0.16em] text-store-primary">Our story</p>
            <h2 className="mb-5 font-heading text-[28px] font-semibold leading-[1.15] tracking-[-0.01em] text-[#1E1A19] lg:text-[36px]">{story.title}</h2>
            <p className="mx-auto max-w-[560px] font-body text-[15px] leading-[1.7] text-[#5C534F] lg:text-base">{story.description}</p>
          </div>
        </section>
      )}

      {/* ─── Filters + Product Grid ─── */}
      <div className="mx-auto w-full max-w-[1328px] px-4 py-10 sm:px-8 lg:px-14 lg:py-14">
        <div className="flex gap-10">
          <aside className="hidden w-[216px] shrink-0 lg:block">
            {filterPanel}
          </aside>

          <div className="min-w-0 flex-1">
            <div className="mb-5 flex items-end justify-between border-b border-[#E7E0D6] pb-4">
              <div>
                <h2 className="mb-1 font-heading text-[22px] font-semibold text-[#1E1A19]">The full collection</h2>
                <p className="font-body text-xs text-[#7A6E6A]">{filteredProducts.length} pieces</p>
              </div>
              <div className="hidden items-center gap-2 lg:flex">
                {activeChips.map(c => (
                  <button key={c.label} onClick={() => removeFilterChip(c.type, c.value)} className="flex items-center gap-1 rounded-full bg-store-primary/10 px-3 py-1 font-body text-xs text-store-primary transition-colors hover:bg-store-primary/20">
                    {c.label} <X className="size-3" />
                  </button>
                ))}
                <div className="relative ml-2">
                  <button onClick={() => setShowSortMenu(v => !v)} className="flex items-center gap-1 font-body text-[13px] text-[#1E1A19]">
                    Sort: <strong>{sortBy}</strong> <ChevronDown className="size-3.5" />
                  </button>
                  {showSortMenu && (
                    <div className="absolute right-0 top-8 z-20 w-48 rounded-lg border border-[#EAE3D9] bg-white py-1 shadow-lg">
                      {SORT_OPTIONS.map(opt => (
                        <button key={opt} onClick={() => { setSortBy(opt); setShowSortMenu(false) }} className={`w-full px-4 py-2 text-left font-body text-[13px] transition-colors ${opt === sortBy ? 'bg-store-primary/5 font-semibold text-store-primary' : 'text-[#1E1A19] hover:bg-[#F9F9F9]'}`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button onClick={() => setShowMobileFilters(true)} className="flex items-center gap-1.5 rounded-full border border-[#D8CFC2] px-3.5 py-1.5 font-body text-[13px] text-[#1E1A19] lg:hidden">
                <SlidersHorizontal className="size-3.5" />
                Filter
                {activeFilterCount > 0 && <span className="flex size-4 items-center justify-center rounded-full bg-store-primary text-[9px] font-bold text-white">{activeFilterCount}</span>}
              </button>
            </div>

            {activeChips.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2 lg:hidden">
                {activeChips.map(c => (
                  <button key={c.label} onClick={() => removeFilterChip(c.type, c.value)} className="flex items-center gap-1 rounded-full bg-store-primary/10 px-2.5 py-1 font-body text-[11px] text-store-primary">
                    {c.label} <X className="size-2.5" />
                  </button>
                ))}
              </div>
            )}

            {visibleProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="mb-2 font-body text-base font-semibold text-[#1E1A19]">No products found</p>
                <p className="mb-4 font-body text-[13px] text-[#7A6E6A]">Try adjusting your filters</p>
                <button onClick={handleReset} className="rounded-full border-[1.5px] border-store-primary px-6 py-2 font-body text-[13px] font-semibold text-store-primary">Clear all filters</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:gap-6">
                {visibleProducts.map((p, i) => (
                  <StoreLink key={`${p.name}-${i}`} href={`/product/${p.slug}`} className="group block cursor-pointer">
                    <div className="relative overflow-hidden rounded-[14px] bg-[#F2EDE4]">
                      <div className="relative aspect-[4/5] w-full">
                        {p.images[0] && <Image src={p.images[0]} alt={p.name} fill sizes="(min-width:1024px) 22vw, 45vw" className="object-cover transition-transform duration-300 group-hover:scale-105" />}
                      </div>
                      {(p.discount || p.badge) && (
                        <span className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-[5px] font-body text-[10px] font-bold uppercase tracking-[0.1em] ${p.discount ? 'bg-store-primary text-white' : 'bg-white/95 text-[#1E1A19]'}`}>
                          {p.discount ?? p.badge}
                        </span>
                      )}
                      <span className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-white/92 transition-colors group-hover:bg-white">
                        <HeartIcon size={15} />
                      </span>
                    </div>
                    <div className="pt-3">
                      <p className="mb-1 font-body text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#7A6E6A]">{p.category}</p>
                      <h3 className="mb-1.5 line-clamp-1 font-heading text-[15.5px] font-semibold leading-[1.25] text-[#1E1A19]">{p.name}</h3>
                      <div className="flex items-baseline gap-2">
                        <span className="font-body text-sm font-bold text-[#1E1A19]">₹{p.price.toLocaleString('en-IN')}</span>
                        {p.comparePrice && p.comparePrice > p.price && <span className="font-body text-[11.5px] text-[#7A6E6A] line-through">₹{p.comparePrice.toLocaleString('en-IN')}</span>}
                        {p.averageRating > 0 && <span className="ml-auto font-body text-[11px] text-[#7A6E6A]">★ {p.averageRating.toFixed(1)}</span>}
                      </div>
                    </div>
                  </StoreLink>
                ))}
              </div>
            )}

            {filteredProducts.length > 0 && (
              <div className="mt-10 flex flex-col items-center gap-3">
                {hasMore ? (
                  <button onClick={() => setVisibleCount(c => c + PRODUCTS_PER_PAGE)} className="inline-flex items-center gap-2 rounded-full px-10 py-3.5 font-body text-[14px] font-semibold text-[#1E1A19] border border-[#1E1A19] transition-colors hover:bg-[#1E1A19] hover:text-white">
                    Show more pieces
                  </button>
                ) : visibleCount > PRODUCTS_PER_PAGE && (
                  <button onClick={() => { setVisibleCount(PRODUCTS_PER_PAGE); window.scrollTo({ top: (document.querySelector('#product-grid-top')?.getBoundingClientRect().top ?? 0) + window.scrollY - 80, behavior: 'smooth' }) }} className="inline-flex items-center gap-2 rounded-full border border-[#1E1A19] px-10 py-3.5 font-body text-[14px] font-semibold text-[#1E1A19] transition-colors hover:bg-[#1E1A19] hover:text-white">
                    Show less
                  </button>
                )}
                <span className="font-body text-[11px] text-[#7A6E6A]">Showing {Math.min(visibleCount, filteredProducts.length)} of {filteredProducts.length} pieces</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Mobile Filter Drawer ─── */}
      <Drawer open={showMobileFilters} onOpenChange={setShowMobileFilters}>
        <DrawerContent className="lg:hidden max-h-[85vh]">
          <DrawerHeader className="flex-row items-center justify-between text-left">
            <DrawerTitle>Filters</DrawerTitle>
            <button onClick={() => setShowMobileFilters(false)} className="w-8 h-8 rounded-full bg-[#F9F9F9] flex items-center justify-center">
              <X className="w-4 h-4 text-fg" />
            </button>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-6 pt-4">
            <div className="mb-5 border-b border-[#E7E0D6] pb-5">
              <p className="mb-3 font-body text-2xs font-bold uppercase tracking-[0.1em] text-[#7A6E6A]">Sort By</p>
              <div className="flex flex-wrap gap-1.5">
                {SORT_OPTIONS.map(opt => (
                  <button key={opt} onClick={() => setSortBy(opt)} className={`rounded-lg border-[1.5px] px-3 py-1.5 font-body text-xs transition-colors ${opt === sortBy ? 'border-store-primary bg-store-primary/6 font-semibold text-store-primary' : 'border-[#D8CFC2] text-[#7A6E6A]'}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            {filterPanel}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
