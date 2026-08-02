import { TrendingUp, TrendingDown } from 'lucide-react'

type Props = {
  label: string
  value: string
  change?: string
  up?: boolean
}

export function StatCard({ label, value, change, up }: Props) {
  return (
    <div className="rounded-lg border border-border-light bg-surface p-3.5 shadow-sm md:p-4">
      <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-muted-warm">{label}</p>
      <p className="font-marketing mt-1.5 text-[28px] font-bold leading-none tracking-[-0.02em] text-brand-primary md:text-[32px]">
        {value}
      </p>
      <p className={`mt-1.5 flex min-h-[16px] items-center gap-1 text-2xs font-medium ${change ? (up ? 'text-success' : 'text-danger') : 'invisible'}`}>
        {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
        {change ?? '—'}
      </p>
    </div>
  )
}
