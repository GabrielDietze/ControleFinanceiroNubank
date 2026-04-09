import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { isoMonthOf } from '@/lib/utils/date'
import type { Transaction } from '@/types'

interface Props {
  allTxs: Transaction[]
  monthTxs: Transaction[]
  currentMonth: string
}

export function MonthPaceBar({ allTxs, monthTxs, currentMonth }: Props) {
  const today = new Date()
  const isCurrentMonth = isoMonthOf(today.toISOString()) === currentMonth

  const data = useMemo(() => {
    if (!isCurrentMonth) return null

    const [y, m] = currentMonth.split('-').map(Number)
    const totalDays = new Date(y, m, 0).getDate()
    const daysPassed = today.getDate()

    const spent = monthTxs
      .filter((t) => t.amount < 0)
      .reduce((s, t) => s + Math.abs(t.amount), 0)

    const pace = daysPassed > 0 ? spent / daysPassed : 0
    const projection = pace * totalDays

    const prevMonths = Array.from(new Set(allTxs.map((t) => isoMonthOf(t.date))))
      .filter((mo) => mo < currentMonth)
      .sort()
      .slice(-6)

    const historicalAvg =
      prevMonths.length > 0
        ? prevMonths
            .map((mo) =>
              allTxs
                .filter((t) => isoMonthOf(t.date) === mo && t.amount < 0)
                .reduce((s, t) => s + Math.abs(t.amount), 0),
            )
            .reduce((s, v) => s + v, 0) / prevMonths.length
        : 0

    const desvio =
      historicalAvg > 0 ? ((projection - historicalAvg) / historicalAvg) * 100 : null

    // barras: % do mês decorrido vs % do budget estimado gasto
    const monthPct = (daysPassed / totalDays) * 100
    const budgetPct = historicalAvg > 0 ? Math.min((spent / historicalAvg) * 100, 100) : monthPct

    return { totalDays, daysPassed, monthPct, budgetPct, spent, pace, projection, historicalAvg, desvio }
  }, [allTxs, monthTxs, currentMonth, isCurrentMonth, today])

  if (!data) return null

  const { totalDays, daysPassed, monthPct, budgetPct, spent, pace, projection, historicalAvg, desvio } = data
  const overPace = desvio !== null && desvio > 15

  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">
            Ritmo do mês · Dia{' '}
            <span className="text-foreground font-semibold">{daysPassed}</span> de {totalDays}
          </span>
          {desvio !== null && (
            <span
              className={`text-xs font-medium ${
                Math.abs(desvio) < 5
                  ? 'text-muted-foreground'
                  : desvio > 0
                  ? 'text-red-500'
                  : 'text-green-600'
              }`}
            >
              {desvio > 0 ? '▲' : '▼'} {Math.abs(desvio).toFixed(0)}% vs média histórica
            </span>
          )}
        </div>

        {/* Barra dupla: tempo decorrido (cinza) + gasto (colorida) */}
        <div className="relative h-2 rounded-full bg-muted overflow-hidden mb-2">
          <div
            className="absolute top-0 left-0 h-full rounded-full bg-muted-foreground/30"
            style={{ width: `${monthPct}%` }}
          />
          <div
            className={`absolute top-0 left-0 h-full rounded-full transition-all ${
              overPace ? 'bg-red-400' : 'bg-primary/70'
            }`}
            style={{ width: `${budgetPct}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>
            Gasto:{' '}
            <span className="font-mono font-medium text-foreground">{formatCurrency(spent)}</span>
          </span>
          <span>
            Pace:{' '}
            <span className="font-mono font-medium text-foreground">
              {formatCurrency(pace)}/dia
            </span>
          </span>
          <span>
            Projeção:{' '}
            <span className={`font-mono font-semibold ${overPace ? 'text-red-500' : 'text-foreground'}`}>
              {formatCurrency(projection)}
            </span>
          </span>
          {historicalAvg > 0 && (
            <span>Média 6m: {formatCurrency(historicalAvg)}</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
