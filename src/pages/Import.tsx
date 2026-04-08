import { useState, useCallback, useMemo } from 'react'
import { parseOFX } from '@/lib/ofx/parser'
import { classifyTransaction } from '@/lib/ofx/classifier'
import { useTransactionStore } from '@/store/useTransactionStore'
import type { ImportPreviewItem } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate, isoMonthOf, monthLabel } from '@/lib/utils/date'
import { TYPE_LABELS } from '@/lib/ofx/classifier'
import { Upload, CheckCircle, AlertCircle, FileText, CalendarDays } from 'lucide-react'
import { toast } from 'sonner'

export default function ImportPage() {
  const { importTransactions, existingFITIDs, settings, transactions } = useTransactionStore()
  const [previewing, setPreviewing] = useState<ImportPreviewItem[] | null>(null)
  const [filesInfo, setFilesInfo] = useState<{ name: string; type: string }[]>([])
  const [dragging, setDragging] = useState(false)
  const [importing, setImporting] = useState(false)

  const importedMonths = useMemo(() => {
    const set = new Set<string>()
    transactions.forEach((t) => set.add(isoMonthOf(t.date)))
    return Array.from(set).sort().reverse()
  }, [transactions])

  const processFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return
      const existing = existingFITIDs()
      const allItems: ImportPreviewItem[] = []
      const infos: { name: string; type: string }[] = []
      let completed = 0
      let errored = 0

      const finish = () => {
        if (errored > 0 && allItems.length === 0) return
        if (errored > 0) toast.warning(`${errored} arquivo(s) não puderam ser lidos.`)

        // Deduplicar FITIDs entre arquivos (manter primeira ocorrência)
        const seenFitids = new Set<string>()
        const deduped = allItems.filter((item) => {
          if (seenFitids.has(item.raw.fitid)) return false
          seenFitids.add(item.raw.fitid)
          return true
        })

        deduped.sort((a, b) => {
          if (a.isDuplicate !== b.isDuplicate) return a.isDuplicate ? 1 : -1
          return b.classified.date.localeCompare(a.classified.date)
        })

        setFilesInfo(infos)
        setPreviewing(deduped)
      }

      files.forEach((file) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const raw = e.target?.result as string
            const parsed = parseOFX(raw)
            infos.push({ name: file.name, type: parsed.fileType })
            parsed.transactions.forEach((rawTx) => {
              allItems.push({
                raw: rawTx,
                classified: classifyTransaction(rawTx, {
                  source: parsed.fileType,
                  extraRules: settings.customCategoryRules,
                  internalNames: settings.internalNames,
                }),
                isDuplicate: existing.has(rawTx.fitid),
              })
            })
          } catch (err) {
            errored++
            toast.error(`Erro ao processar "${file.name}". Verifique se é um arquivo OFX válido.`)
            console.error(err)
          } finally {
            completed++
            if (completed === files.length) finish()
          }
        }
        reader.readAsText(file, 'UTF-8')
      })
    },
    [existingFITIDs, settings],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const files = Array.from(e.dataTransfer.files).filter((f) => f.name.endsWith('.ofx'))
      if (files.length > 0) processFiles(files)
    },
    [processFiles],
  )

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) processFiles(files)
    e.target.value = ''
  }

  const handleConfirm = async () => {
    if (!previewing) return
    setImporting(true)
    try {
      const newItems = previewing.filter((p) => !p.isDuplicate).map((p) => p.classified)
      const { added, duplicates } = await importTransactions(newItems)
      toast.success(`${added} transações importadas. ${duplicates > 0 ? `${duplicates} duplicatas ignoradas.` : ''}`)
      setPreviewing(null)
      setFilesInfo([])
    } catch (err) {
      toast.error('Erro ao importar. Tente novamente.')
      console.error(err)
    } finally {
      setImporting(false)
    }
  }

  const newCount = previewing?.filter((p) => !p.isDuplicate).length ?? 0
  const dupCount = previewing?.filter((p) => p.isDuplicate).length ?? 0

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Importar Extrato OFX</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Arraste ou selecione um ou mais arquivos .ofx exportados do Nubank (conta corrente ou cartão).
        </p>
      </div>

      {importedMonths.length > 0 && (
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <CalendarDays size={14} />
              <span className="font-medium text-foreground">Meses já importados</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {importedMonths.map((m) => (
                <Badge key={m} variant="secondary" className="text-xs">
                  {monthLabel(m)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!previewing && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
            dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          }`}
          onClick={() => document.getElementById('ofx-input')?.click()}
        >
          <Upload className="mx-auto mb-3 text-muted-foreground" size={40} />
          <p className="font-medium">Solte os arquivos aqui ou clique para selecionar</p>
          <p className="text-muted-foreground text-sm mt-1">Suporta múltiplos .ofx (conta corrente e cartão de crédito)</p>
          <input
            id="ofx-input"
            type="file"
            accept=".ofx"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
        </div>
      )}

      {previewing && filesInfo.length > 0 && (
        <div className="space-y-4">
          {/* Info bar */}
          <Card>
            <CardContent className="py-3 px-4 flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <FileText size={16} className="text-muted-foreground" />
                {filesInfo.map((fi, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <span className="font-medium">{fi.name}</span>
                    <Badge variant="outline">
                      {fi.type === 'account' ? 'Conta Corrente' : 'Cartão'}
                    </Badge>
                  </span>
                ))}
              </div>
              <div className="flex gap-3 ml-auto items-center">
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle size={14} /> {newCount} novas
                </span>
                {dupCount > 0 && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <AlertCircle size={14} /> {dupCount} duplicadas
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setPreviewing(null); setFilesInfo([]) }}
                >
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleConfirm} disabled={importing || newCount === 0}>
                  {importing ? 'Importando...' : `Importar ${newCount} transações`}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Preview das transações</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Data</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Descrição</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Tipo</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Categoria</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground">Valor</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewing.map((item) => (
                      <tr
                        key={item.raw.fitid}
                        className={`border-b last:border-0 ${item.isDuplicate ? 'opacity-40' : ''}`}
                      >
                        <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">
                          {formatDate(item.classified.date)}
                        </td>
                        <td className="px-4 py-2 max-w-xs">
                          <span className="truncate block" title={item.classified.memo}>
                            {item.classified.memo}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <TypeBadge type={item.classified.type} />
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">{item.classified.category}</td>
                        <td className={`px-4 py-2 text-right font-mono whitespace-nowrap ${
                          item.classified.amount > 0 ? 'text-green-600' : 'text-red-500'
                        }`}>
                          {formatCurrency(item.classified.amount)}
                        </td>
                        <td className="px-4 py-2">
                          {item.isDuplicate && (
                            <Badge variant="secondary" className="text-xs">duplicada</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    income: 'bg-green-100 text-green-800',
    expense: 'bg-red-100 text-red-800',
    reimbursement: 'bg-orange-100 text-orange-800',
    investment_application: 'bg-blue-100 text-blue-800',
    investment_withdrawal: 'bg-blue-100 text-blue-800',
    card_payment: 'bg-gray-100 text-gray-600',
    internal_transfer: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${map[type] ?? ''}`}>
      {TYPE_LABELS[type as keyof typeof TYPE_LABELS] ?? type}
    </span>
  )
}
