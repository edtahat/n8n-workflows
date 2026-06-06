# Diagrama de Fluxo — Sistema de Prevenção de Incidentes de Fornecedores

> Visualização completa dos 3 workflows N8N com todos os nós e conexões.

---

## WF-100 | ANÁLISE SEMANAL AUTOMÁTICA

```mermaid
flowchart TD
    A1(["🕐 TRIGGER SEMANAL\nSchedule: toda segunda-feira 08h\nTipo: scheduleTrigger"])

    A2["📥 BAIXAR INCIDENTES EXCEL\nGET Graph API → SharePoint\nArquivo: incidentes_fornecedores.xlsx\nTipo: httpRequest"]

    A3["📊 PARSEAR INCIDENTES\nConverte binário Excel → linhas JSON\nAba: Incidentes\nTipo: spreadsheetFile"]

    A4["📥 BAIXAR PROCESSADOS\nGET Graph API → aba Processados\nRetorna IDs já analisados\nTipo: httpRequest"]

    A5["⚙️ PARSEAR PROCESSADOS\nConverte resposta Graph API\npara itens N8N\nTipo: code"]

    A6["🔍 FILTRAR NOVOS INCIDENTES\nCompara todos os IDs com processados\nRetorna apenas incidentes NOVOS\nTipo: code"]

    A7{"❓ EXISTEM NOVOS\nINCIDENTES?"}

    A8(["✅ SEM NOVOS — FIM\nNenhum incidente novo esta semana\nTipo: noOp"])

    A9["📥 BAIXAR TABELA DE FAMÍLIAS\nGET Graph API → aba Familias\nMapeamento: Part_Number → Familia\nTipo: httpRequest"]

    A10["⚙️ PARSEAR FAMÍLIAS\nConverte para mapa\nPart_Number : Familia\nTipo: code"]

    A11["📥 BAIXAR PEDIDOS FUTUROS\nGET Graph API → SharePoint\nArquivo: planejamento_pedidos.xlsx\nTipo: httpRequest"]

    A12["⚙️ PARSEAR PEDIDOS\nConverte para itens N8N\nTodos os pedidos abertos\nTipo: code"]

    A13["🔄 PROCESSAR POR INCIDENTE\nSplit In Batches — 1 por vez\nCria loop por incidente\nTipo: splitInBatches"]

    A14["⚙️ ENRIQUECER CONTEXTO\n• Mapeia família do part number\n• Busca histórico do fornecedor\n• Filtra pedidos próximos 90 dias\n• Detecta ocorrência nova/inédita\n• Monta prompts para classificação 14Q\nTipo: code"]

    A15["⚙️ PREPARAR REQUEST 14Q\nMonta body JSON para OpenAI\nPreserva TODOS os dados do incidente\nno mesmo item (_openai_body_14q)\nTipo: code"]

    A16["🤖 CLASSIFICAR 14Q via GPT-4\nPOST https://api.openai.com/v1/chat/completions\nModel: gpt-4 | Temp: 0.1\nResposta: JSON com categoria 14Q\nTipo: httpRequest"]

    A17["⚙️ EXTRAIR 14Q + PREPARAR LPC\n• Parseia resposta do GPT-4\n• Extrai: categoria, confiança, justificativa\n• Monta prompt do checklist LPC\n• Prepara próxima chamada OpenAI\nTipo: code"]

    A18["🤖 GERAR CHECKLIST LPC via GPT-4\nPOST https://api.openai.com/v1/chat/completions\nModel: gpt-4 | Temp: 0.2\nResposta: JSON com checklist detalhado\nTipo: httpRequest"]

    A19["📐 EXTRAIR LPC + CALCULAR TUDO\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Extrai checklist da resposta da IA\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nMÉTODO 1 — PPM (Peso 30%):\nPPM = falhas ÷ entregas × 1.000.000\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nMÉTODO 2 — Tendência Temporal (Peso 40%):\nMédia móvel: meses 1-3 vs meses 4-6\nCrescente / Estável / Decrescente\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nMÉTODO 3 — Probabilidade Bayesiana (Peso 30%):\nP = (falhas_tipo+1) ÷ (total+2)\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nPROBABILIDADE FINAL:\nP = PPM×0,30 + Tend×0,40 + Bayes×0,30\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nCRUZAMENTO PEDIDOS:\nMês 1: P × 1,00 | Mês 2: P × 0,85\nMês 3: P × 0,70\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nGera explicação detalhada dos cálculos\nTipo: code"]

    A20{"⚖️ PROBABILIDADE FINAL\n> 30% ?"}

    A21["🚨 ACIONAR ALERTA HITL\nHTTP POST → WF-101 Webhook\nEnvia todos os dados do incidente\n+ análise estatística + checklist\nTipo: httpRequest"]

    A22(["📋 REGISTRAR MONITORAMENTO\nSem envio ao fornecedor\nStatus: MONITORAMENTO\nTipo: noOp"])

    A23["💾 SALVAR ANÁLISE NO SHAREPOINT\nPOST Graph API Excel\nInsere linha na aba Análises\ncom todos os cálculos detalhados\nTipo: httpRequest"]

    A24["✅ MARCAR COMO PROCESSADO\nPOST Graph API Excel\nInsere ID na aba Processados\nEvita reprocessamento futuro\nTipo: httpRequest"]

    A25(["✅ ANÁLISE SEMANAL COMPLETA\nTodos os incidentes foram processados\nTipo: noOp"])

    A1 --> A2 --> A3 --> A4 --> A5 --> A6 --> A7
    A7 -->|"❌ NÃO"| A8
    A7 -->|"✅ SIM"| A9
    A9 --> A10 --> A11 --> A12 --> A13
    A13 -->|"📦 batch item"| A14
    A13 -->|"✅ done"| A25
    A14 --> A15 --> A16 --> A17 --> A18 --> A19 --> A20
    A20 -->|"🔴 RISCO ALTO"| A21
    A20 -->|"🟢 DENTRO LIMITE"| A22
    A21 --> A23
    A22 --> A23
    A23 --> A24
    A24 -->|"🔄 loop back"| A13

    style A1 fill:#e3f2fd,stroke:#1565c0,color:#000
    style A7 fill:#fff3e0,stroke:#e65100,color:#000
    style A8 fill:#f5f5f5,stroke:#9e9e9e,color:#555
    style A13 fill:#f3e5f5,stroke:#7b1fa2,color:#000
    style A16 fill:#e8f5e9,stroke:#2e7d32,color:#000
    style A18 fill:#e8f5e9,stroke:#2e7d32,color:#000
    style A19 fill:#e3f2fd,stroke:#1565c0,color:#000
    style A20 fill:#ffebee,stroke:#c62828,color:#000
    style A21 fill:#ffebee,stroke:#c62828,color:#000
    style A22 fill:#f5f5f5,stroke:#9e9e9e,color:#555
    style A25 fill:#e8f5e9,stroke:#2e7d32,color:#000
```

