import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { formatCurrency } from '@/lib/utils/currency'
import { isoMonthOf, monthLabel } from '@/lib/utils/date'
import type { Transaction } from '@/types'

interface Props {
  allTxs: Transaction[]
  allMonths: string[]
}

export function ProjectionChart({ allTxs, allMonths }: Props) {
  const chartData = useMemo(() => {
    const sorted = [...allMonths].sort()
    const lastN = sorted.slice(-12)

    const historical = lastN.map((m) => {
      const txs = allTxs.filter((t) => isoMonthOf(t.date) === m)
      const inc = txs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
      const exp = Math.abs(txs.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0))
      return { label: monthLabel(m), real: +(inc - exp).toFixed(2), projected: undefined }
    })

    const avgSavings =
      historical.length > 0
        ? historical.reduce((s, d) => s + d.real, 0) / historical.length
        : 0

    const lastMonth = sorted[sorted.length - 1] ?? ''
    const projections = Array.from({ length: 6 }, (_, i) => {
      const [y, m] = lastMonth.split('-').map(Number)
      const totalM = m + i + 1
      const ny = y + Math.floor((totalM - 1) / 12)
      const nm = ((totalM - 1) % 12) + 1
      const mo = `${ny}-${String(nm).padStart(2, '0')}`
      return { label: monthLabel(mo), real: undefined, projected: +avgSavings.toFixed(2) }
    })

    // Conecta a projeção ao último ponto real
    const last = historical[historical.length - 1]
    const firstProjection = projections[0]
    if (last && firstProjection) {
      firstProjection.projected = last.real
    }

    return [...historical, ...projections]
  }, [allTxs, allMonths])

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradReal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradProjected" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={1} />
        <YAxis
          tick={{ fontSize: 10 }}
          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
          width={42}
        />
        <Tooltip
          formatter={(v, name) => [
            formatCurrency(v as number),
            name === 'real' ? 'Real' : 'Projeção',
          ]}
          contentStyle={{ fontSize: 11 }}
        />
        <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={1} />
        <Area
          type="monotone"
          dataKey="real"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#gradReal)"
          dot={false}
          connectNulls={false}
        />
        <Area
          type="monotone"
          dataKey="projected"
          stroke="#6366f1"
          strokeWidth={2}
          strokeDasharray="5 3"
          fill="url(#gradProjected)"
          dot={false}
          connectNulls={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
