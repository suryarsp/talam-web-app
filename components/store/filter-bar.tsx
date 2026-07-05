'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { CategoryMeta } from '@/lib/data/products'

type Props = {
  categories: CategoryMeta[]
  activeCategory?: string
  activeSize?: string
  minPrice?: string
  maxPrice?: string
  activeSort?: string
}

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

const SORTS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'popular', label: 'Most Popular' },
]

export function FilterBar({ categories, activeCategory, activeSize, minPrice, maxPrice, activeSort }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (params.get(key) === value) {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.push(`/shop?${params.toString()}`)
  }

  function handlePriceSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const params = new URLSearchParams(searchParams.toString())
    const min = form.get('minPrice')?.toString().trim()
    const max = form.get('maxPrice')?.toString().trim()
    min ? params.set('minPrice', min) : params.delete('minPrice')
    max ? params.set('maxPrice', max) : params.delete('maxPrice')
    router.push(`/shop?${params.toString()}`)
  }

  const panel = (
    <div className="flex flex-col gap-5">
      {categories.length > 0 && (
        <div className="border-b border-border pb-5">
          <p className="mb-2.5 font-body text-2xs font-bold tracking-wide text-muted-warm uppercase">Category</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setParam('category', cat.slug)}
                className={
                  activeCategory === cat.slug
                    ? 'rounded-full bg-fg px-4 py-2 font-body text-sm/tight font-semibold text-surface'
                    : 'rounded-full border border-border px-4 py-2 font-body text-sm/tight text-fg'
                }
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-b border-border pb-5">
        <p className="mb-2.5 font-body text-2xs font-bold tracking-wide text-muted-warm uppercase">Size</p>
        <div className="flex flex-wrap gap-2">
          {SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => setParam('size', size)}
              className={
                activeSize === size
                  ? 'min-w-[52px] rounded-lg bg-fg px-3.5 py-2.5 font-body text-sm/tight font-bold text-surface'
                  : 'min-w-[52px] rounded-lg border border-border px-3.5 py-2.5 font-body text-sm/tight text-fg'
              }
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handlePriceSubmit} className="border-b border-border pb-5">
        <p className="mb-2.5 font-body text-2xs font-bold tracking-wide text-muted-warm uppercase">Price Range</p>
        <div className="flex items-center gap-2">
          <input
            name="minPrice"
            type="number"
            min={0}
            placeholder="Min"
            defaultValue={minPrice}
            className="w-full min-w-0 rounded-lg border border-border px-3 py-2.5 font-body text-sm/tight text-fg"
          />
          <span className="shrink-0 font-body text-sm/tight text-muted-warm">–</span>
          <input
            name="maxPrice"
            type="number"
            min={0}
            placeholder="Max"
            defaultValue={maxPrice}
            className="w-full min-w-0 rounded-lg border border-border px-3 py-2.5 font-body text-sm/tight text-fg"
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg border border-store-primary px-3 py-2.5 font-body text-sm/tight font-semibold text-store-primary"
          >
            Go
          </button>
        </div>
      </form>

      <div>
        <p className="mb-2.5 font-body text-2xs font-bold tracking-wide text-muted-warm uppercase">Sort By</p>
        <div className="flex flex-col gap-2">
          {SORTS.map((sort) => (
            <button
              key={sort.value}
              type="button"
              onClick={() => setParam('sort', sort.value)}
              className={
                (activeSort ?? 'newest') === sort.value
                  ? 'rounded-xl bg-fg px-3.5 py-3 text-left font-body text-md/snug font-semibold text-surface'
                  : 'rounded-xl border border-border px-3.5 py-3 text-left font-body text-md/snug text-fg'
              }
            >
              {sort.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <>
      <details className="mb-4 rounded-xl border border-border bg-surface sm:hidden">
        <summary className="cursor-pointer px-4 py-3 font-body text-sm/tight font-semibold text-fg">Filters</summary>
        <div className="border-t border-border px-4 py-4">{panel}</div>
      </details>
      <aside className="hidden w-60 shrink-0 sm:block">{panel}</aside>
    </>
  )
}
