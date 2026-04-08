import { create } from 'zustand'
import type { Transaction, InvestmentRecord, AppSettings } from '@/types'
import {
  getAllTransactions,
  upsertTransactions,
  updateTransaction as dbUpdateTransaction,
  getAllInvestments,
  upsertInvestments,
  getSettings,
  saveSettings,
  getExistingFITIDs,
  clearAllTransactions,
} from '@/lib/db'
import { linkTransactions } from '@/lib/ofx/linker'

interface TransactionStore {
  transactions: Transaction[]
  investments: InvestmentRecord[]
  settings: AppSettings
  loaded: boolean

  // Carrega tudo do IndexedDB
  load: () => Promise<void>

  // Importação: recebe transações já classificadas, faz dedup, persiste e linka
  importTransactions: (
    incoming: Omit<Transaction, 'importedAt'>[],
  ) => Promise<{ added: number; duplicates: number }>

  // Atualiza categoria de uma transação manualmente
  updateCategory: (id: string, category: string) => Promise<void>

  // Atualiza settings
  updateSettings: (settings: AppSettings) => Promise<void>

  // Limpa todos os dados (util para reset)
  clearAll: () => Promise<void>

  // IDs existentes para dedup no preview
  existingFITIDs: () => Set<string>
}

export const useTransactionStore = create<TransactionStore>((set, get) => ({
  transactions: [],
  investments: [],
  settings: { internalNames: [], customCategoryRules: [] },
  loaded: false,

  load: async () => {
    const [transactions, investments, settings] = await Promise.all([
      getAllTransactions(),
      getAllInvestments(),
      getSettings(),
    ])
    set({ transactions, investments, settings, loaded: true })
  },

  importTransactions: async (incoming) => {
    const existing = await getExistingFITIDs()
    const now = new Date().toISOString()

    const newItems: Transaction[] = []
    let duplicates = 0

    for (const t of incoming) {
      if (existing.has(t.id)) {
        duplicates++
        continue
      }
      newItems.push({ ...t, importedAt: now })
    }

    if (newItems.length === 0) return { added: 0, duplicates }

    // Combina com os já existentes para linkar
    const currentTransactions = get().transactions
    const allForLinking = [...currentTransactions, ...newItems]
    const linked = linkTransactions(allForLinking)

    // Persiste apenas os novos (já linkados) — atualiza também os existentes afetados pelo linking
    const toUpsert = linked.filter((t) => {
      const original = currentTransactions.find((c) => c.id === t.id)
      // Novo ou teve linkedId adicionado
      return !original || original.linkedId !== t.linkedId || original.status !== t.status
    })

    await upsertTransactions(toUpsert)

    // Investimentos: extrai dos novos
    const invRecords: InvestmentRecord[] = newItems
      .filter(
        (t) => t.type === 'investment_application' || t.type === 'investment_withdrawal',
      )
      .map((t) => ({
        id: t.id,
        date: t.date,
        type: t.type === 'investment_application' ? 'application' : 'withdrawal',
        amount: Math.abs(t.amount),
        product: extractProduct(t.memo),
      }))

    if (invRecords.length > 0) await upsertInvestments(invRecords)

    set({
      transactions: linked,
      investments: [...get().investments, ...invRecords.filter((i) => !get().investments.find((e) => e.id === i.id))],
    })

    return { added: newItems.length, duplicates }
  },

  updateCategory: async (id, category) => {
    const tx = get().transactions.find((t) => t.id === id)
    if (!tx) return
    const updated: Transaction = { ...tx, category, manualCategory: true }
    await dbUpdateTransaction(updated)
    set((s) => ({
      transactions: s.transactions.map((t) => (t.id === id ? updated : t)),
    }))
  },

  updateSettings: async (settings) => {
    await saveSettings(settings)
    set({ settings })
  },

  clearAll: async () => {
    await clearAllTransactions()
    set({ transactions: [], investments: [] })
  },

  existingFITIDs: () => new Set(get().transactions.map((t) => t.id)),
}))

function extractProduct(memo: string): string {
  if (/rdb/i.test(memo)) return 'RDB'
  if (/cdb/i.test(memo)) return 'CDB'
  if (/lci/i.test(memo)) return 'LCI'
  return 'Investimento'
}
