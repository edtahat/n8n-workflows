# N8N Workflows - Repositório de Fluxos

Repositório de fluxos N8N prontos para importação. Cada arquivo `.json` pode ser importado diretamente no N8N via **Workflows > Import from file**.

## Estrutura de Pastas

```
fluxos/
├── basicos/        → Webhooks, Cron, HTTP requests simples
├── integracoes/    → GitHub, Slack, Telegram, Google Sheets
├── dados/          → Transformação, CSV, JSON, banco de dados
├── notificacoes/   → Alertas, relatórios, monitoramento
└── ia/             → Fluxos com LLMs, OpenAI, Claude
```

## Como Importar no N8N

1. Abra o N8N
2. Vá em **Workflows** → clique em `+` → **Import from file**
3. Selecione o arquivo `.json` da pasta correspondente
4. Ajuste credenciais e variáveis conforme necessário
5. Ative o workflow

## Como Solicitar um Novo Fluxo

Basta pedir ao Claude descrevendo o que o fluxo deve fazer. Exemplo:
> *"Crie um fluxo que recebe webhook, filtra dados e envia para Slack"*

O arquivo JSON será gerado e salvo automaticamente neste repositório.

## Fluxos Disponíveis

| ID | Nome | Categoria | Descrição |
|----|------|-----------|-----------|
| WF-001 | Webhook Simples | basicos | Recebe dados via webhook e retorna resposta |
| WF-032 | Escalonamento de Email em 14 Dias | notificacoes | Envia email inicial, aguarda 14 dias e escalona para o gerente se o chamado não for resolvido |

---
*Gerado e mantido com Claude Code*
