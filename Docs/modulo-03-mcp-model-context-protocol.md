# Módulo 03: MCP – Model Context Protocol

> **Etapa do Curso:** Trilha 1 – Fundação & Core AI Engineering (Etapa 3 de 12)  
> **Carga Horária Sugerida:** 25 horas  
> **Foco Técnico:** Especificação Oficial do Model Context Protocol (MCP), Arquitetura Host-Client-Server, SDK TypeScript/JavaScript, Exposição de Sistemas Corporativos (AI-Ready Enterprise), Segurança e Governança (Service Tokens, Rate Limiting, WAF) e Implementação Completa em Produção (Server + Back-end + Front-end UI + Multi-Client).

---

## Mapa de Documentações Oficiais do Módulo

| Componente / Padrão | Documentação Oficial | Seções Específicas Recomendadas para Esta Etapa |
| :--- | :--- | :--- |
| **MCP Official Specification** | [modelcontextprotocol.io](https://modelcontextprotocol.io/introduction) | [Specification (2025-03-26 / Latest)](https://modelcontextprotocol.io/specification/latest), [Core Architecture](https://modelcontextprotocol.io/docs/concepts/architecture), [Transports (`stdio`, Streamable HTTP / SSE)](https://modelcontextprotocol.io/docs/concepts/transports) |
| **Primitivas do MCP** | [modelcontextprotocol.io/docs/concepts](https://modelcontextprotocol.io/docs/concepts/resources) | [Resources](https://modelcontextprotocol.io/docs/concepts/resources), [Prompts](https://modelcontextprotocol.io/docs/concepts/prompts), [Tools](https://modelcontextprotocol.io/docs/concepts/tools), [Sampling](https://modelcontextprotocol.io/docs/concepts/sampling), [Roots](https://modelcontextprotocol.io/docs/concepts/roots) |
| **MCP TypeScript SDK** | [github.com/modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk) | [Creating a Server (`McpServer`)](https://github.com/modelcontextprotocol/typescript-sdk#server), [Creating a Client](https://github.com/modelcontextprotocol/typescript-sdk#client), [Streamable HTTP / Express Integration](https://github.com/modelcontextprotocol/typescript-sdk#streamable-http) |
| **MCP Inspector (Debugging)** | [modelcontextprotocol.io/docs/tools/inspector](https://modelcontextprotocol.io/docs/tools/inspector) | [Inspecting Servers Locally & Remotely](https://modelcontextprotocol.io/docs/tools/inspector) |
| **MCP Authorization & Security** | [modelcontextprotocol.io/specification](https://modelcontextprotocol.io/specification/latest/basic/authorization) | [Authorization (OAuth 2.1 / Bearer Tokens)](https://modelcontextprotocol.io/specification/latest/basic/authorization), [Security Best Practices](https://modelcontextprotocol.io/specification/latest/basic/security_best_practices) |
| **Zod (Schema Validation)** | [zod.dev](https://zod.dev/) | [Primitives & Objects](https://zod.dev/?id=objects), [`.describe()` for LLM Tool Metadata](https://zod.dev/?id=describe) |

---

## Estrutura de Conteúdo por Sessão (Etapas da Disciplina)

---

### Sessão 3.1: Visão Geral e Arquitetura do Model Context Protocol (MCP)
* **Posição na Etapa:** Unidade 1 – Fundamentos arquiteturais do padrão aberto.
* **Conteúdo Programático:**
  1. **Por que o MCP Está Ganhando Tanta Tração:**
     * O problema histórico $N \times M$: conectar $N$ aplicações/modelos de IA a $M$ fontes de dados/ferramentas exigia conectores customizados para cada par.
     * A analogia do "USB-C para aplicações de IA": um protocolo único baseado em **JSON-RPC 2.0** que desacopla quem fornece o contexto (MCP Server) de quem consome o contexto (MCP Host/Client).
  2. **A Tríade Arquitetural do MCP:**
     * **MCP Host:** A aplicação onde o usuário interage (ex.: Cursor, Windsurf, Claude Desktop, sua aplicação web/back-end).
     * **MCP Client:** O conector instanciado dentro do Host que mantém uma sessão $1:1$ com um servidor específico e negocia capacidades (*capability negotiation*).
     * **MCP Server:** O programa leve que expõe dados e funcionalidades de um sistema local ou remoto seguindo a especificação.
* **Documentações Oficiais e Seções Específicas:**
  * [MCP Core Architecture](https://modelcontextprotocol.io/docs/concepts/architecture) – *Seções: Protocol layer, Lifecycle (Initialization, Message exchange, Termination)*.
  * [MCP Specification – Lifecycle & JSON-RPC Messages](https://modelcontextprotocol.io/specification/latest/basic/lifecycle).

---

### Sessão 3.2: Integração Padronizada de LLMs com MCP e suas Primitivas
* **Posição na Etapa:** Unidade 1 – As 3 primitivas do servidor e 2 do cliente.
* **Conteúdo Programático:**
  1. **Padronização de Entrada, Saída e Contexto:**
     * **Resources (Controlados pela Aplicação):** Dados somente-leitura expostos via URIs (ex.: `postgres://db/users/schema`, `file:///logs/app.log`) que podem ser anexados ao contexto como arquivos ou assinados (*subscriptions*) para atualizações em tempo real.
     * **Prompts (Controlados pelo Usuário):** Templates reutilizáveis e fluxos padronizados (ex.: *slash commands* `/analisar-incidente` ou `/revisar-pr`) parametrizados pelo servidor.
     * **Tools (Controladas pelo Modelo):** Funções executáveis que permitem ao LLM realizar cálculos, consultar bancos de dados ou disparar efeitos colaterais em APIs externas.
     * **Sampling & Roots (No Cliente):** Como um servidor MCP pode solicitar uma conclusão ao LLM do Host (*Sampling*) respeitando os limites de diretório (*Roots*).
  2. **Camadas de Transporte:**
     * `stdio` (Standard Input/Output): ideal para processos locais e ferramentas de CLI/IDE.
     * `Streamable HTTP` / `HTTP with SSE`: ideal para servidores MCP remotos, microsserviços corporativos e multi-usuários.
* **Documentações Oficiais e Seções Específicas:**
  * [MCP Concepts – Resources](https://modelcontextprotocol.io/docs/concepts/resources), [Prompts](https://modelcontextprotocol.io/docs/concepts/prompts) e [Tools](https://modelcontextprotocol.io/docs/concepts/tools).
  * [MCP Transports Specification](https://modelcontextprotocol.io/docs/concepts/transports) – *Seções: Standard Input/Output (stdio) e Streamable HTTP*.

---

### Sessão 3.3: MCPs vs. Tools Tradicionais (Function Calling Proprietário)
* **Posição na Etapa:** Unidade 1 – Decisão arquitetural em sistemas de IA.
* **Conteúdo Programático:**
  1. **Diferenças Estruturais:**
     * *Tools Tradicionais (OpenAI/Gemini/Anthropic Function Calling):* Acopladas ao código da aplicação consumidora; a definição do schema JSON e a implementação da função vivem dentro do mesmo repositório do agente.
     * *MCP:* Desacoplamento em nível de processo/rede com descoberta dinâmica (`tools/list`, `resources/list`), versionamento independente e portabilidade imediata entre qualquer cliente compatível com MCP.
  2. **Framework de Decisão (Quando Usar Cada Um):**
     * Quando manter uma *Tool* local simples (funções internas exclusivas de um único agente sem reuso).
     * Quando construir um **MCP Server** (serviços compartilhados entre múltiplos times, agentes, IDEs e provedores de LLM).
* **Documentações Oficiais e Seções Específicas:**
  * [MCP Tools Concept & Comparison](https://modelcontextprotocol.io/docs/concepts/tools) – *Seção: Discovery (`tools/list`) vs Invocation (`tools/call`)*.

---

### Sessão 3.4: MCP em JavaScript e TypeScript
* **Posição na Etapa:** Unidade 2 – Engenharia de código com o SDK oficial `@modelcontextprotocol/sdk`.
* **Conteúdo Programático:**
  1. **Criando Servidores MCP com TypeScript:**
     * Setup de projeto TypeScript moderno com `@modelcontextprotocol/sdk` e `zod`.
     * Registro declarativo de ferramentas (`server.tool()`), recursos com templates de URI dinâmicos (`ResourceTemplate`) e prompts (`server.prompt()`).
     * Tratamento estruturado de erros no protocolo (`isError: true` no conteúdo da ferramenta vs. erros de protocolo JSON-RPC).
  2. **Consumindo Servidores MCP em Clientes JavaScript:**
     * Uso da classe `Client` do SDK para conectar via `StdioClientTransport` ou `StreamableHTTPClientTransport` / `SSEClientTransport`.
     * Ponte dinâmica (*Adapter*): convertendo a resposta de `client.listTools()` automaticamente para o formato `tools` das APIs da OpenAI, Anthropic ou Gemini.
  3. **Boas Práticas de Organização de Código:**
     * Separação em camadas: `transports/`, `tools/`, `resources/`, `prompts/`, `services/` e validação rigorosa de schemas.
     * Depuração visual interativa usando o `npx @modelcontextprotocol/inspector`.
* **Documentações Oficiais e Seções Específicas:**
  * [MCP TypeScript SDK Official README](https://github.com/modelcontextprotocol/typescript-sdk) – *Seções: Quickstart Server, Dynamic Servers e Writing MCP Clients*.
  * [MCP Quickstart for Server Developers (Node.js)](https://modelcontextprotocol.io/quickstart/server) – *Selecione a aba Node.js/TypeScript*.
  * [MCP Inspector Tool Guide](https://modelcontextprotocol.io/docs/tools/inspector).

---

### Sessão 3.5: Transformando sua Empresa em um "MCP" (AI-Ready Enterprise)
* **Posição na Etapa:** Unidade 3 – Arquitetura corporativa orientada a contexto.
* **Conteúdo Programático:**
  1. **Expondo Domínios Internos via MCP:**
     * Como desenhar servidores MCP de domínio para **CRM** (consulta de clientes, histórico de vendas), **Billing** (faturas, status de assinatura), **Suporte** (tickets, base de conhecimento) e **Dados de Produto/Analytics** (métricas de uso, logs).
  2. **Desenhando uma Camada "AI-Ready" sobre toda a Stack da Empresa:**
     * Padrão *MCP Gateway / Registry Interno*: catálogo centralizado onde qualquer agente autorizado ou colaborador (via IDE/Chat interno) descobre e consome capacidades de negócio sem precisar escrever integrações ponto a ponto.
     * Princípios de design de ferramentas corporativas: granularidade semântica (evitar expor endpoints CRUD crus de 50 campos; expor ações orientadas à intenção de negócio com descrições semânticas ricas).
* **Documentações Oficiais e Seções Específicas:**
  * [MCP Server Design Best Practices](https://modelcontextprotocol.io/docs/concepts/tools#best-practices) – *Seção: Tool definition & security considerations*.

---

### Sessão 3.6: Segurança e Governança em MCPs
* **Posição na Etapa:** Unidade 4 – Protegendo a fronteira entre LLMs e sistemas críticos.
* **Conteúdo Programático:**
  1. **Autenticação, Autorização e Service Tokens:**
     * Implementação do fluxo de autorização da especificação MCP (OAuth 2.1 e *Service Tokens* / Bearer Tokens em servidores HTTP).
     * Propagação de identidade (*On-Behalf-Of*): garantindo que o servidor MCP execute ações com as permissões exatas do usuário logado (RBAC), e nunca com uma conta *super-admin* global.
  2. **Rate Limiting e Controle de Custos/Abusos:**
     * Proteção contra *Agent Runaway Loops* (quando um agente entra em loop chamando uma tool MCP centenas de vezes por minuto).
     * Implementação de *Rate Limiting* por token/usuário, *quotas* por janela de tempo e *circuit breakers* em operações de escrita.
  3. **Web Application Firewall (WAF) e Proteções de Borda para MCP:**
     * Como proteger servidores MCP expostos via HTTP contra **Indirect Prompt Injection** (dados vindos de fontes externas que tentam sequestrar a próxima chamada de tool do agente), *SSRF*, *SQL Injection* em parâmetros gerados pelo LLM e exfiltração de dados sensíveis.
     * Auditoria completa: logging estruturado de quem chamou qual tool, com quais argumentos e qual resultado retornou.
* **Documentações Oficiais e Seções Específicas:**
  * [MCP Specification – Authorization](https://modelcontextprotocol.io/specification/latest/basic/authorization) – *Seções: OAuth 2.1 Authorization Flow e Token Handling*.
  * [MCP Specification – Security Best Practices](https://modelcontextprotocol.io/specification/latest/basic/security_best_practices).

---

### Sessão 3.7: Casos de Uso Reais e Cenários Práticos de Aplicação
* **Posição na Etapa:** Unidade 3 & 4 – Estudo de arquiteturas aplicadas.
* **Conteúdo Programático:**
  1. **Conectando IA a Sistemas Legados:**
     * Encapsulamento de sistemas legados (bancos relacionais antigos, serviços SOAP, ERPs internos) por trás de um servidor MCP moderno em TypeScript sem alterar o código legado.
  2. **Três Cenários Práticos de Aplicação:**
     * **Plugins e Agentes Inteligentes Consumindo MCPs:** Agentes de atendimento e operações que combinam múltiplos MCPs em uma mesma sessão.
     * **Integrações com IDEs (Copilots Customizados):** Equipando o Cursor/VS Code do time de engenharia com um MCP interno que conhece os microsserviços, flags de feature, esquemas do banco e logs de erro da empresa.
     * **Conexões com Sistemas Corporativos (ERP, CRM, Suporte, Analytics):** Fluxos transversais (ex.: cruzar um chamado de suporte com o status financeiro no ERP e logs técnicos no Datadog/Sentry via 3 MCPs combinados).
* **Documentações Oficiais e Seções Específicas:**
  * [Model Context Protocol – Example Clients & Ecosystem](https://modelcontextprotocol.io/clients) – *Matriz de suporte de Tools, Resources e Prompts nos principais clientes*.

---

### Sessão 3.8: Hands-on – Do Zero ao MCP em Produção
* **Posição na Etapa:** Unidade 5 (Projeto Prático Completo do Módulo).
* **Conteúdo Programático:**
  1. **Etapa 1 – Criação do MCP Server do Zero:**
     * Construção de um servidor MCP em TypeScript com transporte duplo (`stdio` e `Streamable HTTP`), expondo *Resources*, *Prompts* e *Tools* com validação Zod, autenticação via *Service Token* e *Rate Limiting*.
  2. **Etapa 2 – Integração com Back-End e Front-End (UI):**
     * Construção de um Back-end orquestrador (MCP Client + LLM) e uma interface Front-end (UI) que exibe as ferramentas MCP conectadas, solicita confirmação humana para tools sensíveis e renderiza os resultados em tempo real.
  3. **Etapa 3 – Testes Multi-Client e Composição de MCPs:**
     * Validação do mesmo MCP Server no **MCP Inspector**, em uma IDE (**Cursor/Windsurf**) e na aplicação Web própria, compondo seu funcionamento em conjunto com um segundo servidor MCP (ex.: Postgres MCP ou Filesystem MCP).
* **Documentações Oficiais e Seções Específicas:**
  * [MCP Quickstart for Client Developers](https://modelcontextprotocol.io/quickstart/client) – *Implementação completa do loop LLM + MCP Client*.
  * [MCP TypeScript SDK – Streamable HTTP Server Examples](https://github.com/modelcontextprotocol/typescript-sdk#streamable-http).
