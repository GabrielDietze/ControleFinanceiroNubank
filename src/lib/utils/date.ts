import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatDate(isoDate: string): string {
  return format(parseISO(isoDate), 'dd/MM/yyyy', { locale: ptBR })
}

export function formatMonth(isoDate: string): string {
  return format(parseISO(isoDate), 'MMM/yyyy', { locale: ptBR })
}

export function formatMonthFull(isoDate: string): string {
  return format(parseISO(isoDate), 'MMMM yyyy', { locale: ptBR })
}

export function currentMonthStart(): string {
  return startOfMonth(new Date()).toISOString().slice(0, 10)
}

export function currentMonthEnd(): string {
  return endOfMonth(new Date()).toISOString().slice(0, 10)
}

export function monthsBack(n: number): string {
  return subMonths(new Date(), n).toISOString().slice(0, 10)
}

export function isoMonthOf(isoDate: string): string {
  return isoDate.slice(0, 7) // YYYY-MM
}

export function monthLabel(yyyymm: string): string {
  return format(parseISO(`${yyyymm}-01`), 'MMM/yy', { locale: ptBR })
}
