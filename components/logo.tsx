import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('font-heading font-bold text-fg text-[26px] leading-8', className)}>
      talam.
    </span>
  )
}
