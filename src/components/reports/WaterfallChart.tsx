import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts'
import { formatCurrency } from '@/lib/utils/currency'
import { isoMonthOf } from '@/lib/utils/date'
import type { Transaction } from '@/types'

interface Props {
  allTxs: Transaction[]
  currentMonth: string
}

export function WaterfallChart({ allTxs, currentMonth }: Props) {
  const data = useMemo(() => {
    const monthTxs = allTxs.filter((t) => isoMonthOf(t.date) === currentMonth)
    const income = monthTxs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)

    // Agrupa despesas por categoria
    const cats: Record<string, number> = {}
    monthTxs
      .filter((t) => t.amount < 0)
      .forEach((t) => {
        cats[t.category] = (cats[t.category] ?? 0) + Math.abs(t.amount)
      })

    // Top 6 categorias por valor
    const sorted = Object.entries(cats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)

    const outros = Object.entries(cats)
      .sort((a, b) => b[1] - a[1])
      .slice(6)
      .reduce((s, [, v]) => s + v, 0)

    // Monta waterfall: cada barra flutua
    // "base" é o valor acumulado antes da barra
    let running = income
    const items = sorted.map(([name, val]) => {
      const base = running - val
      running = base
      return { name, val: +val.toFixed(2), base: +base.toFixed(2), positive: false }
    })

    if (outros > 0) {
      const base = running - outros
      running = base
      items.push({ name: 'Outros', val: +outros.toFixed(2), base: +base.toFixed(2), positive: false })
    }

    const saldo = running

    return [
      { name: 'Receita', val: +income.toFixed(2), base: 0, positive: true },
      ...items,
      { name: 'Saldo', val: +Math.abs(saldo).toFixed(2), base: 0, positive: saldo >= 0 },
    ]
  }, [allTxs, currentMonth])

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 32 }}>
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10 }}
          angle={-30}
          textAnchor="end"
          interval={0}
        />
        <YAxis
          tick={{ fontSize: 10 }}
          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
          width={44}
        />
        <Tooltip
          formatter={(v) => formatCurrency(v as number)}
          contentStyle={{ fontSize: 11 }}
        />
        <ReferenceLine y={0} stroke="#e5e7eb" />
        {/* Barra transparente — espaçador para flotar */}
        <Bar dataKey="base" stackId="a" fill="transparent" />
        {/* Barra visível */}
        <Bar dataKey="val" stackId="a" radius={[3, 3, 0, 0]} maxBarSize={40}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.positive ? '#10b981' : i === data.length - 1 ? '#6366f1' : '#ef4444'}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
