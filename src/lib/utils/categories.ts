import type { CategoryRule } from '@/types'

export const DEFAULT_CATEGORIES = [
  'Alimentação',
  'Moradia',
  'Saúde',
  'Educação',
  'Farmácia',
  'Transporte',
  'Assinaturas',
  'Academia / Bem-estar',
  'Beleza / Barbearia',
  'Vestuário',
  'Jogos',
  'Compras Online',
  'Entretenimento',
  'Viagens',
  'Pets',
  'Telecom',
  'Pisicologa',
  'Atlético Mineiro',
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
  { id: 'r-alim-4', pattern: 'lanchonete', category: 'Alimentação', isRegex: false },
  { id: 'r-alim-5', pattern: 'ifood', category: 'Alimentação', isRegex: false },
  { id: 'r-alim-6', pattern: 'rappi', category: 'Alimentação', isRegex: false },
  { id: 'r-alim-7', pattern: 'uber eats', category: 'Alimentação', isRegex: false },
  { id: 'r-alim-8', pattern: 'padaria', category: 'Alimentação', isRegex: false },
  { id: 'r-alim-9', pattern: 'pizza', category: 'Alimentação', isRegex: false },
  { id: 'r-alim-10', pattern: 'sabor', category: 'Alimentação', isRegex: false },
  { id: 'r-comp-1', pattern: 'mercado livre', category: 'Compras Online', isRegex: false },
  { id: 'r-alim-11', pattern: 'mercado', category: 'Alimentação', isRegex: false },
  { id: 'r-alim-12', pattern: 'supermercado', category: 'Alimentação', isRegex: false },
  { id: 'r-alim-13', pattern: 'churras', category: 'Alimentação', isRegex: false },
  { id: 'r-alim-14', pattern: 'burger', category: 'Alimentação', isRegex: false },
  { id: 'r-alim-15', pattern: 'burguer', category: 'Alimentação', isRegex: false },
  { id: 'r-alim-16', pattern: 'bebidas', category: 'Alimentação', isRegex: false },
  { id: 'r-alim-17', pattern: '\\bbar\\b', category: 'Alimentação', isRegex: true },
  // Moradia
  { id: 'r-mor-1', pattern: 'aluguel', category: 'Moradia', isRegex: false },
  { id: 'r-mor-2', pattern: 'condominio', category: 'Moradia', isRegex: false },
  { id: 'r-mor-3', pattern: 'condomínio', category: 'Moradia', isRegex: false },
  { id: 'r-mor-4', pattern: 'iptu', category: 'Moradia', isRegex: false },
  { id: 'r-mor-5', pattern: 'energia eletrica', category: 'Moradia', isRegex: false },
  { id: 'r-mor-6', pattern: 'energia elétrica', category: 'Moradia', isRegex: false },
  { id: 'r-mor-7', pattern: 'copasa', category: 'Moradia', isRegex: false },
  { id: 'r-mor-8', pattern: 'cemig', category: 'Moradia', isRegex: false },
  { id: 'r-mor-9', pattern: 'sabesp', category: 'Moradia', isRegex: false },
  { id: 'r-mor-10', pattern: 'agua e esgoto', category: 'Moradia', isRegex: false },
  // Saúde
  { id: 'r-sau-1', pattern: 'hospital', category: 'Saúde', isRegex: false },
  { id: 'r-sau-2', pattern: 'clinica', category: 'Saúde', isRegex: false },
  { id: 'r-sau-3', pattern: 'clínica', category: 'Saúde', isRegex: false },
  { id: 'r-sau-4', pattern: 'medico', category: 'Saúde', isRegex: false },
  { id: 'r-sau-5', pattern: 'médico', category: 'Saúde', isRegex: false },
  { id: 'r-sau-6', pattern: 'dentista', category: 'Saúde', isRegex: false },
  { id: 'r-sau-7', pattern: 'odonto', category: 'Saúde', isRegex: false },
  { id: 'r-sau-8', pattern: 'plano de saude', category: 'Saúde', isRegex: false },
  { id: 'r-sau-9', pattern: 'plano de saúde', category: 'Saúde', isRegex: false },
  { id: 'r-sau-10', pattern: 'unimed', category: 'Saúde', isRegex: false },
  { id: 'r-sau-11', pattern: 'amil', category: 'Saúde', isRegex: false },
  { id: 'r-sau-12', pattern: 'hapvida', category: 'Saúde', isRegex: false },
  // Educação
  { id: 'r-edu-1', pattern: 'faculdade', category: 'Educação', isRegex: false },
  { id: 'r-edu-2', pattern: 'universidade', category: 'Educação', isRegex: false },
  { id: 'r-edu-3', pattern: 'escola', category: 'Educação', isRegex: false },
  { id: 'r-edu-4', pattern: 'curso', category: 'Educação', isRegex: false },
  { id: 'r-edu-5', pattern: 'udemy', category: 'Educação', isRegex: false },
  { id: 'r-edu-6', pattern: 'alura', category: 'Educação', isRegex: false },
  { id: 'r-edu-7', pattern: 'rocketseat', category: 'Educação', isRegex: false },
  { id: 'r-edu-8', pattern: 'livraria', category: 'Educação', isRegex: false },
  // Farmácia
  { id: 'r-farm-1', pattern: 'raia', category: 'Farmácia', isRegex: false },
  { id: 'r-farm-2', pattern: 'drogasil', category: 'Farmácia', isRegex: false },
  { id: 'r-farm-3', pattern: 'farmácia', category: 'Farmácia', isRegex: false },
  { id: 'r-farm-4', pattern: 'farmacia', category: 'Farmácia', isRegex: false },
  { id: 'r-farm-5', pattern: 'droga', category: 'Farmácia', isRegex: false },
  { id: 'r-farm-6', pattern: 'araujo', category: 'Farmácia', isRegex: false },
  // Transporte
  { id: 'r-transp-1', pattern: 'uber', category: 'Transporte', isRegex: false },
  { id: 'r-transp-2', pattern: '99 - nupay', category: 'Transporte', isRegex: false },
  { id: 'r-transp-3', pattern: '99app', category: 'Transporte', isRegex: false },
  { id: 'r-transp-4', pattern: 'taxi', category: 'Transporte', isRegex: false },
  { id: 'r-transp-5', pattern: 'gasolina', category: 'Transporte', isRegex: false },
  { id: 'r-transp-6', pattern: 'combustível', category: 'Transporte', isRegex: false },
  { id: 'r-transp-7', pattern: 'estacionamento', category: 'Transporte', isRegex: false },
  // Assinaturas
  { id: 'r-sign-1', pattern: 'apple', category: 'Assinaturas', isRegex: false },
  { id: 'r-sign-2', pattern: 'google', category: 'Assinaturas', isRegex: false },
  { id: 'r-sign-3', pattern: 'netflix', category: 'Assinaturas', isRegex: false },
  { id: 'r-sign-4', pattern: 'spotify', category: 'Assinaturas', isRegex: false },
  { id: 'r-sign-5', pattern: 'youtube', category: 'Assinaturas', isRegex: false },
  { id: 'r-sign-6', pattern: 'prime', category: 'Assinaturas', isRegex: false },
  { id: 'r-sign-7', pattern: 'disney', category: 'Assinaturas', isRegex: false },
  { id: 'r-sign-8', pattern: 'playstat', category: 'Assinaturas', isRegex: false },
  { id: 'r-sign-9', pattern: 'sony', category: 'Jogos', isRegex: false },
  { id: 'r-sign-10', pattern: 'claude.ai', category: 'Assinaturas', isRegex: false },
  { id: 'r-sign-11', pattern: 'livecareer', category: 'Assinaturas', isRegex: false },
  // Academia
  { id: 'r-gym-1', pattern: 'wellhub', category: 'Academia / Bem-estar', isRegex: false },
  { id: 'r-gym-2', pattern: 'gym', category: 'Academia / Bem-estar', isRegex: false },
  { id: 'r-gym-3', pattern: 'academia', category: 'Academia / Bem-estar', isRegex: false },
  // Beleza / Barbearia
  { id: 'r-bel-1', pattern: 'barbearia', category: 'Beleza / Barbearia', isRegex: false },
  { id: 'r-bel-2', pattern: 'salao', category: 'Beleza / Barbearia', isRegex: false },
  { id: 'r-bel-3', pattern: 'salão', category: 'Beleza / Barbearia', isRegex: false },
  // Vestuário
  { id: 'r-vest-1', pattern: 'ternos', category: 'Vestuário', isRegex: false },
  { id: 'r-vest-2', pattern: 'roupa', category: 'Vestuário', isRegex: false },
  { id: 'r-vest-3', pattern: 'moda', category: 'Vestuário', isRegex: false },
  // Entretenimento
  { id: 'r-ent-1', pattern: 'sympla', category: 'Entretenimento', isRegex: false },
  { id: 'r-ent-2', pattern: 'entretenimento', category: 'Entretenimento', isRegex: false },
  { id: 'r-ent-3', pattern: 'show', category: 'Entretenimento', isRegex: false },
  { id: 'r-ent-4', pattern: 'bilheteria', category: 'Entretenimento', isRegex: false },
  { id: 'r-ent-5', pattern: 'balada', category: 'Entretenimento', isRegex: false },
  { id: 'r-ent-6', pattern: 'night market', category: 'Entretenimento', isRegex: false },
  // Viagens
  { id: 'r-viag-1', pattern: 'airbnb', category: 'Viagens', isRegex: false },
  // Pets
  { id: 'r-pet-1', pattern: 'petz', category: 'Pets', isRegex: false },
  { id: 'r-pet-2', pattern: 'petshop', category: 'Pets', isRegex: false },
  { id: 'r-pet-3', pattern: 'pet shop', category: 'Pets', isRegex: false },
  { id: 'r-pet-4', pattern: 'formula animal', category: 'Pets', isRegex: false },
  // Telecom
  { id: 'r-tel-1', pattern: 'nucel', category: 'Telecom', isRegex: false },
  { id: 'r-tel-2', pattern: 'plano nu', category: 'Telecom', isRegex: false },
  { id: 'r-tel-3', pattern: 'vivo', category: 'Telecom', isRegex: false },
  { id: 'r-tel-4', pattern: 'claro', category: 'Telecom', isRegex: false },
  { id: 'r-tel-5', pattern: 'tim ', category: 'Telecom', isRegex: false },
  // Salário
  { id: 'r-sal-1', pattern: 'CBF INDUSTRIA', category: 'Salário / Renda', isRegex: false },
  { id: 'r-sal-2', pattern: 'GABRIEL AUGUSTO DIETZE NOVY', category: 'Salário / Renda', isRegex: false },
  // Telecom — recargas
  { id: 'r-tel-6', pattern: 'recarga de celular', category: 'Telecom', isRegex: false },
  // Transporte — pedágio (CCR/Infopago) e ônibus
  { id: 'r-transp-8', pattern: 'infopago', category: 'Transporte', isRegex: false },
  { id: 'r-transp-9', pattern: 'buser', category: 'Transporte', isRegex: false },
  // Viagens
  { id: 'r-viag-2', pattern: 'localiza', category: 'Viagens', isRegex: false },
  { id: 'r-viag-3', pattern: 'latam', category: 'Viagens', isRegex: false },
  // Compras Online
  { id: 'r-comp-2', pattern: 'amazon', category: 'Compras Online', isRegex: false },
  { id: 'r-comp-3', pattern: 'kabum', category: 'Compras Online', isRegex: false },
  { id: 'r-comp-4', pattern: 'magalupay', category: 'Compras Online', isRegex: false },
  { id: 'r-comp-5', pattern: 'shpp brasil', category: 'Compras Online', isRegex: false },
  // Alimentação — estabelecimentos identificados
  { id: 'r-alim-18', pattern: 'pracadosamores', category: 'Alimentação', isRegex: false },
  // Entretenimento
  { id: 'r-ent-7', pattern: 'arena mrv', category: 'Entretenimento', isRegex: false },
  // Academia / Bem-estar
  { id: 'r-gym-4', pattern: 'fisia', category: 'Academia / Bem-estar', isRegex: false },
  // Educação
  { id: 'r-edu-9', pattern: 'sociedade educacional', category: 'Educação', isRegex: false },
  { id: 'r-edu-10', pattern: 'luana macintyre', category: 'Educação', isRegex: false },
  // Transferências para familiar (conta empresarial da mãe)
  { id: 'r-fam-1', pattern: 'bianca cosmeticos', category: 'Transferências pessoais', isRegex: false },
  // Pets — veterinário/petshop identificados
  { id: 'r-pet-5', pattern: 'jamag', category: 'Pets', isRegex: false },
  // Psicóloga
  { id: 'r-psi-1', pattern: 'eliatriz', category: 'Pisicologa', isRegex: false },
  // Atlético Mineiro — ingressos via Okto
  { id: 'r-atm-1', pattern: 'okto', category: 'Atlético Mineiro', isRegex: false },
]

/**
 * Extrai o padrão mais útil do memo para criar uma regra aprendida.
 * - PIX: extrai o nome da pessoa/empresa (entre o primeiro e segundo " - ")
 * - Outros: usa o memo completo
 */
export function extractLearnedPattern(memo: string): string {
  // "Transferência recebida pelo Pix - NOME - •••..." ou "Transferência Recebida - NOME - •••..."
  const pixMatch = memo.match(/transfer[eê]ncia\s+\w+(?:\s+pelo\s+pix)?\s+-\s+(.+?)\s+-\s+[•\d]/i)
  if (pixMatch) return pixMatch[1].trim()
  return memo
}

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
