---
id: "m01-s08"
title: "Sessão 1.8 — MCPs e Automação para Devs"
module: 1
session: "1.8"
slug: "cap-08-mcps-e-automacao-devs"
estimatedMinutes: 140
status: "reviewed"
subtopics:
  - "Arquitetura do Model Context Protocol (Host, Client, Server e JSON-RPC 2.0)"
  - "Primitivas do MCP: Tools, Resources e Prompts"
  - "Automação de Testes E2E com Playwright MCP e Inspeção de DOM"
  - "Eliminação de Alucinações com Servidores MCP de Documentação (Context7)"
  - "Navegação Web, Busca e Extração Estruturada (Fetch, Brave Search e Firecrawl MCP)"
  - "Orquestração Visual Bidirecional com n8n (MCP Client Tool e MCP Server Trigger)"
official_docs:
  - title: "Model Context Protocol (MCP) – Core Architecture"
    url: "https://modelcontextprotocol.io/docs/concepts/architecture"
    section: "Core Architecture & JSON-RPC 2.0 Lifecycle"
  - title: "Model Context Protocol – Quickstart for Users & Devs"
    url: "https://modelcontextprotocol.io/quickstart"
    section: "Quickstart for Server & Client Developers"
  - title: "Model Context Protocol – Official Servers Repository"
    url: "https://github.com/modelcontextprotocol/servers"
    section: "Playwright/Puppeteer, Fetch, Filesystem, Git e Postgres MCPs"
  - title: "n8n Documentation – MCP Client Tool & MCP Server Trigger"
    url: "https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolmcp/"
    section: "MCP Client Tool & Server Trigger in n8n AI Agents"
media:
  audio_notebooklm: null
  video_url: "https://www.youtube.com/watch?v=gc9MEMdOZxM"
  videos:
    - title: "Model Context Protocol: Guia que todo Dev precisa saber"
      channel: "Full Cycle"
      url: "https://www.youtube.com/watch?v=gc9MEMdOZxM"
    - title: "Model Context Protocol (MCP) explicado: o \"USB-C\" da IA para integrar LLMs a dados e ferramentas"
      channel: "Vini Lana"
      url: "https://www.youtube.com/watch?v=hsO63OTyeTc"
---

# Sessão 1.8: MCPs e Automação para Devs

> **Unidade 4 — Conectando a IA do Desenvolvedor ao Mundo Externo**  
> Um Large Language Model isolado dentro de uma janela de chat é como um processador de última geração desconectado do barramento de entrada e saída (I/O): por mais sofisticado que seja seu raciocínio interno, ele não enxerga o DOM renderizado da sua aplicação no navegador, não consulta a documentação lançada ontem de uma biblioteca, não inspeciona tabelas reais do seu banco PostgreSQL e não aciona pipelines de automação corporativa. Nesta sessão, dominaremos o **Model Context Protocol (MCP)** — o padrão aberto que transformou IDEs AI-First e orquestradores como o **n8n** em plataformas universais de automação para engenharia de software.

---

<a id="arquitetura-mcp"></a>
## 1. Arquitetura do Model Context Protocol (MCP)

Antes da introdução do **Model Context Protocol (MCP)** pela Anthropic no final de 2024 como um padrão aberto, a indústria de engenharia de software assistida por IA enfrentava o clássico problema de integração $M \times N$. Existiam $M$ aplicações hospedeiras de IA (Cursor, Windsurf, VS Code Copilot, Claude Desktop, agentes customizados em LangChain, workflows do n8n) e $N$ fontes de contexto ou ferramentas externas (Playwright, GitHub, PostgreSQL, Sentry, motores de busca, APIs de documentação). Sem um protocolo unificado, cada IDE precisava escrever e manter conectores proprietários para cada ferramenta externa, gerando fragmentação, duplicação de esforço e acoplamento rígido.

