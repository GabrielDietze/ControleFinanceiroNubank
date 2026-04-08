import type { RawOFXTransaction, Transaction, TransactionType } from '@/types'
import { categorizeByMemo } from '@/lib/utils/categories'
import type { CategoryRule } from '@/types'

interface ClassifyOptions {
  source: 'account' | 'credit_card'
  extraRules?: CategoryRule[]
  internalNames?: string[]
}

/**
 * Classifica uma transação OFX bruta em uma Transaction tipada.
 * Regras:
 *
 * Conta corrente:
 *  - "Aplicação RDB"         → investment_application (neutro)
 *  - "Resgate RDB"           → investment_withdrawal (neutro)
 *  - "Pagamento de fatura"   → card_payment (neutro)
 *  - Transferência enviada   → expense
 *  - Transferência recebida  → income
 *  - Compra no débito        → expense
 *
 * Cartão de crédito:
 *  - "Pagamento recebido"    → card_payment (neutro)
 *  - CREDIT (outros)         → possível reembolso, tratado como income pendente de análise
 *  - DEBIT                   → expense
 */
export function classifyTransaction(
  raw: RawOFXTransaction,
  opts: ClassifyOptions,
): Omit<Transaction, 'importedAt'> {
  const { source, extraRules = [], internalNames = [] } = opts

  let type: TransactionType
  let category = 'Outros'
  let status: Transaction['status'] = 'active'

  if (source === 'account') {
    if (/aplicaç[aã]o rdb/i.test(raw.memo)) {
      type = 'investment_application'
      category = 'Investimentos'
      status = 'neutral'
    } else if (/resgate rdb/i.test(raw.memo)) {
      type = 'investment_withdrawal'
      category = 'Investimentos'
      status = 'neutral'
    } else if (/pagamento de fatura/i.test(raw.memo)) {
      type = 'card_payment'
      category = 'Fatura cartão'
      status = 'neutral'
    } else if (isInternalTransfer(raw.memo, internalNames)) {
      type = 'internal_transfer'
      category = 'Transferências pessoais'
      status = 'neutral'
    } else if (raw.trntype === 'CREDIT') {
      type = 'income'
      category = categorizeByMemo(raw.memo, extraRules)
    } else {
      type = 'expense'
      category = categorizeByMemo(raw.memo, extraRules)
    }
  } else {
    // credit_card
    if (/pagamento recebido/i.test(raw.memo)) {
      type = 'card_payment'
      category = 'Fatura cartão'
      status = 'neutral'
    } else if (raw.trntype === 'CREDIT') {
      // No cartão de crédito não existe receita — valor positivo é sempre reembolso/estorno
      type = 'reimbursement'
      category = 'Outros'
      status = 'neutral'
    } else {
      type = 'expense'
      category = categorizeByMemo(raw.memo, extraRules)
    }
  }

  // Se o amount não bate com o tipo esperado, normaliza o sinal
  // (OFX já traz negativo para débito e positivo para crédito)
  const amount = raw.trnamt

  return {
    id: raw.fitid,
    source,
    type,
    date: raw.dtposted,
    amount,
    memo: raw.memo,
    rawMemo: raw.memo,
    category,
    manualCategory: false,
    status,
  }
}

function isInternalTransfer(memo: string, internalNames: string[]): boolean {
  if (internalNames.length === 0) return false
  const lower = memo.toLowerCase()
  return internalNames.some((name) => lower.includes(name.toLowerCase()))
}

/** Determina se uma transação deve aparecer em relatórios de receita/despesa */
export function isFinanciallyActive(t: Transaction): boolean {
  if (t.status !== 'active') return false
  return t.type === 'income' || t.type === 'expense'
}

/** Retorna o sinal correto para exibição (positivo = receita, negativo = despesa) */
export function displayAmount(t: Transaction): number {
  return t.amount
}

export const TYPE_LABELS: Record<TransactionType, string> = {
  income: 'Receita',
  expense: 'Despesa',
  reimbursement: 'Reembolso',
  investment_application: 'Investimento (aplicação)',
  investment_withdrawal: 'Investimento (resgate)',
  card_payment: 'Pagamento de fatura',
  internal_transfer: 'Transferência interna',
}

