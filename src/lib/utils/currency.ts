export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatCurrencyShort(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1000) {
    return (value < 0 ? '-' : '') + 'R$ ' + (abs / 1000).toFixed(1) + 'k'
  }
  return formatCurrency(value)
}
