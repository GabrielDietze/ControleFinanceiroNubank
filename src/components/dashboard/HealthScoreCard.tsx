import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'
import { isoMonthOf } from '@/lib/utils/date'
import type { Transaction, CategoryBudget } from '@/types'

interface Props {
  allTxs: Transaction[]
  monthTxs: Transaction[]
  currentMonth: string
  budgets: CategoryBudget[]
  savingsGoal: number
}

interface BreakdownItem {
  label: string
  pts: number
  max: number
  ok: boolean
  detail: string
}

function calcScore(
  allTxs: Transaction[],
  monthTxs: Transaction[],
  currentMonth: string,
  budgets: CategoryBudget[],
  savingsGoal: number,
): { score: number; breakdown: BreakdownItem[]; reserveMonths: number } {
  const income = monthTxs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const expense = Math.abs(
    monthTxs.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0),
  )
  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0
  const target = Math.max(savingsGoal, 10)

  // 1. Savings rate — 25pts
  const savingsPts = Math.min(25, Math.round((savingsRate / target) * 25))

  // 2. Reserva de emergência — 25pts (saldo líquido / gasto médio mensal)
  const netBalance = allTxs.reduce((s, t) => s + t.amount, 0)
  const prevMonths = Array.from(new Set(allTxs.map((t) => isoMonthOf(t.date))))
    .filter((m) => m < currentMonth)
    .sort()
    .slice(-6)
  const avgExp =
    prevMonths.length > 0
      ? prevMonths
          .map((m) =>
            Math.abs(
              allTxs
                .filter((t) => isoMonthOf(t.date) === m && t.amount < 0)
                .reduce((s, t) => s + t.amount, 0),
            ),
          )
          .reduce((s, v) => s + v, 0) / prevMonths.length
      : expense
  const reserveMonths = avgExp > 0 ? netBalance / avgExp : 0
  const reservePts = Math.min(25, Math.round((Math.min(Math.max(reserveMonths, 0), 6) / 6) * 25))

  // 3. Orçamentos no limite — 20pts
  let budgetPts = 20
  if (budgets.length > 0) {
    const pctOk =
      budgets.filter((b) => {
        const spent = Math.abs(
          monthTxs
            .filter((t) => t.category === b.category && t.amount < 0)
            .reduce((s, t) => s + t.amount, 0),
        )
        return spent <= b.limit
      }).length / budgets.length
    budgetPts = Math.round(pctOk * 20)
  }

  // 4. Tendência de poupança — 15pts (regressão simples nos últimos 3 meses)
  const trendMonths = [...prevMonths].slice(-3)
  let trendPts = 7
  if (trendMonths.length >= 2) {
    const rates = trendMonths.map((m) => {
      const txs = allTxs.filter((t) => isoMonthOf(t.date) === m)
      const inc = txs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
      const exp = Math.abs(txs.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0))
      return inc > 0 ? ((inc - exp) / inc) * 100 : 0
    })
    const slope = rates[rates.length - 1] - rates[0]
    trendPts = slope > 2 ? 15 : slope < -2 ? 0 : 7
  }

  // 5. Investimentos ativos — 15pts
  const hasInv = allTxs.some((t) => t.type === 'investment_application')
  const investPts = hasInv ? 15 : 0

  const score = Math.min(100, savingsPts + reservePts + budgetPts + trendPts + investPts)

  return {
    score,
    reserveMonths: Math.max(0, reserveMonths),
    breakdown: [
      {
        label: 'Taxa de poupança',
        pts: savingsPts,
        max: 25,
        ok: savingsRate >= target,
        detail: `${savingsRate.toFixed(1)}% — meta: ${target}%`,
      },
      {
        label: 'Reserva de emergência',
        pts: reservePts,
        max: 25,
        ok: reserveMonths >= 3,
        detail: `${Math.max(0, reserveMonths).toFixed(1)} meses (mín. recomendado: 3)`,
      },
      {
        label: 'Orçamentos no limite',
        pts: budgetPts,
        max: 20,
        ok: budgetPts === 20,
        detail:
          budgets.length === 0 ? 'Sem metas configuradas' : `${budgetPts}/20 pts`,
      },
      {
        label: 'Tendência de poupança',
        pts: trendPts,
        max: 15,
        ok: trendPts >= 7,
        detail: trendPts === 15 ? 'Crescendo nos últimos 3 meses' : trendPts === 0 ? 'Caindo nos últimos 3 meses' : 'Estável',
      },
      {
        label: 'Investimentos ativos',
        pts: investPts,
        max: 15,
        ok: hasInv,
        detail: hasInv ? 'Aportes detectados no histórico' : 'Sem aportes detectados',
      },
    ],
  }
}

