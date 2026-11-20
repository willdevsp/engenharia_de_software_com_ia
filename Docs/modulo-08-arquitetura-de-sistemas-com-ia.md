# Módulo 08: Arquitetura de Sistemas com IA

> **Etapa do Curso:** Trilha 3 – Arquitetura Enterprise, Dados & Governança (Etapa 8 de 12)  
> **Carga Horária Sugerida:** 30 horas  
> **Foco Técnico:** Arquitetura AI-First vs. Tradicional, Os 5 Padrões de Sistemas Inteligentes, Decision Framework (IA vs. Regras Determinísticas), Arquiteturas Single-Agent e Multi-Agent Distribuídas (Filas e Mensageria em JS), Padrões de Design AI-Específicos (Hybrid/Multi-Index/Agentic RAG, Model/Intent Router, Semantic/Prompt Cache, HITL) e Arquitetura Enterprise (AI API Gateway, Kubernetes, Model Tiering e Observabilidade).

---

## Mapa de Documentações Oficiais do Módulo

| Componente Arquitetural | Documentação Oficial | Seções Específicas Recomendadas para Esta Etapa |
| :--- | :--- | :--- |
| **Filas e Mensageria Assíncrona (BullMQ / Redis)** | [docs.bullmq.io](https://docs.bullmq.io/) / [redis.io/docs](https://redis.io/docs/latest/) | [BullMQ Flows (Parent-Child Agent Dependencies)](https://docs.bullmq.io/guide/flows), [Workers & Concurrency](https://docs.bullmq.io/guide/workers), [Redis Vector Search & Semantic Caching](https://redis.io/docs/latest/develop/interact/search-and-query/advanced-concepts/vectors/) |
| **LangGraph.js (Single & Multi-Agent)** | [langchain-ai.github.io/langgraphjs](https://langchain-ai.github.io/langgraphjs/) | [Agent Architectures](https://langchain-ai.github.io/langgraphjs/concepts/agentic_concepts/), [Subgraphs & Handoffs](https://langchain-ai.github.io/langgraphjs/how-tos/subgraph/), [Agentic RAG Tutorial](https://langchain-ai.github.io/langgraphjs/tutorials/rag/langgraph_agentic_rag/) |
| **AI Gateways (LiteLLM / Kong / Cloudflare AI Gateway)** | [docs.litellm.ai](https://docs.litellm.ai/) / [developers.cloudflare.com/ai-gateway](https://developers.cloudflare.com/ai-gateway/) | [Model Routing, Fallbacks & Load Balancing](https://docs.litellm.ai/docs/routing), [Caching, Rate Limiting & Analytics](https://developers.cloudflare.com/ai-gateway/features/) |
| **OpenTelemetry GenAI Semantic Conventions** | [opentelemetry.io/docs](https://opentelemetry.io/docs/specs/semconv/gen-ai/) | [Semantic Conventions for Generative AI Systems (`gen_ai.*`)](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/), [GenAI Metrics (TTFT, Token Usage)](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-metrics/) |
| **Busca Híbrida & Reranking (pgvector / Cohere / Qdrant)** | [qdrant.tech/documentation](https://qdrant.tech/documentation/) / [docs.cohere.com](https://docs.cohere.com/docs/rerank-2) | [Hybrid Search (Dense + Sparse/BM25 + RRF)](https://qdrant.tech/documentation/concepts/hybrid-queries/), [Reranking API Guide](https://docs.cohere.com/docs/rerank-2) |

---

## Estrutura de Conteúdo por Sessão (Etapas da Disciplina)

---

### Sessão 8.1 (Unidade 1): Fundamentos de Arquitetura AI-First
* **Posição na Etapa:** Unidade 1 – Princípios de engenharia para sistemas híbridos (determinísticos + probabilísticos).
* **Conteúdo Programático:**
  1. **Arquiteturas Tradicionais vs. Arquiteturas Orientadas por IA (*AI-Driven*):**
     * Sistemas Tradicionais: Código determinístico ($f(x) = y$), contratos rígidos, latência em milissegundos ($10\text{–}50\text{ms}$), custo marginal próximo de zero por requisição e testes binários (*pass/fail*).
     * Sistemas AI-First: Comportamento probabilístico/emergente, entradas não-estruturadas (texto, voz, imagem), latência em segundos ($500\text{ms–}30\text{s}$), custo variável por token e validação baseada em distribuições estatísticas (*evals*).
  2. **Os 5 Principais Padrões de Design em Sistemas Inteligentes:**
     * **Prompting & Context Management:** Montagem dinâmica e segura do estado cognitivo.
     * **Responsible AI & Guardrails:** Filtros de entrada/saída, privacidade e limites de atuação.
     * **AI UX:** Streaming progressivo, estados intermediários de pensamento, citações verificáveis e mecanismos de *feedback* ($+1/-1$).
     * **AI-Ops (LLMOps):** Rastreamento de trajetórias, versionamento de prompts, *evals* contínuos e observabilidade.
     * **Optimization:** Roteamento de modelos (*Model Tiering*), caching semântico e paralelização.
  3. **Decision Framework: Quando Usar IA vs. Regras Determinísticas:**
     * Regra de Ouro da Arquitetura: *"Nunca use um LLM para fazer o que uma expressão regular, uma query SQL ou uma função determinística de 10 linhas resolve com 100% de precisão e 0ms de latência"*.
     * Como isolar o LLM apenas na camada de interpretação semântica ou julgamento ambíguo, delegando cálculos e mutações para código determinístico.
  4. **Trade-offs Fundamentais:**
     * Equilíbrio quantitativo entre **Latência (TTFT e Latência Total)** $\times$ **Precisão/Qualidade** $\times$ **Custo Financeiro** $\times$ **Performance/Throughput**.
* **Documentações Oficiais e Seções Específicas:**
  * [Google Cloud Architecture Framework – AI and ML Perspective](https://cloud.google.com/architecture/framework/perspectives/ai-ml).

---

### Sessão 8.2 (Unidade 2): Arquiteturas Single-Agent
* **Posição na Etapa:** Unidade 2 – Projetando agentes individuais enxutos, rápidos e previsíveis.
* **Conteúdo Programático:**
  1. **O Papel de Agentes Autônomos em Fluxos Lineares de Decisão:**
     * Quando uma arquitetura *Single-Agent* é superior: tarefas bem delimitadas, orçamentos de tokens restritos, exigência de baixa latência e menor superfície de falha.
  2. **Análise Arquitetural dos 5 Padrões Single-Agent:**
     * **Reactive Agent:** Resposta direta estímulo $\rightarrow$ ação sem estado persistente.
     * **Memory-Enhanced Agent:** Enriquecido com recuperação de histórico conversacional e perfil do usuário.
     * **Tool-Using Agent:** Capaz de consultar sistemas externos via Function Calling / MCP em turno único ou múltiplo.
     * **ReAct Agent:** Ciclo iterativo de raciocínio explícito e execução de ferramentas.
     * **Self-Reflection Agent:** Valida e corrige sua própria saída antes de finalizar o turno.
  3. **Laboratório Prático em JavaScript:**
     * Desenvolvimento de protótipos modulares dos 5 padrões em Node.js/TypeScript integrando APIs de IA generativa.
     * Simulação automatizada de interações entre um *User Simulator* e o agente para medir latência, custo e taxa de resolução.
* **Documentações Oficiais e Seções Específicas:**
  * [LangGraph.js – Agent Architectures & Workflows](https://langchain-ai.github.io/langgraphjs/concepts/agentic_concepts/).

---

### Sessão 8.3 (Unidade 3): Arquiteturas Multi-Agent Distribuídas
* **Posição na Etapa:** Unidade 3 – Engenharia de sistemas distribuídos aplicada à colaboração de agentes.
* **Conteúdo Programático:**
  1. **Colaboração entre Agentes em Sistemas Complexos:**
     * Especialização de contexto, separação de privilégios de ferramentas (princípio do menor privilégio por agente) e paralelismo de execução.
  2. **Os 6 Padrões de Orquestração Multiagente:**
     * **Sequential (Pipeline):** Saída do Agente $A$ alimenta a entrada do Agente $B$.
     * **Parallel (Fan-Out / Fan-In):** Múltiplos agentes analisam o mesmo problema sob ângulos diferentes concorrentemente e um agregador sintetiza.
     * **Supervisor:** Orquestrador central que gerencia o estado da tarefa e aciona agentes especialistas sob demanda.
     * **Hierarchical:** Árvore de supervisores em múltiplos níveis organizacionais.
     * **Group Chat:** Espaço de trabalho compartilhado com selecionador de próximo orador (*speaker selection*).
     * **Handoff:** Transferência direta de sessão e controle de um agente para outro (ex.: Agente de Triagem $\xrightarrow{\text{handoff}}$ Agente Financeiro).
  3. **Desafios Distribuídos:**
     * Tratamento de falhas parciais de nós, timeouts em cascata, *deadlocks* de delegação circular ($A \leftrightarrow B$), consistência eventual de estado, idempotência e sincronização.
  4. **Laboratório Prático em JavaScript com Filas de Mensagens:**
     * Implementação de uma arquitetura multiagente assíncrona e resiliente em Node.js utilizando filas de mensagens (**BullMQ / Redis** ou **RabbitMQ**), *workers* concorrentes, *Dead Letter Queues (DLQ)* e correlação de estado.
* **Documentações Oficiais e Seções Específicas:**
  * [BullMQ Official Guide – Flows (Parent/Child Job Hierarchies)](https://docs.bullmq.io/guide/flows) – *Orquestração distribuída de grafos de agentes em Node.js*.
  * [LangGraph.js – Multi-Agent Handoffs & Supervisor Patterns](https://langchain-ai.github.io/langgraphjs/concepts/multi_agent/).

---

### Sessão 8.4 (Unidade 4): Padrões de Design AI-Específicos
* **Posição na Etapa:** Unidade 4 – Catálogo de padrões arquiteturais para performance, acurácia e governança.
* **Conteúdo Programático:**
  1. **Evolução Arquitetural do RAG:**
     * **Basic RAG:** Busca vetorial simples *top-k*.
     * **Hybrid Search RAG:** Combinação de busca léxica por palavra-chave (**BM25 / Full-Text Search**) + busca vetorial densa (**Embeddings**) fundidas via **Reciprocal Rank Fusion (RRF)** + modelo de **Cross-Encoder Reranking**.
     * **Multi-Index RAG:** Roteamento da consulta entre múltiplos índices especializados (banco vetorial, banco de grafos, SQL relacional e APIs em tempo real).
     * **Agentic RAG (CRAG / Self-RAG):** O agente avalia se os documentos recuperados são relevantes; se não forem, reescreve a query e realiza nova busca antes de gerar a resposta.
  2. **Estratégias de Roteamento Inteligente:**
     * **Intent-Based Routing:** Classificador ultrarrápido que identifica a intenção do usuário e direciona para o fluxo determinístico ou agente correto.
     * **Model Router:** Direcionamento dinâmico da query pelo seu grau de complexidade (ex.: $80\%$ do tráfego simples vai para `gemini-2.5-flash` / `gpt-4o-mini`; $20\%$ complexo vai para `claude-3-7-sonnet` / `o3`).
  3. **Mecanismos de Caching e Streaming:**
     * **Semantic Cache:** Armazenamento de pares $(\text{embedding da pergunta}, \text{resposta})$ no Redis/pgvector; se uma nova pergunta tiver similaridade de cosseno $> 0.96$, retorna a resposta em $15\text{ms}$ com custo zero de LLM.
     * **Prompt Cache** (nível do provedor) e **Response Streaming** (SSE/WebSockets para percepção instantânea de velocidade).
  4. **Padrões de Human-in-the-Loop (HITL):**
     * **Approval Gates** (bloqueio pré-execução), **Confidence Thresholds** (transbordo automático para humano quando o score de confiança do modelo é baixo) e **Audit Trails** completos.
* **Documentações Oficiais e Seções Específicas:**
  * [LangGraph.js – Agentic RAG Tutorial](https://langchain-ai.github.io/langgraphjs/tutorials/rag/langgraph_agentic_rag/).
  * [Redis Documentation – Vector Similarity & Semantic Caching](https://redis.io/docs/latest/develop/interact/search-and-query/advanced-concepts/vectors/).
  * [Cohere Rerank Documentation – Improving RAG with Reranking](https://docs.cohere.com/docs/rerank-2).

---

### Sessão 8.5 (Unidade 5): Arquitetura Enterprise de Sistemas de IA
* **Posição na Etapa:** Unidade 5 – Projetando plataformas corporativas completas de IA em produção.
* **Conteúdo Programático:**
  1. **Mapeamento da Stack Enterprise Completa:**
     ```mermaid
     flowchart LR
         Client["Apps Web / Mobile / Chat"] --> GW["AI API Gateway (Auth, Rate Limit, Guardrails, Router)"]
         GW --> Cache[("Semantic & Prompt Cache")]
         GW --> K8s["Orquestração (Kubernetes Workers / Agents)"]
         K8s --> Shared["Serviços Compartilhados (RAG, Memory, MCP Registry)"]
         K8s --> Providers["Multi-Provider LLMs (OpenAI, Gemini, Anthropic, Local vLLM)"]
         GW -.-> Obs["Observabilidade (OpenTelemetry, Langfuse, Prometheus)"]
         K8s -.-> Obs
     ```
  2. **Princípios de Design Enterprise:**
     * **Loose Coupling:** Abstração de provedores para trocar modelos sem reescrever regras de negócio.
     * **Clear Interfaces:** Contratos estritos via OpenAPI, JSON Schema e protocolo MCP.
     * **Policy-Driven Control:** Governança centralizada de segurança, PII masking e limites de gasto no AI Gateway.
  3. **Observabilidade de IA e Implantação Híbrida:**
     * Telemetria padronizada com **OpenTelemetry GenAI Semantic Conventions**: rastreamento de prompts, *Time to First Token (TTFT)*, *Tokens Per Second (TPS)*, taxa de cache hit e custo por tenant.
     * Estratégias de deployment em ambientes híbridos: **Kubernetes** (escalonamento de workers agênticos e inferência GPU com vLLM), **Serverless** e **Edge AI**.
  4. **Laboratório Prático em JavaScript:**
     * Implementação de um **AI Gateway Simulator** em Node.js/TypeScript com **Model Tiering**, Semantic Cache, *Fallback* automático multi-provedor e controle de orçamento (*Token Quota*) em tempo real.
* **Documentações Oficiais e Seções Específicas:**
  * [OpenTelemetry – Semantic Conventions for Generative AI](https://opentelemetry.io/docs/specs/semconv/gen-ai/).
  * [LiteLLM Proxy / AI Gateway Documentation](https://docs.litellm.ai/docs/simple_proxy) – *Arquitetura de referência para roteamento, budgets e fallbacks*.
