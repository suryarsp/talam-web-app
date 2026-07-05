import Link from 'next/link'

// ponytail: static marketing teaser, no "seasonal collection" data model yet —
// add a real Collection entity if this needs to be editable per-tenant.
export function FestivalEdit() {
  return (
    <section className="bg-[#FFF8F0] px-4 py-5 sm:hidden">
      <div className="flex flex-col gap-1.5">
        <span className="text-2xs/[14px] font-bold tracking-[0.1em] text-store-primary uppercase">
          Limited Edit
        </span>
        <h2 className="font-heading text-[22px] leading-[125%] font-bold text-fg">Festival Edit</h2>
        <p className="text-sm leading-[150%] text-muted-warm">
          Handpicked festive sarees and sets for every celebration. Ships in 2 days.
        </p>
        <Link href="/shop" className="mt-2 inline-block font-semibold text-store-primary text-sm/tight">
          Shop the Edit →
        </Link>
      </div>
      <div className="mt-4 flex gap-2 overflow-hidden">
        <div
          className="h-[140px] w-[110px] shrink-0 rounded-lg"
          style={{ backgroundImage: 'linear-gradient(145deg, #C83C5A 0%, #8B2A46 100%)' }}
        />
        <div
          className="h-[140px] w-[110px] shrink-0 rounded-lg"
          style={{ backgroundImage: 'linear-gradient(145deg, #6B2FA0 0%, #3D1F5C 100%)' }}
        />
        <div
          className="h-[140px] w-[110px] shrink-0 rounded-lg"
          style={{ backgroundImage: 'linear-gradient(145deg, #E06B3C 0%, #B8502A 100%)' }}
        />
      </div>
    </section>
  )
}
