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

## Resumo executivo

O sistema tem uma **base sólida**: a lógica de importação OFX é correta, a separação conta/cartão funciona, a deduplicação é robusta e o design é limpo. É um app funcional.

Os três problemas mais urgentes são:

1. **Bug de edição de categoria** — a feature existe mas está quebrada no código. Nenhuma categoria pode ser editada na tela de Transações.
2. **Ausência de "Moradia"** — sem essa categoria, o maior gasto fixo de uma pessoa vai para "Outros", distorcendo todos os relatórios.
3. **Inconsistência no Dashboard** — "Transações Recentes" mostra dados de meses diferentes do selecionado.

Depois de corrigir esses três pontos, o maior salto de utilidade vem com o **sistema de metas por categoria** — sem ele, o app é puramente retroativo (mostra o passado) mas não ajuda a controlar o futuro.
