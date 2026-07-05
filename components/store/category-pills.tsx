import Link from 'next/link'
import type { CategoryMeta } from '@/lib/data/products'

type Props = {
  categories: CategoryMeta[]
}

// ponytail: "All" is always active here since this only renders on the home page teaser row;
// /shop owns real filter state once it exists.
export function CategoryPills({ categories }: Props) {
  if (categories.length === 0) return null

  return (
    <div className="overflow-x-auto border-b border-border bg-surface px-4 pt-3 pb-1 sm:hidden">
      <div className="flex gap-2">
        <Link
          href="/shop"
          className="inline-flex shrink-0 items-center rounded-full bg-fg px-4 py-[7px] font-semibold text-surface text-sm/tight"
        >
          All
        </Link>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/shop?category=${category.slug}`}
            className="inline-flex shrink-0 items-center rounded-full border border-border px-4 py-[7px] text-fg text-sm/tight"
          >
            {category.name}
          </Link>
        ))}
      </div>
    </div>
  )
}
