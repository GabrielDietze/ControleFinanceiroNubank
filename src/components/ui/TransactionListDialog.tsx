import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date'
import { TransactionDetailDialog } from '@/components/ui/TransactionDetailDialog'
import type { Transaction } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  transactions: Transaction[]
}

export function TransactionListDialog({ open, onClose, title, transactions }: Props) {
  const [detailTx, setDetailTx] = useState<Transaction | null>(null)

  const total = transactions.reduce((s, t) => s + t.amount, 0)
  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogClose onClick={onClose} />
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            <table className="w-full text-sm">
              <tbody>
                {sorted.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b last:border-0 cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => setDetailTx(t)}
                  >
                    <td className="py-2.5 pr-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(t.date)}
                    </td>
                    <td className="py-2.5 pr-3 overflow-hidden">
                      <div className="truncate font-medium" title={t.memo}>{t.memo}</div>
                      <div className="text-xs text-muted-foreground">{t.category}</div>
                    </td>
                    <td className={`py-2.5 text-right font-mono whitespace-nowrap font-medium ${t.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {formatCurrency(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t pt-3 flex items-center justify-between text-sm font-medium">
            <span className="text-muted-foreground">{transactions.length} transações</span>
            <span className={total > 0 ? 'text-green-600' : 'text-red-500'}>
              {formatCurrency(Math.abs(total))}
            </span>
          </div>
        </DialogContent>
      </Dialog>

      <TransactionDetailDialog
        transaction={detailTx}
        onClose={() => setDetailTx(null)}
      />
    </>
  )
}
