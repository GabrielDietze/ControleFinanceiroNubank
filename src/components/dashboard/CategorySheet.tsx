import { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate, isoMonthOf, monthLabel } from '@/lib/utils/date'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import type { Transaction } from '@/types'
import { TransactionDetailDialog } from '@/components/ui/TransactionDetailDialog'

interface Props {
  category: string | null
  onClose: () => void
  allTxs: Transaction[]
  currentMonth: string
}

function merchantName(memo: string): string {
  const part = memo.split(/\s*[-–|]\s*/)[0].trim()
  return part.length >= 3 ? part : memo.trim()
}

export function CategorySheet({ category, onClose, allTxs, currentMonth }: Props) {
  const [detailTx, setDetailTx] = useState<Transaction | null>(null)
  const data = useMemo(() => {
    if (!category) return null

    const months = Array.from(new Set(allTxs.map((t) => isoMonthOf(t.date))))
      .sort()
      .slice(-6)

    const trend = months.map((m) => ({
      month: monthLabel(m),
      Gasto: +Math.abs(
        allTxs
          .filter((t) => isoMonthOf(t.date) === m && t.category === category && t.amount < 0)
          .reduce((s, t) => s + t.amount, 0),
      ).toFixed(2),
      current: m === currentMonth,
    }))

    const histMonths = months.filter((m) => m !== currentMonth)
    const avg =
      histMonths.length > 0
        ? histMonths
            .map((m) =>
              Math.abs(
                allTxs
                  .filter((t) => isoMonthOf(t.date) === m && t.category === category && t.amount < 0)
                  .reduce((s, t) => s + t.amount, 0),
              ),
            )
            .reduce((s, v) => s + v, 0) / histMonths.length
        : 0

    const merchantMap: Record<string, number> = {}
    allTxs
      .filter(
        (t) => isoMonthOf(t.date) === currentMonth && t.category === category && t.amount < 0,
      )
      .forEach((t) => {
        const m = merchantName(t.memo)
        merchantMap[m] = (merchantMap[m] ?? 0) + Math.abs(t.amount)
      })
    const merchants = Object.entries(merchantMap)
      .map(([name, total]) => ({ name, total: +total.toFixed(2) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)

    const txs = allTxs
      .filter(
        (t) => isoMonthOf(t.date) === currentMonth && t.category === category && t.amount < 0,
      )
      .sort((a, b) => b.date.localeCompare(a.date))

    return { trend, avg, merchants, txs }
  }, [category, allTxs, currentMonth])

  return (
    <>
    <Dialog open={!!category} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] sm:max-h-[85vh] sm:max-w-xl overflow-y-auto">
        <DialogClose onClick={onClose} />
        <DialogHeader>
          <DialogTitle>{category}</DialogTitle>
        </DialogHeader>

        {data && (
          <div className="space-y-5">
            {/* Trend chart */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Histórico — últimos 6 meses
              </p>
              <ResponsiveContainer width="100%" height={110}>
                <BarChart data={data.trend} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                  <YAxis hide />
                  {data.avg > 0 && (
                    <ReferenceLine
                      y={data.avg}
                      stroke="#94a3b8"
                      strokeDasharray="4 2"
                      label={{ value: 'média', position: 'right', fontSize: 8, fill: '#94a3b8' }}
                    />
                  )}
                  <Tooltip
                    formatter={(v) => formatCurrency(v as number)}
                    contentStyle={{ fontSize: 11 }}
                  />
                  <Bar
                    dataKey="Gasto"
                    fill="#6366f1"
                    radius={[3, 3, 0, 0]}
                    // Mês atual em destaque
                    label={false}
                  />
                </BarChart>
              </ResponsiveContainer>
              {data.avg > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Média histórica:{' '}
                  <span className="font-mono font-medium">{formatCurrency(data.avg)}</span>
                </p>
              )}
            </div>

            {/* Top merchants */}
            {data.merchants.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Top estabelecimentos neste mês
                </p>
                <div className="space-y-1.5">
                  {data.merchants.map((m) => (
                    <div key={m.name} className="flex justify-between text-xs">
                      <span className="truncate text-muted-foreground">{m.name}</span>
                      <span className="font-mono shrink-0 ml-2">{formatCurrency(m.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transactions */}
            {data.txs.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Transações do mês ({data.txs.length})
                </p>
                <div className="space-y-0 max-h-48 overflow-y-auto">
                  {data.txs.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between text-xs py-1.5 border-b last:border-0 cursor-pointer hover:bg-muted/40 rounded px-1 -mx-1 transition-colors"
                      onClick={() => setDetailTx(t)}
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium" title={t.memo}>
                          {t.memo}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {formatDate(t.date)}
                        </div>
                      </div>
                      <span className="font-mono text-red-500 shrink-0 ml-2">
                        {formatCurrency(Math.abs(t.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>

    <TransactionDetailDialog
      transaction={detailTx}
      onClose={() => setDetailTx(null)}
    />
  </>
  )
}
