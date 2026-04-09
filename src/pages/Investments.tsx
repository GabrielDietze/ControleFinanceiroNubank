import { useMemo, useState } from 'react'
import { useTransactionStore } from '@/store/useTransactionStore'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate, isoMonthOf, monthLabel } from '@/lib/utils/date'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { TrendingUp, Plus, Trash2, Filter } from 'lucide-react'
import { toast } from 'sonner'

const PRODUCTS = ['RDB', 'CDB', 'LCI', 'LCA', 'Tesouro Direto', 'Fundo', 'Investimento']

export default function InvestmentsPage() {
  const { investments, addYield, deleteInvestment } = useTransactionStore()

  // ── Dialog state ────────────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false)
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [amount, setAmount] = useState('')
  const [product, setProduct] = useState('Investimento')
  const [saving, setSaving] = useState(false)

  // ── Filters ─────────────────────────────────────────────────────────────────
  const [filterYear, setFilterYear] = useState<string>('all')
  const [filterProduct, setFilterProduct] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')

  const years = useMemo(() => {
    const s = new Set(investments.map((i) => i.date.slice(0, 4)))
    return Array.from(s).sort().reverse()
  }, [investments])

  const availableProducts = useMemo(() => {
    const s = new Set(investments.map((i) => i.product))
    return Array.from(s).sort()
  }, [investments])

  // Base filter: year + product → usado em KPIs, gráficos, breakdown
  const filtered = useMemo(() => {
    return investments.filter((i) => {
      if (filterYear !== 'all' && i.date.slice(0, 4) !== filterYear) return false
      if (filterProduct !== 'all' && i.product !== filterProduct) return false
      return true
    })
  }, [investments, filterYear, filterProduct])

  // Tabela: base + tipo
  const tableRows = useMemo(
    () =>
      filtered
        .filter((i) => filterType === 'all' || i.type === filterType)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [filtered, filterType],
  )

  // ── KPIs globais (sem filtro de tipo) ───────────────────────────────────────
  const totalApplied = useMemo(
    () => filtered.filter((i) => i.type === 'application').reduce((s, i) => s + i.amount, 0),
    [filtered],
  )
  const totalWithdrawn = useMemo(
    () => filtered.filter((i) => i.type === 'withdrawal').reduce((s, i) => s + i.amount, 0),
    [filtered],
  )
  const totalYields = useMemo(
    () => filtered.filter((i) => i.type === 'yield').reduce((s, i) => s + i.amount, 0),
    [filtered],
  )
  const netBalance = totalApplied - totalWithdrawn + totalYields
  const yieldPct = totalApplied > 0 ? (totalYields / totalApplied) * 100 : 0

  // Métricas de rendimento
  const { avgMonthlyYield, monthsWithYield, bestMonthlyYield } = useMemo(() => {
    const byMonth: Record<string, number> = {}
    for (const i of filtered) {
      if (i.type !== 'yield') continue
      const m = isoMonthOf(i.date)
      byMonth[m] = (byMonth[m] ?? 0) + i.amount
    }
    const vals = Object.values(byMonth)
    if (vals.length === 0) return { avgMonthlyYield: 0, monthsWithYield: 0, bestMonthlyYield: 0 }
    return {
      avgMonthlyYield: vals.reduce((s, v) => s + v, 0) / vals.length,
      monthsWithYield: vals.length,
      bestMonthlyYield: Math.max(...vals),
    }
  }, [filtered])

  // ── Gráfico saldo acumulado ──────────────────────────────────────────────────
  const evolutionData = useMemo(() => {
    const monthsSorted = Array.from(new Set(filtered.map((i) => isoMonthOf(i.date)))).sort()
    let running = 0
    return monthsSorted.map((m) => {
      const items = filtered.filter((i) => isoMonthOf(i.date) === m)
      const net = items.reduce((s, i) => {
        if (i.type === 'application') return s + i.amount
        if (i.type === 'withdrawal') return s - i.amount
        return s + i.amount
      }, 0)
      running = +(running + net).toFixed(2)
      return { month: monthLabel(m), saldo: running }
    })
  }, [filtered])

  // ── Gráfico rendimentos por mês ─────────────────────────────────────────────
  const yieldChartData = useMemo(() => {
    const byMonth: Record<string, number> = {}
    for (const i of filtered) {
      if (i.type !== 'yield') continue
      const m = isoMonthOf(i.date)
      byMonth[m] = +(((byMonth[m] ?? 0) + i.amount)).toFixed(2)
    }
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([m, rendimento]) => ({ month: monthLabel(m), rendimento }))
  }, [filtered])

  // ── Breakdown por produto ────────────────────────────────────────────────────
  const byProduct = useMemo(() => {
    const map: Record<string, { applied: number; withdrawn: number; yields: number }> = {}
    for (const i of filtered) {
      if (!map[i.product]) map[i.product] = { applied: 0, withdrawn: 0, yields: 0 }
      if (i.type === 'application') map[i.product].applied += i.amount
      else if (i.type === 'withdrawal') map[i.product].withdrawn += i.amount
      else map[i.product].yields += i.amount
    }
    return Object.entries(map)
      .map(([prod, v]) => ({
        product: prod,
        applied: v.applied,
        withdrawn: v.withdrawn,
        yields: v.yields,
        balance: +(v.applied - v.withdrawn + v.yields).toFixed(2),
        pct: v.applied > 0 ? +((v.yields / v.applied) * 100).toFixed(2) : 0,
      }))
      .sort((a, b) => b.balance - a.balance)
  }, [filtered])

  // ── Dialog handlers ──────────────────────────────────────────────────────────
  function openDialog() {
    setAmount('')
    setProduct('Investimento')
    const d = new Date()
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    setDialogOpen(true)
  }

  async function handleSave() {
    const value = parseFloat(amount.replace(',', '.'))
    if (!month || isNaN(value) || value <= 0) {
      toast.error('Preencha mês e valor válido.')
      return
    }
    setSaving(true)
    try {
      await addYield({ date: `${month}-01`, type: 'yield', amount: value, product })
      toast.success('Rendimento registrado.')
      setDialogOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    await deleteInvestment(id)
    toast.success('Rendimento removido.')
  }

  const hasData = investments.length > 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Investimentos</h1>
        <Button size="sm" onClick={openDialog}>
          <Plus size={15} className="mr-1" />
          Registrar rendimento
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter size={15} className="text-muted-foreground shrink-0" />
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os anos</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterProduct} onValueChange={setFilterProduct}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os produtos</SelectItem>
            {availableProducts.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(filterYear !== 'all' || filterProduct !== 'all') && (
          <button
            onClick={() => { setFilterYear('all'); setFilterProduct('all') }}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">Aplicado</span>
              <TrendingUp size={15} className="text-blue-500" />
            </div>
            <div className="text-xl font-bold text-blue-600">{formatCurrency(totalApplied)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="text-sm text-muted-foreground mb-1">Resgatado</div>
            <div className="text-xl font-bold text-amber-600">{formatCurrency(totalWithdrawn)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="text-sm text-muted-foreground mb-1">Rendimentos</div>
            <div className="text-xl font-bold text-green-600">{formatCurrency(totalYields)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="text-sm text-muted-foreground mb-1">Saldo líquido</div>
            <div className={`text-xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {formatCurrency(netBalance)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="text-sm text-muted-foreground mb-1">Rentabilidade</div>
            <div className={`text-xl font-bold ${yieldPct > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
              {yieldPct.toFixed(2)}%
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">rendimentos / aplicado</div>
          </CardContent>
        </Card>
      </div>

      {/* KPIs secundários de rendimento */}
      {totalYields > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground mb-1">Rendimento médio/mês</div>
              <div className="text-lg font-semibold text-green-600">{formatCurrency(avgMonthlyYield)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground mb-1">Meses com rendimento</div>
              <div className="text-lg font-semibold">{monthsWithYield}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground mb-1">Maior rendimento mensal</div>
              <div className="text-lg font-semibold text-green-600">{formatCurrency(bestMonthlyYield)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gráficos */}
      {hasData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Saldo acumulado */}
          {evolutionData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Saldo acumulado</CardTitle>
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
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                      width={52}
                    />
                    <Tooltip formatter={(v) => formatCurrency(v as number)} />
                    <Area
                      type="monotone"
                      dataKey="saldo"
                      name="Saldo"
                      stroke="#6366f1"
                      fill="url(#investGrad)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Rendimentos por mês */}
          {yieldChartData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Rendimentos por mês</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={yieldChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `R$${v.toFixed(0)}`}
                      width={52}
                    />
                    <Tooltip formatter={(v) => formatCurrency(v as number)} />
                    <Bar dataKey="rendimento" name="Rendimento" fill="#22c55e" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Breakdown por produto */}
      {byProduct.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Por produto</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Produto</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">Aplicado</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">Resgatado</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">Rendimentos</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">Saldo</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">Rent.</th>
                </tr>
              </thead>
              <tbody>
                {byProduct.map((row) => (
                  <tr key={row.product} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2 font-medium">{row.product}</td>
                    <td className="px-4 py-2 text-right font-mono text-blue-600">{formatCurrency(row.applied)}</td>
                    <td className="px-4 py-2 text-right font-mono text-amber-600">{formatCurrency(row.withdrawn)}</td>
                    <td className="px-4 py-2 text-right font-mono text-green-600">{formatCurrency(row.yields)}</td>
                    <td className="px-4 py-2 text-right font-mono font-semibold">{formatCurrency(row.balance)}</td>
                    <td className="px-4 py-2 text-right font-mono text-green-600">
                      {row.pct > 0 ? `${row.pct}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Histórico */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Histórico</CardTitle>
            {/* Filtro de tipo só na tabela */}
            <div className="flex gap-2">
              {(['all', 'application', 'withdrawal', 'yield'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                    filterType === t
                      ? 'bg-foreground text-background border-foreground'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t === 'all' ? 'Todos' : t === 'application' ? 'Aplicações' : t === 'withdrawal' ? 'Resgates' : 'Rendimentos'}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {tableRows.length === 0 ? (
            <p className="px-4 py-8 text-center text-muted-foreground text-sm">
              {hasData ? 'Nenhum registro para os filtros selecionados.' : 'Importe extratos ou registre rendimentos.'}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Data</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Produto</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Tipo</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">Valor</th>
                  <th className="w-8 px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {tableRows.map((inv) => (
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
                            : inv.type === 'withdrawal'
                            ? 'border-amber-300 text-amber-700'
                            : 'border-green-300 text-green-700'
                        }
                      >
                        {inv.type === 'application' ? 'Aplicação' : inv.type === 'withdrawal' ? 'Resgate' : 'Rendimento'}
                      </Badge>
                    </td>
                    <td className={`px-4 py-2 text-right font-mono whitespace-nowrap ${
                      inv.type === 'application' ? 'text-blue-600' : inv.type === 'withdrawal' ? 'text-amber-600' : 'text-green-600'
                    }`}>
                      {formatCurrency(inv.amount)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {inv.type === 'yield' && (
                        <button
                          onClick={() => handleDelete(inv.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          title="Remover rendimento"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Dialog: adicionar rendimento */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar rendimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Mês de referência</label>
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Valor (R$)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Produto</label>
              <Select value={product} onValueChange={setProduct}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCTS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
