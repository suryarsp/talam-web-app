import { DotPattern } from '@/components/ui/dot-pattern'
import { BlurFade } from '@/components/ui/blur-fade'

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <DotPattern glow={false} className="text-brand-primary/15 [mask-image:radial-gradient(360px_circle_at_center,white,transparent)]" />
      <BlurFade direction="up" className="relative space-y-3">
        <p className="font-heading text-6xl font-bold text-brand-primary/30">404</p>
        <h1 className="font-heading text-2xl font-bold text-fg">Store not found</h1>
        <p className="mx-auto max-w-sm font-body text-sm text-muted-foreground">
          This store doesn&apos;t exist or may have moved.
        </p>
      </BlurFade>
    </main>
  )
}
