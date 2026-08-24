import { StoreLink } from '@/components/store/store-context'
import { DotPattern } from '@/components/ui/dot-pattern'
import { BlurFade } from '@/components/ui/blur-fade'

export default function StoreNotFound() {
  return (
    <main className="relative flex min-h-[60vh] flex-col items-center justify-center overflow-hidden px-6 py-20 text-center">
      <DotPattern glow={false} className="text-store-primary/15 [mask-image:radial-gradient(360px_circle_at_center,white,transparent)]" />
      <BlurFade direction="up" className="relative space-y-3">
        <p className="font-heading text-6xl font-bold text-store-primary/30">404</p>
        <h1 className="font-heading text-2xl font-bold text-fg">Page not found</h1>
        <p className="mx-auto max-w-sm font-body text-sm text-muted-warm">
          We couldn&apos;t find the page you were looking for. It may have moved or no longer exists.
        </p>
        <StoreLink
          href="/"
          className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-store-primary px-6 font-body text-sm font-semibold text-white"
        >
          Back to store
        </StoreLink>
      </BlurFade>
    </main>
  )
}
