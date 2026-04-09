# Análise Completa — Controle Financeiro (Nubank Finance)

> Documento gerado em 2026-04-08. Análise feita sobre o código-fonte real do projeto.
> Stack: React 18 + TypeScript + Vite 5 + Tailwind v4 + shadcn/ui + Zustand + IndexedDB + Recharts 2

---

## Índice

1. [Estrutura atual do sistema](#1-estrutura-atual-do-sistema)
2. [UX — Usabilidade e fluxo](#2-ux--usabilidade-e-fluxo)
3. [UI — Interface e design](#3-ui--interface-e-design)
4. [Controle financeiro — Lógica do sistema](#4-controle-financeiro--lógica-do-sistema)
5. [Bugs identificados](#5-bugs-identificados)
6. [Insights e inteligência financeira](#6-insights-e-inteligência-financeira)
7. [Metas financeiras](#7-metas-financeiras)
8. [Integração com Nubank (fluxo OFX)](#8-integração-com-nubank-fluxo-ofx)
9. [O que está faltando](#9-o-que-está-faltando)
10. [Sugestões práticas e aplicáveis](#10-sugestões-práticas-e-aplicáveis)
11. [Priorização final](#11-priorização-final)
12. [Análise de Dados Avançada — Visão 360°](#12-análise-de-dados-avançada--visão-360)
13. [Frontend — Design para Analytics Intuitivo](#13-frontend--design-para-analytics-intuitivo)

---

## 1. Estrutura atual do sistema

### Páginas existentes

| Página | Rota | Função |
|---|---|---|
| Dashboard | `/` | KPIs, gráficos, insights, top merchants |
| Transações | `/transactions` | Tabela filtrável de todas as transações |
| Categorias | `/categories` | Gráfico + tabela por categoria |
| Investimentos | `/investments` | Histórico e evolução de RDB |
| Importar | `/import` | Upload de arquivo OFX |
| Configurações | `/settings` | Regras, transferências internas, backup |

### Tipos de transação implementados

| Tipo | Código | Status | Aparece nos relatórios? |
|---|---|---|---|
| Receita | `income` | `active` | Sim |
| Despesa | `expense` | `active` | Sim |
| Reembolso/Estorno | `reimbursement` | `neutral` | Não |
| Invest. aplicação | `investment_application` | `neutral` | Não |
| Invest. resgate | `investment_withdrawal` | `neutral` | Não |
| Pagamento de fatura | `card_payment` | `neutral` | Não |
| Transferência interna | `internal_transfer` | `neutral` | Não |

### Arquitetura de dados

- 100% local: IndexedDB via `idb`
- Sem servidor, sem autenticação
- Backup/restore manual via JSON
- Deduplicação por FITID do OFX

---

## 2. UX — Usabilidade e fluxo

### O que funciona bem

- **Fluxo de importação** é excelente: drag-and-drop → preview completo com duplicatas marcadas → confirmação. O usuário nunca importa cego.
- **Filtros na tela de Transações** são completos: mês, tipo, origem (conta/cartão), categoria, status e busca por texto.
- **Classificação automática** funciona on-import, sem esforço do usuário.
- **Empty states** bem implementados: tela de boas-vindas clara ao abrir o app sem dados.

### Problemas de UX

#### Dashboard sobrecarregado
O Dashboard tem **9 seções visuais distintas** numa única scroll:
1. Insights (até 3 banners)
2. 6 KPI cards
3. Gráfico Receitas vs Despesas 6 meses
4. Donut de distribuição de gastos
5. Gastos por Categoria (progress bars)
6. Comparativo vs Mês Anterior (tabela)
7. Top Estabelecimentos
8. Gasto Acumulado no Mês (área)
9. Maiores Gastos do Mês
10. Transações Recentes

Isso é informação demais numa tela só. O usuário que quer saber **rapidamente** "como estou esse mês" precisa scrollar muito para entender o quadro geral.

#### "Transações Recentes" ignora o mês selecionado
O componente usa `transactions` globais e pega os 10 mais recentes de **todos os dados**:
```tsx
// Dashboard.tsx linha 251-259
const recent = useMemo(
  () => [...transactions].filter(isFinanciallyActive)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10),
  [transactions],
)
```
Se o usuário está vendo o dashboard de março/2026, as "Transações Recentes" mostram abril/2026. Isso cria **inconsistência direta** com todos os outros dados da tela que são filtrados pelo mês selecionado.

#### Ausência de feedback de progresso no mês atual
Não existe nenhum indicador do tipo "Você está no dia 8 de 30, gastou X de Y esperado". O usuário não sabe se está acelerado ou no ritmo certo.

#### Tela de Categorias sem filtro de origem
O Dashboard tem filtro Conta/Cartão, a tela de Categorias não tem. Se o usuário quer ver só os gastos do cartão por categoria, não consegue.

#### Configurações expõe complexidade desnecessária
A opção "Regex" para regras de categoria vai aparecer para um usuário comum que não sabe o que é regex. Deveria ser escondida atrás de um "Modo avançado".

---

## 3. UI — Interface e design

### O que funciona bem

- Layout sidebar + main é adequado e direto.
- Cores semânticas: verde para receita, vermelho para despesa, consistentes em todo o app.
- Tipografia e espaçamentos são razoáveis.
- Cards com borders sutis e hover states funcionam bem.

### Problemas de UI

#### 6 KPI cards em linha horizontal
```tsx
<div className="grid grid-cols-6 gap-3">
```
Em resolução menor que ~1400px os cards começam a ficar apertados. "Taxa de Poupança", "Gasto/Dia" e "Ticket Médio" têm valores que podem truncar. Além disso, 6 métricas ao mesmo tempo é carga cognitiva alta — o usuário não processa tudo de uma vez.

**Sugestão:** Reduzir para 4 KPIs principais (Receitas, Despesas, Saldo, Taxa de Poupança) e mover Gasto/Dia e Ticket Médio para uma seção secundária ou tooltip.

#### Gráfico principal com dois eixos Y
O gráfico "Receitas vs Despesas + Saldo (6 meses)" tem eixo Y esquerdo para barras e eixo Y direito para a linha de Saldo. Para um usuário não técnico isso é confuso — dois eixos com escalas diferentes no mesmo gráfico é prática que gera interpretação errada dos dados.

**Sugestão:** Separar em dois gráficos: um bar chart de Receitas/Despesas e um line chart separado para Saldo.

#### Legenda do Donut incompleta
O Donut mostra até top 5 + "Outros" mas a legenda manual embaixo só mostra os primeiros 5:
```tsx
{pieData.slice(0, 5).map(...)
```
"Outros" aparece no gráfico mas não na legenda, sem valor associado.

#### Tela de Categorias com grid 2 colunas fixo
```tsx
<div className="grid grid-cols-2 gap-4">
```
O gráfico de barras horizontais fica espremido quando há muitas categorias (mais de 8), cortando os nomes.

---

## 4. Controle financeiro — Lógica do sistema

### O que está correto e bem implementado

- Separação conta corrente / cartão de crédito por FITID e tipo de arquivo OFX.
- Pagamento de fatura marcado como `neutral` em ambos os lados — evita dupla contagem corretamente.
- Investimentos RDB completamente separados dos gastos — não distorcem receita/despesa.
- Transferências internas via lista configurável de nomes — solução simples e eficaz.
- Detecção de reembolsos/estornos no cartão por `trntype === 'CREDIT'`.

### Problemas de lógica

#### Reembolsos sempre invisíveis
Todo `CREDIT` no cartão vira `reimbursement` com status `neutral`. Isso significa que se o Nubank te devolver dinheiro (cashback, estorno), ele **nunca aparece em nenhum relatório**. Para alguns casos isso é correto (o estorno cancela a compra original), mas para outros — como cashback — é uma receita real que você deveria ver.

O sistema não tem mecanismo para diferenciar "estorno de compra existente" de "crédito novo" (ex: devolução de produto que foi pago meses atrás).

#### calcKPIs soma income incluindo reimbursement?
Não — `isFinanciallyActive` filtra corretamente, só retorna `income` e `expense` com status `active`. Reembolsos ficam fora. Correto.

#### Categoria "Moradia" não existe
As categorias padrão são:
```
Alimentação, Farmácia / Saúde, Transporte, Assinaturas,
Academia / Bem-estar, Beleza / Barbearia, Vestuário,
Entretenimento, Viagens, Pets, Telecom, Salário / Renda,
Outros recebimentos, Transferências pessoais, Investimentos,
Fatura cartão, Outros
```

**"Moradia" (aluguel, condomínio, água, luz, internet residencial) está ausente.** Para a maioria das pessoas, moradia é o maior gasto mensal. Tudo que for aluguel vai para "Outros" a menos que o usuário crie a categoria manualmente e configure regras.

#### Sem controle de parcelamentos
Não existe conceito de parcelas no sistema. Uma compra de R$ 1.200 parcelada em 12x aparece como 12 transações independentes de R$ 100 — sem vínculo entre elas, sem visão de comprometimento futuro.

#### Taxa de poupança com meta hardcoded em 20%
```tsx
if (cur.savingsRate >= 20) {
  list.push({ kind: 'good', msg: `Taxa de poupança de ${...}% — acima da meta de 20%` })
}
```
A meta de 20% está hardcoded no código. O usuário não pode configurar sua própria meta de poupança.

#### Insights limitados a 3 e com lógica básica
```tsx
return list.slice(0, 3)
```
O sistema pode ter 10 insights relevantes mas vai mostrar só 3, sem critério de prioridade claro. E os únicos insights possíveis são: taxa de poupança, categoria que subiu >40%, e maior gasto vs renda.

---

## 5. Bugs identificados

### BUG CRÍTICO: `allCategories` fora de escopo em `TransactionRow`

No arquivo `src/pages/Transactions.tsx`, o componente `TransactionRow` é declarado **fora** de `TransactionsPage`, mas referencia a variável `allCategories` que só existe dentro de `TransactionsPage`:

```tsx
// Linha 269 — dentro de TransactionRow (componente externo):
{allCategories.map((c) => (
  <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
))}
```

`allCategories` está definido com `useMemo` dentro de `TransactionsPage` (linha 26-29). Como `TransactionRow` é uma função declarada fora de `TransactionsPage`, `allCategories` **não está no escopo de `TransactionRow`**.

**Resultado:** Ao clicar em uma categoria para editar na tela de Transações, o app vai lançar `ReferenceError: allCategories is not defined`. A edição de categoria está quebrada.

**Correção:** Passar `allCategories` como prop para `TransactionRow`:
```tsx
// Adicionar na interface de props:
allCategories: string[]

// Passar no uso do componente:
<TransactionRow
  allCategories={allCategories}
  ...
/>
```

### BUG MENOR: Encoding do OFX de cartão

O arquivo OFX de conta corrente usa UTF-8, mas o cartão usa USASCII (Latin-1). O código lê ambos como UTF-8:
```tsx
reader.readAsText(file, 'UTF-8')
```
Caracteres especiais (ç, ã, á) no extrato do cartão podem aparecer corrompidos no memo das transações.

**Correção:** Detectar o encoding via header OFX (`ENCODING:USASCII` ou `ENCODING:UTF-8`) e usar o encoding correto no `readAsText`.

---

## 6. Insights e inteligência financeira

### O que existe hoje

- Taxa de poupança vs meta de 20% (hardcoded)
- Categoria que subiu >40% vs mês anterior (só se categoria anterior > R$ 50)
- Maior gasto representando >25% da renda

### O que falta

| Insight | Descrição |
|---|---|
| Dia mais caro do mês | "Você gasta mais às sextas-feiras" |
| Categoria fora do padrão histórico | Usando média de 3+ meses, não só 1 anterior |
| Velocidade de gasto | "No dia 8 você já gastou 40% do seu gasto médio mensal" |
| Recorrentes detectados | "Você pagou Spotify todo mês por 6 meses" |
| Mês projetado | "Nesse ritmo você vai gastar R$ X até o fim do mês" |
| Renda variável | "Sua renda este mês é 15% abaixo da média" |

### Gráficos: úteis ou só visuais?

| Gráfico | Utilidade real |
|---|---|
| Receitas vs Despesas 6 meses (barras + linha) | Alta — histórico comparativo |
| Donut de distribuição | Média — bonito, mas a tabela de categorias já diz o mesmo |
| Gastos por Categoria (progress bars) | Alta — mostra proporção claramente |
| Comparativo vs Mês Anterior (tabela) | Alta — informação direta |
| Top Estabelecimentos | Alta — identifica onde o dinheiro vai de fato |
| Gasto Acumulado no Mês (curva) | Média — útil para ver ritmo, mas só no mês atual |
| Maiores Gastos do Mês | Alta — identifica outliers |

O Donut é o único gráfico que poderia ser removido sem perda de informação — as categorias já têm tabela e progress bars.

---

## 7. Metas financeiras

**O sistema não tem nenhuma funcionalidade de metas.**

Não existe:
- Meta de gasto por categoria (ex: máx R$ 800/mês em Alimentação)
- Meta de poupança mensal (ex: guardar R$ 500/mês)
- Meta de gasto total do mês
- Alertas ao atingir X% de uma meta
- Progresso visual de metas
- Histórico de metas cumpridas/não cumpridas

Isso é um **gap crítico** para os objetivos declarados do usuário. Sem metas, o sistema é retroativo — mostra o que aconteceu, mas não ajuda a mudar o comportamento antes que seja tarde.

---

## 8. Integração com Nubank (fluxo OFX)

### Como funciona hoje

1. Usuário exporta OFX manualmente pelo app/site do Nubank
2. Faz upload no app (drag-and-drop ou seleção de arquivo)
3. Sistema faz preview com classificação automática
4. Usuário confirma importação
5. Duplicatas são ignoradas automaticamente por FITID

### O que funciona bem

- Detecção automática de tipo (conta vs cartão) por estrutura XML do OFX
- Linking automático entre pagamento de fatura na conta e recebimento no cartão (mesmo FITID)
- Preview antes de importar — o usuário nunca importa cego
- Deduplicação robusta

### O que pode melhorar

#### Sem validação de período importado
Se o usuário importar dois meses seguidos sem importar o mês do meio, não há aviso. O sistema vai ter um gap silencioso nos dados e os gráficos de 6 meses vão mostrar um "buraco" sem aviso de que há dados faltando.

**Sugestão:** Detectar gaps de meses no histórico e mostrar aviso: "Você não tem dados de fevereiro/2026. Seus gráficos podem estar incompletos."

#### Sem confirmação de meses já importados
O usuário não consegue ver, na tela de Import, quais períodos já foram importados. Precisa ir no Dashboard e verificar pelo seletor de meses.

**Sugestão:** Mostrar na tela de Importar: "Meses já importados: jan/2026, fev/2026, mar/2026".

---

## 9. O que está faltando

### Funcionalidades essenciais ausentes

| # | Funcionalidade | Impacto |
|---|---|---|
| 1 | **Sistema de metas** (gasto por categoria, poupança mensal) | Crítico |
| 2 | **Categoria "Moradia"** nos padrões | Crítico |
| 3 | **Correção do bug de edição de categoria** (TransactionRow) | Crítico |
| 4 | **Alertas de gasto** (meta atingida, ritmo acelerado) | Alto |
| 5 | **Projeção do mês** ("nesse ritmo, vai gastar R$ X") | Alto |
| 6 | **Detecção de gaps** no histórico importado | Médio |
| 7 | **Filtro de origem na tela de Categorias** | Médio |
| 8 | **"Transações Recentes" filtradas pelo mês selecionado** | Médio |
| 9 | **Meta de poupança configurável** (hoje hardcoded 20%) | Médio |
| 10 | **Indicador de recorrentes** (assinaturas detectadas automaticamente) | Baixo |
| 11 | **Visão de parcelamentos** (agrupar parcelas relacionadas) | Baixo |

### Problemas graves de lógica financeira

1. **Reembolsos invisíveis:** Um cashback do Nubank, uma devolução de reserva — nenhum aparece em lugar nenhum. Para uma visão real do dinheiro, reembolsos que não têm transação original correspondente deveriam aparecer como receita.

2. **Sem renda fixa cadastrada:** O sistema não sabe qual é a renda esperada do usuário. Todos os cálculos de "taxa de poupança" dependem do salário ter entrado no extrato do mês. Se o salário cair no dia 5 e o usuário olhar o dashboard no dia 3, a taxa de poupança mostra 0% ou negativa — o que é falso.

3. **Categoria "Moradia" ausente:** Sem ela, o maior gasto fixo da maioria das pessoas vai para "Outros", distorcendo completamente o breakdown por categoria.

---

## 10. Sugestões práticas e aplicáveis

### Dashboard

- **Remover** o Donut de "Distribuição de Gastos" — a informação já está nas progress bars de categoria e na tabela comparativa.
- **Mover** "Gasto/Dia" e "Ticket Médio" para dentro do card de Despesas como subtexto, reduzindo os KPIs de 6 para 4.
- **Corrigir** "Transações Recentes" para filtrar pelo `effectiveMonth` selecionado, não pegar os globais mais recentes.
- **Adicionar** um indicador de progresso do mês: "Dia 8 de 30 · Gastou R$ X de R$ Y médio histórico".
- **Separar** o gráfico principal em dois: barras (Receitas/Despesas) em cima, linha (Saldo) embaixo — eliminar o duplo eixo Y.
- **Adicionar** "Outros" na legenda do Donut com seu valor.
- **Limitar** insights a 3 mas com prioridade definida: bugs > metas ultrapassadas > variações de categoria.

### Tela de Transações

- **Corrigir o bug** de `allCategories` fora de escopo no `TransactionRow` — isso torna a edição de categoria completamente não-funcional.
- **Adicionar** filtro rápido "Mês atual" como padrão em vez de "Todos os meses".

### Tela de Categorias

- **Adicionar** filtro de origem (Conta / Cartão / Ambos) — igual ao Dashboard.
- **Mudar** layout de `grid-cols-2` para coluna única com gráfico e tabela empilhados, para dar mais espaço ao gráfico com muitas categorias.

### Configurações

- **Esconder** a opção "Regex" atrás de um toggle "Modo avançado" para não assustar usuários não técnicos.
- **Tornar** a meta de poupança configurável: campo numérico em Configurações (padrão 20%).
- **Adicionar** seção "Renda fixa esperada" — valor mensal de referência, mesmo que não venha pelo OFX.

### Dados / Lógica

- **Adicionar** categoria "Moradia" nos padrões com regras: `aluguel`, `condomínio`, `iptu`, `agua`, `luz`, `energia`.
- **Adicionar** categoria "Saúde" separada de "Farmácia" para médico, dentista, plano de saúde.
- **Adicionar** categoria "Educação" para cursos, livros, faculdade.
- **Detectar** gaps de meses no histórico e exibir aviso na tela de Import e no Dashboard.
- **Mostrar** na tela de Importar os meses já presentes no banco de dados.
- **Criar** sistema de metas: tabela simples (categoria → valor máximo por mês), com indicador visual de progresso no Dashboard.

---

## 11. Priorização final

### 🔴 Crítico — corrigir antes de usar o sistema com dados reais

| # | Problema | Arquivo |
|---|---|---|
| 1 | **BUG: edição de categoria quebrada** (`allCategories` fora de escopo em `TransactionRow`) | `src/pages/Transactions.tsx` |
| 2 | **Categoria "Moradia" ausente** nos padrões — maior gasto fixo vai para "Outros" | `src/lib/utils/categories.ts` |
| 3 | **"Transações Recentes" mostra dados do mês errado** no Dashboard | `src/pages/Dashboard.tsx` |

### 🟡 Importante — impacta a utilidade real do sistema

| # | Melhoria | Esforço estimado |
|---|---|---|
| 4 | Sistema de metas por categoria (com progress bar no Dashboard) | Alto |
| 5 | Meta de poupança configurável (tirar 20% hardcoded) | Baixo |
| 6 | Projeção de gasto do mês ("nesse ritmo, vai gastar R$ X") | Médio |
| 7 | Filtro de origem na tela de Categorias | Baixo |
| 8 | Indicador de gaps no histórico importado | Médio |
| 9 | Adicionar categorias: Moradia, Saúde, Educação | Baixo |
| 10 | Encoding correto para OFX de cartão (USASCII) | Baixo |

### 🟢 Refinamento — melhora a experiência, não bloqueia o uso

| # | Melhoria | Esforço |
|---|---|---|
| 11 | Reduzir KPIs de 6 para 4 no Dashboard | Baixo |
| 12 | Remover Donut (informação redundante com progress bars) | Baixo |
| 13 | Separar duplo eixo Y no gráfico principal em dois gráficos | Médio |
| 14 | Esconder opção Regex atrás de "Modo avançado" em Configurações | Baixo |
| 15 | Mostrar meses já importados na tela de Import | Baixo |
| 16 | Adicionar "Outros" na legenda do Donut | Baixo |
| 17 | Insight de velocidade: progresso do mês atual vs histórico | Médio |
| 18 | Campo "Renda fixa esperada" em Configurações | Baixo |

---

## 12. Análise de Dados Avançada — Visão 360°

> Seção adicionada em 2026-04-09. Foco em métricas avançadas, análise temporal e inteligência financeira para visão completa do passado, presente e futuro.

---

### Estado atual da análise de dados

| Recurso | Status |
|---|---|
| Métricas mensais (receita, despesa, saldo, savings rate) | Implementado |
| Comparação mês atual vs. mês anterior | Implementado |
| Gráfico de 6 meses (receitas/despesas/saldo) | Implementado |
| Breakdown de categorias com deltas | Implementado |
| Top merchants | Implementado |
| Curva diária cumulativa de gastos | Implementado |
| Alertas automáticos básicos | Implementado |
| Comparação ano a ano | **Ausente** |
| Médias móveis (3m, 6m, 12m) | **Ausente** |
| Visão trimestral / anual | **Ausente** |
| Projeções e forecasts | **Ausente** |
| Score de saúde financeira | **Ausente** |
| Detecção de recorrentes | **Ausente** |
| Range de datas customizado | **Ausente** |
| Heatmap de gastos | **Ausente** |

---

### PASSADO — Análise Histórica

#### O que falta

| Lacuna | Impacto | Complexidade |
|---|---|---|
| Comparação ano a ano (jan/2025 vs jan/2026) | Alto | Média |
| Médias móveis por categoria (3m, 6m, 12m) | Alto | Média |
| Melhor e pior mês de todos os tempos por categoria | Médio | Baixa |
| Histórico completo por merchant (all-time) | Médio | Baixa |
| Sazonalidade — quais meses historicamente são mais caros | Alto | Média |
| Volatilidade por categoria (desvio padrão mensal) | Médio | Média |
| Retrospectiva anual com ranking de categorias | Alto | Média |
| Tendência do savings rate nos últimos 12 meses | Alto | Baixa |

#### Exemplos de métricas úteis

```
Alimentação — Média 6 meses: R$ 920 | Mês atual: R$ 1.150 (+25%) | Máximo histórico: R$ 1.340 (out/2025)
Melhor mês: jun/2025 — Saldo +R$ 2.800 (maior poupança)
Pior mês: dez/2025 — Gasto R$ 3.100 acima da média
```

---

### PRESENTE — Visão em Tempo Real

#### O que falta

| Lacuna | Impacto | Complexidade |
|---|---|---|
| **Burn rate**: ritmo atual → projeção p/ fim do mês | Alto | Baixa |
| Detecção de transações recorrentes (assinaturas, contas fixas) | Alto | Média |
| Custo fixo vs. variável — breakdown automático | Alto | Alta |
| Diversificação de receita (quantas fontes, % de cada uma) | Médio | Baixa |
| Velocidade de gasto (R$/dia) vs. média histórica | Médio | Baixa |
| Alerta de pace: "você vai gastar R$ X a mais que o mês passado" | Alto | Baixa |
| Dias sem gasto (streak de economia) | Baixo | Baixa |

#### Exemplos de métricas úteis

```
Dia 9 de 30 — Você gastou R$ 890 (34% do gasto médio mensal R$ 2.600)
Pace atual: R$ 99/dia → Projeção fim do mês: R$ 2.970 (+14% vs média)
Custo fixo identificado: R$ 1.240/mês (Spotify, Netflix, academia, aluguel...)
```

---

### FUTURO — Projeções e Forecasts

#### O que falta

| Lacuna | Impacto | Complexidade |
|---|---|---|
| **Projeção de fim de mês** baseada no pace atual | Alto | Baixa |
| Forecast de categoria (baseado em média histórica) | Alto | Média |
| Projeção de investimento (juros compostos sobre saldo atual) | Alto | Média |
| Data estimada para atingir meta de poupança | Alto | Baixa |
| Cash flow projetado (próximos 6-12 meses) | Alto | Alta |
| Simulador "e se eu cortar X?" — impacto no savings rate | Alto | Alta |

#### Exemplos de métricas úteis

```
Se mantiver o ritmo atual:
  → Poupança em 12 meses: R$ 18.400 (meta: R$ 24.000 — falta R$ 5.600)
  → Meta atingida em: mar/2027
  → Reduzindo Alimentação em R$ 200/mês: meta em dez/2026
```

---

### Intervalos de Tempo

#### Recursos de intervalo ausentes

| Recurso | Impacto |
|---|---|
| Visão semanal (qual semana do mês foi mais cara) | Médio |
| Visão trimestral (Q1, Q2, Q3, Q4) | Alto |
| Visão anual consolidada (resumo do ano inteiro) | Alto |
| **Range customizado** (ex: 15/mar a 10/abr) | Médio |
| Rolling windows: últimos 30, 90, 180, 365 dias | Alto |
| **Heatmap de gastos**: eixo Y = mês, eixo X = dia, cor = intensidade | Alto |
| Padrão por dia da semana (segunda é mais cara que sábado?) | Baixo |

#### Estrutura de seleção de período sugerida

```
[Semana] [Mês] [Trimestre] [Ano] [Personalizado: dd/mm/aaaa → dd/mm/aaaa]

Rolling:
[Últimos 30 dias] [Últimos 90 dias] [Últimos 12 meses]
```

---

### Visualizações Ausentes

| Visualização | O que mostra | Impacto |
|---|---|---|
| **Waterfall chart** | Income → despesas por categoria → saldo final | Alto |
| **Treemap** | Hierarquia de gastos (categoria → merchant → transação) | Alto |
| **Heatmap mensal** | Intensidade de gasto por dia do mês ao longo dos meses | Alto |
| **Sankey** | Fluxo de dinheiro: receitas → categorias → investimentos | Alto |
| Scatter de anomalias | Gastos incomuns plotados por data e valor | Médio |
| Linha de tendência | Regressão linear sobre gastos históricos por categoria | Médio |

---

### Métricas Avançadas Ausentes

| Métrica | Fórmula | Importância |
|---|---|---|
| **Meses de reserva de emergência** | `saldo_total / gasto_médio_mensal` | Crítica |
| **Índice de liberdade financeira** | `renda_passiva / gastos_totais` | Alta |
| Razão investimento/renda | `aportes_mensais / receita_mensal` | Alta |
| **Score de saúde financeira (0–100)** | ponderação de savings rate, metas, reserva, tendência | Alta |
| Concentração de gastos | `% que as top 3 categorias representam do total` | Médio |
| Cobertura de orçamento | `% de categorias dentro do budget configurado` | Médio |
| Tendência do savings rate | linha de tendência dos últimos 12 meses (subindo/caindo?) | Alta |
| Volatilidade de renda | desvio padrão da receita mensal | Médio |

#### Fórmula sugerida para Score de Saúde Financeira

```
Score (0–100) =
  Savings Rate ≥ 20%     → +25 pts
  Reserva ≥ 3 meses      → +25 pts
  Metas dentro do budget → +20 pts
  Savings rate crescendo → +15 pts
  Investimentos ativos   → +15 pts
```

---

### Página Nova Sugerida: Analytics / Relatórios

Uma página dedicada à análise avançada, separada do Dashboard operacional:

#### Seções propostas

1. **Painel Temporal**
   - Alternância livre: semana / mês / trimestre / ano / range customizado
   - Rolling windows: últimos 30, 90, 180, 365 dias
   - Comparação de dois períodos lado a lado

2. **Retrospectiva Anual**
   - Ranking de categorias do ano
   - Melhores e piores meses
   - Evolução do savings rate (linha de tendência)
   - Total gasto, total recebido, total investido no ano

3. **Score de Saúde Financeira**
   - Nota de 0 a 100 com breakdown explicado
   - Comparação com mês anterior e com 6 meses atrás

4. **Projeções**
   - Onde você vai estar em 3, 6 e 12 meses no ritmo atual
   - Data projetada para atingir cada meta configurada
   - Gráfico de investimento projetado (juros compostos)

5. **Análise de Recorrentes**
   - Detecção automática de assinaturas e gastos fixos
   - Total mensal de recorrentes identificados
   - Alertas de aumento em recorrentes (ex: plano de saúde que subiu)

6. **Comparador de Períodos**
   - Seleciona dois períodos quaisquer e compara KPIs lado a lado
   - Diferença absoluta e percentual por categoria

---

### Priorização de Análise de Dados

#### Fase 1 — Quick Wins (alto impacto, baixo esforço)

| # | Feature | Onde implementar |
|---|---|---|
| 1 | Projeção de fim de mês (burn rate + forecast) | Dashboard — nova seção |
| 2 | Meses de reserva de emergência | Dashboard — KPI card |
| 3 | Tendência do savings rate (últimos 12 meses) | Dashboard — gráfico existente |
| 4 | Rolling 12 meses (médias móveis por categoria) | Dashboard + Categorias |
| 5 | Visão anual consolidada | Nova aba no Dashboard ou página Analytics |

#### Fase 2 — Médio Prazo

| # | Feature |
|---|---|
| 6 | Heatmap de gastos (dia × mês) |
| 7 | Detecção automática de recorrentes |
| 8 | Comparação ano a ano (mesmo mês, ano anterior) |
| 9 | Visão trimestral com agrupamento automático |
| 10 | Score de saúde financeira |

#### Fase 3 — Avançado

| # | Feature |
|---|---|
| 11 | Waterfall chart (fluxo income → categorias → saldo) |
| 12 | Simulador "e se" (cortar categoria X → impacto no savings) |
| 13 | Cash flow projetado (6–12 meses) |
| 14 | Sankey diagram (fluxo de dinheiro completo) |
| 15 | Range de datas customizado em todos os filtros |

---

## 13. Frontend — Design para Analytics Intuitivo

> Seção adicionada em 2026-04-09. Análise detalhada de como reestruturar o frontend para que todas as funcionalidades de análise avançada (seção 12) sejam descobríveis, compreensíveis e agradáveis de usar — sem sobrecarregar o usuário.

---

### O problema raiz: o Dashboard não escala

O Dashboard hoje tem **10 seções em scroll vertical contínuo**, todas no mesmo nível visual. Adicionar métricas avançadas nesse modelo vai quebrar a experiência. Antes de adicionar qualquer feature nova, é necessário reorganizar a arquitetura de informação.

**Diagnóstico por seção atual:**

| Seção | Posição | Valor | Problema |
|---|---|---|---|
| Insight banners | 1ª | Alto | Até 4 banners empilhados, nenhum com prioridade visual clara |
| Budget progress | 2ª (condicional) | Alto | Aparece no meio do fluxo, deveria ser destacado |
| KPI cards (4) | 3ª | Alto | Correto, mas sem tendência temporal visível |
| Gráfico 6 meses | 4ª | Alto | Duplo eixo Y confunde |
| Categorias + Comparativo | 5ª (2 cols) | Alto | Boa estrutura, mas sem drill-down |
| Top merchants + Acumulado | 6ª (2 cols) | Médio | Acumulado só serve para o mês atual |
| Maiores gastos + Recentes | 7ª (2 cols) | Médio | "Recentes" mostra mês errado |

**Regra geral:** o usuário chega no Dashboard com duas perguntas distintas — "como estou agora?" e "como estou no histórico?". Hoje essas perguntas são respondidas misturadas, sem separação clara.

---

### Solução: separar em modos de uso

A mudança mais impactante não é adicionar um gráfico novo — é **separar o Dashboard em dois modos** via tabs no topo da página:

```
┌─────────────────────────────────────────────────────┐
│  Dashboard                          [Conta+Cartão ▾] │
│                                                      │
│  [Visão Mensal]  [Análise Histórica]                 │
│  ─────────────────────────────────────────────────   │
│  (conteúdo muda conforme a aba selecionada)          │
└─────────────────────────────────────────────────────┘
```

- **Visão Mensal** (tab padrão): o que existe hoje, reorganizado. Filtro de mês no topo.
- **Análise Histórica**: rolling windows, comparação ano a ano, tendências, heatmap. Filtro de período.

Isso resolve o problema sem criar uma nova página na sidebar (que aumentaria a carga cognitiva de navegação).

---

### Reestruturação da Visão Mensal

#### Novo layout proposto (ordem de cima para baixo)

**Bloco 1 — Contexto e alerta (sticky no topo)**
```
[Mês: Abril 2026 ▾]  [Conta+Cartão ▾]        [Alerta: 2 orçamentos próximos do limite ⚠]
```
- O alerta condensa todos os insights em um único indicador clicável
- Clicar expande um painel lateral (drawer) com todos os insights detalhados
- Remove os 4 banners empilhados que hoje quebram o ritmo visual

**Bloco 2 — Score rápido + KPIs (acima da dobra)**
```
┌──────────────────┬──────────┬──────────┬──────────┬──────────┐
│  Saúde: 74/100  │ Receitas │ Despesas │  Saldo   │ Poupança │
│  ████████░░ Bom │ R$4.200  │ R$2.800  │ R$1.400  │  33,3%   │
│  [ver detalhes] │  +5% ↑   │  -8% ↓   │  verde   │  ✓ meta  │
└──────────────────┴──────────┴──────────┴──────────┴──────────┘
```
- O score de saúde financeira ocupa o primeiro card (5 cols total)
- Clicar no score abre um modal com o breakdown explicado
- Os 4 KPIs existentes ficam inalterados

**Bloco 3 — Progresso do mês (novo, crítico)**
```
┌─────────────────────────────────────────────────────────────┐
│  Ritmo do mês                                               │
│  Dia 9 de 30 (30%)  ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 30%  │
│  Gasto: R$890  ·  Pace: R$99/dia  ·  Projeção: R$2.970     │
│  ▲ 14% acima da sua média histórica (R$2.600/mês)          │
└─────────────────────────────────────────────────────────────┘
```
- Card de largura total, fino (height ~56px)
- Responde à pergunta "estou acelerado?" imediatamente
- Sempre visível para o mês corrente; oculto para meses passados

**Bloco 4 — Orçamentos (reorganizado)**
```
┌─────────────────────────────────────────────────────────────┐
│  Orçamentos do mês                              [gerenciar] │
│                                                             │
│  Alimentação  R$890 / R$1.000  ████████████░░  89% ⚠       │
│  Transporte   R$310 / R$400    █████████░░░░░  78%         │
│  Lazer        R$120 / R$300    ████░░░░░░░░░░  40% ✓       │
└─────────────────────────────────────────────────────────────┘
```
- Sobe de posição (hoje está na 2ª seção, mas condicionalmente)
- Sempre visível se houver orçamentos, independente de metas ativas
- Link "gerenciar" leva para Configurações → seção de budgets

**Bloco 5 — Gráfico principal (refatorado)**

Separar o ComposedChart em dois cards:
```
┌──────────────────────────────┬───────────────────────────────┐
│  Receitas vs Despesas        │  Saldo Líquido               │
│  (bar chart, 6 meses)        │  (area chart, 6 meses)       │
│  [tab: 3m | 6m | 12m]       │  [tab: 3m | 6m | 12m]       │
└──────────────────────────────┴───────────────────────────────┘
```
- Elimina o duplo eixo Y
- Tabs de período (3, 6, 12 meses) dentro de cada card
- Ambos os gráficos sincronizados pelo mesmo período selecionado

**Bloco 6 — Análise de categorias (com drill-down)**
```
┌──────────────────────────────┬───────────────────────────────┐
│  Gastos por Categoria        │  vs. Mês Anterior            │
│                              │                               │
│  [Clicável → abre detalhe]  │  Tabela igual à atual        │
│  Alimentação  R$890  34% →  │  + coluna de tendência       │
│  Transporte   R$310  12% →  │    (↑↑ muito acima, ↓ ok)    │
└──────────────────────────────┴───────────────────────────────┘
```
- Cada categoria é clicável
- Clicar abre um **painel lateral (sheet)** com:
  - Histórico da categoria (6 meses, mini-chart)
  - Média histórica vs. atual
  - Top 5 merchants dessa categoria
  - Lista de transações do mês filtradas por ela
- Não navega para outra página — o contexto principal fica visível

**Bloco 7 — Merchants + Recentes (reorganizado)**
```
┌──────────────────────────────┬───────────────────────────────┐
│  Top Estabelecimentos        │  Transações do Mês           │
│  (igual ao atual)            │  (filtrado pelo mês atual)   │
│                              │  + busca rápida              │
└──────────────────────────────┴───────────────────────────────┘
```
- Corrige o bug das Recentes mostrando o mês errado
- Adiciona campo de busca inline nas transações
- Remove a curva de acumulado diário (vai para aba Análise Histórica)

---

### Nova aba: Análise Histórica

Esta aba resolve todas as métricas de longo prazo sem sobrecarregar a visão mensal.

#### Controle de período (elemento central)

```
┌─────────────────────────────────────────────────────────────┐
│  Período:  [3 meses] [6 meses] [12 meses] [Este ano] [↔]   │
│            ↑ padrão                                [custom] │
└─────────────────────────────────────────────────────────────┘
```
- Persiste a seleção entre navegações (localStorage)
- Botão `↔` abre date-picker de range (dois calendários, início e fim)
- Todos os gráficos e métricas da aba respondem a esse seletor

#### Layout da aba

**Bloco 1 — Tendência do Savings Rate**
```
┌─────────────────────────────────────────────────────────────┐
│  Taxa de Poupança — últimos 12 meses                        │
│  Média: 28,4%  ·  Tendência: ↑ crescendo  ·  Meta: 20% ✓  │
│                                                             │
│  [line chart com linha de meta tracejada]                   │
│  jan  fev  mar  abr  mai  jun  jul  ago  set  out  nov  dez │
└─────────────────────────────────────────────────────────────┘
```

**Bloco 2 — Evolução por categoria (médias móveis)**
```
┌──────────────────────────────┬───────────────────────────────┐
│  Tendência por Categoria     │  Volatilidade                │
│                              │                               │
│  [dropdown: selecionar cat] │  Categorias mais instáveis:  │
│  [line chart comparativo]   │  1. Lazer      ±R$280        │
│  Mostra: média + mês atual  │  2. Alimentação ±R$190       │
└──────────────────────────────┴───────────────────────────────┘
```

**Bloco 3 — Heatmap de gastos**
```
┌─────────────────────────────────────────────────────────────┐
│  Intensidade de Gastos por Dia                              │
│                                                             │
│       Jan  Fev  Mar  Abr  Mai  Jun                         │
│  D01  ░░   ██   ░░   ▓▓   ░░   --                          │
│  D05  ▓▓   ░░   ██   ░░   ▓▓   --                          │
│  D10  ░░   ░░   ░░   ▓▓   ██   --                          │
│  ...                                                        │
│  Escala: ░ baixo  ▓ médio  █ alto                           │
└─────────────────────────────────────────────────────────────┘
```
- Permite ver padrões sazonais (todo dia 10 você gasta mais → dia de boleto)
- Hover mostra tooltip com valor e principais gastos do dia

**Bloco 4 — Comparação ano a ano**
```
┌──────────────────────────────┬───────────────────────────────┐
│  Este mês vs. mesmo mês      │  Retrospectiva Anual         │
│  do ano anterior             │                               │
│                              │  Melhor mês: jun/2025        │
│  Abr/2026  R$2.800 despesas │  Pior mês:   dez/2025        │
│  Abr/2025  R$2.400 despesas │  Total gasto 2025: R$31.200  │
│  Diferença: +R$400 (+16%)   │  Total poupado: R$8.400      │
└──────────────────────────────┴───────────────────────────────┘
```

**Bloco 5 — Projeções**
```
┌─────────────────────────────────────────────────────────────┐
│  Se você mantiver o ritmo atual...                          │
│                                                             │
│  Em 3 meses:  poupança acumulada R$ 4.200                  │
│  Em 12 meses: poupança acumulada R$16.800                  │
│  Meta de R$ 20.000: atingida em fev/2027                   │
│                                                             │
│  [area chart com projeção tracejada após hoje]             │
└─────────────────────────────────────────────────────────────┘
```

---

### Nova página na sidebar: Relatórios

Além das tabs no Dashboard, uma página **Relatórios** na sidebar para análises sob demanda — diferente do Dashboard (que é operacional e se atualiza com o tempo), Relatórios é exploratório.

**Quando o usuário vai até lá:** quando quer responder uma pergunta específica, não apenas ver o estado atual.

#### Estrutura da página

```
Relatórios
────────────────────────────────────────────────
[Período: último trimestre ▾]  [Conta+Cartão ▾]

Score de Saúde Financeira
  ┌──────────────────────────────────────┐
  │  74 / 100  ████████████░░░░  Bom    │
  │                                      │
  │  Savings rate ≥ 20%    25pts ✓       │
  │  Reserva ≥ 3 meses     25pts ✓       │
  │  Metas no orçamento    12pts ⚠ (60%) │
  │  Savings crescendo     15pts ✓       │
  │  Investimentos ativos   0pts ✗       │
  └──────────────────────────────────────┘

Meses de Reserva de Emergência
  Saldo: R$12.400  ÷  Gasto médio: R$2.650  =  4,7 meses ✓

Waterfall — Como seu dinheiro fluiu
  [waterfall chart: receita → categoria1 → categoria2 → ... → saldo]

Recorrentes Detectados
  Netflix R$55,90  · Spotify R$21,90  · Academia R$120  · ...
  Total mensal fixo identificado: R$892

Comparador de Períodos
  [Período A: __/__  ×  Período B: __/__]  [Comparar]
  [tabela lado a lado com delta]
```

---

### Componentes de UI necessários (novos)

| Componente | Descrição | Reutilização |
|---|---|---|
| `<PeriodSelector>` | Tabs de período (3m/6m/12m/ano/custom) com date-range picker | Global — todas as páginas analíticas |
| `<HealthScoreCard>` | Card com nota 0–100, barra de progresso, breakdown clicável | Dashboard + Relatórios |
| `<MonthPaceBar>` | Barra fina de progresso do mês + burn rate + projeção | Dashboard — Visão Mensal |
| `<CategorySheet>` | Painel lateral deslizante com detalhes de categoria | Dashboard (on-click) |
| `<InsightDrawer>` | Drawer com todos os insights expandidos | Dashboard (bell/alert button) |
| `<SpendingHeatmap>` | Tabela estilizada com gradiente de cor por intensidade | Análise Histórica |
| `<WaterfallChart>` | Recharts customizado para waterfall (income → saldo) | Relatórios |
| `<ProjectionChart>` | Area chart com linha real + linha tracejada futura | Análise Histórica + Relatórios |
| `<PeriodComparator>` | Dois selectors de mês + tabela comparativa lado a lado | Relatórios |
| `<RecurringList>` | Lista de recorrentes detectados com valor e frequência | Relatórios + Dashboard |

---

### Padrões de interação para não sobrecarregar

#### Progressive disclosure (regra central)

Nenhuma feature avançada deve aparecer na "primeira tela" sem ação do usuário. A hierarquia é:

```
Nível 1 (visível por padrão):
  → KPIs principais, orçamentos, alertas resumidos, gráfico mensal

Nível 2 (um clique):
  → Score detalhado (clique no card de saúde)
  → Insights expandidos (clique no alerta do header)
  → Detalhe de categoria (clique na linha da categoria)
  → Análise histórica (clique na tab "Análise Histórica")

Nível 3 (dois cliques):
  → Transações filtradas por categoria (dentro do CategorySheet)
  → Simulador "e se" (dentro da seção de Projeções)
  → Comparador de períodos customizados (dentro de Relatórios)
```

#### Drill-down sem saída de página

Usar `<Sheet>` (painel lateral deslizante) para detalhes, não navegação. O usuário mantém o contexto do dashboard enquanto explora um detalhe. Só navega para outra página quando quer fechar o contexto completamente.

```
Dashboard (contexto principal)
  └── [clica em "Alimentação"]
      └── Sheet lateral abre com:
          - histórico de Alimentação (6 meses)
          - merchants desta categoria
          - transações do mês
          [clica em uma transação]
              └── linha expande inline com detalhes
```

#### Tooltips contextuais em métricas novas

Toda métrica não-óbvia deve ter um `(?)` ao lado que, ao hover, explica o cálculo:

```
Meses de Reserva  4,7 (?)
                  ┌─────────────────────────────┐
                  │ Saldo total ÷ gasto médio   │
                  │ R$12.400 ÷ R$2.650 = 4,7   │
                  │ Recomendado: mínimo 3 meses │
                  └─────────────────────────────┘
```

#### Indicadores de tendência em vez de apenas números

Todo número que tem histórico deve mostrar direção:

```
Alimentação  R$890  ↑8% vs. sua média de 6 meses
                    (não apenas vs. mês anterior)
```

---

### Reorganização da Sidebar

Adicionar "Relatórios" sem sobrecarregar a navegação:

```
Sidebar atual (6 itens):          Sidebar proposta (7 itens):
  Dashboard                         Dashboard
  Transações                        Transações
  Categorias               →        Categorias
  Investimentos                     Investimentos
  Importar                          Relatórios         ← novo
  Configurações                     Importar
                                    Configurações
```

"Categorias" pode ser absorvida dentro de "Relatórios" futuramente, mas por ora mantém a separação para não quebrar fluxo existente.

---

### Mapeamento feature → localização na UI

| Feature (Seção 12) | Onde aparece | Como é acessada |
|---|---|---|
| Projeção de fim de mês | Dashboard — Visão Mensal | Bloco 3 (MonthPaceBar), sempre visível |
| Meses de reserva | Dashboard — Visão Mensal | Card KPI adicional **ou** Relatórios |
| Score de saúde | Dashboard — Visão Mensal | Card KPI (clicável para detalhes) |
| Orçamentos refatorados | Dashboard — Visão Mensal | Bloco 4, sempre visível |
| Drill-down de categoria | Dashboard — Visão Mensal | Sheet lateral ao clicar na categoria |
| Tendência savings rate | Dashboard — Análise Histórica | Bloco 1 da aba |
| Médias móveis | Dashboard — Análise Histórica | Bloco 2 da aba |
| Heatmap | Dashboard — Análise Histórica | Bloco 3 da aba |
| Comparação ano a ano | Dashboard — Análise Histórica | Bloco 4 da aba |
| Projeções longas | Dashboard — Análise Histórica | Bloco 5 da aba |
| Waterfall chart | Relatórios | Seção principal |
| Recorrentes detectados | Relatórios | Seção dedicada |
| Comparador de períodos | Relatórios | Seção dedicada |
| Score detalhado | Relatórios | Seção de saúde financeira |
| Detecção recorrentes | Relatórios | Seção dedicada |

---

### Ordem de implementação sugerida (frontend-first)

Implementar na ordem que gera valor visível mais rápido:

1. **`<MonthPaceBar>`** — 1 componente novo, dados já disponíveis, altíssima utilidade diária
2. **Corrigir "Transações Recentes"** — 1 linha de código, bug crítico
3. **Tabs no Dashboard** (Visão Mensal | Análise Histórica) — estrutura que desbloqueia tudo
4. **`<CategorySheet>`** com drill-down — alto impacto, reutiliza dados existentes
5. **`<HealthScoreCard>`** — fórmula simples, diferencial visual forte
6. **Gráfico de tendência (savings rate)** — dentro da aba Análise Histórica
7. **`<SpendingHeatmap>`** — component novo, dados disponíveis
8. **Página Relatórios** + `<PeriodSelector>` global
9. **`<ProjectionChart>`** com linha tracejada
10. **`<WaterfallChart>`** + `<RecurringList>`

---

## Resumo executivo

O sistema tem uma **base sólida**: a lógica de importação OFX é correta, a separação conta/cartão funciona, a deduplicação é robusta e o design é limpo. É um app funcional.

Os três problemas mais urgentes são:

1. **Bug de edição de categoria** — a feature existe mas está quebrada no código. Nenhuma categoria pode ser editada na tela de Transações.
2. **Ausência de "Moradia"** — sem essa categoria, o maior gasto fixo de uma pessoa vai para "Outros", distorcendo todos os relatórios.
3. **Inconsistência no Dashboard** — "Transações Recentes" mostra dados de meses diferentes do selecionado.

Depois de corrigir esses três pontos, o maior salto de utilidade vem com o **sistema de metas por categoria** — sem ele, o app é puramente retroativo (mostra o passado) mas não ajuda a controlar o futuro.
