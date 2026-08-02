'use client'

import { motion, AnimatePresence } from 'motion/react'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { BlurFade } from '@/components/ui/blur-fade'
import { cn } from '@/lib/utils'

const FAQS = [
  { q: 'Do I need GST registration to start?', a: 'No. Start selling without GST or MSME registration. Add GST details later when your business crosses the threshold.' },
  { q: 'How long does setup actually take?', a: 'About 14 minutes. Name your store, add a few products, connect Razorpay, go live. All from your phone.' },
  { q: 'Can I use my own domain name?', a: 'Yes, on the Pro plan. Every store gets yourstore.talam4shop.com free. Pro lets you connect yoursilks.com.' },
  { q: 'What payment methods do customers get?', a: 'UPI (Google Pay, PhonePe), credit and debit cards, net banking, and cash on delivery — via Razorpay, settled to your bank.' },
  { q: 'Can I create occasion-based collections?', a: 'Absolutely. Diwali, Wedding Season, Pongal — create collections with hero banners, curated products, and special offers.' },
  { q: 'How does shipping work?', a: 'Shiprocket is built in. Generate a shipping label in one click per order. Customers get a WhatsApp tracking link automatically.' },
  { q: 'Is there a free trial?', a: '14 days, full access, no credit card. Walk away with nothing owed if it\'s not for you.' },
  { q: 'Can I switch plans later?', a: 'Anytime. Upgrade or downgrade from your dashboard — change applies next billing cycle.' },
]

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false)

  return (
    <BlurFade delay={0.05 + index * 0.04} inView>
      <div className="border-b border-border-light">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between py-6 text-left group"
        >
          <span className="font-body font-medium text-fg text-base md:text-lg pr-4 group-hover:text-brand-primary transition-colors">
            {q}
          </span>
          <Plus className={cn(
            'w-5 h-5 text-muted-warm shrink-0 transition-transform duration-300',
            open && 'rotate-45 text-brand-primary'
          )} />
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <p className="pb-6 text-sm md:text-base text-muted-warm font-body leading-relaxed pr-10">
                {a}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </BlurFade>
  )
}

export function Faq() {
  return (
    <section id="faq" className="bg-surface py-32 md:py-44 border-t border-border-light">
      <div className="max-w-[720px] mx-auto px-6 md:px-16">
        <BlurFade delay={0.1} inView>
          <p className="text-xs uppercase tracking-[0.25em] text-brand-primary font-body font-medium text-center mb-4">FAQ</p>
          <h2 className="font-marketing font-semibold text-fg text-[34px] md:text-[48px] leading-[1.1] tracking-[-0.02em] text-center mb-14">
            Questions, answered.
          </h2>
        </BlurFade>

        <div className="border-t border-border-light">
          {FAQS.map((faq, i) => (
            <FaqItem key={faq.q} {...faq} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
