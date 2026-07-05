import type { TenantStorefront } from '@/lib/data/tenant'

type Props = {
  tenant: Pick<TenantStorefront, 'name' | 'about'>
}

// ponytail: GMV/customers/rating stats have no aggregation query yet — placeholders
// until orders + reviews are summarized. Swap for real numbers once that exists.
export function OurStory({ tenant }: Props) {
  if (!tenant.about?.description) return null

  return (
    <section className="bg-[#1A1040] px-6 py-8 sm:hidden">
      <span className="mb-2.5 block text-2xs/[14px] font-bold tracking-[0.1em] text-amber uppercase">
        Our Story
      </span>
      <h2 className="mb-3 font-heading text-[22px] leading-[125%] font-bold text-surface">
        {tenant.about.storyTitle ?? `Handcrafted by ${tenant.name}`}
      </h2>
      <p className="mb-5 text-md leading-[160%] text-white/65">{tenant.about.description}</p>

      <div className="mt-7 flex border-t border-white/[0.12] pt-5">
        {[
          { value: '2,400+', label: 'Customers' },
          { value: '4.8★', label: 'Rated' },
        ].map((stat, i) => (
          <div key={stat.label} className={i === 0 ? 'grow basis-0 border-r border-white/[0.12]' : 'grow basis-0'}>
            <div className="text-center font-bold text-surface text-xl/relaxed">{stat.value}</div>
            <div className="mt-[3px] text-center text-2xs/[14px] text-white/50">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
