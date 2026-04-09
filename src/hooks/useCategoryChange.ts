import { toast } from 'sonner'
import { useTransactionStore } from '@/store/useTransactionStore'

export function useCategoryChange() {
  const { updateCategory, addLearnedRule } = useTransactionStore()

  const handleCategoryChange = async (id: string, category: string) => {
    const result = await updateCategory(id, category)
    if (result && !result.alreadyHasRule) {
      const { pattern } = result
      const label = pattern.length > 40 ? pattern.slice(0, 40) + '…' : pattern
      toast(`Criar regra para "${label}"?`, {
        description: `Futuras transações serão classificadas como "${category}" automaticamente.`,
        duration: 10000,
        action: {
          label: 'Criar regra',
          onClick: () => addLearnedRule(pattern, category),
        },
        cancel: {
          label: 'Não',
          onClick: () => {},
        },
      })
    }
  }

  return { handleCategoryChange }
}
