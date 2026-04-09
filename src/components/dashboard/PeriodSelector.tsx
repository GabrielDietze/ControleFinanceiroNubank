export type Period = '3m' | '6m' | '12m' | 'ytd'

const OPTIONS: { value: Period; label: string }[] = [
  { value: '3m', label: '3 meses' },
  { value: '6m', label: '6 meses' },
  { value: '12m', label: '12 meses' },
  { value: 'ytd', label: 'Este ano' },
]

interface Props {
  value: Period
  onChange: (v: Period) => void
}

export function PeriodSelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-0.5 p-0.5 bg-muted rounded-lg w-fit">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
            value === opt.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

/** Retorna os meses que ficam dentro do período selecionado */
export function getMonthsForPeriod(period: Period, allMonths: string[]): string[] {
  const sorted = [...allMonths].sort()
  if (period === 'ytd') {
    const year = new Date().getFullYear().toString()
    return sorted.filter((m) => m.startsWith(year))
  }
  const n = period === '3m' ? 3 : period === '6m' ? 6 : 12
  return sorted.slice(-n)
}
