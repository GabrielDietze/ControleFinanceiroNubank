import { useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date'
import { TYPE_LABELS } from '@/lib/ofx/classifier'
import { DEFAULT_CATEGORIES } from '@/lib/utils/categories'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useCategoryChange } from '@/hooks/useCategoryChange'
import type { Transaction } from '@/types'

interface Props {
  transaction: Transaction | null
  onClose: () => void
}

export function TransactionDetailDialog({ transaction: t, onClose }: Props) {
  const { settings } = useTransactionStore()
  const { handleCategoryChange } = useCategoryChange()
  const [saving, setSaving] = useState(false)

  const allCategories = useMemo(
    () => [...DEFAULT_CATEGORIES, ...(settings.customCategories ?? [])].sort((a, b) => a.localeCompare(b, 'pt')),
    [settings.customCategories],
  )

  const onCategoryChange = async (category: string) => {
    if (!t) return
    setSaving(true)
    await handleCategoryChange(t.id, category)
    setSaving(false)
    onClose()
  }

  return (
    <Dialog open={!!t} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogClose onClick={onClose} />
        <DialogHeader>
          <DialogTitle className="text-base font-semibold leading-snug pr-6" title={t?.memo}>
            {t?.memo}
          </DialogTitle>
        </DialogHeader>

        {t && (
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <span className="text-muted-foreground">Data</span>
              <span>{formatDate(t.date)}</span>

              <span className="text-muted-foreground">Valor</span>
              <span className={`font-mono font-medium ${t.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                {formatCurrency(t.amount)}
              </span>

              <span className="text-muted-foreground">Tipo</span>
              <span>{TYPE_LABELS[t.type] ?? t.type}</span>

              <span className="text-muted-foreground">Origem</span>
              <Badge variant="outline" className="w-fit text-xs">
                {t.source === 'account' ? 'Conta corrente' : 'Cartão de crédito'}
              </Badge>

              <span className="text-muted-foreground">Status</span>
              <span className="capitalize">{t.status}</span>
            </div>

            <div className="space-y-1.5">
              <p className="text-sm text-muted-foreground">Categoria</p>
              <Select
                defaultValue={t.category}
                onValueChange={onCategoryChange}
                disabled={saving}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allCategories.map((c) => (
                    <SelectItem key={c} value={c} className="text-sm">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {t.manualCategory && (
                <p className="text-xs text-muted-foreground">✎ Categoria definida manualmente</p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
