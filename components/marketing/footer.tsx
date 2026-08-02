import Link from 'next/link'
import { Logo } from '@/components/logo'

export function MarketingFooter() {
  return (
    <footer className="bg-bg-dark border-t border-white/10 py-10">
      <div className="max-w-[1200px] mx-auto px-6 md:px-[60px] flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Logo className="text-white text-[20px]" />
          <span className="text-sm text-white/40 font-body">Built for Indian textile shops</span>
        </div>
        <div className="flex items-center gap-8">
          <a href="#features" className="text-sm text-white/50 hover:text-white transition-colors font-body">Features</a>
          <a href="#pricing" className="text-sm text-white/50 hover:text-white transition-colors font-body">Pricing</a>
          <Link href="/terms" className="text-sm text-white/50 hover:text-white transition-colors font-body">Terms</Link>
          <Link href="/privacy" className="text-sm text-white/50 hover:text-white transition-colors font-body">Privacy</Link>
        </div>
      </div>
    </footer>
  )
}