---

## WF-101 | ALERTA HUMANO (HUMAN-IN-THE-LOOP)

```mermaid
flowchart LR
    B1[/"📨 WEBHOOK: RECEBER DADOS WF-100\nPOST /supplier-hitl-alerta\nRecebe incidente + análise + checklist\nTipo: webhook"/]

    B2["⚙️ PREPARAR DADOS DO ALERTA\n• Formata HTML do email\n• Calcula nível de risco\n  MÉDIO 30-40% / ALTO 40-60%\n  CRÍTICO 60%+\n• Monta tabela de pedidos HTML\n• Define email do responsável\nTipo: code"]

    B3["📧 ENVIAR ALERTA AO RESPONSÁVEL\nMicrosoft Outlook — Send Email\n• Análise estatística completa\n• Explicação dos 3 métodos\n• Checklist LPC detalhado\n• Links APROVAR e REJEITAR\n  (usam $execution.resumeUrl)\nTipo: microsoftOutlook"]

    B4["⏸️ AGUARDAR APROVAÇÃO\nWait Node — tipo: webhook\nPausa execução até clicar no link\nTimeout: 48 horas\nResume via URL única do N8N\nTipo: wait"]

    B5{"🤔 RESPONSÁVEL\nAPROVOU?"}

    B6["⚙️ PREPARAR EMAIL AO FORNECEDOR\n• Gera Checklist_ID único\n• Monta tabela HTML do checklist\n• Define data limite de resposta\n• Inclui link do Microsoft Forms\nTipo: code"]

    B7["📧 ENVIAR CHECKLIST AO FORNECEDOR\nMicrosoft Outlook — Send Email\n• Checklist LPC em tabela formatada\n• Cada item com critério de aceite\n• Frequência e responsável por item\n• Link Microsoft Forms para resposta\n• Prazo: 14 dias\nTipo: microsoftOutlook"]

    B8["⚙️ REGISTRAR DECISÃO REJEIÇÃO\nStatus: REJEITADO\nMotivo: Apenas monitoramento\nSem envio ao fornecedor\nTipo: code"]

    B9["💾 SALVAR STATUS NO SHAREPOINT\nPOST Graph API Excel\nchecklists_enviados.xlsx\nColunas: ID, Fornecedor, Part,\nDecisão, Data_Envio, Status\nTipo: httpRequest"]

    B10["🔄 ACIONAR SISTEMA DE FOLLOW-UP\nHTTP POST → WF-102 Webhook\nInicia rastreamento de prazo\nApenas quando APROVADO\nTipo: httpRequest"]

    B1 --> B2 --> B3 --> B4 --> B5
    B5 -->|"✅ APROVADO"| B6
    B5 -->|"❌ REJEITADO"| B8
    B6 --> B7 --> B9
    B8 --> B9
    B9 --> B10

    style B1 fill:#e3f2fd,stroke:#1565c0,color:#000
    style B4 fill:#e8eaf6,stroke:#3949ab,color:#000
    style B5 fill:#fff3e0,stroke:#e65100,color:#000
    style B7 fill:#e8f5e9,stroke:#2e7d32,color:#000
    style B8 fill:#ffebee,stroke:#c62828,color:#555
    style B10 fill:#f3e5f5,stroke:#7b1fa2,color:#000
```

