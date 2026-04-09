import { useMemo } from 'react'
import { formatCurrency } from '@/lib/utils/currency'
import { isoMonthOf } from '@/lib/utils/date'
import type { Transaction } from '@/types'

interface Props {
  allTxs: Transaction[]
}

interface Recurring {
  name: string
  modalAmount: number
  months: string[]
  occurrences: number
}

function merchantName(memo: string): string {
  const part = memo.split(/\s*[-–|]\s*/)[0].trim()
  return part.length >= 3 ? part : memo.trim()
}

export function RecurringList({ allTxs: txs }: Props) {
  const recurring = useMemo((): Recurring[] => {
    const allMonths = Array.from(new Set(txs.map((t) => isoMonthOf(t.date)))).sort()
    const last6 = allMonths.slice(-6)

    // Agrupa por merchant: {merchant: {month: [amounts]}}
    const map: Record<string, Record<string, number[]>> = {}
    txs
      .filter((t) => t.amount < 0 && last6.includes(isoMonthOf(t.date)))
      .forEach((t) => {
        const m = merchantName(t.memo)
        const mo = isoMonthOf(t.date)
        if (!map[m]) map[m] = {}
        if (!map[m][mo]) map[m][mo] = []
        map[m][mo].push(Math.abs(t.amount))
      })

    const result: Recurring[] = []

    for (const [name, monthMap] of Object.entries(map)) {
      const months = Object.keys(monthMap)
      if (months.length < 3) continue // aparece em < 3 meses → não é recorrente

      // Calcula valor modal (mediana arredondada)
      const allAmounts = Object.values(monthMap).flat().sort((a, b) => a - b)
      const modal = allAmounts[Math.floor(allAmounts.length / 2)]

      // Verifica se valores são consistentes (±20% do modal)
      const consistent = Object.values(monthMap).every((amounts) =>
        amounts.some((a) => Math.abs(a - modal) / modal <= 0.2),
      )
      if (!consistent) continue

      result.push({ name, modalAmount: modal, months, occurrences: months.length })
    }

    return result.sort((a, b) => b.modalAmount - a.modalAmount)
  }, [txs])

  if (recurring.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Nenhuma recorrência detectada nos últimos 6 meses.
      </p>
    )
  }

  const totalMonthly = recurring.reduce((s, r) => s + r.modalAmount, 0)

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground mb-3 pb-2 border-b">
        <span>{recurring.length} recorrentes detectados</span>
        <span>
          Total mensal estimado:{' '}
          <span className="font-mono font-semibold text-foreground">
            {formatCurrency(totalMonthly)}
          </span>
        </span>
      </div>
      {recurring.map((r) => (
        <div key={r.name} className="flex items-center justify-between text-xs py-1.5 border-b last:border-0">
          <div className="min-w-0">
            <div className="font-medium truncate">{r.name}</div>
            <div className="text-[10px] text-muted-foreground">
              {r.occurrences} dos últimos 6 meses
            </div>
          </div>
          <span className="font-mono text-red-500 shrink-0 ml-2">
            {formatCurrency(r.modalAmount)}/mês
          </span>
        </div>
      ))}
    </div>
  )
}