O **MCP** resolve esse gargalo transformando uma matriz $M \times N$ em uma equação linear $M + N$. Assim como o protocolo **LSP (*Language Server Protocol*)** padronizou a comunicação entre qualquer editor de código e qualquer analisador léxico/semântico de linguagem, e assim como o conector **USB-C** padronizou o barramento físico de periféricos, o MCP define uma interface universal baseada em **JSON-RPC 2.0** para que qualquer servidor de contexto ou ferramenta possa ser plugado instantaneamente em qualquer Host compatível.

![Arquitetura do Model Context Protocol (MCP) e os Pilares de Automação Dev](../assets/cap-08-mcp-architecture-flow.png)

### Os Três Atores da Topologia MCP

Conforme especificado na documentação oficial (*Model Context Protocol – Core Architecture*), a topologia de execução divide responsabilidades estritas entre três componentes:

1. **MCP Host (Aplicação Hospedeira):** É a aplicação de face para o usuário onde o modelo de linguagem opera — como o **Cursor IDE**, o **Windsurf**, o **Claude Desktop** ou um agente em execução no **n8n**. O Host gerencia a interface de usuário, a janela de contexto do LLM, as políticas de permissão (*human-in-the-loop* para aprovar execuções sensíveis) e o ciclo de vida de múltiplos clientes MCP.
2. **MCP Client (Cliente de Protocolo):** Instanciado internamente pelo Host, cada **MCP Client** mantém uma conexão dedicada na proporção **1:1 (um para um)** com um único **MCP Server**. O Client é responsável pela negociação de capacidades (*capability negotiation*), serialização de mensagens JSON-RPC 2.0, roteamento de chamadas de ferramentas solicitadas pelo LLM e gerenciamento de timeouts.
3. **MCP Server (Servidor de Contexto e Ferramentas):** É um programa leve e especializado (escrito em TypeScript/Node.js, Python, Go ou Rust, ou exposto visualmente via n8n) que encapsula uma fonte de dados ou capacidade externa — como controlar uma instância real do Chromium via Playwright, consultar o índice vetorial de documentações do Context7 ou executar queries parametrizadas em um banco local.

| Componente | Proporção na Sessão | Responsabilidade Primária | Exemplo Real no Fluxo Dev |
| :--- | :--- | :--- | :--- |
| **MCP Host** | $1$ por aplicação | Orquestrar o LLM, agregar contextos e solicitar aprovação do usuário | Cursor IDE, Windsurf, Claude Desktop, n8n Workflow |
| **MCP Client** | $1:1$ com cada Server | Manter sessão stateful JSON-RPC 2.0 e negociar capacidades | Módulo interno do Cursor que gerencia um subprocesso MCP |
| **MCP Server** | $N$ servidores ativos | Expor `Tools`, `Resources` e `Prompts` padronizados | `@playwright/mcp`, `@upstash/context7-mcp`, `n8n MCP Trigger` |

### Camada de Transporte e Ciclo de Vida JSON-RPC 2.0

Toda comunicação entre Client e Server no MCP utiliza o formato de mensagens **JSON-RPC 2.0** (requisições com `id`, respostas com `result` ou `error`, e notificações unidirecionais sem `id`). O protocolo define dois mecanismos principais de transporte:

* **Transporte Local via `stdio` (Standard Input / Standard Output):** O MCP Host inicia o MCP Server como um subprocesso filho local na máquina do desenvolvedor (ex.: `npx -y @playwright/mcp@latest`). As mensagens JSON-RPC 2.0 trafegam delimitadas por quebras de linha diretamente pelo `stdin` e `stdout` do processo, enquanto logs de diagnóstico devem obrigatoriamente ser escritos em `stderr` (usar `console.log` para debug dentro de um servidor `stdio` corrompe o stream JSON-RPC!). É o transporte ideal para ferramentas que precisam acessar o filesystem local, o navegador local ou portas `localhost`.
* **Transporte Remoto via `SSE` (*Server-Sent Events*) / `Streamable HTTP`:** Utilizado quando o servidor MCP roda remotamente em um container Docker, em um cluster corporativo ou em uma instância do **n8n**. O cliente envia mensagens via requisições `HTTP POST` e recebe streams de eventos e chamadas assíncronas do servidor, permitindo autenticação via cabeçalhos HTTP (`Authorization: Bearer <token>`).