---

## WF-102 | SISTEMA DE FOLLOW-UP E APRENDIZADO

```mermaid
flowchart TD
    subgraph FLUXO_A["📅 FLUXO A — Verificação Diária (Cron 09h)"]
        direction LR
        C1(["🕐 VERIFICAÇÃO DIÁRIA 09h\nSchedule: todos os dias 09:00\nTipo: scheduleTrigger"])

        C2["📥 LER CHECKLISTS PENDENTES\nGET Graph API Excel\nchecklists_enviados.xlsx\nAba: Checklists\nTipo: httpRequest"]

        C3["⚙️ FILTRAR E CLASSIFICAR PENDENTES\n• Parseia todos os checklists\n• Filtra Status=AGUARDANDO_RESPOSTA\n• Calcula dias desde o envio\n• Classifica ação necessária:\n  3+ dias → LEMBRETE_1\n  7+ dias → LEMBRETE_2\n  14+ dias → ESCALACAO\n  < 3 dias → NENHUMA\nTipo: code"]

        C4{"📋 TEM CHECKLISTS\nPENDENTES?"}
        C5(["✅ SEM PENDENTES — FIM"])

        C6{"⏰ REQUER AÇÃO\nHOJE?"}

        C7{"🔺 É ESCALAÇÃO\n14+ dias?"}

        C8["📧 ENVIAR LEMBRETE AO FORNECEDOR\nMicrosoft Outlook\n1º lembrete (3 dias) ou\n2º lembrete (7 dias)\nInclui link para formulário\nTipo: microsoftOutlook"]

        C9["🚨 ESCALAÇÃO AO GESTOR\nMicrosoft Outlook\nSem resposta há 14+ dias\nAções recomendadas listadas\nTipo: microsoftOutlook"]

        C1 --> C2 --> C3 --> C4
        C4 -->|"✅ SIM"| C6
        C4 -->|"❌ NÃO"| C5
        C6 -->|"✅ SIM"| C7
        C6 -->|"❌ NÃO"| C5
        C7 -->|"🔺 SIM"| C9
        C7 -->|"📬 NÃO"| C8
    end

    subgraph FLUXO_B["📝 FLUXO B — Resposta do Formulário (Microsoft Forms)"]
        direction TB
        D1[/"📨 WEBHOOK: RECEBER RESPOSTA FORMS\nPOST /supplier-forms-resposta\nRecebe resposta do Microsoft Forms\nTipo: webhook"/]

        D2["⚙️ ANALISAR RESPOSTA DO CHECKLIST\n• Calcula % de conclusão\n• ≥90% = COMPLETO\n• Verifica se há desvios\n• Detecta desvio NÃO PREVISTO\n  (novo aprendizado)\n• Status: COMPLETO_OK /\n  COMPLETO_COM_DESVIOS /\n  PARCIAL / INCOMPLETO\nTipo: code"]

        D3{"✅ CHECKLIST\nCOMPLETO?"}

        D4["💾 FECHAR CASO NO SHAREPOINT\nPOST Graph API Excel\nAtualiza status para COMPLETO\nTipo: httpRequest"]

        D5["🧠 REGISTRAR APRENDIZADO\nVerifica se houve desvio\nnão previsto no checklist\nSe SIM: cria registro de\naprendizado para melhoria\nTipo: code"]

        D6["💾 SALVAR APRENDIZADO SHAREPOINT\nPOST Graph API Excel\nAba: Aprendizado\nPara validação pelo eng. de qualidade\nTipo: httpRequest"]

        D7["📧 NOTIFICAR ENGENHEIRO\nMicrosoft Outlook\nNovo padrão detectado\nSolicita validação e atualização\nda base de conhecimento\nTipo: microsoftOutlook"]

        D8["📧 SOLICITAR COMPLEMENTO\nMicrosoft Outlook\nChecklist incompleto\nSolicita completar os itens\nfaltantes via formulário\nTipo: microsoftOutlook"]

        D1 --> D2 --> D3
        D3 -->|"✅ SIM ≥90%"| D4
        D3 -->|"❌ NÃO <90%"| D8
        D4 --> D5 --> D6 --> D7
    end

    subgraph FLUXO_C["🔗 FLUXO C — Início do Follow-up (Webhook do WF-101)"]
        direction LR
        E1[/"📨 WEBHOOK: INICIAR FOLLOW-UP\nPOST /supplier-followup-iniciar\nAcionado pelo WF-101 após aprovação\nTipo: webhook"/]

        E2["⚙️ REGISTRAR INÍCIO FOLLOW-UP\n• Calcula datas dos lembretes\n  3 dias: 1º lembrete\n  7 dias: 2º lembrete\n  14 dias: escalação\n• Registra email do gestor\n• Status: INICIADO\nTipo: code"]

        E1 --> E2
    end

    style C1 fill:#e3f2fd,stroke:#1565c0,color:#000
    style C4 fill:#fff3e0,stroke:#e65100,color:#000
    style C5 fill:#f5f5f5,stroke:#9e9e9e,color:#555
    style C6 fill:#fff3e0,stroke:#e65100,color:#000
    style C7 fill:#fff3e0,stroke:#e65100,color:#000
    style C9 fill:#ffebee,stroke:#c62828,color:#000
    style D1 fill:#e3f2fd,stroke:#1565c0,color:#000
    style D3 fill:#fff3e0,stroke:#e65100,color:#000
    style D5 fill:#f3e5f5,stroke:#7b1fa2,color:#000
    style D7 fill:#f3e5f5,stroke:#7b1fa2,color:#000
    style D8 fill:#fff8e1,stroke:#f9a825,color:#000
    style E1 fill:#e3f2fd,stroke:#1565c0,color:#000
```

---

## Legenda de Cores

| Cor | Significado |
|-----|-------------|
| 🔵 Azul | Trigger / Webhook (início do fluxo) |
| 🟠 Laranja | Nó de decisão (IF) |
| 🟢 Verde | Chamadas à IA (OpenAI GPT-4) / Conclusão OK |
| 🟣 Roxo | Loop / Aprendizado |
| 🔴 Vermelho | Alertas de risco / Escalação |
| ⚪ Cinza | Fim sem ação |

## Fluxo entre os 3 Workflows

```mermaid
flowchart LR
    W1["🔄 WF-100\nAnálise Semanal\n25 nós"] 
    W2["👤 WF-101\nHuman-in-the-Loop\n10 nós"]
    W3["📬 WF-102\nFollow-up\n19 nós"]

    W1 -->|"risco > 30%\nHTTP POST webhook"| W2
    W2 -->|"aprovado\nHTTP POST webhook"| W3
    W3 -->|"respostas Forms\nHTTP POST webhook"| W3

    style W1 fill:#e3f2fd,stroke:#1565c0,color:#000
    style W2 fill:#fff3e0,stroke:#e65100,color:#000
    style W3 fill:#e8f5e9,stroke:#2e7d32,color:#000
```
