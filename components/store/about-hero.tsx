import Link from 'next/link'
import type { TenantStorefront } from '@/lib/data/tenant'

type Props = {
  tenant: Pick<TenantStorefront, 'name' | 'about'>
}

function socialLinks(about: Props['tenant']['about']) {
  return [
    about?.instagramUrl && { label: 'Instagram', href: about.instagramUrl },
    about?.facebookUrl && { label: 'Facebook', href: about.facebookUrl },
    about?.youtubeUrl && { label: 'YouTube', href: about.youtubeUrl },
  ].filter((s): s is { label: string; href: string } => Boolean(s))
}

export function AboutHero({ tenant }: Props) {
  const socials = socialLinks(tenant.about)
  const initial = tenant.name.charAt(0).toUpperCase()

  return (
    <section className="flex flex-col gap-8 sm:flex-row sm:gap-16">
      <div className="flex flex-col items-center gap-1 sm:w-[360px] sm:shrink-0 sm:items-start">
        <div className="mb-4 flex size-[120px] items-center justify-center rounded-full bg-store-primary/10 font-heading text-4xl font-bold text-store-primary sm:size-[140px]">
          {initial}
        </div>
        <h1 className="font-heading text-xl font-bold text-fg sm:text-2xl">{tenant.name}</h1>
        <p className="font-body text-sm text-muted-warm">Founder &amp; Designer</p>

        {/* ponytail: store-wide vanity stats, same placeholder pattern as the footer's "2,400+ happy customers" badge — not a per-tenant aggregate, no real data source */}
        <div className="mt-6 grid w-full grid-cols-3 divide-x divide-border border-y border-border py-5 text-center">
          <div>
            <p className="font-body text-xl font-bold text-fg sm:text-[22px]">₹50L+</p>
            <p className="mt-1 font-body text-xs text-muted-warm">GMV</p>
          </div>
          <div>
            <p className="font-body text-xl font-bold text-fg sm:text-[22px]">2,400+</p>
            <p className="mt-1 font-body text-xs text-muted-warm">Customers</p>
          </div>
          <div>
            <p className="font-body text-xl font-bold text-fg sm:text-[22px]">4.8★</p>
            <p className="mt-1 font-body text-xs text-muted-warm">Rated</p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-5">
        <h2 className="font-body text-lg font-bold text-fg">{tenant.about?.storyTitle ?? 'Our Story'}</h2>
        <p className="font-body text-[15px] leading-[165%] whitespace-pre-line text-muted-warm">
          {tenant.about?.description ?? <span className="italic text-muted-warm/70">Store description coming soon</span>}
        </p>
        {socials.length > 0 && (
          <div className="space-y-3">
            <p className="font-body text-lg font-bold text-fg">Follow Us</p>
            <div className="flex gap-3">
              {socials.map((social) => (
                <Link
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.label}
                  className="flex size-10 items-center justify-center rounded-full border border-border bg-surface"
                >
                  {social.label.charAt(0)}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
