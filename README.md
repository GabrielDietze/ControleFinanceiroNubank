# Controle Financeiro

App pessoal de controle financeiro baseado em extratos OFX exportados do Nubank.

## Funcionalidades

- **Dashboard** — visão geral de receitas, despesas e saldo por período
- **Transações** — listagem, filtros e categorização manual de lançamentos
- **Categorias** — criação e gestão de categorias personalizadas
- **Investimentos** — acompanhamento de aplicações/resgates RDB
- **Importação** — upload de arquivos OFX (conta corrente e cartão de crédito)
- **Configurações** — nomes de transferências internas, temas e preferências

Os dados ficam armazenados localmente no navegador via IndexedDB — nenhuma informação é enviada para servidores externos.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | React 19 + TypeScript 5.8 |
| Build | Vite 5 |
| Estilo | Tailwind CSS v4 + shadcn/ui |
| Estado | Zustand 5 |
| Persistência | IndexedDB (idb) |
| Gráficos | Recharts 2 |
| Datas | date-fns 4 |

## Pré-requisitos

- Node.js >= 22.11

## Instalação

```bash
npm install
```

## Desenvolvimento

```bash
npm run dev
```

Acesse `http://localhost:5173`.

## Build

```bash
npm run build
```

## Como usar

1. Exporte o extrato da sua conta corrente e/ou cartão de crédito no Nubank (formato OFX)
2. Acesse a página **Importar** e faça o upload dos arquivos
3. As transações serão importadas e categorizadas automaticamente segundo as regras configuradas
4. Use a página **Transações** para ajustar categorias manualmente
5. Acompanhe os relatórios no **Dashboard**

## Regras de categorização automática

| Descrição da transação | Categoria |
|------------------------|-----------|
| Aplicação/Resgate RDB | Investimento (neutro) |
| Pagamento de fatura | Pagamento de cartão (neutro) |
| Pagamento recebido (cartão) | Pagamento de cartão (neutro) |
| Reembolso / estorno | Cancelado (neutro) |
| Transferências internas | Configurável em Ajustes |
