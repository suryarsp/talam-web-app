import type { TenantStorefront } from '@/lib/data/tenant'
import { StoreLink } from '@/components/store/store-context'
import type { CategoryMeta } from '@/lib/data/products'

type Props = {
  tenant: Pick<
    TenantStorefront,
    | 'name'
    | 'tagline'
    | 'contactPhone'
    | 'contactEmail'
    | 'whatsappNumber'
    | 'about'
    | 'branch'
    | 'sizeGuideUrl'
  >
  categories: CategoryMeta[]
}

const footerLinks = [
  { label: 'Shop', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Shipping', href: '/shipping' },
  { label: 'Returns', href: '/returns' },
  { label: 'Contact', href: '/contact' },
]

const desktopHelpLinks = [
  { label: 'About Us', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Shipping Policy', href: '/shipping' },
  { label: 'Returns & Exchange', href: '/returns' },
  { label: 'FAQs', href: '/faqs' },
]

const socialIconPaths = {
  Instagram: (
    <>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="4" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="17.5" cy="6.5" r="1" stroke="none" />
    </>
  ),
  Facebook: (
    <path
      d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"
      fill="none"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  YouTube: (
    <>
      <path
        d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"
        fill="none"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon points="9.75,15.02 15.5,12 9.75,8.98 9.75,15.02" stroke="none" />
    </>
  ),
  WhatsApp: (
    <path
      d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
      fill="none"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
} as const

function SocialIcons({ tenant, dark, size = 'md' }: { tenant: Props['tenant']; dark: boolean; size?: 'sm' | 'md' }) {
  const iconColor = dark ? 'rgb(255 255 255 / 70%)' : 'var(--color-fg)'
  const sizeClass = size === 'sm' ? 'size-9' : 'size-10'
  const gapClass = size === 'sm' ? 'gap-2' : 'gap-[10px]'
  const wrapperClass = dark
    ? `flex ${sizeClass} shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5`
    : `flex ${sizeClass} shrink-0 items-center justify-center rounded-full border border-border bg-surface`

  const socials = [
    { href: tenant.about?.instagramUrl, label: 'Instagram' as const },
    { href: tenant.about?.facebookUrl, label: 'Facebook' as const },
    { href: tenant.about?.youtubeUrl, label: 'YouTube' as const },
    { href: tenant.whatsappNumber ? `https://wa.me/${tenant.whatsappNumber}` : null, label: 'WhatsApp' as const },
  ].filter((social): social is { href: string; label: keyof typeof socialIconPaths } => Boolean(social.href))

  if (socials.length === 0) return null

  return (
    <div className={`flex ${gapClass}`}>
      {socials.map((social) => (
        <a key={social.label} href={social.href} target="_blank" rel="noreferrer" className={wrapperClass} aria-label={social.label}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill={iconColor} stroke={iconColor}>
            {socialIconPaths[social.label]}
          </svg>
        </a>
      ))}
    </div>
  )
}

const contactIconPaths = {
  phone: (
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.9 1.2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 5.99 6l1.28-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  ),
  email: (
    <>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </>
  ),
  pin: (
    <>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  hours: (
    <>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12,6 12,12 16,14" />
    </>
  ),
} as const

function ContactIcon({ icon, color }: { icon: keyof typeof contactIconPaths; color: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {contactIconPaths[icon]}
    </svg>
  )
}

export function StoreFooter({ tenant, categories }: Props) {
  const storeAddress = tenant.branch ? [tenant.branch.address, tenant.branch.city].filter(Boolean).join(', ') : null

  const contactRows: { icon: keyof typeof contactIconPaths; label: string; value: string; isPlaceholder: boolean }[] = [
    { icon: 'phone', label: 'Phone', value: tenant.contactPhone ?? 'Coming soon', isPlaceholder: !tenant.contactPhone },
    { icon: 'email', label: 'Email', value: tenant.contactEmail ?? 'Coming soon', isPlaceholder: !tenant.contactEmail },
    { icon: 'pin', label: 'Store', value: storeAddress ?? 'Coming soon', isPlaceholder: !storeAddress },
    { icon: 'hours', label: 'Hours', value: tenant.branch?.hours ?? 'Coming soon', isPlaceholder: !tenant.branch?.hours },
  ]

  return (
    <footer className="font-body">
      {/* Desktop */}
      <div className="hidden bg-[#0E0A1F] lg:block">
        <div
          className="h-[3px]"
          style={{ backgroundImage: 'linear-gradient(90deg, var(--color-store-primary) 0%, #a04ea0 50%, var(--color-amber) 100%)' }}
        />
        <div className="flex border-b border-white/10 px-24 pt-16 pb-12">
          <div className="basis-[340px] shrink-0 border-r border-white/10 pr-16">
            <div className="mb-1.5 font-heading text-[32px] leading-10 font-bold tracking-[-0.02em] text-surface">
              {tenant.name}
            </div>
            {tenant.tagline && (
              <div className="mb-7 text-md leading-[170%] text-white/55">{tenant.tagline}</div>
            )}
            <div className="mb-6">
              <SocialIcons tenant={tenant} dark />
            </div>
            {/* ponytail: "happy customers" count is a static trust badge, same placeholder figure
                as Our Story — swap both for a real customer-count aggregate together later */}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.06] px-3.5 py-2">
              <span className="text-sm/tight text-amber">★★★★★</span>
              <span className="text-xs/tight text-white/50">2,400+ happy customers</span>
            </div>
          </div>

          <div className="grow basis-0 px-12">
            <div className="mb-5 text-[10px] leading-3 font-bold tracking-[0.12em] text-white/30 uppercase">Shop</div>
            <div className="flex flex-col gap-[13px]">
              {categories.map((category) => (
                <StoreLink key={category.id} href={`/?category=${category.slug}`} className="text-md/snug text-white/75">
                  {category.name}
                </StoreLink>
              ))}
              <StoreLink href="/" className="text-md/snug text-white/75">
                New Arrivals
              </StoreLink>
              <StoreLink href="/?category=sale" className="text-md/snug font-semibold text-store-primary">
                Sale Items
              </StoreLink>
            </div>
          </div>

          <div className="grow basis-0 border-l border-white/[0.06] px-12">
            <div className="mb-5 text-[10px] leading-3 font-bold tracking-[0.12em] text-white/30 uppercase">Help</div>
            <div className="flex flex-col gap-[13px]">
              {desktopHelpLinks.map((link) => (
                <StoreLink key={link.href} href={link.href} className="text-md/snug text-white/75">
                  {link.label}
                </StoreLink>
              ))}
              <StoreLink href={tenant.sizeGuideUrl ?? '/size-guide'} className="text-md/snug text-white/75">
                Size Guide
              </StoreLink>
            </div>
          </div>

          <div className="basis-[300px] shrink-0 border-l border-white/10 pl-12">
            <div className="mb-5 text-[10px] leading-3 font-bold tracking-[0.12em] text-white/30 uppercase">
              Get in Touch
            </div>
            <div className="flex flex-col gap-4">
              {contactRows.map((row) => (
                <div key={row.label} className="flex items-start gap-3">
                  <div className="mt-px flex size-8 shrink-0 items-center justify-center rounded-lg bg-store-primary/10">
                    <ContactIcon icon={row.icon} color="var(--color-store-primary)" />
                  </div>
                  <div>
                    <div className="mb-[3px] text-xs/tight text-white/35">{row.label}</div>
                    <div className={row.isPlaceholder ? 'text-md/snug italic text-white/35' : 'font-medium whitespace-pre-line text-surface text-md/snug'}>
                      {row.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-24 py-5">
          <div className="text-xs/tight text-white/25">© {new Date().getFullYear()} {tenant.name}. All rights reserved.</div>
          <div className="flex items-center gap-2">
            {/* ponytail: generic "we accept" trust badges, not tied to tenant.paymentProvider (single gateway, not a card-network list) */}
            {['UPI', 'VISA', 'MC', 'RAZORPAY'].map((method) => (
              <span
                key={method}
                className="rounded-[5px] border border-white/[0.1] bg-white/[0.07] px-2.5 py-[5px] text-[10px] leading-3 font-bold tracking-[0.04em] text-white/50"
              >
                {method}
              </span>
            ))}
          </div>
          <div className="inline-flex items-center gap-[6px] rounded-full border border-white/[0.12] bg-white/[0.04] px-3.5 py-1.5">
            <span className="text-2xs/[14px] text-white/35">Powered by</span>
            <span className="text-2xs/[14px] font-bold tracking-[0.01em] text-brand-primary">talam</span>
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="relative border-t border-border bg-bg lg:hidden">
        <div className="flex flex-col gap-7 px-5 pt-8 pb-7">
          <div>
            <div className="mb-1 font-heading text-xl/relaxed font-bold text-fg">{tenant.name}</div>
            {tenant.tagline && <div className="text-xs leading-[140%] text-muted-warm">{tenant.tagline}</div>}
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {footerLinks.map((link, i) => (
              <StoreLink key={link.href} href={link.href} className={i === 0 ? 'text-sm/tight font-medium text-fg' : 'text-sm/tight text-muted-warm'}>
                {link.label}
              </StoreLink>
            ))}
          </div>

          <div className="flex flex-col gap-2.5">
            {contactRows.map((row) => (
              <div key={row.label} className="flex items-start gap-2.5">
                <span className="mt-px shrink-0">
                  <ContactIcon icon={row.icon} color="var(--color-muted-warm)" />
                </span>
                <span className={row.isPlaceholder ? 'text-sm/tight italic text-muted-warm/70' : 'whitespace-pre-line text-sm/tight text-fg'}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          {(tenant.about?.instagramUrl || tenant.about?.facebookUrl || tenant.about?.youtubeUrl || tenant.whatsappNumber) && (
            <div>
              <div className="mb-3 text-2xs/[14px] font-semibold tracking-wide text-muted-warm uppercase">Follow us</div>
              <SocialIcons tenant={tenant} dark={false} size="sm" />
            </div>
          )}

          <div className="text-2xs/[14px] text-muted-warm">© {new Date().getFullYear()} {tenant.name}</div>
        </div>

        <div className="flex justify-center border-t border-border/60 py-4">
          <div className="inline-flex items-center gap-[5px] rounded-full border border-border px-3 py-1">
            <span className="text-[10px] leading-3 text-muted-warm">Powered by</span>
            <span className="text-[10px] leading-3 font-bold text-brand-primary">talam</span>
          </div>
        </div>

        {tenant.whatsappNumber && (
          <a
            href={`https://wa.me/${tenant.whatsappNumber}`}
            target="_blank"
            rel="noreferrer"
            aria-label="Chat on WhatsApp"
            className="absolute right-3 bottom-[67.5px] flex size-12 items-center justify-center rounded-full bg-[#25D366] shadow-[0_4px_12px_#25D36666]"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M17.5 14.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.44-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01s-.52.07-.79.37c-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.42.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35Z"
                fill="#fff"
              />
              <path
                d="M12 0C5.37 0 0 5.37 0 12c0 2.13.56 4.13 1.53 5.86L.06 23.49l5.81-1.46A11.95 11.95 0 0 0 12 24c6.63 0 12-5.37 12-12S18.63 0 12 0Zm0 22c-1.89 0-3.66-.53-5.17-1.44l-.37-.22-3.44.87.89-3.35-.24-.38A9.98 9.98 0 0 1 2 12C2 6.48 6.48 2 12 2s10 4.48 10 10-4.48 10-10 10Z"
                fill="#fff"
              />
            </svg>
          </a>
        )}
      </div>
    </footer>
  )
}
