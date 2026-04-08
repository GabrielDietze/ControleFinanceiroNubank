export type TransactionSource = 'account' | 'credit_card'

export type TransactionType =
  | 'income'
  | 'expense'
  | 'reimbursement'
  | 'investment_application'
  | 'investment_withdrawal'
  | 'card_payment'
  | 'internal_transfer'

export type TransactionStatus = 'active' | 'cancelled' | 'neutral'

export interface Transaction {
  id: string // FITID
  source: TransactionSource
  type: TransactionType
  date: string // ISO date string
  amount: number // positivo = entrada, negativo = saída
  memo: string
  rawMemo: string
  category: string
  manualCategory: boolean
  linkedId?: string // FITID do par (pagamento de fatura / reembolso)
  status: TransactionStatus
  importedAt: string // ISO timestamp
}

export interface InvestmentRecord {
  id: string // FITID
  date: string
  type: 'application' | 'withdrawal'
  amount: number // sempre positivo
  product: string // "RDB", etc.
}

export interface CategoryRule {
  id: string
  pattern: string // regex ou substring (case-insensitive)
  category: string
  isRegex: boolean
}

export interface CategoryBudget {
  category: string
  limit: number // limite mensal em R$
}

export interface AppSettings {
  internalNames: string[] // CPFs/CNPJs/nomes marcados como transferência interna
  customCategoryRules: CategoryRule[]
  customCategories: string[] // categorias adicionadas pelo usuário
  savingsGoal: number // percentual de poupança desejado (padrão: 20)
  budgets: CategoryBudget[] // metas mensais por categoria
}

// Resultado do parse de um arquivo OFX
export interface OFXParseResult {
  fileType: 'account' | 'credit_card'
  accountId: string
  currency: string
  dateStart: string
  dateEnd: string
  transactions: RawOFXTransaction[]
}

export interface RawOFXTransaction {
  fitid: string
  trntype: 'DEBIT' | 'CREDIT'
  dtposted: string
  trnamt: number
  memo: string
}

// Para a tela de preview antes de importar
export interface ImportPreviewItem {
  raw: RawOFXTransaction
  classified: Omit<Transaction, 'importedAt'>
  isDuplicate: boolean
}
