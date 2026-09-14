# Digital Maturity Assessment - Setup

Workflow n8n que serve um formulário HTML de página única e faz a busca de
pessoas no Microsoft Entra ID para preencher o formulário automaticamente.

## Arquivos

| Arquivo | Papel |
|---------|-------|
| `../digital-maturity-assessment.json` | **Workflow pronto para importar no n8n** (HTML já embutido) |
| `interface.html` | Fonte do formulário (edite aqui) |
| `workflow.template.json` | Estrutura do workflow com o placeholder `__INTERFACE_HTML__` |
| `build.py` | Injeta `interface.html` no template e gera o JSON importável |

Depois de editar `interface.html` ou `workflow.template.json`:

```bash
python3 build.py
```

## Nós do workflow

```
Interface Webhook (GET)      -> Serve Interface (HTML da página)
People Search Webhook (POST) -> Prepare Search Term -> Search Entra Users -> Return People Results
```

- **Interface Webhook** — `GET /webhook/7cb41a2d-d302-4bef-9d2e-fcc64f0788ed`, entrega a página.
- **People Search Webhook** — `POST /webhook/c7fe0be6-d5d8-4bd5-8308-e16398916e6f`, recebe `{"name":"tahata"}`.
- **Prepare Search Term** — normaliza o termo (trim, escapa `'`, limita a 60 caracteres) e evita
  filtro vazio, que traria usuários aleatórios.
- **Search Entra Users** — `startswith` em `displayName`, `givenName`, `surname` e `mail`
  (antes só `displayName`), limite de 15. Configurado com `alwaysOutputData` e
  `onError: continueRegularOutput`, para que o webhook sempre responda e o formulário
  nunca fique travado esperando.
- **Return People Results** — devolve os itens como JSON com cabeçalhos CORS.

## Formulário (interface.html)

- **Página única**: sem wizard, sem stepper e sem botões Voltar/Avançar — as quatro
  seções (Solicitante, Respondentes, Atividades, Framework & envio) ficam visíveis de uma vez.
- **Campo "Department / area name" removido**. O departamento vem do diretório, pelo
  usuário selecionado, e é o que alimenta `department.name` no payload enviado.
- **Busca de pessoas** no campo *Requested by* e também no nome de cada respondente:
  a partir de 2 caracteres, com debounce de 250 ms, navegação por teclado
  (↑ ↓ Enter Esc) e descarte de respostas fora de ordem.
  Ao escolher a pessoa são preenchidos nome, e-mail, departamento, cargo e o ID do Entra.
- **URLs derivadas da própria página**: se a interface é aberta pela URL de teste
  (`/webhook-test/...`), as chamadas também usam `/webhook-test/...`; em produção usam `/webhook/...`.
  Não é mais preciso editar a URL do webhook dentro do HTML.
- Se a busca falhar, o formulário continua utilizável: o campo mostra um aviso e
  os dados podem ser digitados manualmente.

### Payload enviado (POST para `/webhook/5e0f338d-9b2b-48dd-9d39-8dc301798212`)

```json
{
  "formType": "digital_maturity_assessment_setup",
  "submittedAt": "2026-09-14T12:00:00.000Z",
  "department": {
    "name": "MA/PUQ1-LA",
    "targetDate": "2026-10-09",
    "requestedBy": "Tahata Eduardo",
    "requestedByEmail": "Eduardo.Tahata2@br.bosch.com",
    "requestedByDepartment": "MA/PUQ1-LA",
    "requestedByJobTitle": "Digital Specialist",
    "requestedById": "..."
  },
  "respondents": [{ "name": "...", "email": "...", "role": "..." }],
  "activities": [{ "name": "...", "description": "..." }],
  "maturityFramework": { "dimensions": [], "teamQuestions": [], "openQuestions": [] }
}
```

## Ajustes após importar

1. Reconecte a credencial **Microsoft Entra ID** no nó `Search Entra Users`.
2. Troque `REPLACE_WITH_LOGO_URL` em `interface.html` pela URL do logotipo e rode `build.py`.
3. O endpoint de envio (`5e0f338d-...`) precisa existir em outro workflow; ajuste o UUID
   em `interface.html` se for diferente.
4. Ative o workflow para que as URLs de produção (`/webhook/...`) respondam.
