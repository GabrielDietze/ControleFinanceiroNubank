import { openDB, type IDBPDatabase } from 'idb'
import type { Transaction, InvestmentRecord, AppSettings } from '@/types'

const DB_NAME = 'financeiro-nubank'
const DB_VERSION = 1

export interface FinanceDB {
  transactions: {
    key: string
    value: Transaction
    indexes: { 'by-date': string; 'by-source': string; 'by-type': string }
  }
  investments: {
    key: string
    value: InvestmentRecord
    indexes: { 'by-date': string }
  }
  settings: {
    key: string
    value: { id: string; data: AppSettings }
  }
}

let dbPromise: Promise<IDBPDatabase<FinanceDB>> | null = null

export function getDB(): Promise<IDBPDatabase<FinanceDB>> {
  if (!dbPromise) {
    dbPromise = openDB<FinanceDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Transactions store
        const txStore = db.createObjectStore('transactions', { keyPath: 'id' })
        txStore.createIndex('by-date', 'date')
        txStore.createIndex('by-source', 'source')
        txStore.createIndex('by-type', 'type')

        // Investments store
        const invStore = db.createObjectStore('investments', { keyPath: 'id' })
        invStore.createIndex('by-date', 'date')

        // Settings store
        db.createObjectStore('settings', { keyPath: 'id' })
      },
    })
  }
  return dbPromise
}

// ────────────────────────── Transactions ──────────────────────────

export async function getAllTransactions(): Promise<Transaction[]> {
  const db = await getDB()
  return db.getAll('transactions')
}

export async function getTransactionById(id: string): Promise<Transaction | undefined> {
  const db = await getDB()
  return db.get('transactions', id)
}

export async function upsertTransactions(items: Transaction[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('transactions', 'readwrite')
  await Promise.all([...items.map((t) => tx.store.put(t)), tx.done])
}

export async function updateTransaction(t: Transaction): Promise<void> {
  const db = await getDB()
  await db.put('transactions', t)
}

export async function getExistingFITIDs(): Promise<Set<string>> {
  const db = await getDB()
  const keys = await db.getAllKeys('transactions')
  return new Set(keys as string[])
}

export async function clearAllTransactions(): Promise<void> {
  const db = await getDB()
  await db.clear('transactions')
}

// ────────────────────────── Investments ──────────────────────────

export async function getAllInvestments(): Promise<InvestmentRecord[]> {
  const db = await getDB()
  return db.getAll('investments')
}

export async function upsertInvestments(items: InvestmentRecord[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('investments', 'readwrite')
  await Promise.all([...items.map((i) => tx.store.put(i)), tx.done])
}

export async function deleteInvestment(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('investments', id)
}

// ────────────────────────── Settings ──────────────────────────

const SETTINGS_KEY = 'app-settings'

const defaultSettings: AppSettings = {
  internalNames: [],
  customCategoryRules: [],
  customCategories: [],
  savingsGoal: 20,
  budgets: [],
}

export async function getSettings(): Promise<AppSettings> {
  const db = await getDB()
  const record = await db.get('settings', SETTINGS_KEY)
  // Merge with defaults so new fields always exist, even for users com settings antigas
  return { ...defaultSettings, ...(record?.data ?? {}) }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDB()
  await db.put('settings', { id: SETTINGS_KEY, data: settings })
}

// ────────────────────────── Export / Import ──────────────────────────

export interface ExportData {
  version: 1
  exportedAt: string
  transactions: Transaction[]
  investments: InvestmentRecord[]
  settings: AppSettings
}

export async function exportData(): Promise<ExportData> {
  const [transactions, investments, settings] = await Promise.all([
    getAllTransactions(),
    getAllInvestments(),
    getSettings(),
  ])
  return { version: 1, exportedAt: new Date().toISOString(), transactions, investments, settings }
}

export async function importData(
  data: ExportData,
): Promise<{ addedTransactions: number; addedInvestments: number }> {
  const existingTxIds = await getExistingFITIDs()

  const newTransactions = data.transactions.filter((t) => !existingTxIds.has(t.id))
  const existingInvIds = new Set((await getAllInvestments()).map((i) => i.id))
  const newInvestments = data.investments.filter((i) => !existingInvIds.has(i.id))

  const db = await getDB()

  if (newTransactions.length > 0) {
    const tx = db.transaction('transactions', 'readwrite')
    await Promise.all([...newTransactions.map((t) => tx.store.put(t)), tx.done])
  }

  if (newInvestments.length > 0) {
    const tx = db.transaction('investments', 'readwrite')
    await Promise.all([...newInvestments.map((i) => tx.store.put(i)), tx.done])
  }

  // Settings: merge — preserva regras locais que não estejam no arquivo
  const currentSettings = await getSettings()
  const mergedSettings: AppSettings = {
    ...currentSettings,
    internalNames: Array.from(new Set([...currentSettings.internalNames, ...(data.settings.internalNames ?? [])])),
    customCategoryRules: [
      ...currentSettings.customCategoryRules,
      ...(data.settings.customCategoryRules ?? []).filter(
        (r) => !currentSettings.customCategoryRules.find((c) => c.id === r.id),
      ),
    ],
    customCategories: Array.from(new Set([
      ...(currentSettings.customCategories ?? []),
      ...(data.settings.customCategories ?? []),
    ])),
  }
  await saveSettings(mergedSettings)

  return { addedTransactions: newTransactions.length, addedInvestments: newInvestments.length }
}
