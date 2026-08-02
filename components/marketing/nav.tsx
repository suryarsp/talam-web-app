'use client'

import Link from 'next/link'
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Logo } from '@/components/logo'
import { Menu, X } from 'lucide-react'

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
]

export function MarketingNav() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/10 bg-bg-dark/60 backdrop-blur-xl backdrop-saturate-150">
        <div className="flex items-center justify-between px-6 py-4 md:px-[60px] max-w-[1400px] mx-auto">
          <Logo className="text-white text-[22px]" />
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-white/60 hover:text-white transition-colors duration-200 font-body"
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/auth"
              className="text-sm text-white/60 hover:text-white transition-colors duration-200 font-body"
            >
              Sign in
            </Link>
            <Link
              href="/auth"
              className="px-5 py-[9px] rounded-full bg-brand-primary text-white text-sm font-semibold font-body hover:opacity-90 transition-opacity"
            >
              Start free
            </Link>
          </div>
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden text-white/70 hover:text-white"
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed inset-x-0 top-[61px] z-40 bg-bg-dark/95 backdrop-blur-xl border-b border-white/10 md:hidden"
          >
            <div className="flex flex-col gap-1 px-6 py-4">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="py-3 text-base text-white/70 hover:text-white font-body transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <Link
                href="/auth"
                onClick={() => setOpen(false)}
                className="mt-2 block text-center px-6 py-3 rounded-full bg-brand-primary text-white text-sm font-semibold font-body"
              >
                Start free
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
