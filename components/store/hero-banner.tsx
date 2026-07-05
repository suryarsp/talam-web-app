import Link from 'next/link'
import type { TenantStorefront } from '@/lib/data/tenant'

type Props = {
  tenant: Pick<TenantStorefront, 'tagline'>
}

// ponytail: countdown text is static (matches the Paper mock); wire a real offer
// end-time once discount campaigns have a schema field to read from.
export function HeroBanner({ tenant }: Props) {
  return (
    <section
      className="relative flex flex-col justify-end gap-4 overflow-hidden px-5 pt-10 pb-5 sm:h-[420px] sm:flex-row sm:items-center sm:justify-start sm:gap-15 sm:px-12 sm:py-15"
      style={{ backgroundImage: 'linear-gradient(135deg, #241429 0%, #221542 100%)' }}
    >
      <div className="absolute -top-10 -right-10 size-[180px] rounded-full bg-[#FFD7001A] sm:size-[360px] sm:bg-[#FFD70014]" />

      <div className="absolute top-3 right-4 rounded-md bg-[#0000004D] px-3 py-1.5 sm:top-6 sm:right-12 sm:rounded-lg sm:px-4 sm:py-2">
        <span className="font-body text-2xs/[14px] font-semibold text-surface sm:text-xs/tight">
          <span className="sm:hidden">Ends in 02:45:30</span>
          <span className="hidden sm:inline">Offer ends in 02:45:30</span>
        </span>
      </div>

      <div className="relative flex flex-col gap-4 sm:grow sm:gap-6">
        <span className="font-body text-xs font-semibold tracking-wide text-amber uppercase sm:text-sm sm:font-bold sm:tracking-[0.12em]">
          <span className="sm:hidden">Summer Collection</span>
          <span className="hidden sm:inline">Curated for You</span>
        </span>
        <h1 className="font-heading text-[36px] leading-[120%] font-bold text-surface sm:text-[56px]">
          <span className="sm:hidden">Timeless Elegance for Every Moment</span>
          <span className="hidden sm:inline">Discover Timeless Elegance</span>
        </h1>
        <p className="hidden max-w-[480px] font-body text-base leading-[160%] text-border sm:block">
          {tenant.tagline ?? 'Handpicked ethnic wear, artisan crafts, and modern designs. Direct from makers you can trust.'}
        </p>
        <Link
          href="/shop"
          className="self-start rounded-lg bg-store-primary px-6 py-3 font-body text-md font-semibold leading-snug text-surface sm:px-8 sm:py-3.5 sm:text-[15px]"
        >
          <span className="sm:hidden">Shop Now</span>
          <span className="hidden sm:inline">Explore Collection</span>
        </Link>
        <div className="mt-2 flex justify-center gap-1.5 sm:justify-start sm:gap-2">
          <div className="h-1.5 w-6 shrink-0 rounded-full bg-surface sm:h-2 sm:w-10 sm:rounded-sm" />
          <div className="size-1.5 shrink-0 rounded-full bg-[#FFFFFF66] sm:size-2" />
          <div className="size-1.5 shrink-0 rounded-full bg-[#FFFFFF66] sm:size-2" />
        </div>
      </div>

      <div
        className="hidden h-[300px] shrink-0 basis-[40%] rounded-xl sm:block"
        style={{ backgroundImage: 'linear-gradient(135deg, rgba(232,87,126,0.15) 0%, rgba(200,60,90,0.1) 100%)' }}
      />
    </section>
  )
}