O ciclo de vida de uma sessão MCP segue três fases determinísticas:

```json
// 1. FASE DE INICIALIZAÇÃO: Client -> Server (Negociação de versão e capabilities)
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": { "roots": { "listChanged": true }, "sampling": {} },
    "clientInfo": { "name": "cursor-ide", "version": "0.48.0" }
  }
}

// 2. RESPOSTA DO SERVIDOR: Server -> Client (Declara suporte a tools e resources)
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": { "listChanged": true },
      "resources": { "subscribe": false, "listChanged": false }
    },
    "serverInfo": { "name": "playwright-mcp-server", "version": "1.0.0" }
  }
}

// 3. CONFIRMAÇÃO: Client -> Server (Notificação sem ID liberando o tráfego operacional)
{
  "jsonrpc": "2.0",
  "method": "notifications/initialized"
}
```

Após o handshake, o Client invoca `tools/list` para descobrir o catálogo de ferramentas disponíveis (incluindo seus contratos **JSON Schema**), injeta essas definições no campo `tools` do LLM e, quando o modelo decide agir, envia um `tools/call` com os argumentos validados.

---

<a id="primitivas-mcp"></a>
## 2. As Três Primitivas do MCP: Tools, Resources e Prompts

Um erro comum ao iniciar com o Model Context Protocol é tratar todo servidor MCP apenas como um repositório de funções. Na arquitetura oficial, o protocolo separa claramente **três primitivas fundamentais** de acordo com **quem controla o acionamento**:

| Primitiva MCP | Quem Controla | Natureza da Operação | Métodos JSON-RPC 2.0 | Exemplo Prático em Engenharia de Software |
| :--- | :--- | :--- | :--- | :--- |
| **Resources** | **Aplicação (Host)** | Leitura passiva de dados (sem efeitos colaterais, análogo a um `GET`) | `resources/list`, `resources/read`, `resources/templates/list` | Ler o schema de uma tabela (`postgres://localhost/db/schema`) ou logs de erro (`file:///var/log/app.log`) |
| **Tools** | **Modelo (LLM)** | Execução ativa com parâmetros tipados e possíveis efeitos colaterais (`POST`/RPC) | `tools/list`, `tools/call` | Navegar com Playwright (`browser_navigate`), buscar docs (`get-library-docs`) ou disparar webhook n8n |
| **Prompts** | **Usuário (Dev)** | Templates reutilizáveis parametrizados expostos na UI (ex.: slash commands) | `prompts/list`, `prompts/get` | Comando `/auditar-pr` que pré-carrega o diff do Git e as regras de segurança da equipe |

### Anatomia de uma `Tool` no MCP

As **Tools** são a espinha dorsal da automação para desenvolvedores porque são **controladas pelo modelo** (*Model-controlled*). Quando o servidor responde ao método `tools/list`, cada ferramenta fornece três metadados críticos para o raciocínio do LLM:
1. `name`: Identificador único da operação (ex.: `browser_click`, `firecrawl_scrape`).
2. `description`: Explicação semântica precisa de **quando** e **como** o modelo deve acionar a ferramenta.
3. `inputSchema`: Um objeto **JSON Schema** estrito que define os parâmetros aceitos, tipos primitivos, descrições de campos e propriedades obrigatórias (`required`).

Se a execução da ferramenta falhar (por exemplo, um seletor DOM não encontrado pelo Playwright ou uma URL inacessível), o servidor MCP retorna `isError: true` dentro do objeto `result`, permitindo que o LLM leia a mensagem de erro estruturada e **auto-corrija** sua estratégia no próximo turno (*self-healing loop*).

---

<a id="testes-e2e-playwright-mcp"></a>
## 3. Pilar 1: Geração e Execução de Testes Automatizados com Playwright MCP

