export function CalorieReadout({ value, target }: { value: number; target: number }) {
  const pct = Math.min((value / target) * 100, 100)

  return (
    <div>
      <div className="flex items-baseline gap-3">
        <span className="font-display text-5xl sm:text-7xl font-medium tracking-tight text-stone-950 tabular-nums">
          {Math.round(value)}
        </span>
        <span className="text-sm text-stone-400 font-mono">/ {target} kcal</span>
      </div>
      <div className="mt-4 h-2 w-full rounded-full bg-stone-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-teal-500 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function FuelBar({
  label,
  value,
  target,
  unit = 'g',
  colorClass,
}: {
  label: string
  value: number
  target: number
  unit?: string
  colorClass: string
}) {
  const pct = Math.min((value / target) * 100, 100)

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs font-mono uppercase tracking-widest text-stone-500">{label}</span>
        <span className="text-xs font-mono text-stone-400">
          <span className="text-stone-700">{Math.round(value)}</span>
          {' / '}{target}{unit}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-stone-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}