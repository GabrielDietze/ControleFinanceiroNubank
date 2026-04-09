import { useMemo } from 'react'
import { formatCurrency } from '@/lib/utils/currency'
import { isoMonthOf, monthLabel } from '@/lib/utils/date'
import type { Transaction } from '@/types'
import { type Period, getMonthsForPeriod } from './PeriodSelector'

interface Props {
  allTxs: Transaction[]
  allMonths: string[]
  period: Period
}

export function SpendingHeatmap({ allTxs, allMonths, period }: Props) {
  const { months, matrix, maxVal } = useMemo(() => {
    const months = getMonthsForPeriod(period, allMonths)

    const matrix: Record<string, Record<number, number>> = {}
    allTxs
      .filter((t) => months.includes(isoMonthOf(t.date)) && t.amount < 0)
      .forEach((t) => {
        const m = isoMonthOf(t.date)
        const day = parseInt(t.date.slice(8, 10), 10)
        if (!matrix[m]) matrix[m] = {}
        matrix[m][day] = (matrix[m][day] ?? 0) + Math.abs(t.amount)
      })

    const allVals = Object.values(matrix).flatMap((d) => Object.values(d))
    const maxVal = allVals.length > 0 ? Math.max(...allVals) : 1

    return { months, matrix, maxVal }
  }, [allTxs, allMonths, period])

  const days = Array.from({ length: 31 }, (_, i) => i + 1)

  return (
    <div className="overflow-x-auto">
      <div className="min-w-max">
        {/* Header de meses */}
        <div className="flex gap-1 mb-1 pl-7">
          {months.map((m) => (
            <div
              key={m}
              className="w-7 text-center text-[9px] text-muted-foreground capitalize leading-tight"
            >
              {monthLabel(m)}
            </div>
          ))}
        </div>

        {/* Linhas de dias */}
        {days.map((day) => (
          <div key={day} className="flex items-center gap-1 mb-0.5">
            <div className="w-6 text-right text-[9px] text-muted-foreground shrink-0 leading-none">
              {day % 5 === 0 || day === 1 ? day : ''}
            </div>
            {months.map((m) => {
              const val = matrix[m]?.[day] ?? 0
              const intensity = val > 0 ? val / maxVal : 0
              return (
                <div
                  key={m}
                  title={val > 0 ? `${m}-${String(day).padStart(2, '0')}: ${formatCurrency(val)}` : undefined}
                  className="w-7 h-4 rounded-sm"
                  style={{
                    backgroundColor:
                      val > 0
                        ? `rgba(239, 68, 68, ${Math.round((0.15 + intensity * 0.85) * 100) / 100})`
                        : 'rgb(241, 245, 249)',
                  }}
                />
              )
            })}
          </div>
        ))}

        {/* Legenda */}
        <div className="flex items-center gap-2 mt-2 pl-7 text-[9px] text-muted-foreground">
          <span>Menos</span>
          {[0.1, 0.3, 0.5, 0.7, 0.9].map((v) => (
            <div
              key={v}
              className="w-4 h-3 rounded-sm"
              style={{ backgroundColor: `rgba(239, 68, 68, ${0.15 + v * 0.85})` }}
            />
          ))}
          <span>Mais</span>
        </div>
      </div>
    </div>
  )
}
