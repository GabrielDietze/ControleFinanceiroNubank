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
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

const PRODUCTS = ['RDB', 'CDB', 'LCI', 'LCA', 'Tesouro Direto', 'Fundo', 'Investimento']

export default function InvestmentsPage() {
  const { investments, addYield, deleteInvestment } = useTransactionStore()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [amount, setAmount] = useState('')
  const [product, setProduct] = useState('Investimento')
  const [saving, setSaving] = useState(false)

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
  const totalYields = useMemo(
    () => investments.filter((i) => i.type === 'yield').reduce((s, i) => s + i.amount, 0),
    [investments],
  )
  const netBalance = totalApplied - totalWithdrawn + totalYields

  // Evolução acumulada por mês
  const evolutionData = useMemo(() => {
    const byMonth: Record<string, number> = {}
    const monthsSorted = Array.from(
      new Set(investments.map((i) => isoMonthOf(i.date))),
    ).sort()

    let running = 0
    for (const m of monthsSorted) {
      const monthItems = investments.filter((i) => isoMonthOf(i.date) === m)
      const net = monthItems.reduce((s, i) => {
        if (i.type === 'application') return s + i.amount
        if (i.type === 'withdrawal') return s - i.amount
        return s + i.amount // yield
      }, 0)
      running += net
      byMonth[m] = +running.toFixed(2)
    }

    return Object.entries(byMonth).map(([m, saldo]) => ({
      month: monthLabel(m),
      saldo,
    }))
  }, [investments])

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Investimentos</h1>
        <Button size="sm" onClick={openDialog}>
          <Plus size={15} className="mr-1" />
          Registrar rendimento
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            <div className="text-sm text-muted-foreground mb-1">Rendimentos</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalYields)}</div>
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
              Nenhum investimento encontrado. Importe extratos ou registre rendimentos.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Data</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Produto</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Tipo</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">Valor</th>
                  <th className="px-4 py-2" />
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
                            : inv.type === 'withdrawal'
                            ? 'border-amber-300 text-amber-700'
                            : 'border-green-300 text-green-700'
                        }
                      >
                        {inv.type === 'application'
                          ? 'Aplicação'
                          : inv.type === 'withdrawal'
                          ? 'Resgate'
                          : 'Rendimento'}
                      </Badge>
                    </td>
                    <td className={`px-4 py-2 text-right font-mono whitespace-nowrap ${
                      inv.type === 'application'
                        ? 'text-blue-600'
                        : inv.type === 'withdrawal'
                        ? 'text-amber-600'
                        : 'text-green-600'
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
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
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
