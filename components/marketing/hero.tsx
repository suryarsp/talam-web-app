import Link from 'next/link'

const MARQUEE_ITEMS = [
  'Ethnic Wear', 'Bakeries', 'Salons', 'Handicrafts', 'Tutors', 'Home Food', 'Jewellery', 'Boutiques',
]

const STORES = [
  {
    name: 'Aarna Silks',
    domain: 'aarna.talam4shop.com',
    delayClass: '',
    products: [
      { name: 'Kanchipuram Silk', price: '₹4,899', from: '#E8577E', to: '#F59E0B' },
      { name: 'Cotton Kurta Set', price: '₹1,299', from: '#4F3FF0', to: '#E8577E' },
      { name: 'Banarasi Dupatta', price: '₹899', from: '#F59E0B', to: '#4F3FF0' },
      { name: 'Handloom Saree', price: '₹2,499', from: '#10B981', to: '#4F3FF0' },
    ],
  },
  {
    name: "Maya's Bakehouse",
    domain: 'maya.talam4shop.com',
    delayClass: 'marketing-store-card-delay-one',
    products: [
      { name: 'Truffle Cake', price: '₹899', from: '#F59E0B', to: '#E8577E' },
      { name: 'Sourdough Loaf', price: '₹349', from: '#10B981', to: '#F59E0B' },
      { name: 'Croissant Box (6)', price: '₹499', from: '#E8577E', to: '#4F3FF0' },
      { name: 'Cookie Jar', price: '₹249', from: '#4F3FF0', to: '#10B981' },
    ],
  },
  {
    name: "Priya's Salon",
    domain: 'priya.talam4shop.com',
    delayClass: 'marketing-store-card-delay-two',
    products: [
      { name: 'Bridal Package', price: '₹15,999', from: '#4F3FF0', to: '#E8577E' },
      { name: 'Hair Spa', price: '₹1,499', from: '#E8577E', to: '#F59E0B' },
      { name: 'Mani-Pedi Combo', price: '₹799', from: '#F59E0B', to: '#10B981' },
      { name: 'Facial Glow', price: '₹999', from: '#10B981', to: '#4F3FF0' },
    ],
  },
]

function StoreCarousel() {
  return (
    <div className="relative">
      {STORES.map((store, idx) => (
        <div
          key={store.name}
          className={`${idx === 0 ? '' : 'absolute inset-0'} marketing-store-card ${store.delayClass}`}
        >
          <div className="px-4 pt-5 pb-3 border-b border-border-light bg-white">
            <div className="font-heading font-bold text-fg text-lg">{store.name}</div>
            <div className="text-[10px] text-muted-warm font-body">{store.domain}</div>
          </div>
          <div className="grid grid-cols-2 gap-2 p-3 bg-bg">
            {store.products.map((p) => (
              <div key={p.name} className="rounded-lg bg-surface overflow-hidden shadow-sm">
                <div
                  className="h-24"
                  style={{ background: `linear-gradient(135deg, ${p.from}33, ${p.to}33)` }}
                />
                <div className="p-2">
                  <div className="text-[10px] font-medium text-fg font-body truncate">{p.name}</div>
                  <div className="text-[11px] font-bold text-fg font-body">{p.price}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function Hero() {
  return (
    <section className="relative min-h-dvh bg-bg-dark overflow-hidden flex flex-col">
      <div
        className="marketing-blob-one absolute -top-40 -left-40 w-[560px] h-[560px] rounded-full bg-brand-primary/25 blur-[120px] pointer-events-none"
      />
      <div
        className="marketing-blob-two absolute -bottom-40 -right-20 w-[480px] h-[480px] rounded-full bg-amber/15 blur-[120px] pointer-events-none"
      />

      <div className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-20 px-6 md:px-[60px] pt-32 pb-16 max-w-[1280px] mx-auto w-full">
        <div className="marketing-hero-copy flex-1 max-w-[640px]">
          <h1 className="font-marketing font-semibold text-white text-[44px] md:text-[68px] leading-[1.05] tracking-[-0.02em]">
            <span className="block overflow-hidden pb-1">
              <span className="marketing-hero-line block">Your business</span>
            </span>
            <span className="block overflow-hidden pb-1">
              <span className="marketing-hero-line block [animation-delay:180ms]">deserves more than</span>
            </span>
            <span className="block overflow-hidden pb-1">
              <span className="marketing-hero-line block text-amber italic [animation-delay:320ms]">a DM inbox.</span>
            </span>
          </h1>

          <p className="marketing-fade-in mt-6 text-base md:text-lg text-white/60 font-body leading-relaxed max-w-[480px] [animation-delay:620ms]">
            Launch a Myntra-quality store under your own name — in 14 minutes, from your phone. Payments, orders, and shipping built in.
          </p>

          <div className="marketing-fade-in mt-8 flex flex-wrap items-center gap-4 [animation-delay:760ms]">
            <Link
              href="/auth"
              className="px-8 py-4 rounded-full bg-brand-primary text-white text-base font-semibold font-body hover:opacity-90 transition-opacity"
            >
              Start free
            </Link>
            <a
              href="https://silk.talam4shop.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 rounded-full border border-white/20 text-white text-base font-medium font-body hover:bg-white/10 transition-colors"
            >
              See a live store →
            </a>
          </div>
        </div>

        <div className="marketing-phone relative w-[280px] md:w-[320px] shrink-0 rotate-3">
          <div className="rounded-[40px] border-[10px] border-black bg-white shadow-2xl shadow-brand-primary/30 overflow-hidden">
            <StoreCarousel />
            <div className="flex justify-around py-3 border-t border-border-light bg-surface">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`w-5 h-5 rounded-md ${i === 0 ? 'bg-brand-primary' : 'bg-border-light'}`} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 border-t border-white/10 py-4 overflow-hidden">
        <div className="flex w-max animate-[marquee_30s_linear_infinite] motion-reduce:animate-none">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span key={i} className="mx-6 text-sm text-white/40 font-body whitespace-nowrap">
              {item} <span className="ml-6 text-white/20">·</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
