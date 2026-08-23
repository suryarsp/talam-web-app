type MonthlyBar = { label: string; value: number; tooltip?: string }

/** Shared 6-month bar chart used by Growth (signups) and Order Insights (GMV trend).
 *  Zero-value months render as a flat 0% bar rather than the Math.max floor every
 *  nonzero bar gets, so an empty month reads as empty instead of a fake sliver.
 *  `renderValue` lets each caller format the number shown above its own bars
 *  (a raw signup count vs. a currency GMV figure) — defaults to the raw value. */
export function MonthlyBarChart({
  data,
  renderValue = (v: number) => v,
}: {
  data: MonthlyBar[]
  renderValue?: (value: number) => React.ReactNode
}) {
  const max = Math.max(1, ...data.map((d) => d.value))

  return (
    <div className="flex h-32 items-end gap-3">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-xs text-foreground">{renderValue(d.value)}</span>
          <div className="flex h-full w-full items-end">
            <div
              className="w-full rounded-t bg-primary"
              style={{ height: `${d.value === 0 ? 0 : Math.max(4, (d.value / max) * 100)}%` }}
              title={d.tooltip}
            />
          </div>
          <span className="text-xs text-muted-foreground">{d.label}</span>
        </div>
      ))}
    </div>
  )
}
