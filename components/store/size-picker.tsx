'use client'

import { cn } from '@/lib/utils'

type Props = {
  sizes: string[]
  stockBySize: Record<string, number>
  selected: string | null
  onSelect: (size: string) => void
}

export function SizePicker({ sizes, stockBySize, selected, onSelect }: Props) {
  return (
    <div className="space-y-2">
      <p className="font-body text-sm font-semibold text-fg">Size</p>
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => {
          const inStock = (stockBySize[size] ?? 0) > 0
          return (
            <button
              key={size}
              type="button"
              disabled={!inStock}
              onClick={() => onSelect(size)}
              className={cn(
                'h-10 min-w-11 rounded-lg border px-3.5 font-body text-sm font-semibold transition-colors',
                selected === size ? 'border-fg bg-fg text-surface' : 'border-border bg-surface text-fg hover:border-fg',
                !inStock && 'cursor-not-allowed text-muted-warm line-through opacity-50'
              )}
            >
              {size}
            </button>
          )
        })}
      </div>
    </div>
  )
}
