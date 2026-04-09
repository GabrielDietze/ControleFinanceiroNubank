import { useMemo, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils/currency'
import { isoMonthOf } from '@/lib/utils/date'
import type { Transaction } from '@/types'

interface Props {
  allTxs: Transaction[]
  allMonths: string[]
}

interface MonthKPI {
  income: number
  expense: number
  balance: number
  savingsRate: number
  byCategory: Record<string, number>
}

function calcMonthKPI(txs: Transaction[], month: string): MonthKPI {
  const monthTxs = txs.filter((t) => isoMonthOf(t.date) === month)
  const income = monthTxs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const expense = Math.abs(monthTxs.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0))
  const balance = income - expense
  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0
  const byCategory: Record<string, number> = {}
  monthTxs
    .filter((t) => t.amount < 0)
    .forEach((t) => {
      byCategory[t.category] = (byCategory[t.category] ?? 0) + Math.abs(t.amount)
    })
  return { income, expense, balance, savingsRate, byCategory }
}

function deltaChip(a: number, b: number, goodUp: boolean) {
  if (b === 0) return null
  const pct = ((a - b) / b) * 100
  const good = goodUp ? pct > 0 : pct < 0
  const color = Math.abs(pct) < 1 ? 'text-muted-foreground' : good ? 'text-green-600' : 'text-red-500'
  const sign = pct > 0 ? '+' : ''
  return (
    <span className={`text-[10px] font-medium ${color}`}>
      {sign}{pct.toFixed(1)}%
    </span>
  )
}

export function PeriodComparator({ allTxs, allMonths }: Props) {
  const sortedMonths = useMemo(() => [...allMonths].sort().reverse(), [allMonths])

  const [monthA, setMonthA] = useState(sortedMonths[0] ?? '')
  const [monthB, setMonthB] = useState(sortedMonths[1] ?? '')

  const kpiA = useMemo(
    () => (monthA ? calcMonthKPI(allTxs, monthA) : null),
    [allTxs, monthA],
  )
  const kpiB = useMemo(
    () => (monthB ? calcMonthKPI(allTxs, monthB) : null),
    [allTxs, monthB],
  )

  const allCategories = useMemo(() => {
    if (!kpiA || !kpiB) return []
    const cats = new Set([...Object.keys(kpiA.byCategory), ...Object.keys(kpiB.byCategory)])
    return Array.from(cats).sort((a, b) => {
      const va = kpiA.byCategory[a] ?? 0
      const vb = kpiA.byCategory[b] ?? 0
      return vb - va
    })
  }, [kpiA, kpiB])

  return (
    <div className="space-y-4">
      {/* Seletores de período */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground w-14">Período A</span>
          <Select value={monthA} onValueChange={(v) => { if (v) setMonthA(v) }}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortedMonths.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="text-muted-foreground">vs</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground w-14">Período B</span>
          <Select value={monthB} onValueChange={(v) => { if (v) setMonthB(v) }}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortedMonths.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela comparativa */}
      {kpiA && kpiB && (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Métrica</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                {monthA}
              </th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                {monthB}
              </th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground">Δ A vs B</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b hover:bg-muted/30">
              <td className="px-3 py-1.5 font-medium">Receitas</td>
              <td className="px-3 py-1.5 text-right font-mono text-green-600">{formatCurrency(kpiA.income)}</td>
              <td className="px-3 py-1.5 text-right font-mono text-green-600">{formatCurrency(kpiB.income)}</td>
              <td className="px-3 py-1.5 text-right">{deltaChip(kpiA.income, kpiB.income, true)}</td>
            </tr>
            <tr className="border-b hover:bg-muted/30">
              <td className="px-3 py-1.5 font-medium">Despesas</td>
              <td className="px-3 py-1.5 text-right font-mono text-red-500">{formatCurrency(kpiA.expense)}</td>
              <td className="px-3 py-1.5 text-right font-mono text-red-500">{formatCurrency(kpiB.expense)}</td>
              <td className="px-3 py-1.5 text-right">{deltaChip(kpiA.expense, kpiB.expense, false)}</td>
            </tr>
            <tr className="border-b hover:bg-muted/30">
              <td className="px-3 py-1.5 font-medium">Saldo</td>
              <td className={`px-3 py-1.5 text-right font-mono ${kpiA.balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatCurrency(kpiA.balance)}</td>
              <td className={`px-3 py-1.5 text-right font-mono ${kpiB.balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatCurrency(kpiB.balance)}</td>
              <td className="px-3 py-1.5 text-right">{deltaChip(kpiA.balance, kpiB.balance, true)}</td>
            </tr>
            <tr className="border-b bg-muted/10 hover:bg-muted/30">
              <td className="px-3 py-1.5 font-medium">Poupança</td>
              <td className="px-3 py-1.5 text-right font-mono">{kpiA.savingsRate.toFixed(1)}%</td>
              <td className="px-3 py-1.5 text-right font-mono">{kpiB.savingsRate.toFixed(1)}%</td>
              <td className="px-3 py-1.5 text-right">
                <span className={`text-[10px] font-medium ${kpiA.savingsRate - kpiB.savingsRate > 0 ? 'text-green-600' : kpiA.savingsRate - kpiB.savingsRate < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                  {(kpiA.savingsRate - kpiB.savingsRate > 0 ? '+' : '')}{(kpiA.savingsRate - kpiB.savingsRate).toFixed(1)} p.p.
                </span>
              </td>
            </tr>

            {/* Divisor */}
            <tr><td colSpan={4} className="px-3 py-1 text-[10px] text-muted-foreground font-medium border-b border-t bg-muted/20">Por categoria</td></tr>

            {allCategories.map((cat) => {
              const va = kpiA.byCategory[cat] ?? 0
              const vb = kpiB.byCategory[cat] ?? 0
              return (
                <tr key={cat} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-1 text-muted-foreground truncate max-w-[140px]">{cat}</td>
                  <td className="px-3 py-1 text-right font-mono">{va > 0 ? formatCurrency(va) : '—'}</td>
                  <td className="px-3 py-1 text-right font-mono text-muted-foreground">{vb > 0 ? formatCurrency(vb) : '—'}</td>
                  <td className="px-3 py-1 text-right">
                    {va > 0 && vb > 0 ? deltaChip(va, vb, false) : null}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
