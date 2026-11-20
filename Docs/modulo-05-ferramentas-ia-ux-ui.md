# Módulo 05: Ferramentas de IA para UX & UI

> **Etapa do Curso:** Trilha 2 – IA Aplicada ao Ciclo de Produto & Ops (Etapa 5 de 12)  
> **Carga Horária Sugerida:** 20 horas  
> **Foco Técnico:** AI-Driven UX/UI, Prototipação Text-to-UI, Conversão Figma para Código com Firebase Studio, Desenvolvimento Front-End Agêntico via Gemini CLI, Testes E2E Autônomos via MCP (`mcpui.dev`) e Integração de IA no Cliente/Servidor com Firebase AI Logic.

---

## Mapa de Documentações Oficiais do Módulo

| Ferramenta / Tecnologia | Documentação Oficial | Seções Específicas Recomendadas para Esta Etapa |
| :--- | :--- | :--- |
| **Firebase Studio (Project IDX)** | [firebase.google.com/docs/studio](https://firebase.google.com/docs/studio) | [Import Figma Designs to Code](https://firebase.google.com/docs/studio/figma), [App Prototyping Agent](https://firebase.google.com/docs/studio/prototyping), [Preview & Deploy Web Apps](https://firebase.google.com/docs/studio) |
| **Firebase AI Logic (Vertex AI in Firebase)** | [firebase.google.com/docs/ai-logic](https://firebase.google.com/docs/ai-logic) | [Get Started with Web SDK (`firebase/ai`)](https://firebase.google.com/docs/ai-logic/get-started), [Security & Firebase App Check](https://firebase.google.com/docs/ai-logic/app-check), [Function Calling & Multimodal in Client](https://firebase.google.com/docs/ai-logic/function-calling) |
| **Gemini CLI** | [github.com/google-gemini/gemini-cli](https://github.com/google-gemini/gemini-cli) | [Installation & Authentication](https://github.com/google-gemini/gemini-cli#quickstart), [Project Context (`GEMINI.md`)](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/configuration.md), [Built-in Tools & MCP Integration](https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/mcp-server.md) |
| **MCP UI (`mcpui.dev`)** | [mcpui.dev](https://mcpui.dev/) | [Getting Started & UI Resources](https://mcpui.dev/), [Interactive UI Components over MCP](https://mcpui.dev/) |
| **Playwright MCP (Testes E2E)** | [github.com/microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) | [Accessibility Tree Snapshot Mode](https://github.com/microsoft/playwright-mcp#usage), [Agent-Driven E2E Testing](https://playwright.dev/docs/intro) |
| **Figma Dev Mode & MCP Server** | [help.figma.com](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to- the-Dev-Mode-MCP-Server) | [Guide to the Figma Dev Mode MCP Server](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Dev-Mode-MCP-Server) |

---

## Estrutura de Conteúdo por Sessão (Etapas da Disciplina)

---

### Sessão 5.1 (Unidade 1): A Revolução da IA no Design e Desenvolvimento de Interfaces
* **Posição na Etapa:** Unidade 1 – Mudança de paradigma no ciclo de produto digital.
* **Conteúdo Programático:**
  1. **Introdução ao Conceito de *AI-Driven UX/UI*:**
     * A transição de interfaces estáticas para interfaces adaptativas, generativas (*Generative UI*) e orientadas à intenção do usuário.
     * Como a IA elimina a barreira histórica de *handoff* entre Produto (PM), Design (UX/UI) e Engenharia Front-End.
  2. **Panorama de Ferramentas de IA em Cada Etapa do Processo:**
     * **Pesquisa e Discovery:** Síntese de entrevistas com usuários, geração de personas baseadas em dados, análise competitiva e mapeamento de jornadas.
     * **Ideação e Arquitetura de Informação:** Geração de fluxogramas de navegação, *sitemap* e *microcopy* contextual.
     * **Prototipação e Design Visual:** Geração de sistemas de tokens de design (cores, tipografia, espaçamento) e componentes interativos.
     * **Desenvolvimento e Teste:** Conversão de layouts em código semântico e automação agêntica de QA visual e funcional.
  3. **Análise de Casos de Uso Reais:**
     * Como equipes de engenharia de produto reduziram o ciclo "da ideia ao MVP funcional no ar" de semanas para horas.
* **Documentações Oficiais e Seções Específicas:**
  * [Google PAIR (People + AI Research) Guidebook](https://pair.withgoogle.com/guidebook/) – *Seções: User Needs + Defining Success, Mental Models e Feedback + Control*.

---

### Sessão 5.2 (Unidade 2): Prototipação e Geração de UI com Inteligência Artificial
* **Posição na Etapa:** Unidade 2 – Do prompt e do Figma diretamente para o código Front-End.
* **Conteúdo Programático:**
  1. **Text-to-UI (Wireframes e Mockups via Linguagem Natural):**
     * Técnicas de estruturação de prompts visuais e funcionais: especificando hierarquia visual, estados de componente (*loading*, *empty state*, *error*, *success*), responsividade (*mobile-first*) e tokens de Design System.
  2. **Mão na Massa – Do Figma ao Código com Firebase Studio:**
     * Fluxo de importação e sincronização de designs do **Figma** no **Firebase Studio** (e uso do Figma Dev Mode MCP).
     * Análise crítica do código gerado: estrutura do DOM, componentização (Angular/React/Web Components), fidelidade visual de CSS/Tailwind, responsividade e refatoração assistida.
  3. **Validação de Usabilidade e Acessibilidade com Modelos Multimodais:**
     * Utilizando LLMs com visão (Gemini Vision / Claude Vision) para auditar capturas de tela e árvore DOM da interface em busca de falhas de heurísticas de Nielsen, contraste de cores e conformidade **WCAG 2.1 AA** (ARIA labels, navegação por teclado).
* **Documentações Oficiais e Seções Específicas:**
  * [Firebase Studio – Import from Figma](https://firebase.google.com/docs/studio/figma) – *Passo a passo da conversão de frames do Figma para aplicação web*.
  * [Firebase Studio – App Prototyping Agent](https://firebase.google.com/docs/studio/prototyping).
  * [Figma Dev Mode MCP Server Official Guide](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Dev-Mode-MCP-Server).

---

### Sessão 5.3 (Unidade 3): Agentes de IA e CLI no Fluxo do Desenvolvedor Front-End
* **Posição na Etapa:** Unidade 3 – Produtividade máxima no terminal e na codebase Front-End.
* **Conteúdo Programático:**
  1. **Como Agentes de Codificação Operam no Ambiente Front-End:**
     * Leitura de árvore de componentes, inspeção de configurações (`tsconfig.json`, `angular.json`, `package.json`), execução de servidor de desenvolvimento e validação automática via compilador TypeScript e linter.
  2. **Mão na Massa com Gemini CLI no Desenvolvimento Front-End:**
     * **Scaffolding de Projetos:** Criação da arquitetura base de pastas, rotas, estados e tema visual via linha de comando.
     * **Geração de Componentes:** Criação de componentes complexos (tabelas com paginação/filtro, formulários reativos validados, modais acessíveis e gráficos) com seus respectivos testes unitários.
     * **Refatoração Guiada:** Migração de componentes legados, extração de *custom hooks* / *services* e otimização de bundle/performance (*lazy loading*, *memoization*).
     * Configuração do arquivo `GEMINI.md` na raiz do repositório para fixar os padrões de UI e arquitetura do projeto.
  3. **Boas Práticas de Prompt Engineering para Código Front-End (HTML, CSS, JS/TS):**
     * Como especificar contratos de propriedades (`Props`/`@Input()`), eventos (`@Output()`), estados assíncronos, semântica HTML5 e regras de estilização sem efeitos colaterais globais.
* **Documentações Oficiais e Seções Específicas:**
  * [Gemini CLI Official Documentation](https://github.com/google-gemini/gemini-cli) – *Seções: Configuration (`GEMINI.md`), Commands (`/init`, `/memory`, `/tools`) e Non-interactive mode*.

---

### Sessão 5.4 (Unidade 4): Automação e Interação Inteligente com a UI via MCP
* **Posição na Etapa:** Unidade 4 – A convergência entre interfaces gráficas e protocolos agênticos.
* **Conteúdo Programático:**
  1. **Automação de Testes End-to-End (E2E) com Agentes Autônomos e MCP:**
     * Por que testes E2E tradicionais quebram a cada mudança de classe CSS ou seletor XPath.
     * Agentes de QA que consomem o contexto semântico da aplicação via MCP (e *Accessibility Tree* via Playwright MCP) para executar jornadas completas de usuário orientadas a objetivos (ex.: *"Faça login, adicione um item ao carrinho, aplique um cupom inválido e verifique se a mensagem de erro aparece"*).
  2. **Discussão e Prática com `mcpui.dev`:**
     * Como o padrão **MCP-UI** permite que servidores MCP exponham e renderizem interfaces ricas e interativas, e como aplicações front-end expõem seu estado e ações via MCP.
     * Utilizando o ambiente do `mcpui.dev` e o MCP Inspector para visualizar, depurar e interagir em tempo real com o contexto exposto pela interface da aplicação.
* **Documentações Oficiais e Seções Específicas:**
  * [MCP-UI Documentation (`mcpui.dev`)](https://mcpui.dev/) – *Seções: Architecture, Client/Server SDKs e Interactive UI Resources*.
  * [Microsoft Playwright MCP Server](https://github.com/microsoft/playwright-mcp) – *Seção: Snapshot mode vs Vision mode for deterministic UI automation*.

---

### Sessão 5.5 (Unidade 5): Integração de Lógica de IA no Cliente e no Servidor
* **Posição na Etapa:** Unidade 5 (Projeto Prático Final do Módulo) – Aplicações web inteligentes em produção.
* **Conteúdo Programático:**
  1. **Consumindo APIs de IA a partir do Front-End – Arquitetura e Segurança:**
     * O risco crítico de expor `API_KEY` no bundle JavaScript do navegador.
     * Quando processar no cliente (WebGPU/Chrome Built-in AI Gemini Nano), quando usar BFF (*Backend-for-Frontend*) e quando usar SDKs gerenciados seguros.
  2. **Dominando o Firebase AI Logic:**
     * Como o **Firebase AI Logic** permite chamar os modelos Gemini/Imagen diretamente da aplicação web/mobile com proteção de borda via **Firebase App Check** (bloqueando chamadas de clientes não autorizados ou scripts maliciosos), *Remote Config* (troca dinâmica de modelo/system prompt sem redeploy do front-end) e controle de cotas.
  3. **Desenvolvimento de Features Inteligentes de Produto:**
     * **Busca Semântica e Filtros em Linguagem Natural:** Convertendo frases do usuário (ex.: *"tênis de corrida leve até R$ 400"*) em filtros estruturados da UI em tempo real.
     * **Chatbots Contextuais Co-Navegadores:** Assistentes que leem o estado atual da tela e podem preencher formulários ou acionar ações da UI via *Function Calling*.
     * **Personalização Dinâmica de Conteúdo:** Adaptação da interface em tempo real de acordo com o perfil e intenção do usuário.
  4. **Projeto Mão na Massa:**
     * Construção e deploy de uma aplicação web completa que utiliza lógica de IA gerenciada pelo **Firebase AI Logic** para processar inputs multimodais do usuário com streaming na UI.
* **Documentações Oficiais e Seções Específicas:**
  * [Firebase AI Logic – Get Started for Web](https://firebase.google.com/docs/ai-logic/get-started?platform=web) – *Seções: Initialize the SDK, Generate text/stream e Multimodal inputs*.
  * [Firebase AI Logic – Protect API Calls with App Check](https://firebase.google.com/docs/ai-logic/app-check) – *Seção: Enforcing App Check in production*.
  * [Firebase AI Logic – Dynamic Configuration with Remote Config](https://firebase.google.com/docs/ai-logic/remote-config).
