import { useState } from 'react'
import { useTransactionStore } from '@/store/useTransactionStore'
import type { CategoryRule } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Trash2, Plus } from 'lucide-react'

export default function SettingsPage() {
  const { settings, updateSettings, clearAll } = useTransactionStore()

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
