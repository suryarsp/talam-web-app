'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { useStoreBase } from './store-context'
import { searchProductsAction } from '@/app/store/actions'

type Result = {
  slug: string
  name: string
  price: number
  comparePrice: number | null
  images: string[]
  categoryName: string | null
}

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const base = useStoreBase()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setQuery('')
      setResults([])
      setSearched(false)
    }
  }

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const search = useCallback(
    (q: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (!q.trim()) {
        setResults([])
        setSearched(false)
        return
      }
      timerRef.current = setTimeout(async () => {
        setLoading(true)
        const res = await searchProductsAction(q)
        setResults(res as Result[])
        setSearched(true)
        setLoading(false)
      }, 300)
    },
    [],
  )

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setQuery(v)
    search(v)
  }

  function go(slug: string) {
    onClose()
    router.push(`${base}/product/${slug}`)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="mx-auto mt-[10vh] w-full max-w-[560px] px-4 sm:mt-[15vh] sm:px-0">
        <div className="overflow-hidden rounded-2xl bg-surface shadow-2xl">
          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <circle cx="11" cy="11" r="8" stroke="var(--color-muted-warm)" strokeWidth="1.8" />
              <path d="m21 21-4.35-4.35" stroke="var(--color-muted-warm)" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={handleChange}
              placeholder="Search products..."
              className="flex-1 bg-transparent font-body text-lg text-fg outline-none placeholder:text-muted-warm"
            />
            {query && (
              <button onClick={() => { setQuery(''); setResults([]); setSearched(false); inputRef.current?.focus() }} className="cursor-pointer text-muted-warm hover:text-fg">
                <X className="size-5" />
              </button>
            )}
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {loading && (
              <p className="px-4 py-6 text-center font-body text-sm text-muted-warm">Searching...</p>
            )}
            {!loading && searched && results.length === 0 && (
              <p className="px-4 py-6 text-center font-body text-sm text-muted-warm">No products found</p>
            )}
            {!loading && results.map((r) => (
              <button
                key={r.slug}
                onClick={() => go(r.slug)}
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bg"
              >
                {r.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.images[0]} alt="" className="size-12 rounded-lg object-cover" />
                ) : (
                  <div className="flex size-12 items-center justify-center rounded-lg bg-bg">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted-warm)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-body text-md font-semibold text-fg">{r.name}</p>
                  {r.categoryName && <p className="font-body text-xs text-muted-warm">{r.categoryName}</p>}
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-body text-md font-semibold text-fg">₹{r.price.toLocaleString('en-IN')}</p>
                  {r.comparePrice && (
                    <p className="font-body text-xs text-muted-warm line-through">₹{r.comparePrice.toLocaleString('en-IN')}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
