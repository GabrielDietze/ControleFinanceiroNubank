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

// ────────────────────────── Settings ──────────────────────────

const SETTINGS_KEY = 'app-settings'

const defaultSettings: AppSettings = {
  internalNames: [],
  customCategoryRules: [],
}

export async function getSettings(): Promise<AppSettings> {
  const db = await getDB()
  const record = await db.get('settings', SETTINGS_KEY)
  return record?.data ?? defaultSettings
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDB()
  await db.put('settings', { id: SETTINGS_KEY, data: settings })
}
