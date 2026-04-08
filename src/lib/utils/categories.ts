import type { CategoryRule } from '@/types'

export const DEFAULT_CATEGORIES = [
  'Alimentação',
  'Farmácia / Saúde',
  'Transporte',
  'Assinaturas',
  'Academia / Bem-estar',
  'Vestuário',
  'Salário / Renda',
  'Outros recebimentos',
  'Transferências pessoais',
  'Investimentos',
  'Fatura cartão',
  'Outros',
] as const

// Regras padrão: ordem importa (primeiro match vence)
export const DEFAULT_CATEGORY_RULES: CategoryRule[] = [
  // Alimentação
  { id: 'r-alim-1', pattern: 'restaurante', category: 'Alimentação', isRegex: false },
  { id: 'r-alim-2', pattern: 'cantina', category: 'Alimentação', isRegex: false },
  { id: 'r-alim-3', pattern: 'lanche', category: 'Alimentação', isRegex: false },
  { id: 'r-alim-4', pattern: 'ifood', category: 'Alimentação', isRegex: false },
  { id: 'r-alim-5', pattern: 'rappi', category: 'Alimentação', isRegex: false },
  { id: 'r-alim-6', pattern: 'uber eats', category: 'Alimentação', isRegex: false },
  { id: 'r-alim-7', pattern: 'padaria', category: 'Alimentação', isRegex: false },
  { id: 'r-alim-8', pattern: 'pizza', category: 'Alimentação', isRegex: false },
  { id: 'r-alim-9', pattern: 'sabor', category: 'Alimentação', isRegex: false },
  { id: 'r-alim-10', pattern: 'mercado', category: 'Alimentação', isRegex: false },
  { id: 'r-alim-11', pattern: 'supermercado', category: 'Alimentação', isRegex: false },
  // Farmácia
  { id: 'r-farm-1', pattern: 'raia', category: 'Farmácia / Saúde', isRegex: false },
  { id: 'r-farm-2', pattern: 'drogasil', category: 'Farmácia / Saúde', isRegex: false },
  { id: 'r-farm-3', pattern: 'farmácia', category: 'Farmácia / Saúde', isRegex: false },
  { id: 'r-farm-4', pattern: 'farmacia', category: 'Farmácia / Saúde', isRegex: false },
  { id: 'r-farm-5', pattern: 'drogaria', category: 'Farmácia / Saúde', isRegex: false },
  { id: 'r-farm-6', pattern: 'araujo', category: 'Farmácia / Saúde', isRegex: false },
  // Transporte
  { id: 'r-transp-1', pattern: 'uber', category: 'Transporte', isRegex: false },
  { id: 'r-transp-2', pattern: '99app', category: 'Transporte', isRegex: false },
  { id: 'r-transp-3', pattern: 'taxi', category: 'Transporte', isRegex: false },
  { id: 'r-transp-4', pattern: 'gasolina', category: 'Transporte', isRegex: false },
  { id: 'r-transp-5', pattern: 'combustível', category: 'Transporte', isRegex: false },
  { id: 'r-transp-6', pattern: 'estacionamento', category: 'Transporte', isRegex: false },
  // Assinaturas
  { id: 'r-sign-1', pattern: 'apple', category: 'Assinaturas', isRegex: false },
  { id: 'r-sign-2', pattern: 'google', category: 'Assinaturas', isRegex: false },
  { id: 'r-sign-3', pattern: 'netflix', category: 'Assinaturas', isRegex: false },
  { id: 'r-sign-4', pattern: 'spotify', category: 'Assinaturas', isRegex: false },
  { id: 'r-sign-5', pattern: 'youtube', category: 'Assinaturas', isRegex: false },
  { id: 'r-sign-6', pattern: 'prime', category: 'Assinaturas', isRegex: false },
  { id: 'r-sign-7', pattern: 'disney', category: 'Assinaturas', isRegex: false },
  // Academia
  { id: 'r-gym-1', pattern: 'wellhub', category: 'Academia / Bem-estar', isRegex: false },
  { id: 'r-gym-2', pattern: 'gym', category: 'Academia / Bem-estar', isRegex: false },
  { id: 'r-gym-3', pattern: 'academia', category: 'Academia / Bem-estar', isRegex: false },
  // Vestuário
  { id: 'r-vest-1', pattern: 'ternos', category: 'Vestuário', isRegex: false },
  { id: 'r-vest-2', pattern: 'roupa', category: 'Vestuário', isRegex: false },
  { id: 'r-vest-3', pattern: 'moda', category: 'Vestuário', isRegex: false },
  // Salário
  { id: 'r-sal-1', pattern: 'CBF INDUSTRIA', category: 'Salário / Renda', isRegex: false },
]

export function categorizeByMemo(memo: string, extraRules: CategoryRule[] = []): string {
  const lower = memo.toLowerCase()
  const allRules = [...extraRules, ...DEFAULT_CATEGORY_RULES]

  for (const rule of allRules) {
    if (rule.isRegex) {
      try {
        if (new RegExp(rule.pattern, 'i').test(memo)) return rule.category
      } catch {
        // regex inválida, ignora
      }
    } else {
      if (lower.includes(rule.pattern.toLowerCase())) return rule.category
    }
  }

  return 'Outros'
}
