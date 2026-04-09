import { useMemo, useState } from 'react'
import { useTransactionStore } from '@/store/useTransactionStore'
import { isFinanciallyActive } from '@/lib/ofx/classifier'
import { formatCurrency } from '@/lib/utils/currency'
import { isoMonthOf, monthLabel } from '@/lib/utils/date'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CategorySheet } from '@/components/dashboard/CategorySheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

const COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b',
]

type Source = 'all' | 'account' | 'credit_card'

export default function CategoriesPage() {
  const { transactions } = useTransactionStore()

  const months = useMemo(() => {
    const set = new Set<string>()
    transactions.forEach((t) => set.add(isoMonthOf(t.date)))
    return Array.from(set).sort().reverse()
  }, [transactions])

  const [selectedMonth, setSelectedMonth] = useState(months[0] ?? '')
  const [source, setSource] = useState<Source>('all')
  const [sheetCategory, setSheetCategory] = useState<string | null>(null)
  const effectiveMonth = months.includes(selectedMonth) ? selectedMonth : (months[0] ?? selectedMonth)

  const expenses = useMemo(
    () =>
      transactions
        .filter(isFinanciallyActive)
        .filter((t) => t.amount < 0 && isoMonthOf(t.date) === effectiveMonth)
        .filter((t) => source === 'all' || t.source === source),
    [transactions, effectiveMonth, source],
  )

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {}
    expenses.forEach((t) => {
      map[t.category] = (map[t.category] ?? 0) + Math.abs(t.amount)
    })
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: +value.toFixed(2) }))
      .sort((a, b) => b.value - a.value)
  }, [expenses])

  const total = byCategory.reduce((s, c) => s + c.value, 0)

  // Comparativo mês a mês (últimos 3 meses para as top categorias)
  const topCats = byCategory.slice(0, 5).map((c) => c.name)
  const comparison = useMemo(() => {
    const relevant = months.slice(0, 3).reverse()
    return relevant.map((m) => {
      const txs = transactions
        .filter(isFinanciallyActive)
        .filter((t) => t.amount < 0 && isoMonthOf(t.date) === m)
        .filter((t) => source === 'all' || t.source === source)
      const entry: Record<string, number | string> = { month: monthLabel(m) }
      topCats.forEach((cat) => {
        entry[cat] = +Math.abs(txs.filter((t) => t.category === cat).reduce((s, t) => s + t.amount, 0)).toFixed(2)
      })
      return entry
    })
  }, [transactions, months, topCats, source])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Categorias</h1>
        <div className="flex gap-2">
          <Select value={source} onValueChange={(v) => setSource(v as Source)}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Conta + Cartão</SelectItem>
              <SelectItem value="account">Conta corrente</SelectItem>
              <SelectItem value="credit_card">Cartão de crédito</SelectItem>
            </SelectContent>
          </Select>
          <Select value={effectiveMonth} onValueChange={(v) => { if (v) setSelectedMonth(v) }}>
            <SelectTrigger className="w-36 h-8 text-sm">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Despesas por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {byCategory.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">Sem despesas no período</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={byCategory} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(1)}k`}
                  />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip formatter={(v) => formatCurrency(v as number)} />
                  <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                    {byCategory.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Lista detalhada */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Detalhamento — {effectiveMonth}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Categoria</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">Valor</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">%</th>
                </tr>
              </thead>
              <tbody>
                {byCategory.map((c, i) => (
                  <tr
                    key={c.name}
                    className="border-b last:border-0 cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => setSheetCategory(c.name)}
                  >
                    <td className="px-4 py-2 flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      {c.name}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-red-500">
                      {formatCurrency(c.value)}
                    </td>
                    <td className="px-4 py-2 text-right text-muted-foreground">
                      {total > 0 ? ((c.value / total) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
                {byCategory.length > 0 && (
                  <tr className="border-t bg-muted/30">
                    <td className="px-4 py-2 font-medium">Total</td>
                    <td className="px-4 py-2 text-right font-mono font-medium text-red-500">
                      {formatCurrency(total)}
                    </td>
                    <td className="px-4 py-2 text-right text-muted-foreground">100%</td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <CategorySheet
        category={sheetCategory}
        onClose={() => setSheetCategory(null)}
        allTxs={transactions}
        currentMonth={effectiveMonth}
      />

      {/* Comparativo mês a mês */}
      {comparison.length > 1 && topCats.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top categorias — últimos {comparison.length} meses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={comparison} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip formatter={(v) => formatCurrency(v as number)} />
                {topCats.map((cat, i) => (
                  <Bar key={cat} dataKey={cat} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
