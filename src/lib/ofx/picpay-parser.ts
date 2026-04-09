import type { OFXParseResult, RawOFXTransaction } from '@/types'
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url'

/** Converte nome de mês em português para número (1-12) */
const MONTH_MAP: Record<string, string> = {
  janeiro: '01', fevereiro: '02', março: '03', abril: '04',
  maio: '05', junho: '06', julho: '07', agosto: '08',
  setembro: '09', outubro: '10', novembro: '11', dezembro: '12',
}

/** Parseia "DD de mês YYYY" → "YYYY-MM-DD" */
function parsePtDate(str: string): string | null {
  // Usa [^\s\d]+ para capturar nomes de meses com acentos (e.g. "março")
  const m = str.trim().match(/^(\d{1,2})\s+de\s+([^\s\d]+)\s+(\d{4})$/)
  if (!m) return null
  const day = m[1].padStart(2, '0')
  const month = MONTH_MAP[m[2].toLowerCase()]
  if (!month) return null
  return `${m[3]}-${month}-${day}`
}

/** Parseia "−R$ 1.024,17" ou "+R$ 50,27" → número */
function parsePtAmount(str: string): number {
  // O sinal "−" pode ser U+2212 (minus) ou U+002D (hyphen)
  const negative = str.startsWith('−') || str.startsWith('-')
  const digits = str.replace(/[^0-9,]/g, '').replace(',', '.')
  const val = parseFloat(digits)
  return negative ? -val : val
}

interface TextItem {
  x: number
  y: number
  str: string
}

/** Agrupa items de texto com Y próximo (margem de ±12px), dentro de uma página */
function groupByRow(items: TextItem[]): Map<number, TextItem[]> {
  const rows = new Map<number, TextItem[]>()
  for (const item of items) {
    let matched = false
    for (const [key] of rows) {
      if (Math.abs(item.y - key) <= 12) {
        rows.get(key)!.push(item)
        matched = true
        break
      }
    }
    if (!matched) rows.set(item.y, [item])
  }
  return rows
}

/**
 * Parseia uma lista de TextItems de uma única página e extrai transações.
 * Recebe `currentDate` do estado entre páginas (o extrato pode ter a data no topo de uma
 * página e as transações continuando na mesma).
 */
function parsePageItems(
  items: TextItem[],
  currentDateIn: string,
  seenFitids: Set<string>,
): { transactions: RawOFXTransaction[]; currentDate: string } {
  const transactions: RawOFXTransaction[] = []
  let currentDate = currentDateIn

  const rows = groupByRow(items)

  // Ordena de cima para baixo (Y decrescente em coords PDF — origem no canto inferior esquerdo)
  const sortedYs = Array.from(rows.keys()).sort((a, b) => b - a)

  for (const y of sortedYs) {
    const row = rows.get(y)!.sort((a, b) => a.x - b.x)
    const texts = row.map((r) => r.str)
    const firstX = row[0].x

    // Ignora linhas de cabeçalho, rodapé e identificação do titular
    if (texts.includes('Hora') || texts.includes('Documento emitido em:')) continue
    if (texts.some((t) => /^(Rubens|CPF:|PicPay Serviços|CNPJ:|Dias úteis|Período|Extrato de conta|Saldo final|Agência)/.test(t))) continue
    if (texts.some((t) => /^\d+ de \d+$/.test(t))) continue // "1 de 21"

    // Detecta linha de data do dia: x < 100, texto como "07 de abril 2026"
    const dateStr = texts.find((t) => parsePtDate(t) !== null)
    if (dateStr && firstX < 100) {
      const parsed = parsePtDate(dateStr)
      if (parsed) {
        currentDate = parsed
        continue
      }
    }

    // Detecta transação: primeiro item da linha é hora (HH:MM) com x < 100
    const timeText = row.find((r) => r.x < 100 && /^\d{2}:\d{2}$/.test(r.str))
    if (!timeText || !currentDate) continue

    const time = timeText.str

    // Tipo: x ≈ 121
    const typeItem = row.find((r) => r.x >= 110 && r.x < 230)
    const tipo = typeItem?.str ?? ''

    // Valor: x ≥ 490, contém "R$"
    const valorItem = row.find((r) => r.x >= 490 && /[R\$]/.test(r.str))
    if (!valorItem) continue
    const amount = parsePtAmount(valorItem.str)
    if (isNaN(amount)) continue

    // Destino/origem: x ≈ 243, pode ter mais de um fragmento na mesma linha
    const destItems = row.filter((r) => r.x >= 230 && r.x < 350)
    const memo = destItems.map((r) => r.str).join(' ').trim() || tipo

    const trntype: 'DEBIT' | 'CREDIT' = amount >= 0 ? 'CREDIT' : 'DEBIT'

    // FITID determinístico
    const fitidBase = `picpay-${currentDate}-${time}-${amount}`
    let fitid = fitidBase
    let counter = 1
    while (seenFitids.has(fitid)) fitid = `${fitidBase}-${counter++}`
    seenFitids.add(fitid)

    const fullMemo = tipo && memo !== tipo ? `${tipo} - ${memo}` : memo

    transactions.push({ fitid, trntype, dtposted: currentDate, trnamt: amount, memo: fullMemo })
  }

  return { transactions, currentDate }
}

/**
 * Parseia um PDF de extrato PicPay e retorna OFXParseResult.
 * @param arrayBuffer - conteúdo do arquivo PDF
 */
export async function parsePicPayPDF(arrayBuffer: ArrayBuffer): Promise<OFXParseResult> {
  // Importa pdfjs-dist dinamicamente para não aumentar o bundle inicial
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

  const data = new Uint8Array(arrayBuffer)
  const pdf = await (pdfjsLib as unknown as typeof import('pdfjs-dist')).getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  } as Parameters<typeof import('pdfjs-dist').getDocument>[0]).promise

  const allTransactions: RawOFXTransaction[] = []
  const seenFitids = new Set<string>()
  let currentDate = ''

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()

    const pageItems: TextItem[] = []
    for (const item of content.items) {
      if ('str' in item && item.str.trim()) {
        pageItems.push({
          x: Math.round((item as { transform: number[] }).transform[4]),
          y: Math.round((item as { transform: number[] }).transform[5]),
          str: item.str.trim(),
        })
      }
    }

    const result = parsePageItems(pageItems, currentDate, seenFitids)
    allTransactions.push(...result.transactions)
    currentDate = result.currentDate
  }

  const dates = allTransactions.map((t) => t.dtposted).sort()
  const dateStart = dates[0] ?? new Date().toISOString().slice(0, 10)
  const dateEnd = dates[dates.length - 1] ?? dateStart

  return {
    fileType: 'account',
    accountId: 'picpay',
    currency: 'BRL',
    dateStart,
    dateEnd,
    transactions: allTransactions,
  }
}