Durante anos, pedir a um LLM para escrever testes End-to-End (E2E) com Playwright ou Cypress produzia resultados frustrantes. O motivo é arquitetural: ao olhar apenas para o código-fonte estático (`.tsx` ou `.vue`), o modelo tenta adivinhar a estrutura do DOM final. Em aplicações modernas com componentes de bibliotecas terceiras (Radix UI, Shadcn, MUI), portais dinâmicos, estados assíncronos de hidratação e classes CSS utilitárias ofuscadas, o LLM frequentemente inventa seletores frágeis como `page.locator('.btn-submit-primary')` que falham imediatamente na execução real.

O **Playwright MCP** (`@playwright/mcp`, mantido oficialmente pela Microsoft, bem como o `@modelcontextprotocol/server-puppeteer` do repositório oficial de servidores MCP) revoluciona esse fluxo ao dar **olhos e mãos reais sobre o navegador** para o agente da sua IDE.

### Como o Playwright MCP Funciona por Dentro: Accessibility Tree vs. Pixels

Ao contrário de abordagens baseadas apenas em captura de tela (Vision/Screenshots), que consomem milhares de tokens de imagem e sofrem com imprecisão de coordenadas $(X, Y)$, o modo padrão do **Playwright MCP** opera sobre a **Árvore de Acessibilidade (*Accessibility Tree* / ARIA Snapshot)** do navegador renderizado:

1. Quando o agente invoca `browser_navigate` para `http://localhost:5173/checkout`, o servidor Playwright MCP abre uma instância real do Chromium (headless ou visível) e aguarda o carregamento da rede.
2. Em seguida, a ferramenta `browser_snapshot` extrai a árvore semântica do DOM vivo em formato YAML estruturado, atribuindo referências determinísticas (`ref`) a cada elemento interativo (botões, inputs, links, modais) junto com suas *roles* ARIA, *labels* e estados (`disabled`, `expanded`, `checked`).
3. O agente também pode invocar `browser_console_messages` para capturar exceções JavaScript em runtime e `browser_network_requests` para inspecionar falhas HTTP (`400 Bad Request`, `500 Internal Server Error`, CORS).
4. Com base nos elementos reais verificados no navegador, o agente interage com a página (`browser_click`, `browser_type`, `browser_select_option`) para validar a jornada do usuário e, só então, escreve o arquivo `.spec.ts` utilizando os seletores resilientes recomendados pela documentação oficial (`getByRole`, `getByLabel`, `getByTestId`).

### Configuração Prática e Fluxo de Automação E2E no Cursor / Windsurf

