import { useMemo } from 'react'
import { useTransactionStore } from '@/store/useTransactionStore'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate, isoMonthOf, monthLabel } from '@/lib/utils/date'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp } from 'lucide-react'

export default function InvestmentsPage() {
  const { investments } = useTransactionStore()

  const sorted = useMemo(
    () => [...investments].sort((a, b) => b.date.localeCompare(a.date)),
    [investments],
  )

  const totalApplied = useMemo(
    () => investments.filter((i) => i.type === 'application').reduce((s, i) => s + i.amount, 0),
    [investments],
  )
  const totalWithdrawn = useMemo(
    () => investments.filter((i) => i.type === 'withdrawal').reduce((s, i) => s + i.amount, 0),
    [investments],
  )
  const netBalance = totalApplied - totalWithdrawn

  // Evolução acumulada por mês
  const evolutionData = useMemo(() => {
    const byMonth: Record<string, number> = {}
    const monthsSorted = Array.from(
      new Set(investments.map((i) => isoMonthOf(i.date))),
    ).sort()

    let running = 0
    for (const m of monthsSorted) {
      const monthItems = investments.filter((i) => isoMonthOf(i.date) === m)
      const net = monthItems.reduce(
        (s, i) => s + (i.type === 'application' ? i.amount : -i.amount),
        0,
      )
      running += net
      byMonth[m] = +running.toFixed(2)
    }

    return Object.entries(byMonth).map(([m, saldo]) => ({
      month: monthLabel(m),
      saldo,
    }))
  }, [investments])

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Investimentos</h1>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">Total aplicado</span>
              <TrendingUp size={16} className="text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalApplied)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="text-sm text-muted-foreground mb-1">Total resgatado</div>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(totalWithdrawn)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="text-sm text-muted-foreground mb-1">Saldo líquido</div>
            <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {formatCurrency(netBalance)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Evolução */}
      {evolutionData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Saldo investido acumulado</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={evolutionData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="investGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(1)}k`}
                />
                <Tooltip formatter={(v) => formatCurrency(v as number)} />
                <Area
                  type="monotone"
                  dataKey="saldo"
                  stroke="#6366f1"
                  fill="url(#investGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Histórico */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Histórico de movimentações</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sorted.length === 0 ? (
            <p className="px-4 py-8 text-center text-muted-foreground text-sm">
              Nenhum investimento encontrado. Importe extratos para ver os dados.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Data</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Produto</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Tipo</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">Valor</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                      {formatDate(inv.date)}
                    </td>
                    <td className="px-4 py-2 font-medium">{inv.product}</td>
                    <td className="px-4 py-2">
                      <Badge
                        variant="outline"
                        className={
                          inv.type === 'application'
                            ? 'border-blue-300 text-blue-700'
                            : 'border-amber-300 text-amber-700'
                        }
                      >
                        {inv.type === 'application' ? 'Aplicação' : 'Resgate'}
                      </Badge>
                    </td>
                    <td className={`px-4 py-2 text-right font-mono whitespace-nowrap ${
                      inv.type === 'application' ? 'text-blue-600' : 'text-amber-600'
                    }`}>
                      {formatCurrency(inv.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
