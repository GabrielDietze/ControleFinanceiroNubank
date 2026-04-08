import type { OFXParseResult, RawOFXTransaction } from '@/types'

/**
 * Parse um arquivo OFX (SGML, não XML) do Nubank.
 * Suporta dois formatos:
 *  - Conta corrente: BANKMSGSRSV1 / STMTTRNRS
 *  - Cartão de crédito: CREDITCARDMSGSRSV1 / CCSTMTTRNRS
 */
export function parseOFX(raw: string): OFXParseResult {
  // Normaliza quebras de linha
  const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  const isCard = /<CREDITCARDMSGSRSV1/i.test(text)
  const fileType: 'account' | 'credit_card' = isCard ? 'credit_card' : 'account'

  const accountId = isCard
    ? extractTag(text, 'ACCTID') ?? 'cartao'
    : `${extractTag(text, 'BANKID') ?? ''}-${extractTag(text, 'ACCTID') ?? ''}`

  const currency = extractTag(text, 'CURDEF') ?? 'BRL'
  const dateStart = parseOFXDate(extractTag(text, 'DTSTART') ?? '')
  const dateEnd = parseOFXDate(extractTag(text, 'DTEND') ?? '')

  const transactions = extractTransactions(text)

  return { fileType, accountId, currency, dateStart, dateEnd, transactions }
}

function extractTransactions(text: string): RawOFXTransaction[] {
  const results: RawOFXTransaction[] = []

  // Pega cada bloco <STMTTRN>...</STMTTRN>
  const trnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi
  let match: RegExpExecArray | null

  while ((match = trnRegex.exec(text)) !== null) {
    const block = match[1]

    const trntype = (extractTag(block, 'TRNTYPE') ?? 'DEBIT').toUpperCase() as 'DEBIT' | 'CREDIT'
    const dtposted = parseOFXDate(extractTag(block, 'DTPOSTED') ?? '')
    const trnamt = parseFloat(extractTag(block, 'TRNAMT') ?? '0')
    const fitid = extractTag(block, 'FITID') ?? crypto.randomUUID()
    const memo = decodeOFXText(extractTag(block, 'MEMO') ?? '')

    results.push({ fitid, trntype, dtposted, trnamt, memo })
  }

  return results
}

/** Extrai o valor de uma tag SGML simples: <TAG>valor */
function extractTag(text: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}>([^<\\n]+)`, 'i')
  const match = regex.exec(text)
  return match ? match[1].trim() : null
}

/**
 * Converte data OFX para ISO string (YYYY-MM-DD).
 * Formatos: 20260301000000[-3:BRT] ou 20260301
 */
export function parseOFXDate(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '').slice(0, 8)
  if (digits.length < 8) return new Date().toISOString().slice(0, 10)
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
}

/** Decodifica entidades HTML simples que podem aparecer em MEMOs */
function decodeOFXText(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
    .trim()
}
