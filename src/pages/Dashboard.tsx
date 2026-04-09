import { useMemo, useState } from 'react'
import { useTransactionStore } from '@/store/useTransactionStore'
import { isFinanciallyActive } from '@/lib/ofx/classifier'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate, formatMonthFull, isoMonthOf, monthLabel, monthsBack } from '@/lib/utils/date'
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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
  LineChart,
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
  Target,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Transaction } from '@/types'

import { MonthPaceBar } from '@/components/dashboard/MonthPaceBar'
import { HealthScoreCard } from '@/components/dashboard/HealthScoreCard'
import { InsightDrawer } from '@/components/dashboard/InsightDrawer'
import { CategorySheet } from '@/components/dashboard/CategorySheet'
import { PeriodSelector, getMonthsForPeriod, type Period } from '@/components/dashboard/PeriodSelector'
import { SpendingHeatmap } from '@/components/dashboard/SpendingHeatmap'
import { ProjectionChart } from '@/components/dashboard/ProjectionChart'

// ─── Paleta ────────────────────────────────────────────────────────────────────
const CAT_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b',
]

// ─── Helpers ───────────────────────────────────────────────────────────────────
type Source = 'all' | 'account' | 'credit_card'
type ChartPeriod = '3m' | '6m' | '12m'

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
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('6m')
  const [historicalPeriod, setHistoricalPeriod] = useState<Period>('6m')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [trendCategory, setTrendCategory] = useState<string>('all')

  const effectiveMonth = months.includes(selectedMonth)
    ? selectedMonth
    : (months[0] ?? selectedMonth)
  const prevKey = calcPrevMonth(effectiveMonth)

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

  const avgDailySpend = useMemo(() => {
    const today = new Date()
    const isCurrentMonth = isoMonthOf(today.toISOString()) === effectiveMonth
    const [y, m] = effectiveMonth.split('-').map(Number)
    const daysTotal = new Date(y, m, 0).getDate()
    const daysUsed = isCurrentMonth ? today.getDate() : daysTotal
    return daysUsed > 0 ? cur.expense / daysUsed : 0
  }, [cur.expense, effectiveMonth])

  // ── Gráfico principal com período variável ───────────────────────────────────
  const chartData = useMemo(() => {
    const n = chartPeriod === '3m' ? 3 : chartPeriod === '6m' ? 6 : 12
    const cutoff = monthsBack(n).slice(0, 7)
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
  }, [active, chartPeriod])

  // ── Categorias ───────────────────────────────────────────────────────────────
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

  // ── Merchants ────────────────────────────────────────────────────────────────
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

  // ── Maiores despesas + Recentes ───────────────────────────────────────────────
  const top5 = useMemo(
    () =>
      [...monthTxs]
        .filter((t) => t.amount < 0)
        .sort((a, b) => a.amount - b.amount)
        .slice(0, 5),
    [monthTxs],
  )

  const recent = useMemo(
    () => [...monthTxs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10),
    [monthTxs],
  )

  // ── Gaps no histórico ────────────────────────────────────────────────────────
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

  // ── Orçamentos ───────────────────────────────────────────────────────────────
  const budgetProgress = useMemo(() => {
    const budgets = settings.budgets ?? []
    if (budgets.length === 0) return []
    return budgets.map((b) => {
      const spent = categoryData.find((c) => c.name === b.category)?.value ?? 0
      const pct = b.limit > 0 ? (spent / b.limit) * 100 : 0
      return { category: b.category, spent, limit: b.limit, pct, over: pct > 100 }
    })
  }, [settings.budgets, categoryData])

  // ── Insights ─────────────────────────────────────────────────────────────────
  const insights = useMemo(() => {
    const savingsGoal = settings.savingsGoal ?? 20
    const list: { kind: 'warn' | 'good' | 'info'; msg: string }[] = []

    if (gapMonths.length > 0) {
      const labels = gapMonths.slice(0, 2).map((m) => monthLabel(m)).join(', ')
      const extra = gapMonths.length > 2 ? ` e mais ${gapMonths.length - 2}` : ''
      list.push({ kind: 'info', msg: `Dados faltando em: ${labels}${extra}. Importe os extratos para histórico completo.` })
    }

    budgetProgress.forEach(({ category, pct }) => {
      if (pct > 100) {
        list.push({ kind: 'warn', msg: `Meta de ${category} ultrapassada (${pct.toFixed(0)}% do limite)` })
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
      list.push({ kind: 'info', msg: `Maior gasto: "${top5[0].memo}" representa ${(Math.abs(top5[0].amount) / cur.income * 100).toFixed(0)}% da receita` })
    }

    return list.slice(0, 5)
  }, [cur, categoryData, hasPrev, top5, settings.savingsGoal, gapMonths, budgetProgress])

  // ── Análise Histórica: savings rate trend ────────────────────────────────────
  const allMonths = useMemo(
    () => Array.from(new Set(active.map((t) => isoMonthOf(t.date)))).sort(),
    [active],
  )

  const savingsRateTrend = useMemo(() => {
    const mths = getMonthsForPeriod(historicalPeriod, allMonths)
    return mths.map((m) => {
      const txs = active.filter((t) => isoMonthOf(t.date) === m)
      const inc = txs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
      const exp = Math.abs(txs.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0))
      const rate = inc > 0 ? +((inc - exp) / inc * 100).toFixed(1) : 0
      return { month: monthLabel(m), 'Taxa (%)': rate }
    })
  }, [active, allMonths, historicalPeriod])

  const savingsGoalLine = settings.savingsGoal ?? 20

  // ── Análise Histórica: tendência por categoria ───────────────────────────────
  const categoryNames = useMemo(
    () => Array.from(new Set(active.filter((t) => t.amount < 0).map((t) => t.category))).sort(),
    [active],
  )

  const categoryTrend = useMemo(() => {
    if (trendCategory === 'all') return []
    const mths = getMonthsForPeriod(historicalPeriod, allMonths)
    return mths.map((m) => {
      const val = +Math.abs(
        active
          .filter((t) => isoMonthOf(t.date) === m && t.category === trendCategory && t.amount < 0)
          .reduce((s, t) => s + t.amount, 0),
      ).toFixed(2)
      return { month: monthLabel(m), Gasto: val }
    })
  }, [active, allMonths, trendCategory, historicalPeriod])

  // ── Análise Histórica: ano a ano ─────────────────────────────────────────────
  const yoy = useMemo(() => {
    const [y, m] = effectiveMonth.split('-').map(Number)
    const prevYear = `${y - 1}-${String(m).padStart(2, '0')}`
    const prevYearTxs = active.filter((t) => isoMonthOf(t.date) === prevYear)
    const prevYearKpi = calcKPIs(prevYearTxs)
    return { prevYear, prevYearKpi, hasPrevYear: prevYearTxs.length > 0 }
  }, [active, effectiveMonth, cur])

  // ── Render ───────────────────────────────────────────────────────────────────
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
    <div className="p-6 space-y-4">
      {/* ── Cabeçalho ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold leading-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {formatMonthFull(`${effectiveMonth}-01`)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Insights condensados */}
          <InsightDrawer insights={insights} />

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

      {/* ── Tabs ───────────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="mensal">
        <TabsList variant="line">
          <TabsTrigger value="mensal">Visão Mensal</TabsTrigger>
          <TabsTrigger value="historica">Análise Histórica</TabsTrigger>
        </TabsList>

        {/* ════════════════════════════════════════════════════════════════════════
            VISÃO MENSAL
        ════════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="mensal">
          <div className="space-y-4 mt-4">
            {/* ── KPIs (5 cols: HealthScore + 4 métricas) ────────────────────── */}
            <div className="grid grid-cols-5 gap-3">
              <HealthScoreCard
                allTxs={active}
                monthTxs={monthTxs}
                currentMonth={effectiveMonth}
                budgets={settings.budgets ?? []}
                savingsGoal={settings.savingsGoal ?? 20}
              />
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

            {/* ── Ritmo do mês ───────────────────────────────────────────────── */}
            <MonthPaceBar
              allTxs={active}
              monthTxs={monthTxs}
              currentMonth={effectiveMonth}
            />

            {/* ── Orçamentos ─────────────────────────────────────────────────── */}
            {budgetProgress.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <Target size={14} className="text-primary" />
                    Metas do Mês
                  </CardTitle>
                  <CardAction>
                    <button
                      onClick={() => navigate('/settings')}
                      className="text-xs text-primary hover:underline"
                    >
                      gerenciar →
                    </button>
                  </CardAction>
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

            {/* ── Gráficos: Receitas vs Despesas + Saldo ─────────────────────── */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm">Receitas vs Despesas</CardTitle>
                  <CardAction>
                    <div className="flex items-center gap-0.5 p-0.5 bg-muted rounded-md">
                      {(['3m', '6m', '12m'] as ChartPeriod[]).map((p) => (
                        <button
                          key={p}
                          onClick={() => setChartPeriod(p)}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                            chartPeriod === p
                              ? 'bg-background text-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </CardAction>
                </CardHeader>
                <CardContent className="px-2 pb-3">
                  <ResponsiveContainer width="100%" height={180}>
                    <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} width={44} />
                      <Tooltip formatter={(v) => formatCurrency(v as number)} contentStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Receitas" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={24} />
                      <Bar dataKey="Despesas" fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={24} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm">Saldo Líquido</CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-3">
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradSaldo" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} width={44} />
                      <Tooltip formatter={(v) => formatCurrency(v as number)} contentStyle={{ fontSize: 11 }} />
                      <Area
                        type="monotone"
                        dataKey="Saldo"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        fill="url(#gradSaldo)"
                        dot={{ r: 3.5, fill: '#6366f1', strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* ── Categorias (clicáveis) + Comparativo ───────────────────────── */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Gastos por Categoria</CardTitle>
                  <CardAction>
                    <span className="text-[10px] text-muted-foreground">clique para detalhar</span>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  {categoryData.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                      Sem despesas no período
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {categoryData.slice(0, 7).map((cat, i) => (
                        <button
                          key={cat.name}
                          onClick={() => setSelectedCategory(cat.name)}
                          className="w-full text-left group"
                        >
                          <div className="flex items-center justify-between text-xs mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }}
                              />
                              <span className="font-medium truncate group-hover:underline">{cat.name}</span>
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
                              className="h-full rounded-full group-hover:opacity-80 transition-opacity"
                              style={{
                                width: `${Math.min(cat.pct, 100)}%`,
                                backgroundColor: CAT_COLORS[i % CAT_COLORS.length],
                              }}
                            />
                          </div>
                        </button>
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
                          <th className="text-right px-4 py-2 font-medium text-muted-foreground">Var.</th>
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

            {/* ── Merchants + Maiores gastos ──────────────────────────────────── */}
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
                              <td className="pl-4 pr-2 py-2 text-xs font-mono text-muted-foreground w-5">{i + 1}</td>
                              <td className="px-2 py-2 min-w-0">
                                <div className="text-xs font-medium truncate" title={m.name}>{m.name}</div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <div className="h-1 rounded-full bg-muted flex-1 overflow-hidden max-w-[80px]">
                                    <div className="h-full rounded-full bg-primary/60" style={{ width: `${Math.min(pct, 100)}%` }} />
                                  </div>
                                  <span className="text-[10px] text-muted-foreground shrink-0">{m.count}x · {pct.toFixed(0)}%</span>
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
                  <CardTitle>Maiores Gastos do Mês</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {top5.length === 0 ? (
                    <div className="px-4 py-6 text-center text-muted-foreground text-sm">Sem despesas</div>
                  ) : (
                    <table className="w-full table-fixed">
                      <colgroup><col className="w-7" /><col /><col className="w-28" /></colgroup>
                      <tbody>
                        {top5.map((t, i) => (
                          <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="pl-4 pr-2 py-2.5 text-xs font-mono text-muted-foreground">{i + 1}</td>
                            <td className="px-2 py-2.5 overflow-hidden">
                              <div className="text-xs font-medium truncate" title={t.memo}>{t.memo}</div>
                              <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{t.category} · {formatDate(t.date)}</div>
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
            </div>

            {/* ── Transações Recentes ─────────────────────────────────────────── */}
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
                  <colgroup><col className="w-24" /><col /><col className="w-28" /></colgroup>
                  <tbody>
                    {recent.map((t) => (
                      <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-2 text-[10px] text-muted-foreground truncate">{formatDate(t.date)}</td>
                        <td className="px-2 py-2 overflow-hidden">
                          <div className="text-xs font-medium truncate" title={t.memo}>{t.memo}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{t.category}</div>
                        </td>
                        <td className={`pr-4 py-2 text-right font-mono text-xs ${t.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {formatCurrency(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════════════════
            ANÁLISE HISTÓRICA
        ════════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="historica">
          <div className="space-y-5 mt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">Período de análise</h2>
              <PeriodSelector value={historicalPeriod} onChange={setHistoricalPeriod} />
            </div>

            {/* ── Tendência de Poupança ───────────────────────────────────────── */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Taxa de Poupança Mensal</CardTitle>
                {savingsRateTrend.length > 0 && (
                  <CardAction>
                    <span className="text-[10px] text-muted-foreground">
                      Meta: {savingsGoalLine}%
                    </span>
                  </CardAction>
                )}
              </CardHeader>
              <CardContent className="px-2 pb-3">
                {savingsRateTrend.length === 0 ? (
                  <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                    Sem dados no período
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={savingsRateTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) => `${v}%`}
                        width={40}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip
                        formatter={(v) => [`${(v as number).toFixed(1)}%`, 'Taxa de poupança']}
                        contentStyle={{ fontSize: 11 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Taxa (%)"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        dot={{ r: 3.5, fill: '#10b981', strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                      />
                      {/* Linha de meta */}
                      <Line
                        dataKey={() => savingsGoalLine}
                        stroke="#94a3b8"
                        strokeWidth={1.5}
                        strokeDasharray="5 3"
                        dot={false}
                        legendType="none"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* ── Tendência por Categoria + Heatmap ──────────────────────────── */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Tendência por Categoria</CardTitle>
                  <CardAction>
                    <Select value={trendCategory} onValueChange={setTrendCategory}>
                      <SelectTrigger className="h-7 w-40 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Selecione...</SelectItem>
                        {categoryNames.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardAction>
                </CardHeader>
                <CardContent className="px-2 pb-3">
                  {trendCategory === 'all' || categoryTrend.length === 0 ? (
                    <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                      {trendCategory === 'all' ? 'Selecione uma categoria acima' : 'Sem dados no período'}
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={categoryTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradCat" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} width={44} />
                        <Tooltip formatter={(v) => formatCurrency(v as number)} contentStyle={{ fontSize: 11 }} />
                        <Area type="monotone" dataKey="Gasto" stroke="#6366f1" strokeWidth={2} fill="url(#gradCat)" dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Heatmap de Gastos por Dia</CardTitle>
                </CardHeader>
                <CardContent className="pb-3">
                  <SpendingHeatmap
                    allTxs={active}
                    allMonths={allMonths}
                    period={historicalPeriod}
                  />
                </CardContent>
              </Card>
            </div>

            {/* ── Comparação Ano a Ano ───────────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Comparação Ano a Ano — {effectiveMonth} vs {yoy.prevYear}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!yoy.hasPrevYear ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Sem dados de {yoy.prevYear} para comparar.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <YoYBlock label={effectiveMonth} kpi={cur} />
                    <YoYBlock label={yoy.prevYear} kpi={yoy.prevYearKpi} />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Projeção ──────────────────────────────────────────────────────*/}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Projeção de Saldo (12m histórico + 6m futuro)</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-3">
                <div className="flex gap-4 text-[10px] text-muted-foreground mb-2">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-4 h-0.5 bg-green-500 rounded" /> Real
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-4 h-0.5 bg-indigo-500 rounded border-dashed" style={{borderTop:'2px dashed #6366f1',height:0}} /> Projeção (média histórica)
                  </span>
                </div>
                <ProjectionChart allTxs={active} allMonths={allMonths} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── CategorySheet (drill-down) ──────────────────────────────────────── */}
      <CategorySheet
        category={selectedCategory}
        onClose={() => setSelectedCategory(null)}
        allTxs={active}
        currentMonth={effectiveMonth}
      />
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

function YoYBlock({
  label,
  kpi,
}: {
  label: string
  kpi: { income: number; expense: number; balance: number; savingsRate: number }
}) {
  return (
    <div className="border rounded-lg p-3 space-y-2">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <div className="grid grid-cols-2 gap-1 text-xs">
        <div>
          <div className="text-[10px] text-muted-foreground">Receitas</div>
          <div className="font-mono font-semibold text-green-600">{formatCurrency(kpi.income)}</div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground">Despesas</div>
          <div className="font-mono font-semibold text-red-500">{formatCurrency(kpi.expense)}</div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground">Saldo</div>
          <div className={`font-mono font-semibold ${kpi.balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {formatCurrency(kpi.balance)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground">Poupança</div>
          <div className="font-mono font-semibold">{kpi.savingsRate.toFixed(1)}%</div>
        </div>
      </div>
    </div>
  )
}
