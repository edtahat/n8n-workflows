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
| WF-013 | [API Consulta CNPJ (Receita Federal)](fluxos/integracoes/consulta-cnpj-receita.json) | integracoes | `GET /webhook/cnpj?cnpj=...` valida os dígitos verificadores (inclusive CNPJ alfanumérico) e informa se o CNPJ está registrado e com situação cadastral ATIVA |

### WF-013 — API Consulta CNPJ

```
GET https://SEU-N8N/webhook/cnpj?cnpj=00.000.000/0001-91
```

Resposta (`200`):

```json
{
  "cnpj": "00.000.000/0001-91",
  "formato_valido": true,
  "registrado": true,
  "valido": true,
  "situacao_cadastral": "ATIVA",
  "razao_social": "BANCO DO BRASIL SA",
  "...": "data da situação, motivo, nome fantasia, CNAE, município/UF"
}
```

- `valido` = registrado **e** situação cadastral `ATIVA` (BAIXADA, INAPTA, SUSPENSA e NULA retornam `false`).
- CNPJ com dígito verificador errado → `400` sem consultar a fonte; CNPJ inexistente → `200` com `registrado: false`.
- Fonte indisponível ou limite de consultas → `502`/`503` com `registrado: null` (resultado indeterminado, não significa inválido).
- A fonte é a [BrasilAPI](https://brasilapi.com.br/docs#tag/CNPJ), que publica a base aberta de CNPJ da Receita Federal (atualização mensal). A página `cnpjreva` da Receita exige captcha, por isso não é consultada diretamente.

---
*Gerado e mantido com Claude Code*
