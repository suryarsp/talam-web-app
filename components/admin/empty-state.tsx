import type { LucideIcon } from 'lucide-react'

type Props = {
  icon: LucideIcon
  message: string
}

export function EmptyState({ icon: Icon, message }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg bg-surface py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-bg">
        <Icon className="size-5 text-muted-warm" strokeWidth={2} />
      </span>
      <p className="text-sm text-muted-warm">{message}</p>
    </div>
  )
}