Para habilitar o Playwright MCP e os servidores essenciais no seu projeto, crie ou edite o arquivo `.cursor/mcp.json` (ou `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "-y",
        "@playwright/mcp@latest"
      ]
    },
    "context7": {
      "command": "npx",
      "args": [
        "-y",
        "@upstash/context7-mcp@latest"
      ]
    },
    "fetch": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-fetch"
      ]
    }
  }
}
```

Com o servidor `playwright` ativo no modo *Agent* da IDE, você pode executar um comando de engenharia completo como:

> *"Use o Playwright MCP para abrir `http://localhost:5173/login`, inspecione o snapshot do formulário real, teste o envio com credenciais inválidas verificando a mensagem de alerta e o log de rede, e em seguida gere a suíte completa `tests/e2e/auth.spec.ts` e rode `npx playwright test` até passar 100%."*

O código gerado pelo agente após inspecionar a árvore de acessibilidade real deixa de usar seletores inventados e passa a refletir exatamente a semântica verificada no DOM:

```typescript
// tests/e2e/auth.spec.ts — Gerado e validado via Playwright MCP sobre o DOM real
import { test, expect } from '@playwright/test';

test.describe('Fluxo de Autenticação Verificado via MCP', () => {
  test('deve exibir erro acessível ao submeter credenciais inválidas', async ({ page }) => {
    await page.goto('http://localhost:5173/login');

    // Seletores baseados na Accessibility Tree inspecionada via browser_snapshot
    await page.getByLabel('E-mail corporativo').fill('dev.invalido@empresa.com');
    await page.getByLabel('Senha').fill('SenhaErrada123!');
    await page.getByRole('button', { name: 'Entrar na Plataforma' }).click();

    // Verifica o alerta ARIA real capturado durante a exploração interativa do MCP
    const alertBanner = page.getByRole('alert');
    await expect(alertBanner).toBeVisible();
    await expect(alertBanner).toContainText('Credenciais inválidas ou conta bloqueada.');
  });
});
```

---

<a id="documentacao-atualizada-context7"></a>
## 4. Pilar 2: Consulta a Documentações Atualizadas com Context7 e Docs MCP

Todo modelo de linguagem possui uma **data de corte de conhecimento (*Knowledge Cutoff*)** congelada nos pesos do seu pré-treinamento. Na engenharia de software moderna, onde frameworks e SDKs lançam *breaking changes* a cada trimestre, essa limitação produz uma das maiores fontes de perda de tempo para o desenvolvedor: **alucinações por defasagem de versão**.

Exemplos clássicos que ocorrem quando o LLM codifica sem um MCP de documentação:
* Gerar configurações `tailwind.config.js` legadas quando o projeto utiliza **Tailwind CSS v4** (`@import "tailwindcss";` e diretiva `@theme`).
* Escrever rotas do **Next.js 15+** acessando `params.id` de forma síncrona quando a API oficial passou a exigir `const { id } = await params;`.
* Misturar assinaturas antigas do SDK da OpenAI, do Zod v3/v4 ou do Capacitor v7.

### Como o Context7 MCP Elimina Alucinações de API

Servidores MCP de documentação como o **Context7 (`@upstash/context7-mcp`)** conectam o agente diretamente a índices atualizados das documentações oficiais e exemplos de código específicos de cada versão. O protocolo de consulta opera através de duas ferramentas encadeadas:

1. **`resolve-library-id`:** Recebe o nome do pacote ou tecnologia (ex.: `"pgvector"`, `"next.js"`, `"@capacitor/android"`) e retorna o identificador canônico e as versões indexadas no Context7.
2. **`get-library-docs`:** Recebe o `context7CompatibleLibraryID` resolvido na etapa anterior, juntamente com um parâmetro `topic` opcional (ex.: `"HNSW indexing"`, `"app router dynamic params"`) e `tokens` (limite de tokens a recuperar), injetando os trechos exatos e atualizados da documentação oficial diretamente na janela de contexto antes que o LLM escreva uma única linha de código.

> **Dica de Engenharia Sênior:** Adicione uma regra no seu arquivo `.cursor/rules/mcp-docs.mdc` instruindo o agente: *"Sempre que for implementar ou atualizar integrações com bibliotecas externas, invoque primeiro as ferramentas `resolve-library-id` e `get-library-docs` do servidor MCP Context7 para verificar a sintaxe oficial da versão instalada no `package.json`."*

---

<a id="navegacao-web-scraping-mcp"></a>
## 5. Pilar 3: Navegação Web e Extração de Dados com Fetch, Brave Search e Firecrawl MCP

O terceiro pilar de automação para desenvolvedores consiste em trazer dados vivos da web — issues recém-abertas no GitHub, advisories de segurança (CVEs), changelogs de pacotes npm, tabelas de preços de APIs ou páginas de concorrentes — diretamente para dentro do fluxo de codificação em formato **Markdown limpo e estruturado para LLMs**.

Para escolher o servidor MCP correto para cada tarefa de engenharia, precisamos compreender a diferença técnica entre as três soluções principais do ecossistema:

| Servidor MCP | Ferramentas Expostas (`Tools`) | Renderiza JS (SPA)? | Caso de Uso Ideal no Fluxo de Engenharia |
| :--- | :--- | :--- | :--- |
| **Fetch MCP** (`@modelcontextprotocol/server-fetch`) | `fetch` (com `url`, `max_length`, `start_index`, `raw`) | Não (HTTP estático + parser HTML $\rightarrow$ Markdown) | Ler páginas estáticas, RFCs, READMEs brutos e artigos técnicos com paginação leve de tokens |
| **Brave Search MCP** (`@modelcontextprotocol/server-brave-search`) | `brave_web_search`, `brave_local_search` | Não (Motor de busca SERP API) | Pesquisar mensagens de erro obscuras, descobrir bibliotecas recentes e cruzar múltiplas fontes na web |
| **Firecrawl MCP** (`firecrawl-mcp`) | `firecrawl_scrape`, `firecrawl_crawl`, `firecrawl_search`, `firecrawl_extract` | **Sim** (Headless browser completo + limpeza de ruído) | Extrair documentações que usam SPAs pesadas, varrer múltiplos sublinks ou extrair JSON tipado via schema |

### Paginação Inteligente e Extração com Schema

Um detalhe técnico fundamental do servidor oficial **`@modelcontextprotocol/server-fetch`** é o controle de janela de contexto através dos parâmetros `max_length` (padrão de $5000$ caracteres) e `start_index`. Quando uma página de documentação ou especificação técnica é extensa, o servidor converte o HTML principal para Markdown (descartando scripts, estilos e menus de navegação) e informa ao agente em qual índice o conteúdo foi truncado. O LLM pode então chamar `fetch` novamente passando `start_index: 5000` para ler a continuação sob demanda, sem estourar o orçamento de tokens da conversa.

Já quando a aplicação alvo é uma Single-Page Application (SPA) que depende de execução JavaScript no cliente ou quando você precisa transformar dados de um portal web diretamente em um arquivo de seed JSON tipado para o seu sistema, o **Firecrawl MCP** (`npx -y firecrawl-mcp` com `FIRECRAWL_API_KEY`) permite acionar a ferramenta `firecrawl_extract` passando um `schema` JSON estrito, devolvendo os dados já higienizados e prontos para alimentar testes ou migrações de banco de dados.

---

<a id="orquestracao-visual-n8n-mcp"></a>
## 6. Orquestração Visual Bidirecional com n8n MCP

Enquanto o Cursor e o Windsurf operam na máquina local do desenvolvedor, empresas modernas possuem dezenas de sistemas satélites — Jira, Linear, GitHub Enterprise, Slack, PagerDuty, bancos de homologação, pipelines de CI/CD e CRMs. É exatamente aqui que entra o **n8n**, a plataforma líder de automação de workflows *fair-code* com suporte nativo ao **Model Context Protocol**.

Conforme documentado em *n8n Documentation – MCP Client Tool & MCP Server Trigger*, o n8n implementa uma **arquitetura MCP bidirecional**, podendo atuar simultaneamente como **Consumidor (MCP Client)** e como **Provedor (MCP Server)**:

### Modo A: n8n como Consumidor (`MCP Client Tool` Sub-Node)

Quando você constrói um workflow autônomo no n8n utilizando o nó **AI Agent** (baseado em LangChain *Tools Agent*), você pode acoplar a ele o sub-nó **`MCP Client Tool`** (`@n8n/n8n-nodes-langchain.toolMcp`).
* **Como funciona:** O nó `MCP Client Tool` conecta-se a qualquer servidor MCP externo — seja via transporte remoto **SSE / Streamable HTTP** (informando a URL do endpoint SSE e cabeçalhos Bearer de autenticação) ou via linha de comando **`stdio`** em instâncias self-hosted do n8n (habilitando a variável de ambiente `N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true` quando aplicável).
* **Descoberta Dinâmica de Ferramentas:** Ao iniciar a execução do agente no n8n, o sub-nó consulta automaticamente `tools/list` no servidor MCP conectado, permite selecionar todas as ferramentas (*All*) ou filtrar apenas uma lista autorizada (*Selected*), e disponibiliza essas ações para o LLM do agente n8n decidir qual chamar.

### Modo B: n8n como Provedor (`MCP Server Trigger` Node)

Esta é uma das arquiteturas mais poderosas para times de engenharia: transformar workflows visuais do n8n em **ferramentas MCP consumíveis diretamente de dentro do Cursor, Windsurf ou Claude Desktop**.
* **Como funciona:** Você adiciona o nó **`MCP Server Trigger`** como ponto de entrada de um workflow no n8n e conecta a ele um ou mais sub-nós de ferramentas (como **Custom n8n Workflow Tool**, nós de banco de dados Postgres, integrações com Jira, GitHub ou Slack).
* **Exposição via Endpoint SSE/HTTP:** O `MCP Server Trigger` gera uma URL de produção/teste (ex.: `https://n8n.suaempresa.com/mcp/devops-assistant/sse`) protegida por autenticação Header/Bearer.
* **Consumo na IDE do Desenvolvedor:** Ao registrar essa URL do n8n no `.cursor/mcp.json` da sua IDE, o agente de código ganha instantaneamente a capacidade de acionar workflows corporativos complexos — como provisionar um ambiente de staging, abrir um ticket formatado no Jira com os detalhes do bug recém-corrigido ou consultar métricas de produção — com uma única chamada `tools/call` auditada e governada pelo n8n!

---

<a id="laboratorio-mcp-servidor-customizado"></a>
## 7. Laboratório Prático: Construindo seu Próprio Servidor MCP em TypeScript e Integrando ao n8n

Para consolidar o domínio técnico da arquitetura MCP, vamos construir do zero um **Servidor MCP em Node.js/TypeScript** utilizando o SDK oficial `@modelcontextprotocol/sdk` e `zod`, capaz de auditar dependências do projeto e acionar um workflow do **n8n** para registro de relatórios técnicos.

### Passo 1: Inicialização e Instalação do SDK Oficial

```bash
mkdir dev-audit-mcp && cd dev-audit-mcp
npm init -y
npm install @modelcontextprotocol/sdk zod
npm install -D typescript @types/node tsx
```

### Passo 2: Implementação do Servidor MCP (`src/server.ts`)

Observe atentamente duas regras de ouro da especificação oficial no código abaixo:
1. Usamos `McpServer` e `StdioServerTransport` do pacote `@modelcontextprotocol/sdk`.
2. **Nunca usamos `console.log()`** em um servidor `stdio`, pois o canal `stdout` pertence exclusivamente ao tráfego de pacotes JSON-RPC 2.0. Todo log interno utiliza `console.error()` (`stderr`).

```typescript
// src/server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";

// 1. Instancia o servidor MCP declarando nome e versão semântica
const server = new McpServer({
  name: "dev-workspace-auditor",
  version: "1.0.0",
});

// 2. Registra uma TOOL controlada pelo LLM com validação via Zod (convertida para JSON Schema)
server.tool(
  "inspect_package_dependencies",
  "Lê o package.json de um diretório local e retorna a lista estruturada de dependencies e devDependencies para auditoria de versões.",
  {
    projectPath: z
      .string()
      .describe("Caminho absoluto para a raiz do projeto Node.js contendo o package.json"),
  },
  async ({ projectPath }) => {
    try {
      const pkgFile = path.join(projectPath, "package.json");
      const rawContent = await fs.readFile(pkgFile, "utf-8");
      const pkg = JSON.parse(rawContent);

      const report = {
        name: pkg.name ?? "unnamed-project",
        nodeEngine: pkg.engines?.node ?? "unspecified",
        dependencies: pkg.dependencies ?? {},
        devDependencies: pkg.devDependencies ?? {},
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(report, null, 2),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Retorno de erro padronizado no protocolo MCP (isError: true permite auto-correção pelo LLM)
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Falha ao ler package.json em '${projectPath}': ${message}`,
          },
        ],
      };
    }
  }
);

