import { useMemo, useState } from 'react'
import { useTransactionStore } from '@/store/useTransactionStore'
import { isFinanciallyActive } from '@/lib/ofx/classifier'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate, formatMonthFull, isoMonthOf, monthLabel, monthsBack } from '@/lib/utils/date'
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  PiggyBank,
  AlertTriangle,
  CheckCircle2,
  Info,
  Target,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Transaction } from '@/types'

// ─── Paleta ────────────────────────────────────────────────────────────────────
const CAT_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b',
]

// ─── Helpers ───────────────────────────────────────────────────────────────────
// Nota: CAT_COLORS usada nos progress bars de categoria
type Source = 'all' | 'account' | 'credit_card'

function calcPrevMonth(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number)
  if (m === 1) return `${y - 1}-12`
  return `${y}-${String(m - 1).padStart(2, '0')}`
}

function deltaPercent(a: number, b: number): number | null {
  if (b === 0) return null
  return ((a - b) / b) * 100
}

function calcKPIs(txs: Transaction[]) {
  const income = txs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const expense = Math.abs(txs.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0))
  const balance = income - expense
  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0
  const expenseCount = txs.filter((t) => t.amount < 0).length
  const avgTicket = expenseCount > 0 ? expense / expenseCount : 0
  return { income, expense, balance, savingsRate, expenseCount, avgTicket }
}