export function HealthScoreCard({ allTxs, monthTxs, currentMonth, budgets, savingsGoal }: Props) {
  const [open, setOpen] = useState(false)
  const { score, breakdown, reserveMonths } = useMemo(
    () => calcScore(allTxs, monthTxs, currentMonth, budgets, savingsGoal),
    [allTxs, monthTxs, currentMonth, budgets, savingsGoal],
  )

  const label = score >= 75 ? 'Ótimo' : score >= 50 ? 'Bom' : score >= 30 ? 'Atenção' : 'Crítico'
  const color =
    score >= 75 ? 'text-green-600' : score >= 50 ? 'text-amber-500' : 'text-red-500'
  const barColor =
    score >= 75 ? 'bg-green-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <>
      <Card
        className="cursor-pointer hover:ring-2 hover:ring-primary/30 transition-shadow"
        onClick={() => setOpen(true)}
      >
        <CardContent className="pt-4 pb-3 px-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-muted-foreground font-medium">Saúde Financeira</span>
            <span className="text-[10px] text-muted-foreground">ver →</span>
          </div>
          <div className={`text-base font-bold ${color} mb-1 leading-tight`}>
            {score}/100 · {label}
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${score}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogClose onClick={() => setOpen(false)} />
          <DialogHeader>
            <DialogTitle>Score de Saúde Financeira</DialogTitle>
          </DialogHeader>

          <div className="mb-5">
            <div className={`text-4xl font-bold ${color} mb-1`}>{score}/100</div>
            <div className="text-sm text-muted-foreground mb-2">{label}</div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full ${barColor}`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>

          <div className="space-y-3">
            {breakdown.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <span className="font-medium flex items-center gap-1.5">
                    <span className={item.ok ? 'text-green-600' : 'text-red-500'}>
                      {item.ok ? '✓' : '✗'}
                    </span>
                    {item.label}
                  </span>
                  <span className="text-muted-foreground font-mono text-[11px]">
                    {item.pts}/{item.max}pts
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground mb-1">{item.detail}</div>
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.ok ? 'bg-green-500' : 'bg-red-400'}`}
                    style={{ width: `${(item.pts / item.max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t text-xs text-muted-foreground">
            Reserva de emergência estimada:{' '}
            <span className="font-semibold text-foreground">
              {reserveMonths.toFixed(1)} meses
            </span>{' '}
            <span className={reserveMonths >= 3 ? 'text-green-600' : 'text-amber-500'}>
              {reserveMonths >= 3 ? '✓ adequada' : '⚠ abaixo de 3 meses'}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            * Reserva estimada com base no saldo líquido acumulado de todas as transações.
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function calcReserveMonths(allTxs: Transaction[], currentMonth: string): number {
  const netBalance = allTxs.reduce((s, t) => s + t.amount, 0)
  const prevMonths = Array.from(new Set(allTxs.map((t) => isoMonthOf(t.date))))
    .filter((m) => m < currentMonth)
    .sort()
    .slice(-6)
  if (prevMonths.length === 0) return 0
  const avgExp =
    prevMonths
      .map((m) =>
        Math.abs(
          allTxs
            .filter((t) => isoMonthOf(t.date) === m && t.amount < 0)
            .reduce((s, t) => s + t.amount, 0),
        ),
      )
      .reduce((s, v) => s + v, 0) / prevMonths.length
  return avgExp > 0 ? Math.max(0, netBalance / avgExp) : 0
}
