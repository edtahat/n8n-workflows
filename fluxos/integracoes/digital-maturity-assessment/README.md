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
| `test/interface.test.mjs` | Testes do formulário em navegador real, com os webhooks simulados |

Depois de editar `interface.html` ou `workflow.template.json`:

```bash
python3 build.py

# opcional, valida o formulário num navegador de verdade
npm install playwright && node test/interface.test.mjs
```

## Nós do workflow

```
Interface Webhook (GET)          -> Serve Interface (HTML da página)
People Search Webhook (GET/POST) -> Prepare Search Term -> Search Entra Users -> Format People Results -> Return People Results
CNPJ Webhook (GET/POST)          -> Prepare CNPJ -> CNPJ válido? -> Fetch CNPJ -> Format CNPJ Result -> Return CNPJ Result
                                                                 \-> (inválido) ----------------------> Return CNPJ Result
```

- **Interface Webhook** — `GET /webhook/7cb41a2d-d302-4bef-9d2e-fcc64f0788ed`, entrega a página.
- **People Search Webhook** — `GET` **e** `POST` em `/webhook/c7fe0be6-d5d8-4bd5-8308-e16398916e6f`
  (`multipleMethods: true`). O formulário usa `GET ...?q=tahata`, que é uma requisição
  "simples" para o navegador e não dispara preflight `OPTIONS`. `allowedOrigins: "*"`
  faz o n8n responder ao preflight e mandar cabeçalhos CORS também nos erros.
- **Prepare Search Term** — lê o termo em `query.q`, `query.name`, `body.name` ou `body.q`
  (funciona igual em GET e POST), normaliza (trim, escapa `'`, limita a 60 caracteres) e evita
  filtro vazio, que traria usuários aleatórios.
- **Search Entra Users** — `startswith(displayName, termo)`, limite de 15. **Não** combine
  várias propriedades com `or` (`displayName` + `givenName` + `mail` ...): o Microsoft Graph
  recusa boa parte dessas combinações sem os parâmetros de *advanced query*
  (`ConsistencyLevel: eventual` + `$count=true`), o nó falha e a busca volta vazia.
  Como no diretório o `displayName` começa pelo sobrenome ("Tahata Eduardo"), buscar pelo
  sobrenome funciona; buscar só pelo primeiro nome não.
  Configurado com `alwaysOutputData` e `onError: continueRegularOutput`, para o webhook
  sempre responder e o formulário nunca ficar travado esperando.
- **Format People Results** — normaliza os usuários e **expõe o erro da API** em vez de
  devolver lista vazia. Resposta: `{ ok, term, count, people: [...], error }`.
- **Return People Results** — devolve esse JSON com cabeçalhos CORS.

### Consulta de CNPJ

- **CNPJ Webhook** — `GET`/`POST` em `/webhook/3f0a5c21-9b7e-4d58-a0c6-71e2d4f8b913`,
  chamado pelo formulário como `?cnpj=11222333000181`.
- **Prepare CNPJ** — limpa a pontuação e valida os dígitos verificadores. Aceita o CNPJ
  numérico e o **alfanumérico** (12 caracteres + 2 dígitos, com o valor de cada caractere
  igual ao código ASCII menos 48).
- **CNPJ válido?** — CNPJ inválido responde na hora, sem gastar chamada na API externa.
- **Fetch CNPJ** — `GET https://brasilapi.com.br/api/cnpj/v1/{cnpj}`, sem autenticação,
  com `neverError` para o corpo do 404 chegar ao fluxo. **Requer saída para a internet
  a partir da instância n8n** — se estiver bloqueada, troque a URL pela API interna
  (o nó seguinte já entende o formato BrasilAPI e o da ReceitaWS).
- **Format CNPJ Result** — normaliza e expõe o erro: `{ ok, cnpj, cnpjFormatted, error, company }`.
  `company` traz `razaoSocial`, `nomeFantasia`, `situacao`, `dataAbertura`,
  `atividadePrincipal`, `porte`, endereço (`logradouro`, `numero`, `bairro`, `municipio`,
  `uf`, `cep`), `telefone` e `email`.

No formulário, o CNPJ é **opcional**: digitou, ele é validado no navegador (sem chamada
inútil para DV errado) e consultado; razão social, nome fantasia e município/UF são
preenchidos sozinhos. Um CNPJ preenchido e inválido bloqueia o envio; em branco, não.

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
4. Confirme que a instância alcança `brasilapi.com.br` (nó `Fetch CNPJ`).
5. Ative o workflow para que as URLs de produção (`/webhook/...`) respondam.

## Se a busca não funcionar

O formulário só chama o webhook de pessoas; quase toda falha está na URL ou no estado do
workflow. Teste o endpoint fora do navegador primeiro:

Como o endpoint agora é GET, dá para abrir direto numa aba do navegador:

```
https://<sua-instancia>/webhook/c7fe0be6-d5d8-4bd5-8308-e16398916e6f?q=tahata
```

A resposta diz exatamente o que está acontecendo: `count` maior que zero significa que a
busca funciona; `error` preenchido traz a mensagem do Microsoft Graph; 404 significa
problema de URL/instância/workflow inativo.

| Sintoma | Causa | Correção |
|---------|-------|----------|
| 404 `webhook not registered` | URL de produção (`/webhook/...`) com o workflow **inativo**, ou método diferente do configurado no nó | Ative o workflow, ou use `/webhook-test/...` com o "Listen for test event" ligado |
| 404 mesmo com o workflow ativo | A URL no HTML aponta para **outra instância** (ex.: página servida por `i1-d`, busca chamando `i1-s`) | Deixe `PEOPLE_WEBHOOK_OVERRIDE` vazio: a URL passa a ser derivada da própria página. Só preencha se o workflow de busca estiver mesmo em outra instância |
| Erro de CORS no console | Instância diferente + resposta de erro sem cabeçalho `Access-Control-Allow-Origin` | Mesma instância (acima) ou mantenha `allowedOrigins: "*"` no nó do webhook |
| Requisição fica pendurada / sem resposta | O nó do Entra não devolveu itens, então o `Respond to Webhook` nunca executa | `alwaysOutputData: true` no `Search Entra Users` (já configurado) |
| Sempre "No user found", mesmo com nome que existe | Filtro com vários `or` (`displayName or givenName or mail`): o Graph recusa e o nó falha | Use só `startswith(displayName, ...)`, como está agora. A mensagem de erro do Graph agora aparece no próprio campo |
| Nome encontrado no Entra mas não na busca | `startswith(displayName, ...)` casa com o **começo** do nome completo, que no diretório começa pelo sobrenome | Busque pelo sobrenome ("tahata"), não pelo primeiro nome |
| Nome com apóstrofo (O'Brien) quebra a busca | Aspas simples não escapadas no filtro OData | O `Prepare Search Term` já duplica `'` |
| CNPJ sempre falha com erro de rede/DNS | A instância n8n não tem saída para `brasilapi.com.br` | Troque a URL do nó `Fetch CNPJ` por uma API interna; o `Format CNPJ Result` já normaliza os dois formatos |
| CNPJ novo (com letras) recusado | Validação que só aceita dígitos | O fluxo e o formulário já aceitam o CNPJ alfanumérico |
