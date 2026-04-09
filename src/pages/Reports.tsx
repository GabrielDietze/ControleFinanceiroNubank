import { useMemo, useState } from 'react'
import { useTransactionStore } from '@/store/useTransactionStore'
import { isFinanciallyActive } from '@/lib/ofx/classifier'
import { formatMonthFull, isoMonthOf } from '@/lib/utils/date'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { HealthScoreCard, calcReserveMonths } from '@/components/dashboard/HealthScoreCard'
import { WaterfallChart } from '@/components/reports/WaterfallChart'
import { RecurringList } from '@/components/reports/RecurringList'
import { PeriodComparator } from '@/components/reports/PeriodComparator'
import { FileBarChart2 } from 'lucide-react'

type Source = 'all' | 'account' | 'credit_card'

export default function ReportsPage() {
  const { transactions, loaded, settings } = useTransactionStore()

  const months = useMemo(() => {
    const set = new Set<string>()
    transactions.forEach((t) => set.add(isoMonthOf(t.date)))
    return Array.from(set).sort().reverse()
  }, [transactions])

  const [selectedMonth, setSelectedMonth] = useState<string>(
    months[0] ?? isoMonthOf(new Date().toISOString()),
  )
  const [source, setSource] = useState<Source>('all')

  const effectiveMonth = months.includes(selectedMonth) ? selectedMonth : (months[0] ?? selectedMonth)

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

  const allMonths = useMemo(
    () => Array.from(new Set(active.map((t) => isoMonthOf(t.date)))).sort(),
    [active],
  )

  const reserveMonths = useMemo(
    () => calcReserveMonths(active, effectiveMonth),
    [active, effectiveMonth],
  )

  if (!loaded) {
    return <div className="p-6 text-muted-foreground text-sm">Carregando...</div>
  }

  if (transactions.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <FileBarChart2 size={48} className="text-muted-foreground" />
        <div>
          <h2 className="text-xl font-semibold mb-1">Nenhum dado ainda</h2>
          <p className="text-muted-foreground text-sm">Importe extratos OFX para ver os relatórios.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* ── Cabeçalho ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold leading-tight">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Análises sob demanda · {formatMonthFull(`${effectiveMonth}-01`)}</p>
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

      {/* ── Score de Saúde + Reserva de Emergência ──────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {/* HealthScoreCard em modo expandido (ocupa 2 cols) */}
        <div className="col-span-2">
          <div className="grid grid-cols-5 gap-3 h-full">
            <div className="col-span-2 h-full">
              <HealthScoreCard
                allTxs={active}
                monthTxs={monthTxs}
                currentMonth={effectiveMonth}
                budgets={settings.budgets ?? []}
                savingsGoal={settings.savingsGoal ?? 20}
              />
            </div>
            <Card className="col-span-3">
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-[11px] text-muted-foreground font-medium mb-1">Reserva de Emergência</p>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className={`text-2xl font-bold ${reserveMonths >= 3 ? 'text-green-600' : reserveMonths >= 1 ? 'text-amber-500' : 'text-red-500'}`}>
                    {reserveMonths.toFixed(1)}
                  </span>
                  <span className="text-sm text-muted-foreground">meses</span>
                  <span className={`text-xs font-medium ml-1 ${reserveMonths >= 3 ? 'text-green-600' : 'text-amber-500'}`}>
                    {reserveMonths >= 6 ? 'Excelente' : reserveMonths >= 3 ? 'Adequada' : reserveMonths >= 1 ? 'Insuficiente' : 'Crítico'}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full ${reserveMonths >= 3 ? 'bg-green-500' : reserveMonths >= 1 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min((reserveMonths / 6) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Saldo líquido acumulado ÷ gasto médio mensal (6m). Mínimo recomendado: 3 meses.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Dicas rápidas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Como usar esta página</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li>• <strong>Waterfall</strong>: veja para onde vai cada real da sua receita</li>
              <li>• <strong>Recorrentes</strong>: assinaturas e gastos fixos detectados automaticamente</li>
              <li>• <strong>Comparador</strong>: escolha dois meses e compare KPIs lado a lado</li>
              <li>• Mude o mês no seletor acima para analisar qualquer período</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* ── Waterfall ────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Como seu dinheiro fluiu em {effectiveMonth}</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground mb-3 px-2">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-green-500 opacity-85" /> Receita / Saldo positivo
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-red-500 opacity-85" /> Despesas por categoria
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-indigo-500 opacity-85" /> Saldo final
            </span>
          </div>
          <WaterfallChart allTxs={active} currentMonth={effectiveMonth} />
        </CardContent>
      </Card>

      {/* ── Recorrentes ──────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Gastos Recorrentes Detectados</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[10px] text-muted-foreground mb-3">
            Estabelecimentos que aparecem em 3+ dos últimos 6 meses com valores consistentes (±20%).
          </p>
          <RecurringList allTxs={active} />
        </CardContent>
      </Card>

      {/* ── Comparador de Períodos ───────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Comparador de Períodos</CardTitle>
        </CardHeader>
        <CardContent>
          <PeriodComparator allTxs={active} allMonths={allMonths} />
        </CardContent>
      </Card>
    </div>
  )
}
