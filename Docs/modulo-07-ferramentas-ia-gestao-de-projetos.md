# Módulo 07: Ferramentas de IA para Gestão de Projetos

> **Etapa do Curso:** Trilha 2 – IA Aplicada ao Ciclo de Produto & Ops (Etapa 7 de 12)  
> **Carga Horária Sugerida:** 30 horas  
> **Foco Técnico:** Engenharia de Requisitos Assistida (Requirements Copilot), Priorização Quantitativa (RICE, WSJF, MoSCoW), Cronograma e Capacidade What-If, Simulações Probabilísticas (Monte Carlo em JS), AIOps de Projeto e Gestão de Riscos, Automação de Reuniões, Status Reports Multi-Audiência, Governança e Auditoria em JavaScript, Bots de Integração (Jira, Asana, Trello, Notion, Slack) e Gestão de Portfólio/OKRs com IA.

---

## Mapa de Documentações Oficiais do Módulo

| Plataforma / API | Documentação Oficial | Seções Específicas Recomendadas para Esta Etapa |
| :--- | :--- | :--- |
| **Jira Cloud REST API v3** | [developer.atlassian.com/cloud/jira/platform/rest/v3](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/) | [Issues API (Create, Update, Transitions)](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/), [Webhooks Configuration](https://developer.atlassian.com/cloud/jira/platform/webhooks/), [JQL Search API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/) |
| **Notion API & JS SDK** | [developers.notion.com](https://developers.notion.com/) | [`@notionhq/client` Quickstart](https://developers.notion.com/docs/getting-started), [Working with Databases & Pages](https://developers.notion.com/docs/working-with-databases) |
| **Linear / Asana / Trello APIs** | [developers.asana.com](https://developers.asana.com/docs) / [developer.atlassian.com/cloud/trello](https://developer.atlassian.com/cloud/trello/) | [Asana Tasks & Webhooks](https://developers.asana.com/reference/tasks), [Trello Cards & Boards REST API](https://developer.atlassian.com/cloud/trello/rest/api-group-cards/) |
| **Slack API & Bolt.js** | [api.slack.com](https://api.slack.com/) / [tools.slack.dev/bolt-js](https://tools.slack.dev/bolt-js/) | [Messaging & Block Kit UI](https://api.slack.com/block-kit), [Events API & Shortcuts](https://tools.slack.dev/bolt-js/concepts/event-listening/) |
| **GitHub REST & GraphQL API (`Octokit.js`)** | [docs.github.com/en/rest](https://docs.github.com/en/rest) | [Octokit.js SDK](https://github.com/octokit/octokit.js), [Pull Requests, Issues & Releases Auditing](https://docs.github.com/en/rest/pulls/pulls) |
| **OpenAI Whisper & Structured Outputs** | [platform.openai.com/docs](https://platform.openai.com/docs/overview) | [Speech to Text (Meeting Transcription)](https://platform.openai.com/docs/guides/speech-to-text), [Structured Outputs (Epics/Stories JSON Schema)](https://platform.openai.com/docs/guides/structured-outputs) |

---

## Estrutura de Conteúdo por Sessão (Etapas da Disciplina)

---

### Sessão 7.1 (Unidade 1): Planejamento e Escopo com IA (Requirements Copilot)
* **Posição na Etapa:** Unidade 1 – Engenharia de requisitos assistida por modelos generativos.
* **Conteúdo Programático:**
  1. **Levantamento e Definição de Requisitos de Software com IA:**
     * Análise automatizada de documentos de visão de produto (PRDs), transcrições de *discovery* e pedidos de clientes para detectar ambiguidades, lacunas funcionais, casos de borda (*edge cases*) e requisitos não-funcionais omitidos (segurança, performance, LGPD).
  2. **Conversão de Linguagem Natural (NL) em Artefatos Ágeis Estruturados:**
     * Pipeline com *Structured Outputs* (Zod/JSON Schema) que converte uma especificação em texto livre para uma árvore hierárquica: **Iniciativa $\rightarrow$ Épicos $\rightarrow$ Histórias de Usuário (*User Stories* no padrão INVEST) $\rightarrow$ Requisitos de Mudança (*Change Requests*)**.
  3. **Decomposição Técnica e Critérios de Aceite:**
     * Quebra automática de histórias de usuário em *sub-tasks* de Front-end, Back-end, Banco de Dados e QA.
     * Geração determinística de **Critérios de Aceite** no formato BDD (**Gherkin**: `Dado [contexto] / Quando [ação] / Então [resultado esperado]`) prontos para alimentar testes automatizados.
* **Documentações Oficiais e Seções Específicas:**
  * [OpenAI Structured Outputs Guide](https://platform.openai.com/docs/guides/structured-outputs) – *Modelagem de schemas recursivos/hierárquicos para Épicos e User Stories*.
  * [Cucumber / Gherkin Official Reference](https://cucumber.io/docs/gherkin/reference/) – *Sintaxe formal `Given / When / Then` para critérios de aceite*.

---

### Sessão 7.2 (Unidade 2): Priorização Inteligente de Backlog
* **Posição na Etapa:** Unidade 2 – Tomada de decisão quantitativa e refino de backlog.
* **Conteúdo Programático:**
  1. **Frameworks de Priorização Assistidos por IA:**
     * **RICE** (*Reach, Impact, Confidence, Effort*): como usar LLMs conectados a dados de produto/suporte para estimar alcance, impacto e nível de confiança com justificativa explícita.
     * **WSJF** (*Weighted Shortest Job First* / SAFe): cálculo de *Cost of Delay* (Valor de Negócio + Criticidade Temporal + Redução de Risco) dividido pelo tamanho do trabalho.
     * **MoSCoW** (*Must have, Should have, Could have, Won't have*): classificação automatizada para corte de escopo de MVP.
  2. **Simulação de Impacto e Geração de Roadmaps:**
     * Agrupamento semântico via embeddings para eliminar itens duplicados no backlog e sugerir trilhas trimestrais de roadmap alinhadas à capacidade do time.
  3. **Critérios de Pontuação Inteligente (Smart Scoring):**
     * Criação de um motor em JavaScript que pondera votos de clientes, severidade técnica e objetivos estratégicos para reordenar o backlog continuamente.
* **Documentações Oficiais e Seções Específicas:**
  * [Atlassian Agile Coach – Prioritization Frameworks](https://www.atlassian.com/agile/product-management/prioritization-framework).

---

### Sessão 7.3 (Unidade 3): Cronograma, Capacidade e Alocação Assistidos
* **Posição na Etapa:** Unidade 3 – Orquestração de dependências e balanceamento de carga.
* **Conteúdo Programático:**
  1. **Criação Dinâmica de Cronogramas e Grafo de Dependências:**
     * Extração assistida por IA de dependências bloqueantes entre tarefas (`blocks` / `is blocked by`) e cálculo automático do **Caminho Crítico** (DAG – *Directed Acyclic Graph*).
  2. **Análise de Cenários "What-If" e Balanceamento de Capacidade:**
     * Simulação interativa de variáveis reais: *"O que acontece com a data de lançamento se o desenvolvedor sênior tirar 10 dias de férias, ou se adicionarmos este requisito de segurança na Sprint 4?"*.
     * Alocação inteligente respeitando matriz de habilidades (*skill matrix*), limite de *Work in Progress (WIP)* e prevenção de sobrecarga individual.
  3. **Ajustes Automatizados de Cronograma:**
     * Replanejamento contínuo com base na vazão (*throughput*) real observada nas sprints anteriores e restrições operacionais.
* **Documentações Oficiais e Seções Específicas:**
  * [Jira Cloud REST API – Issue Links (Dependency Graph)](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-links/).

---

### Sessão 7.4 (Unidade 4): Estimativas e Previsões Probabilísticas
* **Posição na Etapa:** Unidade 4 – Substituindo "chutes" por estatística e aprendizado de dados históricos.
* **Conteúdo Programático:**
  1. **Previsão de Prazos, Custos e Esforço Baseada em IA:**
     * Busca por similaridade semântica (*RAG de Projetos Passados*): encontrar histórias e épicos históricos semelhantes já concluídos pelo time para ancorar a estimativa no tempo real de execução (*Cycle Time* histórico), neutralizando a Falácia do Planejamento.
  2. **Simulações Probabilísticas de Monte Carlo em JavaScript:**
     * Por que datas únicas determinísticas falham na engenharia de software.
     * **Implementação Prática em JS:** Algoritmo de Simulação de **Monte Carlo** que roda $10.000$ cenários aleatórios baseados no *Throughput* histórico diário/semanal da equipe para responder com rigor estatístico:
       * $50\%$ de probabilidade de entrega até a Data $X$ (P50)
       * $85\%$ de probabilidade de entrega até a Data $Y$ (P85 – compromisso recomendado)
       * $95\%$ de probabilidade de entrega até a Data $Z$ (P95)
* **Referência Técnica da Sessão:**
  * *Actionable Agile Metrics for Predictability (Daniel S. Vacanti)* – Fundamentos matemáticos de Cycle Time, Throughput e Simulação de Monte Carlo aplicada a software.

---

### Sessão 7.5 (Unidade 5): Riscos e Mitigações com AIOps de Projeto
* **Posição na Etapa:** Unidade 5 – Telemetria preditiva sobre a saúde da entrega.
* **Conteúdo Programático:**
  1. **Detecção Automática de Riscos de Escopo, Cronograma e Recursos:**
     * Monitoramento contínuo de sinais precoces de falha: *Scope Creep* (aumento silencioso de tasks após o início da sprint), PRs grandes travados em Code Review, *Aging WIP* (cards parados na mesma coluna além do percentil 85) e concentração de conhecimento (*Bus Factor = 1*).
  2. **Análise de Padrões e Anomalias em Dados de Projetos:**
     * Cruzamento de dados do Git (commits, retrabalho/*code churn*, abertura de bugs pós-merge) com dados do board (Jira/Linear/Trello) para prever gargalos antes que virem atrasos no milestone.
  3. **Planos de Mitigação Automatizados:**
     * Geração de alertas preventivos acompanhados de planos de ação recomendados com base em heurísticas de gestão e histórico de resolução da organização.
* **Documentações Oficiais e Seções Específicas:**
  * [DORA (DevOps Research and Assessment) – The Four Keys Metrics](https://dora.dev/guides/dora-metrics-four-keys/) – *Deployment Frequency, Lead Time for Changes, Change Failure Rate, Failed Deployment Recovery Time*.

---

### Sessão 7.6 (Unidade 6): Reuniões Turbinadas (Notas, Action Items e Follow-ups)
* **Posição na Etapa:** Unidade 6 – Eliminando o trabalho manual pós-reunião.
* **Conteúdo Programático:**
  1. **Pipeline de Transcrição e Sumarização de Reuniões:**
     * Processamento de áudio de reuniões técnicas (Daily, Sprint Planning, Refinamento, Retrospectiva, Arquitetura) via APIs de *Speech-to-Text* (Whisper / Gemini Audio) com identificação de interlocutores.
  2. **Extração Estruturada a partir de Conversas em Linguagem Natural:**
     * Prompting com *Structured Outputs* para separar com precisão:
       * **Resumo Executivo** (3 a 5 tópicos)
       * **Decisões Tomadas** (para registro em ADR)
       * **Riscos / Bloqueios Levantados**
       * **Action Items** (`descrição`, `responsável`, `prazo sugerido`, `prioridade`).
  3. **Integração Direta com Calendários e Boards:**
     * Automação que transforma cada *Action Item* aprovado da reunião em um card atribuído no Jira/Trello/Asana/Notion e agenda o *follow-up* automaticamente.
* **Documentações Oficiais e Seções Específicas:**
  * [OpenAI Audio Transcription & Post-Processing with GPT-4o](https://platform.openai.com/docs/guides/speech-to-text#post-processing-with-gpt-4o).

---

### Sessão 7.7 (Unidade 7): Status Reports e Executive Summaries
* **Posição na Etapa:** Unidade 7 – Comunicação assíncrona automatizada e adaptada ao público.
* **Conteúdo Programático:**
  1. **Automação de Relatórios de Sprint, Projeto e Portfólio:**
     * Script/Agente que coleta automaticamente issues fechadas, PRs mergeados, métricas de velocidade, incidentes e progresso de épicos da semana.
  2. **Adaptação Multi-Audiência com IA:**
     * Como transformar a mesma base de fatos brutos em 3 relatórios distintos em um único pipeline:
       * **Visão Técnica (Para a Squad/Engenharia):** Foco em PRs, débitos técnicos resolvidos, mudanças arquiteturais e dependências técnicas.
       * **Visão Tática (Para PMs e Gerentes):** Foco em progresso do milestone, burndown/burnup, bloqueios e riscos de cronograma.
       * **Visão Executiva (Para Diretoria / C-Level):** Foco em impacto de negócio, saúde do investimento (RAG Status: *Red/Amber/Green*), entrega de valor e decisões estratégicas necessárias.
* **Documentações Oficiais e Seções Específicas:**
  * [Jira Cloud REST API – JQL Search for Sprint Reports (`/rest/api/3/search`)](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/).

---

### Sessão 7.8 (Unidade 8): Governança, Compliance e Qualidade
* **Posição na Etapa:** Unidade 8 – Auditoria contínua automatizada em JavaScript.
* **Conteúdo Programático:**
  1. **Verificação de Conformidade e Rastreabilidade:**
     * Validação automatizada de *Definition of Ready (DoR)* (o card tem critério de aceite claro antes de entrar na sprint?) e *Definition of Done (DoD)* (o PR referencia o ID da tarefa, possui testes, aprovação de code review e documentação atualizada?).
  2. **Checklists Automatizados, Trilhas de Decisão e Documentação de Qualidade:**
     * Geração automática de *Changelogs*, notas de release (*Release Notes*) e registros de decisão arquitetural (ADRs) a partir do histórico de PRs e issues.
  3. **Implementação Prática em JavaScript:**
     * Desenvolvimento de scripts em Node.js utilizando `Octokit.js` (GitHub API) + API do Board + LLM para auditar releases, validar versionamento semântico (*SemVer*) e emitir laudos de conformidade para auditoria interna.
* **Documentações Oficiais e Seções Específicas:**
  * [GitHub Octokit.js Official Documentation](https://github.com/octokit/octokit.js) – *Inspeção programática de Commits, Pull Requests, Reviews e Releases*.

---

### Sessão 7.9 (Unidade 9): Automação Prática em Jira, Asana, Trello, Notion e Slack
* **Posição na Etapa:** Unidade 9 (Projeto Prático Principal do Módulo) – Construção de bots e fluxos NL $\rightarrow$ Workflow.
* **Conteúdo Programático:**
  1. **Arquitetura de Automações Inteligentes Cross-Platform:**
     * Recebimento de eventos em tempo real via Webhooks e orquestração bidirecional entre ferramentas de comunicação (Slack) e gestão (Jira, Asana, Trello, Notion).
  2. **Desenvolvimento de Bots em JavaScript/Node.js:**
     * Criação, enriquecimento automático, categorização por tags, detecção de duplicidade e priorização de cards no momento em que são criados.
  3. **Linguagem Natural para Workflow ($\text{NL} \rightarrow \text{Workflow}$):**
     * **Lab Mão na Massa:** O usuário digita em linguagem natural no Slack (ex.: *"@pm-bot Precisamos corrigir o timeout no checkout via Pix até sexta-feira, é crítico e o responsável é o Carlos"*); o bot extrai os campos estruturados via Function Calling, exibe um preview interativo com botão `[Confirmar Criação]` (regra de aprovação) e cria o card completo no Jira/Trello/Notion com notificações e lembretes configurados.
* **Documentações Oficiais e Seções Específicas:**
  * [Notion JavaScript SDK (`@notionhq/client`)](https://github.com/makenotion/notion-sdk-js) – *Criação e query de páginas em databases*.
  * [Trello REST API – Cards & Webhooks](https://developer.atlassian.com/cloud/trello/rest/api-group-cards/).
  * [Asana Node.js Client Library (`asana`)](https://github.com/Asana/node-asana).
  * [Slack Bolt.js – Actions & Approvals](https://tools.slack.dev/bolt-js/concepts/actions/).

---

### Sessão 7.10 (Unidade 10): Portfólio e OKRs com IA
* **Posição na Etapa:** Unidade 10 – Alinhamento estratégico entre execução de engenharia e objetivos de negócio.
* **Conteúdo Programático:**
  1. **Alinhamento Semântico de Projetos com OKRs:**
     * Uso de LLMs e embeddings para mapear como cada épico e tarefa do backlog contribui (ou deixa de contribuir!) para os *Objectives and Key Results (OKRs)* trimestrais da empresa, revelando "trabalho órfão" sem impacto estratégico.
  2. **Análise de Métricas de *Outcome* vs. *Output*:**
     * Diferenciando velocidade de entrega de código (*Output*) de mudança real nos indicadores dos Key Results (*Outcome*: retenção, conversão, NPS, receita, redução de custo).
  3. **Avaliação de Impacto e Recomendação de Portfólio Baseada em Dados:**
     * Consolidação de dados de múltiplos projetos corporativos para apoiar decisões executivas de realocação de orçamento e *squads*.
* **Referência Técnica da Sessão:**
  * [Atlassian – OKRs: The Ultimate Guide to Objectives and Key Results](https://www.atlassian.com/agile/agile-at-scale/okr).
