import { useMemo, useState } from 'react'
import { useTransactionStore } from '@/store/useTransactionStore'
import { isFinanciallyActive } from '@/lib/ofx/classifier'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate, isoMonthOf, monthLabel, monthsBack } from '@/lib/utils/date'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TrendingUp, TrendingDown, Wallet, Link } from 'lucide-react'
import { Link as RouterLink } from 'react-router-dom'

const PIE_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b',
]

export default function DashboardPage() {
  const { transactions, loaded } = useTransactionStore()

  const months = useMemo(() => {
    const set = new Set<string>()
    transactions.forEach((t) => set.add(isoMonthOf(t.date)))
    return Array.from(set).sort().reverse()
  }, [transactions])

  const [selectedMonth, setSelectedMonth] = useState<string>(
    months[0] ?? isoMonthOf(new Date().toISOString()),
  )

  const activeTransactions = useMemo(
    () => transactions.filter(isFinanciallyActive),
    [transactions],
  )

  // KPIs do mês selecionado
  const monthTransactions = useMemo(
    () => activeTransactions.filter((t) => isoMonthOf(t.date) === selectedMonth),
    [activeTransactions, selectedMonth],
  )

  const income = useMemo(
    () => monthTransactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0),
    [monthTransactions],
  )
  const expense = useMemo(
    () => Math.abs(monthTransactions.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0)),
    [monthTransactions],
  )
  const balance = income - expense

  // Gráfico de barras: últimos 6 meses
  const barData = useMemo(() => {
    const cutoff = monthsBack(6).slice(0, 7)
    const relevantMonths = Array.from(
      new Set(activeTransactions.map((t) => isoMonthOf(t.date))),
    )
      .filter((m) => m >= cutoff)
      .sort()

    return relevantMonths.map((m) => {
      const txs = activeTransactions.filter((t) => isoMonthOf(t.date) === m)
      const inc = txs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
      const exp = Math.abs(txs.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0))
      return { month: monthLabel(m), Receitas: +inc.toFixed(2), Despesas: +exp.toFixed(2) }
    })
  }, [activeTransactions])

  // Gráfico de pizza: despesas por categoria no mês
  const pieData = useMemo(() => {
    const expenses = monthTransactions.filter((t) => t.amount < 0)
    const grouped: Record<string, number> = {}
    expenses.forEach((t) => {
      grouped[t.category] = (grouped[t.category] ?? 0) + Math.abs(t.amount)
    })
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value: +value.toFixed(2) }))
      .sort((a, b) => b.value - a.value)
  }, [monthTransactions])

  // Últimas transações
  const recent = useMemo(
    () =>
      [...transactions]
        .filter(isFinanciallyActive)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 8),
    [transactions],
  )

  if (!loaded) return <div className="p-6 text-muted-foreground">Carregando...</div>

  if (transactions.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full text-center gap-4">
        <Wallet size={48} className="text-muted-foreground" />
        <div>
          <h2 className="text-xl font-semibold mb-1">Nenhum dado ainda</h2>
          <p className="text-muted-foreground text-sm">
            Importe um arquivo OFX do Nubank para começar.
          </p>
        </div>
        <RouterLink
          to="/import"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
        >
          Importar agora
        </RouterLink>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Select value={selectedMonth} onValueChange={(v) => { if (v) setSelectedMonth(v) }}>
          <SelectTrigger className="w-36 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        <KPICard
          title="Receitas"
          value={income}
          icon={<TrendingUp size={18} className="text-green-600" />}
          color="text-green-600"
        />
        <KPICard
          title="Despesas"
          value={expense}
          icon={<TrendingDown size={18} className="text-red-500" />}
          color="text-red-500"
          negative
        />
        <KPICard
          title="Saldo"
          value={balance}
          icon={<Wallet size={18} className={balance >= 0 ? 'text-green-600' : 'text-red-500'} />}
          color={balance >= 0 ? 'text-green-600' : 'text-red-500'}
          negative={balance < 0}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Receitas vs Despesas (6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip formatter={(v) => formatCurrency(v as number)} />
                <Bar dataKey="Receitas" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Despesas" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Despesas por categoria — {selectedMonth}</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                Sem despesas no período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="40%"
                    cy="50%"
                    outerRadius={80}
                    label={false}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v as number)} />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconSize={10}
                    formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent transactions */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Transações recentes</CardTitle>
          <RouterLink to="/transactions" className="text-xs text-primary hover:underline flex items-center gap-1">
            Ver todas <Link size={12} />
          </RouterLink>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <tbody>
              {recent.map((t) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2 text-muted-foreground whitespace-nowrap w-24">
                    {formatDate(t.date)}
                  </td>
                  <td className="px-4 py-2 max-w-xs">
                    <span className="truncate block" title={t.memo}>{t.memo}</span>
                    <span className="text-xs text-muted-foreground">{t.category}</span>
                  </td>
                  <td className={`px-4 py-2 text-right font-mono whitespace-nowrap w-28 ${
                    t.amount > 0 ? 'text-green-600' : 'text-red-500'
                  }`}>
                    {formatCurrency(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

function KPICard({
  title,
  value,
  icon,
  color,
  negative = false,
}: {
  title: string
  value: number
  icon: React.ReactNode
  color: string
  negative?: boolean
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-muted-foreground">{title}</span>
          {icon}
        </div>
        <div className={`text-2xl font-bold ${color}`}>
          {negative && value > 0 ? '-' : ''}{formatCurrency(value)}
        </div>
      </CardContent>
    </Card>
  )
}