function merchantName(memo: string): string {
  const part = memo.split(/\s*[-–|]\s*/)[0].trim()
  return part.length >= 3 ? part : memo.trim()
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { transactions, loaded, settings } = useTransactionStore()
  const navigate = useNavigate()

  const months = useMemo(() => {
    const set = new Set<string>()
    transactions.forEach((t) => set.add(isoMonthOf(t.date)))
    return Array.from(set).sort().reverse()
  }, [transactions])

  const [selectedMonth, setSelectedMonth] = useState<string>(
    months[0] ?? isoMonthOf(new Date().toISOString()),
  )
  const [source, setSource] = useState<Source>('all')

  const effectiveMonth = months.includes(selectedMonth)
    ? selectedMonth
    : (months[0] ?? selectedMonth)
  const prevKey = calcPrevMonth(effectiveMonth)

  // Transações ativas filtradas por fonte
  const active = useMemo(
    () =>
      transactions
        .filter(isFinanciallyActive)
        .filter((t) => source === 'all' || t.source === source),
    [transactions, source],
  )

  const monthTxs = useMemo(
    () => active.filter((t) => isoMonthOf(t.date) === effectiveMonth),
    [active, effectiveMonth],
  )
  const prevTxs = useMemo(
    () => active.filter((t) => isoMonthOf(t.date) === prevKey),
    [active, prevKey],
  )
  const hasPrev = prevTxs.length > 0

  const cur = useMemo(() => calcKPIs(monthTxs), [monthTxs])
  const prev = useMemo(() => calcKPIs(prevTxs), [prevTxs])

  // Gasto médio diário (considera dias transcorridos se for o mês atual)
  const avgDailySpend = useMemo(() => {
    const today = new Date()
    const isCurrentMonth = isoMonthOf(today.toISOString()) === effectiveMonth
    const [y, m] = effectiveMonth.split('-').map(Number)
    const daysTotal = new Date(y, m, 0).getDate()
    const daysUsed = isCurrentMonth ? today.getDate() : daysTotal
    return daysUsed > 0 ? cur.expense / daysUsed : 0
  }, [cur.expense, effectiveMonth])

  // Dados do gráfico principal (6 meses)
  const chartData = useMemo(() => {
    const cutoff = monthsBack(6).slice(0, 7)
    return Array.from(new Set(active.map((t) => isoMonthOf(t.date))))
      .filter((m) => m >= cutoff)
      .sort()
      .map((m) => {
        const txs = active.filter((t) => isoMonthOf(t.date) === m)
        const inc = txs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
        const exp = Math.abs(txs.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0))
        return {
          month: monthLabel(m),
          Receitas: +inc.toFixed(2),
          Despesas: +exp.toFixed(2),
          Saldo: +(inc - exp).toFixed(2),
        }
      })
  }, [active])

  // Categorias com comparativo
  const categoryData = useMemo(() => {
    const g: Record<string, { cur: number; prev: number }> = {}
    monthTxs.filter((t) => t.amount < 0).forEach((t) => {
      if (!g[t.category]) g[t.category] = { cur: 0, prev: 0 }
      g[t.category].cur += Math.abs(t.amount)
    })
    prevTxs.filter((t) => t.amount < 0).forEach((t) => {
      if (!g[t.category]) g[t.category] = { cur: 0, prev: 0 }
      g[t.category].prev += Math.abs(t.amount)
    })
    return Object.entries(g)
      .map(([name, { cur: c, prev: p }]) => ({
        name,
        value: +c.toFixed(2),
        prev: +p.toFixed(2),
        pct: cur.expense > 0 ? (c / cur.expense) * 100 : 0,
        delta: hasPrev && p > 0 ? deltaPercent(c, p) : null,
      }))
      .sort((a, b) => b.value - a.value)
  }, [monthTxs, prevTxs, cur.expense, hasPrev])

  // Top merchants do mês
  const topMerchants = useMemo(() => {
    const g: Record<string, { total: number; count: number }> = {}
    monthTxs
      .filter((t) => t.amount < 0)
      .forEach((t) => {
        const m = merchantName(t.memo)
        if (!g[m]) g[m] = { total: 0, count: 0 }
        g[m].total += Math.abs(t.amount)
        g[m].count++
      })
    return Object.entries(g)
      .map(([name, { total, count }]) => ({ name, total: +total.toFixed(2), count }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
  }, [monthTxs])

  // Curva de gasto diário acumulado no mês
  const dailyCurve = useMemo(() => {
    const [y, m] = effectiveMonth.split('-').map(Number)
    const daysTotal = new Date(y, m, 0).getDate()
    const expenses = monthTxs.filter((t) => t.amount < 0)
    let acc = 0
    return Array.from({ length: daysTotal }, (_, i) => {
      const day = i + 1
      const dayStr = `${effectiveMonth}-${String(day).padStart(2, '0')}`
      acc += expenses
        .filter((t) => t.date === dayStr)
        .reduce((s, t) => s + Math.abs(t.amount), 0)
      return { dia: day, acumulado: +acc.toFixed(2) }
    })
  }, [monthTxs, effectiveMonth])

  // Maiores despesas do mês
  const top5 = useMemo(
    () =>
      [...monthTxs]
        .filter((t) => t.amount < 0)
        .sort((a, b) => a.amount - b.amount)
        .slice(0, 5),
    [monthTxs],
  )

  // Detecção de gaps no histórico
  const gapMonths = useMemo(() => {
    if (months.length < 2) return []
    const sorted = [...months].sort()
    const gaps: string[] = []
    for (let i = 0; i < sorted.length - 1; i++) {
      const [cy, cm] = sorted[i].split('-').map(Number)
      const next = sorted[i + 1]
      let y = cy, m = cm + 1
      if (m > 12) { y++; m = 1 }
      let candidate = `${y}-${String(m).padStart(2, '0')}`
      while (candidate < next) {
        gaps.push(candidate)
        m++
        if (m > 12) { y++; m = 1 }
        candidate = `${y}-${String(m).padStart(2, '0')}`
      }
    }
    return gaps
  }, [months])

  // Progresso das metas por categoria
  const budgetProgress = useMemo(() => {
    const budgets = settings.budgets ?? []
    if (budgets.length === 0) return []
    return budgets.map((b) => {
      const spent = categoryData.find((c) => c.name === b.category)?.value ?? 0
      const pct = b.limit > 0 ? (spent / b.limit) * 100 : 0
      return { category: b.category, spent, limit: b.limit, pct, over: pct > 100 }
    })
  }, [settings.budgets, categoryData])

  // Insights automáticos
  const insights = useMemo(() => {
    const savingsGoal = settings.savingsGoal ?? 20
    const list: { kind: 'warn' | 'good' | 'info'; msg: string }[] = []

    // Gap no histórico
    if (gapMonths.length > 0) {
      const labels = gapMonths.slice(0, 2).map((m) => monthLabel(m)).join(', ')
      const extra = gapMonths.length > 2 ? ` e mais ${gapMonths.length - 2}` : ''
      list.push({ kind: 'info', msg: `Dados faltando em: ${labels}${extra}. Importe os extratos para ter um histórico completo.` })
    }

    // Metas ultrapassadas
    budgetProgress.forEach(({ category, pct }) => {
      if (pct > 100) {
        list.push({ kind: 'warn', msg: `Meta de ${category} ultrapassada (${pct.toFixed(0)}% do limite usado)` })
      }
    })

    if (cur.income > 0) {
      if (cur.savingsRate >= savingsGoal) {
        list.push({ kind: 'good', msg: `Taxa de poupança de ${cur.savingsRate.toFixed(1)}% — acima da meta de ${savingsGoal}%` })
      } else {
        list.push({ kind: 'warn', msg: `Taxa de poupança de ${cur.savingsRate.toFixed(1)}% — abaixo da meta de ${savingsGoal}%` })
      }
    }
    if (hasPrev) {
      categoryData.forEach((cat) => {
        if (cat.delta != null && cat.delta > 40 && cat.prev > 50) {
          list.push({ kind: 'warn', msg: `${cat.name} subiu ${cat.delta.toFixed(0)}% vs mês anterior (${formatCurrency(cat.prev)} → ${formatCurrency(cat.value)})` })
        }
      })
    }
    if (top5.length > 0 && cur.income > 0 && Math.abs(top5[0].amount) / cur.income > 0.25) {
      list.push({ kind: 'info', msg: `Maior gasto: "${top5[0].memo}" representa ${(Math.abs(top5[0].amount) / cur.income * 100).toFixed(0)}% da sua receita` })
    }
    return list.slice(0, 4)
  }, [cur, categoryData, hasPrev, top5, settings.savingsGoal, gapMonths, budgetProgress])

  // Transações recentes do mês selecionado
  const recent = useMemo(
    () => [...monthTxs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10),
    [monthTxs],
  )

  // ── Render ──────────────────────────────────────────────────────────────────
  if (!loaded) {
    return <div className="p-6 text-muted-foreground text-sm">Carregando...</div>
  }

  if (transactions.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <Wallet size={48} className="text-muted-foreground" />
        <div>
          <h2 className="text-xl font-semibold mb-1">Nenhum dado ainda</h2>
          <p className="text-muted-foreground text-sm">Importe um arquivo OFX do Nubank para começar.</p>
        </div>
        <button
          onClick={() => navigate('/import')}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
        >
          Importar agora
        </button>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold leading-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {formatMonthFull(`${effectiveMonth}-01`)}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={source} onValueChange={(v) => setSource(v as Source)}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Conta + Cartão</SelectItem>
              <SelectItem value="account">Conta corrente</SelectItem>
              <SelectItem value="credit_card">Cartão de crédito</SelectItem>
            </SelectContent>
          </Select>
          <Select value={effectiveMonth} onValueChange={(v) => { if (v) setSelectedMonth(v) }}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Insights ──────────────────────────────────────────────────────── */}
      {insights.length > 0 && (
        <div className="flex flex-col gap-2">
          {insights.map((ins, i) => (
            <InsightBanner key={i} kind={ins.kind} msg={ins.msg} />
          ))}
        </div>
      )}

      {/* ── Metas do Mês ──────────────────────────────────────────────────── */}
      {budgetProgress.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Target size={14} className="text-primary" />
              Metas do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {budgetProgress.map(({ category, spent, limit, pct, over }) => (
                <div key={category}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium truncate">{category}</span>
                    <span className={`shrink-0 ml-2 font-mono ${over ? 'text-red-500 font-semibold' : 'text-muted-foreground'}`}>
                      {formatCurrency(spent)} / {formatCurrency(limit)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-primary'}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {pct.toFixed(0)}% usado{over ? ' — limite ultrapassado' : ''}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── KPIs (4 cards) ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        <KPICard
          title="Receitas"
          value={formatCurrency(cur.income)}
          icon={<TrendingUp size={14} className="text-green-600" />}
          color="text-green-600"
          delta={hasPrev ? deltaPercent(cur.income, prev.income) : null}
          goodUp
          onClick={() => navigate('/transactions')}
        />
        <KPICard
          title="Despesas"
          value={formatCurrency(cur.expense)}
          icon={<TrendingDown size={14} className="text-red-500" />}
          color="text-red-500"
          delta={hasPrev ? deltaPercent(cur.expense, prev.expense) : null}
          goodUp={false}
          subtitle={cur.expenseCount > 0 ? `${formatCurrency(avgDailySpend)}/dia · ${cur.expenseCount} transações` : undefined}
          onClick={() => navigate('/transactions')}
        />
        <KPICard
          title="Saldo Líquido"
          value={formatCurrency(cur.balance)}
          icon={<Wallet size={14} className={cur.balance >= 0 ? 'text-green-600' : 'text-red-500'} />}
          color={cur.balance >= 0 ? 'text-green-600' : 'text-red-500'}
          delta={hasPrev ? deltaPercent(cur.balance, prev.balance) : null}
          goodUp
        />
        <KPICard
          title="Taxa de Poupança"
          value={`${cur.savingsRate.toFixed(1)}%`}
          icon={<PiggyBank size={14} className={cur.savingsRate >= (settings.savingsGoal ?? 20) ? 'text-green-600' : 'text-amber-500'} />}
          color={cur.savingsRate >= (settings.savingsGoal ?? 20) ? 'text-green-600' : cur.savingsRate >= 0 ? 'text-amber-500' : 'text-red-500'}
          delta={hasPrev ? cur.savingsRate - prev.savingsRate : null}
          deltaLabel=" p.p."
          goodUp
        />
      </div>

      {/* ── Gráfico principal (largura total) ────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Receitas vs Despesas — últimos 6 meses</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                width={48}
              />
              <Tooltip
                formatter={(v) => formatCurrency(v as number)}
                contentStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="Receitas" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={28} />
              <Bar dataKey="Despesas" fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={28} />
              <Line
                type="monotone"
                dataKey="Saldo"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: '#6366f1', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Análise de Categorias ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Gastos por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                Sem despesas no período
              </div>
            ) : (
              <div className="space-y-3">
                {categoryData.slice(0, 7).map((cat, i) => (
                  <div key={cat.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }}
                        />
                        <span className="font-medium truncate">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {cat.delta != null && (
                          <DeltaChip delta={cat.delta} goodUp={false} compact />
                        )}
                        <span className="text-muted-foreground">
                          {cat.pct.toFixed(0)}% · {formatCurrency(cat.value)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(cat.pct, 100)}%`,
                          backgroundColor: CAT_COLORS[i % CAT_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comparativo vs Mês Anterior</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {categoryData.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm px-4">
                Sem dados
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Categoria</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Atual</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Anterior</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Variação</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryData.map((cat) => (
                    <tr key={cat.name} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-1.5 font-medium truncate max-w-[120px]">{cat.name}</td>
                      <td className="px-4 py-1.5 text-right font-mono">{formatCurrency(cat.value)}</td>
                      <td className="px-4 py-1.5 text-right font-mono text-muted-foreground">
                        {cat.prev > 0 ? formatCurrency(cat.prev) : '—'}
                      </td>
                      <td className="px-4 py-1.5 text-right">
                        <DeltaChip delta={cat.delta} goodUp={false} />
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t bg-muted/20">
                    <td className="px-4 py-1.5 font-semibold">Total</td>
                    <td className="px-4 py-1.5 text-right font-mono font-semibold text-red-500">
                      {formatCurrency(cur.expense)}
                    </td>
                    <td className="px-4 py-1.5 text-right font-mono text-muted-foreground">
                      {prev.expense > 0 ? formatCurrency(prev.expense) : '—'}
                    </td>
                    <td className="px-4 py-1.5 text-right">
                      <DeltaChip delta={hasPrev ? deltaPercent(cur.expense, prev.expense) : null} goodUp={false} />
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Merchants + Curva de gastos ────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Top Estabelecimentos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {topMerchants.length === 0 ? (
              <div className="px-4 py-6 text-center text-muted-foreground text-sm">Sem dados</div>
            ) : (
              <table className="w-full">
                <tbody>
                  {topMerchants.map((m, i) => {
                    const pct = cur.expense > 0 ? (m.total / cur.expense) * 100 : 0
                    return (
                      <tr key={m.name} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="pl-4 pr-2 py-2 text-xs font-mono text-muted-foreground w-5">
                          {i + 1}
                        </td>
                        <td className="px-2 py-2 min-w-0">
                          <div className="text-xs font-medium truncate" title={m.name}>{m.name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="h-1 rounded-full bg-muted flex-1 overflow-hidden max-w-[80px]">
                              <div
                                className="h-full rounded-full bg-primary/60"
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {m.count}x · {pct.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-red-500 text-xs whitespace-nowrap">
                          {formatCurrency(m.total)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gasto Acumulado no Mês</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dailyCurve} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradDiario" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="dia"
                  tick={{ fontSize: 10 }}
                  interval={4}
                  tickFormatter={(v) => `D${v}`}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  width={42}
                />
                <Tooltip
                  formatter={(v) => [formatCurrency(v as number), 'Acumulado']}
                  labelFormatter={(l) => `Dia ${l}`}
                  contentStyle={{ fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="acumulado"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fill="url(#gradDiario)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Maiores gastos + Transações recentes ───────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Maiores Gastos do Mês</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {top5.length === 0 ? (
              <div className="px-4 py-6 text-center text-muted-foreground text-sm">
                Sem despesas no período
              </div>
            ) : (
              <table className="w-full table-fixed">
                <colgroup>
                  <col className="w-7" />
                  <col />
                  <col className="w-28" />
                </colgroup>
                <tbody>
                  {top5.map((t, i) => (
                    <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="pl-4 pr-2 py-2.5 text-xs font-mono text-muted-foreground">
                        {i + 1}
                      </td>
                      <td className="px-2 py-2.5 overflow-hidden">
                        <div className="text-xs font-medium truncate" title={t.memo}>{t.memo}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                          {t.category} · {formatDate(t.date)}
                        </div>
                      </td>
                      <td className="pr-4 py-2.5 text-right font-mono text-red-500 text-xs">
                        {formatCurrency(Math.abs(t.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimas Transações do Mês</CardTitle>
            <CardAction>
              <button
                onClick={() => navigate('/transactions')}
                className="text-xs text-primary hover:underline"
              >
                Ver todas →
              </button>
            </CardAction>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-20" />
                <col />
                <col className="w-28" />
              </colgroup>
              <tbody>
                {recent.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2 text-[10px] text-muted-foreground truncate">
                      {formatDate(t.date)}
                    </td>
                    <td className="px-2 py-2 overflow-hidden">
                      <div className="text-xs font-medium truncate" title={t.memo}>{t.memo}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{t.category}</div>
                    </td>
                    <td
                      className={`pr-4 py-2 text-right font-mono text-xs ${
                        t.amount > 0 ? 'text-green-600' : 'text-red-500'
                      }`}
                    >
                      {formatCurrency(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Componentes auxiliares ────────────────────────────────────────────────────

function KPICard({
  title, value, icon, color, delta, goodUp = true, deltaLabel = '%', subtitle, onClick,
}: {
  title: string
  value: string
  icon: React.ReactNode
  color: string
  delta?: number | null
  goodUp?: boolean
  deltaLabel?: string
  subtitle?: string
  onClick?: () => void
}) {
  return (
    <Card
      className={onClick ? 'cursor-pointer hover:ring-primary/30 hover:ring-2 transition-shadow' : ''}
      onClick={onClick}
    >
      <CardContent className="pt-4 pb-3 px-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-muted-foreground font-medium leading-tight">{title}</span>
          {icon}
        </div>
        <div className={`text-base font-bold ${color} mb-1 leading-tight`}>{value}</div>
        {delta != null ? (
          <DeltaChip delta={delta} goodUp={goodUp} label={deltaLabel} />
        ) : subtitle ? (
          <p className="text-[10px] text-muted-foreground">{subtitle}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function DeltaChip({
  delta,
  goodUp = true,
  label = '%',
  compact = false,
}: {
  delta: number | null
  goodUp?: boolean
  label?: string
  compact?: boolean
}) {
  if (delta == null) return <span className="text-[10px] text-muted-foreground">—</span>

  const neutral = Math.abs(delta) < 1
  const good = goodUp ? delta > 0 : delta < 0
  const color = neutral ? 'text-muted-foreground' : good ? 'text-green-600' : 'text-red-500'
  const Icon = neutral ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight
  const sign = delta > 0 ? '+' : ''

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${color}`}>
        <Icon size={9} />
        {sign}{delta.toFixed(0)}{label}
      </span>
    )
  }

  return (
    <span className={`flex items-center gap-0.5 text-[11px] ${color}`}>
      <Icon size={11} />
      {sign}{delta.toFixed(1)}{label}
      <span className="text-muted-foreground ml-0.5 text-[10px]">vs ant.</span>
    </span>
  )
}

function InsightBanner({ kind, msg }: { kind: 'warn' | 'good' | 'info'; msg: string }) {
  const styles = {
    warn: { bg: 'bg-amber-50 border-amber-200 text-amber-800', icon: <AlertTriangle size={13} className="text-amber-600 shrink-0" /> },
    good: { bg: 'bg-green-50 border-green-200 text-green-800', icon: <CheckCircle2 size={13} className="text-green-600 shrink-0" /> },
    info: { bg: 'bg-blue-50 border-blue-200 text-blue-800', icon: <Info size={13} className="text-blue-600 shrink-0" /> },
  }[kind]

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${styles.bg}`}>
      {styles.icon}
      <span>{msg}</span>
    </div>
  )
}