// 3. Registra uma segunda TOOL que dispara um webhook/workflow de automação no n8n
server.tool(
  "trigger_n8n_audit_workflow",
  "Envia o relatório de auditoria técnica da codebase para um workflow de automação do n8n.",
  {
    n8nWebhookUrl: z.string().url().describe("URL do Webhook ou endpoint n8n"),
    repositoryName: z.string().describe("Nome do repositório auditado"),
    findingsSummary: z.string().describe("Resumo em Markdown das vulnerabilidades ou melhorias encontradas"),
    severity: z.enum(["low", "medium", "high", "critical"]).describe("Nível de criticidade da auditoria"),
  },
  async ({ n8nWebhookUrl, repositoryName, findingsSummary, severity }) => {
    try {
      const response = await fetch(n8nWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repositoryName,
          findingsSummary,
          severity,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        content: [
          {
            type: "text",
            text: `Workflow n8n acionado com sucesso para ${repositoryName} (Severidade: ${severity}).`,
          },
        ],
      };
    } catch (err) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Erro ao acionar workflow do n8n: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
      };
    }
  }
);

// 4. Conecta o servidor ao transporte stdio e inicia o loop de escuta JSON-RPC 2.0
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // IMPORTANTE: Sempre usar console.error (stderr) para não corromper o stdout JSON-RPC
  console.error("[dev-workspace-auditor] Servidor MCP iniciado via stdio.");
}

