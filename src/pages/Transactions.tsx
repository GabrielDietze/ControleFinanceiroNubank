import { useMemo, useState } from 'react'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useCategoryChange } from '@/hooks/useCategoryChange'
import type { Transaction, TransactionType } from '@/types'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date'
import { TYPE_LABELS } from '@/lib/ofx/classifier'
import { DEFAULT_CATEGORIES } from '@/lib/utils/categories'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Link2 } from 'lucide-react'

const PAGE_SIZE = 50

type SortField = 'date' | 'amount'

export default function TransactionsPage() {
  const { transactions, settings } = useTransactionStore()
  const { handleCategoryChange } = useCategoryChange()
  const allCategories = useMemo(
    () => [...DEFAULT_CATEGORIES, ...(settings.customCategories ?? [])].sort((a, b) => a.localeCompare(b, 'pt')),
    [settings.customCategories],
  )

  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all')
  const [filterSource, setFilterSource] = useState<'all' | 'account' | 'credit_card'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'neutral' | 'cancelled'>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterMonth, setFilterMonth] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)

  const months = useMemo(() => {
    const set = new Set<string>()
    transactions.forEach((t) => set.add(t.date.slice(0, 7)))
    return Array.from(set).sort().reverse()
  }, [transactions])

  const filtered = useMemo(() => {
    return transactions
      .filter((t) => {
        if (filterType !== 'all' && t.type !== filterType) return false
        if (filterSource !== 'all' && t.source !== filterSource) return false
        if (filterStatus !== 'all' && t.status !== filterStatus) return false
        if (filterCategory !== 'all' && t.category !== filterCategory) return false
        if (filterMonth !== 'all' && !t.date.startsWith(filterMonth)) return false
        if (search) {
          const q = search.toLowerCase()
          if (!t.memo.toLowerCase().includes(q) && !t.category.toLowerCase().includes(q)) return false
        }
        return true
      })
      .sort((a, b) => {
        const mul = sortDir === 'asc' ? 1 : -1
        if (sortField === 'date') return mul * a.date.localeCompare(b.date)
        return mul * (a.amount - b.amount)
      })
  }, [transactions, filterType, filterSource, filterStatus, filterCategory, filterMonth, search, sortField, sortDir])

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('desc') }
    setPage(0)
  }

  const onCategoryChange = async (id: string, cat: string) => {
    await handleCategoryChange(id, cat)
    setEditingId(null)
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Transações</h1>
        <span className="text-sm text-muted-foreground">{filtered.length} registros</span>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="py-3 px-4 flex flex-wrap gap-2">
          <Input
            placeholder="Buscar descrição ou categoria..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            className="h-8 w-56"
          />
          <FilterSelect
            value={filterMonth}
            onValueChange={(v) => { setFilterMonth(v); setPage(0) }}
            placeholder="Mês"
          >
            <SelectItem value="all">Todos os meses</SelectItem>
            {months.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </FilterSelect>
          <FilterSelect
            value={filterType}
            onValueChange={(v) => { setFilterType(v as TransactionType | 'all'); setPage(0) }}
            placeholder="Tipo"
          >
            <SelectItem value="all">Todos os tipos</SelectItem>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </FilterSelect>
          <FilterSelect
            value={filterSource}
            onValueChange={(v) => { setFilterSource(v as 'all' | 'account' | 'credit_card'); setPage(0) }}
            placeholder="Origem"
          >
            <SelectItem value="all">Conta + Cartão</SelectItem>
            <SelectItem value="account">Conta corrente</SelectItem>
            <SelectItem value="credit_card">Cartão de crédito</SelectItem>
          </FilterSelect>
          <FilterSelect
            value={filterCategory}
            onValueChange={(v) => { setFilterCategory(v); setPage(0) }}
            placeholder="Categoria"
          >
            <SelectItem value="all">Todas as categorias</SelectItem>
            {allCategories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </FilterSelect>
          <FilterSelect
            value={filterStatus}
            onValueChange={(v) => { setFilterStatus(v as 'all' | 'active' | 'neutral' | 'cancelled'); setPage(0) }}
            placeholder="Status"
          >
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="neutral">Neutro</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </FilterSelect>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th
                    className="text-left px-4 py-2 font-medium text-muted-foreground cursor-pointer select-none"
                    onClick={() => toggleSort('date')}
                  >
                    Data {sortField === 'date' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Descrição</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Tipo</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Categoria</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Origem</th>
                  <th
                    className="text-right px-4 py-2 font-medium text-muted-foreground cursor-pointer select-none"
                    onClick={() => toggleSort('amount')}
                  >
                    Valor {sortField === 'amount' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhuma transação encontrada.
                    </td>
                  </tr>
                )}
                {paginated.map((t) => (
                  <TransactionRow
                    key={t.id}
                    t={t}
                    isEditing={editingId === t.id}
                    onEditStart={() => setEditingId(t.id)}
                    onCategoryChange={(cat) => onCategoryChange(t.id, cat)}
                    onEditCancel={() => setEditingId(null)}
                    allCategories={allCategories}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {/* Paginação */}
          {pageCount > 1 && (
            <div className="flex items-center justify-between px-4 py-2 border-t text-sm">
              <span className="text-muted-foreground">
                Página {page + 1} de {pageCount}
              </span>
              <div className="flex gap-1">
                <button
                  className="px-2 py-1 rounded border disabled:opacity-40"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ←
                </button>
                <button
                  className="px-2 py-1 rounded border disabled:opacity-40"
                  disabled={page >= pageCount - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  →
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function TransactionRow({
  t,
  isEditing,
  onEditStart,
  onCategoryChange,
  onEditCancel,
  allCategories,
}: {
  t: Transaction
  isEditing: boolean
  onEditStart: () => void
  onCategoryChange: (cat: string) => void
  onEditCancel: () => void
  allCategories: string[]
}) {
  const isNeutral = t.status === 'neutral' || t.status === 'cancelled'

  return (
    <tr className={`border-b last:border-0 hover:bg-muted/30 ${isNeutral ? 'opacity-60' : ''}`}>
      <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">
        {formatDate(t.date)}
      </td>
      <td className="px-4 py-2 max-w-xs">
        <div className="flex items-center gap-1.5">
          <span className="truncate block" title={t.memo}>{t.memo}</span>
          {t.linkedId && <Link2 size={12} className="shrink-0 text-muted-foreground" aria-label="Vinculada" />}
        </div>
        {t.status === 'cancelled' && (
          <span className="text-xs text-muted-foreground line-through">(cancelada/estorno)</span>
        )}
      </td>
      <td className="px-4 py-2 whitespace-nowrap">
        <TypeBadge type={t.type} />
      </td>
      <td className="px-4 py-2">
        {isEditing ? (
          <Select
            defaultValue={t.category}
            onValueChange={(v) => { if (v) onCategoryChange(v) }}
          >
            <SelectTrigger className="h-7 w-44 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allCategories.map((c) => (
                <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <button
            onClick={onEditStart}
            className="text-left hover:underline text-muted-foreground hover:text-foreground transition-colors"
          >
            {t.category}
            {t.manualCategory && <span className="text-xs ml-1 text-primary">✎</span>}
          </button>
        )}
        {isEditing && (
          <button onClick={onEditCancel} className="text-xs text-muted-foreground ml-2">cancelar</button>
        )}
      </td>
      <td className="px-4 py-2">
        <Badge variant="outline" className="text-xs">
          {t.source === 'account' ? 'Conta' : 'Cartão'}
        </Badge>
      </td>
      <td className={`px-4 py-2 text-right font-mono whitespace-nowrap ${
        t.amount > 0 ? 'text-green-600' : 'text-red-500'
      }`}>
        {formatCurrency(t.amount)}
      </td>
    </tr>
  )
}

function FilterSelect({
  value,
  onValueChange,
  placeholder,
  children,
}: {
  value: string
  onValueChange: (v: string) => void
  placeholder: string
  children: React.ReactNode
}) {
  return (
    <Select value={value} onValueChange={(v) => { if (v) onValueChange(v) }}>
      <SelectTrigger className="h-8 w-auto min-w-32 text-xs">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  )
}

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    income: 'bg-green-100 text-green-800',
    expense: 'bg-red-100 text-red-800',
    reimbursement: 'bg-orange-100 text-orange-800',
    investment_application: 'bg-blue-100 text-blue-800',
    investment_withdrawal: 'bg-cyan-100 text-cyan-800',
    card_payment: 'bg-gray-100 text-gray-600',
    internal_transfer: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${map[type] ?? ''}`}>
      {TYPE_LABELS[type as keyof typeof TYPE_LABELS] ?? type}
    </span>
  )
}
