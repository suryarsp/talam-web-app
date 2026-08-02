import type { ProductFilters, ProductSort, CategoryMeta } from '@/lib/data/products'

const VALID_SORTS = new Set<ProductSort>(['newest', 'price-asc', 'price-desc', 'popular', 'discount-desc'])

export function parseListingParams(
  searchParams: Record<string, string | string[] | undefined>,
  categories?: CategoryMeta[],
): ProductFilters {
  const get = (key: string) => {
    const v = searchParams[key]
    return typeof v === 'string' ? v : undefined
  }
  const catSlug = get('category')
  const sort = get('sort') as ProductSort | undefined
  return {
    categoryId: catSlug && categories ? categories.find((c) => c.slug === catSlug)?.id : undefined,
    size: get('size'),
    minPrice: get('minPrice') ? Number(get('minPrice')) : undefined,
    maxPrice: get('maxPrice') ? Number(get('maxPrice')) : undefined,
    sort: sort && VALID_SORTS.has(sort) ? sort : undefined,
  }
}
