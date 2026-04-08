import type { Transaction } from '@/types'

/**
 * Vincula pagamentos de fatura entre conta corrente e cartão de crédito.
 *
 * Estratégia:
 * 1. Se o FITID de um card_payment na conta corrente existir no cartão → link direto.
 * 2. Fallback: procura "Pagamento recebido" no cartão com mesmo valor absoluto ± 1 dia.
 *
 * Também detecta reembolsos/estornos no cartão:
 * Para cada CREDIT não-pagamento no cartão, tenta encontrar um DEBIT com mesmo valor
 * e MEMO similar (mesmo merchant) → marca ambos como 'cancelled'.
 */
export function linkTransactions(transactions: Transaction[]): Transaction[] {
  const map = new Map<string, Transaction>(transactions.map((t) => [t.id, t]))

  // 1. Link pagamentos de fatura via FITID compartilhado
  for (const t of transactions) {
    if (t.type === 'card_payment' && t.source === 'account') {
      const cardPayment = map.get(t.id)
      if (cardPayment && cardPayment.source === 'credit_card') {
        // Mesmo FITID existe nos dois → já são o mesmo registro, não duplica
        continue
      }

      // Procura no cartão por "Pagamento recebido" com mesmo FITID
      const cardMatch = transactions.find(
        (c) =>
          c.source === 'credit_card' &&
          c.type === 'card_payment' &&
          c.id === t.id,
      )
      if (cardMatch) {
        map.set(t.id, { ...t, linkedId: cardMatch.id })
        map.set(cardMatch.id, { ...cardMatch, linkedId: t.id })
        continue
      }

      // Fallback: mesmo valor absoluto, ± 1 dia
      const tDate = new Date(t.date).getTime()
      const fallback = transactions.find(
        (c) =>
          c.source === 'credit_card' &&
          c.type === 'card_payment' &&
          !c.linkedId &&
          Math.abs(c.amount) === Math.abs(t.amount) &&
          Math.abs(new Date(c.date).getTime() - tDate) <= 86400000,
      )
      if (fallback) {
        map.set(t.id, { ...t, linkedId: fallback.id })
        map.set(fallback.id, { ...fallback, linkedId: t.id })
      }
    }
  }

  // 2. Vincula reembolsos/estornos no cartão à despesa original
  const cardTransactions = transactions.filter((t) => t.source === 'credit_card')
  const reimbursements = cardTransactions.filter((t) => t.type === 'reimbursement')
  const debits = cardTransactions.filter((t) => t.amount < 0 && t.type === 'expense')

  for (const reimb of reimbursements) {
    if (map.get(reimb.id)?.linkedId) continue

    const merchant = extractMerchant(reimb.memo)
    const matchDebit = debits.find(
      (d) =>
        !map.get(d.id)?.linkedId &&
        Math.abs(d.amount) === Math.abs(reimb.amount) &&
        extractMerchant(d.memo) === merchant,
    )
    if (matchDebit) {
      // Herda a categoria da despesa original no reembolso
      const expenseCategory = map.get(matchDebit.id)!.category
      map.set(reimb.id, {
        ...map.get(reimb.id)!,
        status: 'cancelled',
        linkedId: matchDebit.id,
        category: expenseCategory,
      })
      map.set(matchDebit.id, {
        ...map.get(matchDebit.id)!,
        status: 'cancelled',
        linkedId: reimb.id,
      })
    }
  }

  return Array.from(map.values())
}

/** Extrai um identificador de merchant do MEMO (primeiros 2 palavras significativas) */
function extractMerchant(memo: string): string {
  return memo
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .slice(0, 2)
    .join(' ')
    .trim()
}
