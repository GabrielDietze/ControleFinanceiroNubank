import { useRef, useState, useMemo } from 'react'
import { useTransactionStore } from '@/store/useTransactionStore'
import type { CategoryRule, CategoryBudget } from '@/types'
import type { ExportData } from '@/lib/db'
import { DEFAULT_CATEGORIES } from '@/lib/utils/categories'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils/currency'
import { toast } from 'sonner'
import { Trash2, Plus, Download, Upload } from 'lucide-react'

export default function SettingsPage() {
  const { settings, updateSettings, clearAll, exportData, importData } = useTransactionStore()
  const importInputRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    try {
      const data = await exportData()
      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const date = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `financeiro-backup-${date}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Backup exportado com sucesso.')
    } catch {
      toast.error('Erro ao exportar dados.')
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    try {
      const text = await file.text()
      const data = JSON.parse(text) as ExportData

      if (data.version !== 1 || !Array.isArray(data.transactions)) {
        toast.error('Arquivo inválido ou formato não reconhecido.')
        return
      }

      const { addedTransactions, addedInvestments } = await importData(data)
      toast.success(
        `Importação concluída: ${addedTransactions} transações e ${addedInvestments} investimentos adicionados.`,
      )
    } catch {
      toast.error('Erro ao importar arquivo. Verifique se é um backup válido.')
    }
  }

  // Internal names
  const [newName, setNewName] = useState('')

  const addName = () => {
    const trimmed = newName.trim()
    if (!trimmed || settings.internalNames.includes(trimmed)) return
    updateSettings({ ...settings, internalNames: [...settings.internalNames, trimmed] })
    setNewName('')
  }

  const removeName = (name: string) => {
    updateSettings({
      ...settings,
      internalNames: settings.internalNames.filter((n) => n !== name),
    })
  }

  // Meta de poupança
  const [savingsGoalInput, setSavingsGoalInput] = useState(String(settings.savingsGoal ?? 20))

  const saveSavingsGoal = () => {
    const val = parseInt(savingsGoalInput)
    if (isNaN(val) || val < 0 || val > 100) {
      toast.error('Informe um valor entre 0 e 100.')
      return
    }
    updateSettings({ ...settings, savingsGoal: val })
    toast.success('Meta de poupança salva.')
  }

  // Metas por categoria
  const allCategories = useMemo(
    () => [...DEFAULT_CATEGORIES, ...(settings.customCategories ?? [])],
    [settings.customCategories],
  )
  const [budgetCategory, setBudgetCategory] = useState('')
  const [budgetLimit, setBudgetLimit] = useState('')

  const addBudget = () => {
    if (!budgetCategory) { toast.error('Selecione uma categoria.'); return }
    const limit = parseFloat(budgetLimit.replace(',', '.'))
    if (isNaN(limit) || limit <= 0) { toast.error('Informe um limite válido.'); return }
    const existing = (settings.budgets ?? []).find((b) => b.category === budgetCategory)
    if (existing) { toast.error('Já existe uma meta para essa categoria.'); return }
    const newBudget: CategoryBudget = { category: budgetCategory, limit }
    updateSettings({ ...settings, budgets: [...(settings.budgets ?? []), newBudget] })
    setBudgetCategory('')
    setBudgetLimit('')
    toast.success('Meta adicionada.')
  }

  const removeBudget = (category: string) => {
    updateSettings({ ...settings, budgets: (settings.budgets ?? []).filter((b) => b.category !== category) })
  }

  // Custom rules
  const [rulePattern, setRulePattern] = useState('')
  const [ruleCategory, setRuleCategory] = useState('')
  const [ruleIsRegex, setRuleIsRegex] = useState(false)

  const addRule = () => {
    if (!rulePattern.trim() || !ruleCategory.trim()) return
    const newRule: CategoryRule = {
      id: crypto.randomUUID(),
      pattern: rulePattern.trim(),
      category: ruleCategory.trim(),
      isRegex: ruleIsRegex,
    }
    updateSettings({
      ...settings,
      customCategoryRules: [...settings.customCategoryRules, newRule],
    })
    setRulePattern('')
    setRuleCategory('')
    setRuleIsRegex(false)
  }

  const removeRule = (id: string) => {
    updateSettings({
      ...settings,
      customCategoryRules: settings.customCategoryRules.filter((r) => r.id !== id),
    })
  }

  const handleClearAll = async () => {
    if (!confirm('Tem certeza que deseja apagar todos os dados? Esta ação não pode ser desfeita.')) return
    await clearAll()
    toast.success('Todos os dados foram removidos.')
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Configurações</h1>

      {/* Meta de poupança */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Meta de poupança</CardTitle>
          <p className="text-sm text-muted-foreground">
            Percentual da renda que você quer poupar por mês. Usado para avaliar a taxa de poupança no Dashboard.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={savingsGoalInput}
              onChange={(e) => setSavingsGoalInput(e.target.value)}
              className="h-8 w-24 text-sm"
              min="0"
              max="100"
              step="5"
            />
            <span className="text-sm text-muted-foreground">%</span>
            <Button size="sm" onClick={saveSavingsGoal}>Salvar</Button>
          </div>
        </CardContent>
      </Card>

      {/* Metas mensais por categoria */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Metas mensais por categoria</CardTitle>
          <p className="text-sm text-muted-foreground">
            Defina um limite de gasto mensal por categoria. O progresso aparece no Dashboard.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-wrap items-center">
            <Select value={budgetCategory} onValueChange={setBudgetCategory}>
              <SelectTrigger className="h-8 w-48 text-sm">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                {allCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">R$</span>
              <Input
                type="number"
                placeholder="Limite"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addBudget() }}
                className="h-8 w-28 text-sm"
                min="0"
                step="50"
              />
            </div>
            <Button size="sm" onClick={addBudget}>
              <Plus size={14} className="mr-1" /> Adicionar
            </Button>
          </div>
          {(settings.budgets ?? []).length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1 font-medium text-muted-foreground">Categoria</th>
                  <th className="text-right py-1 font-medium text-muted-foreground">Limite mensal</th>
                  <th className="py-1 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {(settings.budgets ?? []).map((b) => (
                  <tr key={b.category} className="border-b last:border-0">
                    <td className="py-1.5">{b.category}</td>
                    <td className="py-1.5 text-right font-mono">{formatCurrency(b.limit)}</td>
                    <td className="py-1.5 text-right">
                      <button
                        onClick={() => removeBudget(b.category)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Transferências internas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Transferências internas</CardTitle>
          <p className="text-sm text-muted-foreground">
            Nomes, CPFs ou CNPJs que identificam transferências entre suas próprias contas.
            Transações para/de esses destinatários serão classificadas como "Transferência interna" (neutro).
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Ex: Gabriel Augusto Dietze Novy"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addName() }}
              className="h-8 text-sm"
            />
            <Button size="sm" onClick={addName} className="shrink-0">
              <Plus size={14} className="mr-1" /> Adicionar
            </Button>
          </div>
          {settings.internalNames.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {settings.internalNames.map((name) => (
                <span
                  key={name}
                  className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-sm"
                >
                  {name}
                  <button
                    onClick={() => removeName(name)}
                    className="text-muted-foreground hover:text-destructive ml-1"
                  >
                    <Trash2 size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Regras personalizadas de categoria */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Regras de categorização personalizadas</CardTitle>
          <p className="text-sm text-muted-foreground">
            Aplicadas antes das regras padrão. Se o padrão for encontrado no MEMO da transação, a categoria é atribuída.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Input
              placeholder="Padrão (ex: Livraria)"
              value={rulePattern}
              onChange={(e) => setRulePattern(e.target.value)}
              className="h-8 text-sm w-44"
            />
            <Input
              placeholder="Categoria"
              value={ruleCategory}
              onChange={(e) => setRuleCategory(e.target.value)}
              className="h-8 text-sm w-36"
            />
            <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={ruleIsRegex}
                onChange={(e) => setRuleIsRegex(e.target.checked)}
                className="rounded"
              />
              Regex
            </label>
            <Button size="sm" onClick={addRule}>
              <Plus size={14} className="mr-1" /> Adicionar
            </Button>
          </div>
          {settings.customCategoryRules.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1 font-medium text-muted-foreground">Padrão</th>
                  <th className="text-left py-1 font-medium text-muted-foreground">Categoria</th>
                  <th className="py-1"></th>
                  <th className="py-1"></th>
                </tr>
              </thead>
              <tbody>
                {settings.customCategoryRules.map((rule) => (
                  <tr key={rule.id} className="border-b last:border-0">
                    <td className="py-1.5 font-mono text-xs">{rule.pattern}</td>
                    <td className="py-1.5">{rule.category}</td>
                    <td className="py-1.5">
                      {rule.isRegex && <Badge variant="outline" className="text-xs">regex</Badge>}
                    </td>
                    <td className="py-1.5 text-right">
                      <button
                        onClick={() => removeRule(rule.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Categorias personalizadas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Categorias personalizadas</CardTitle>
          <p className="text-sm text-muted-foreground">
            Adicione novas categorias que aparecerão na seleção manual de categoria das transações.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <CustomCategoriesEditor
            categories={settings.customCategories ?? []}
            onChange={(customCategories) => updateSettings({ ...settings, customCategories })}
          />
        </CardContent>
      </Card>

      {/* Exportar / Importar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Exportar / Importar dados</CardTitle>
          <p className="text-sm text-muted-foreground">
            Faça backup de todas as transações, investimentos e configurações para usar em outro dispositivo.
            A importação mescla os dados (duplicatas são ignoradas automaticamente).
          </p>
        </CardHeader>
        <CardContent className="flex gap-3 flex-wrap">
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download size={14} className="mr-1.5" />
            Exportar backup
          </Button>
          <Button size="sm" variant="outline" onClick={() => importInputRef.current?.click()}>
            <Upload size={14} className="mr-1.5" />
            Importar backup
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImport}
          />
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-destructive">Zona de perigo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Remove todas as transações e investimentos do banco de dados local. As configurações são mantidas.
          </p>
          <Button variant="destructive" size="sm" onClick={handleClearAll}>
            Apagar todos os dados
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function CustomCategoriesEditor({
  categories,
  onChange,
}: {
  categories: string[]
  onChange: (categories: string[]) => void
}) {
  const [newCategory, setNewCategory] = useState('')

  const add = () => {
    const trimmed = newCategory.trim()
    if (!trimmed) return
    if (categories.includes(trimmed) || (DEFAULT_CATEGORIES as readonly string[]).includes(trimmed)) {
      toast.error('Essa categoria já existe.')
      return
    }
    onChange([...categories, trimmed])
    setNewCategory('')
  }

  const remove = (cat: string) => onChange(categories.filter((c) => c !== cat))

  return (
    <>
      <div className="flex gap-2">
        <Input
          placeholder="Ex: Educação"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add() }}
          className="h-8 text-sm"
        />
        <Button size="sm" onClick={add} className="shrink-0">
          <Plus size={14} className="mr-1" /> Adicionar
        </Button>
      </div>
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <span
              key={cat}
              className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-sm"
            >
              {cat}
              <button
                onClick={() => remove(cat)}
                className="text-muted-foreground hover:text-destructive ml-1"
              >
                <Trash2 size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </>
  )
}