main().catch((error) => {
  console.error("Erro fatal ao iniciar servidor MCP:", error);
  process.exit(1);
});
```

### Passo 3: Testando com o MCP Inspector e Conectando ao Cursor e ao n8n

Antes de plugar o servidor na IDE, a documentação oficial recomenda validá-lo com o **MCP Inspector**, uma interface visual interativa que simula um MCP Client para inspecionar `tools/list`, testar chamadas `tools/call` e visualizar os pacotes JSON-RPC 2.0 brutos:

```bash
npx @modelcontextprotocol/inspector npx tsx src/server.ts
```

Para disponibilizar simultaneamente o seu servidor local e um servidor remoto do **n8n** (`MCP Server Trigger`) no Cursor IDE, basta configurar o `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "dev-workspace-auditor": {
      "command": "npx",
      "args": ["tsx", "C:/projetos/dev-audit-mcp/src/server.ts"]
    },
    "n8n-devops-hub": {
      "url": "http://localhost:5678/mcp/devops-assistant/sse",
      "headers": {
        "Authorization": "Bearer SEU_TOKEN_SEGURO_N8N"
      }
    }
  }
}
```

Com essa arquitetura em operação, seu agente de IA deixa de ser um gerador de texto isolado: ele inspeciona as dependências reais do projeto via `inspect_package_dependencies`, consulta a documentação atualizada das bibliotecas via **Context7 MCP**, valida a interface renderizada no navegador via **Playwright MCP** e aciona pipelines corporativos via **n8n MCP** — fechando o ciclo completo da engenharia de software automatizada por IA.

---

## Resumo Técnico da Sessão 1.8

1. **Padronização $M + N$:** O **Model Context Protocol (MCP)** substitui integrações fragmentadas por um protocolo aberto baseado em **JSON-RPC 2.0**, conectando **MCP Hosts** (IDEs/Agentes) a **MCP Servers** através de **MCP Clients** dedicados ($1:1$).
2. **Transportes `stdio` vs. `SSE / Streamable HTTP`:** Processos locais comunicam-se via `stdin`/`stdout` (exigindo que logs de debug usem `stderr`), enquanto servidores remotos e instâncias do **n8n** operam sobre HTTP com suporte a cabeçalhos de autenticação.
3. **Três Primitivas com Fronteiras de Controle:** `Resources` são dados de leitura controlados pela aplicação; `Tools` são ações executáveis controladas autonomamente pelo modelo via JSON Schema; `Prompts` são templates acionados pelo usuário.
4. **Três Pilares Dev + n8n:** **Playwright MCP** elimina testes E2E cegos ao operar sobre a *Accessibility Tree* real do DOM; **Context7 MCP** elimina alucinações de versão injetando documentações atualizadas; **Fetch / Brave / Firecrawl MCP** extraem dados vivos da web em Markdown/JSON; e o **n8n** integra workflows visuais bidirecionalmente via `MCP Client Tool` e `MCP Server Trigger`.
