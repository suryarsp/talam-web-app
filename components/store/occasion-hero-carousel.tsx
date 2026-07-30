'use client'

import type { Product, ProductCategory } from '@prisma/client'
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel'
import { AuroraText } from '@/components/ui/aurora-text'
import Text3DFlip from '@/components/ui/text-3d-flip'
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
  return (
    <div
      className="flex flex-col items-center gap-6 bg-cover bg-center px-4 py-14 text-center sm:py-20"
      style={theme.image ? { backgroundImage: `${theme.gradient}, url(${theme.image})`, backgroundBlendMode: 'multiply' } : { backgroundImage: theme.gradient }}
    >
      <span className="text-5xl leading-none">{emoji || '🎉'}</span>
      <h1 className="font-heading text-3xl font-bold sm:text-4xl">
        <AuroraText>{name}</AuroraText>
      </h1>
      <Text3DFlip as="p" className="justify-center font-body text-sm text-white/80 sm:text-base">
        {theme.headline}
      </Text3DFlip>

      {featuredProducts.length > 0 && (
        <Carousel orientation="vertical" opts={{ loop: featuredProducts.length > 1, align: 'start' }} className="w-full max-w-xs">
          <CarouselContent className="h-[340px]">
            {featuredProducts.slice(0, 6).map((product, i) => (
              <CarouselItem key={product.id} className="basis-1/2">
                <ProductCard product={product} priority={i === 0} />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      )}
    </div>
  )
}
