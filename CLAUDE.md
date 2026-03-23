# CLAUDE.md — N8N Workflows Repository

This file provides guidance for AI assistants working in this repository.

## Repository Purpose

A curated library of ready-to-import **n8n automation workflows** stored as JSON files. Each file can be imported directly into an n8n instance via **Workflows → Import from file**.

The repository is maintained in **Brazilian Portuguese**. All filenames, descriptions, and catalog metadata should be written in Portuguese.

---

## Directory Structure

```
n8n-workflows/
├── CLAUDE.md               ← this file
├── CATALOGO.md             ← human-readable catalog with import instructions
├── index.json              ← machine-readable index of all workflows
├── .gitignore              ← ignores .env, *.log, .DS_Store, Thumbs.db
│
├── basicos/                ← root-level folder (legacy; WF-001 lives here)
│   └── webhook-simples.json
│
└── fluxos/                 ← main workflow folder (use this for new workflows)
    ├── basicos/            → Webhooks, Cron, simple HTTP requests
    ├── integracoes/        → GitHub, Slack, Telegram, Google Sheets
    ├── dados/              → JSON/CSV transformation, databases
    ├── notificacoes/       → Alerts, reports, monitoring
    └── ia/                 → LLM flows (OpenAI, Claude, etc.)
```

**Note:** New workflows should be placed under `fluxos/<category>/`. The top-level `basicos/` folder exists for the initial seed file (WF-001) and should not be used for new additions.

---

## Workflow JSON Structure

Every workflow file must be valid n8n-compatible JSON. Use the following schema:

```json
{
  "name": "Human-readable name in Portuguese",
  "nodes": [ /* array of node objects */ ],
  "connections": { /* node wiring */ },
  "active": false,
  "settings": {
    "executionOrder": "v1"
  },
  "meta": {
    "templateId": "WF-XXX",
    "descricao": "Short description in Portuguese"
  },
  "tags": ["tag1", "tag2"]
}
```

### Node Object Schema

```json
{
  "parameters": { /* node-specific params */ },
  "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",  // UUID v4
  "name": "Node Name",
  "type": "n8n-nodes-base.<nodetype>",
  "typeVersion": 2,
  "position": [x, y]
}
```

- Node positions use `[x, y]` pixel coordinates. Space nodes ~250px apart horizontally.
- IDs must be unique UUID v4 strings — generate a fresh UUID for every node.
- `active` should always be `false` in committed files (users activate after import).

---

## Catalog Index (`index.json`)

`index.json` is the authoritative registry of all workflows. **Always update it when adding or removing a workflow.**

Structure:
```json
{
  "catalogo": "N8N Workflows - Repositório Local",
  "versao": "1.0.0",
  "atualizado": "YYYY-MM-DD",
  "fontes_confiaveis": [ ... ],
  "categorias": {
    "<categoria>": [
      {
        "id": "WF-XXX",
        "nome": "Workflow Name",
        "arquivo": "<categoria>/filename.json",
        "descricao": "What the workflow does",
        "tags": ["tag1", "tag2"]
      }
    ]
  }
}
```

### ID Convention

| Range     | Category        |
|-----------|-----------------|
| WF-001–009 | `basicos`      |
| WF-010–019 | `integracoes`  |
| WF-020–029 | `dados`        |
| WF-030–039 | `notificacoes` |
| WF-040–049 | `ia`           |

Always assign the next available ID within the appropriate range.

---

## Adding a New Workflow

1. **Create the JSON file** in `fluxos/<categoria>/<nome-em-kebab-case>.json`.
2. **Update `index.json`**: add the entry to the correct category array and update `atualizado` to today's date.
3. **Update `CATALOGO.md`**: add a row to the **Fluxos Disponíveis** table.
4. Commit with a descriptive message (Portuguese is fine):
   ```
   feat: adiciona workflow WF-XXX — <nome>
   ```

---

## Conventions & Rules

- **Language:** All user-facing text (names, descriptions, comments, catalog entries) must be in **Brazilian Portuguese**.
- **File naming:** `kebab-case.json` — lowercase, words separated by hyphens, no spaces.
- **No credentials in files:** Credential fields (API keys, tokens, passwords) must be left as empty strings `""` or placeholder text. Never commit real secrets.
- **`active: false`:** All committed workflows must have `"active": false`. Users enable them after configuring credentials.
- **`executionOrder: "v1"`:** Use this setting for all new workflows unless there is a specific reason to change it.
- **Node IDs:** Must be unique UUID v4 strings. Do not reuse IDs across files.
- **`.gitignore`:** `.env`, `*.log`, `.DS_Store`, `Thumbs.db` are ignored — do not force-add these.

---

## Common n8n Node Types

| Node Type                              | Purpose                          |
|----------------------------------------|----------------------------------|
| `n8n-nodes-base.webhook`               | Receive HTTP webhooks            |
| `n8n-nodes-base.respondToWebhook`      | Send HTTP response               |
| `n8n-nodes-base.code`                  | Run JavaScript (Code node)       |
| `n8n-nodes-base.httpRequest`           | Make HTTP requests               |
| `n8n-nodes-base.scheduleTrigger`       | Cron/scheduled execution         |
| `n8n-nodes-base.set`                   | Set/transform fields             |
| `n8n-nodes-base.if`                    | Conditional branching            |
| `n8n-nodes-base.emailSend`             | Send email                       |
| `n8n-nodes-base.slack`                 | Slack integration                |
| `n8n-nodes-base.telegram`             | Telegram integration             |
| `n8n-nodes-base.googleSheets`          | Google Sheets integration        |
| `n8n-nodes-base.github`               | GitHub integration               |
| `@n8n/n8n-nodes-langchain.openAi`      | OpenAI / LLM node                |

---

## Currently Implemented Workflows

| ID     | File                             | Status    |
|--------|----------------------------------|-----------|
| WF-001 | `basicos/webhook-simples.json`   | Committed |

Workflows listed in `index.json` but not yet committed (WF-002 through WF-031) are **planned** — their JSON files do not exist yet.

---

## Development Branch

Active development happens on the branch `claude/add-claude-documentation-xLfG8`. The default branch is `master`.
