# Módulo 04: Criação de Agentes Autônomos

> **Etapa do Curso:** Trilha 1 – Fundação & Core AI Engineering (Etapa 4 de 12)  
> **Carga Horária Sugerida:** 30 horas  
> **Foco Técnico:** Arquitetura de Agentes (Agent Loop), Padrões de Raciocínio (ReAct, Plan-and-Execute, Reflection), Function Calling e Tool Use, Memória (Curta, Longa, Episódica, Semântica), Gerenciamento de Contexto (Pruning/Stitching), LangGraph e Fluxos em Grafo, Observabilidade, Guardrails e Sistemas Multiagentes.

---

## Mapa de Documentações Oficiais do Módulo

| Framework / Tecnologia | Documentação Oficial | Seções Específicas Recomendadas para Esta Etapa |
| :--- | :--- | :--- |
| **LangGraph.js** | [langchain-ai.github.io/langgraphjs](https://langchain-ai.github.io/langgraphjs/) | [Quickstart & StateGraph](https://langchain-ai.github.io/langgraphjs/tutorials/quickstart/), [Persistence & Checkpointers (Memory)](https://langchain-ai.github.io/langgraphjs/concepts/persistence/), [Human-in-the-Loop (`interrupt`)](https://langchain-ai.github.io/langgraphjs/concepts/human_in_the_loop/), [Multi-Agent Architectures](https://langchain-ai.github.io/langgraphjs/concepts/multi_agent/) |
| **Padrões Agênticos (LangGraph)** | [langchain-ai.github.io/langgraphjs/tutorials](https://langchain-ai.github.io/langgraphjs/tutorials/) | [Plan-and-Execute Tutorial](https://langchain-ai.github.io/langgraphjs/tutorials/plan-and-execute/plan-and-execute/), [Reflection & Self-Critique](https://langchain-ai.github.io/langgraphjs/tutorials/reflection/reflection/), [ReAct Agent from Scratch](https://langchain-ai.github.io/langgraphjs/how-tos/react-agent-from-scratch/) |
| **Anthropic Agent Patterns** | [docs.anthropic.com](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview) | [Tool Use (Function Calling)](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview), [Building Effective Agents Guide](https://www.anthropic.com/engineering/building-effective-agents) |
| **OpenAI Agents & Tools** | [platform.openai.com/docs](https://platform.openai.com/docs/guides/function-calling) | [Function Calling Guide](https://platform.openai.com/docs/guides/function-calling), [Agents SDK / Responses API](https://platform.openai.com/docs/guides/agents) |
| **Google Gemini Tool Use & ADK** | [ai.google.dev/gemini-api/docs](https://ai.google.dev/gemini-api/docs/function-calling) | [Function Calling](https://ai.google.dev/gemini-api/docs/function-calling), [Agent Development Kit (ADK)](https://google.github.io/adk-docs/) |
| **LangSmith (Observabilidade)** | [docs.smith.langchain.com](https://docs.smith.langchain.com/) | [Tracing LangGraph Agents](https://docs.smith.langchain.com/observability), [Evaluating Agents](https://docs.smith.langchain.com/evaluation) |

---

## Estrutura de Conteúdo por Sessão (Etapas da Disciplina)

---

### Sessão 4.1 (Unidade 1): Arquitetura de Agents
* **Posição na Etapa:** Unidade 1 – Anatomia e engenharia interna de um agente.
* **Conteúdo Programático:**
  1. **O Conceito de *Agent Loop*:**
     * Modelagem do ciclo contínuo: $\text{Percepção (Input/Ambiente)} \rightarrow \text{Raciocínio (LLM Policy)} \rightarrow \text{Ação (Tool Execution)} \rightarrow \text{Feedback (Observação/Estado)}$.
     * Condições de parada (*termination conditions*), orçamento máximo de iterações (`maxSteps`) e tratamento de falhas no loop.
  2. **Estrutura Interna Modular:**
     * **Planner:** Decomposição de metas e decisão da próxima ação.
     * **Executor:** Camada de runtime segura que invoca funções, trata timeouts e formata o retorno.
     * **Memory Store:** Acesso a estado de curto e longo prazo.
     * **Toolbox:** Registro tipado das ferramentas e MCPs disponíveis.
  3. **Taxonomia de Agentes:**
     * *Task-Based* (execução de tarefas pontuais), *Interactive* (co-pilotos conversacionais com o usuário), *Goal-Oriented* (orientados a um objetivo final com múltiplos passos) e *Autonomous* (operação contínua orientada a eventos).
  4. **Componentização:** Como desacoplar prompts de sistema, ferramentas, injeção de contexto e *feedback loops* em código limpo.
* **Documentações Oficiais e Seções Específicas:**
  * [Anthropic – Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents) – *Seções: What are agents? e Composable patterns*.
  * [LangGraph.js – Agentic Concepts Overview](https://langchain-ai.github.io/langgraphjs/concepts/high_level/).

---

### Sessão 4.2 (Unidade 2): Padrões de Raciocínio e Execução
* **Posição na Etapa:** Unidade 2 – Algoritmos cognitivos para tomada de decisão.
* **Conteúdo Programático:**
  1. **ReAct Pattern (Reasoning + Acting):**
     * Estrutura iterativa: `Thought` (raciocínio explícito sobre o estado atual) $\rightarrow$ `Action` (escolha da tool e parâmetros) $\rightarrow$ `Observation` (resultado da execução) $\rightarrow$ repetição até a resposta final.
  2. **Plan-and-Execute Pattern:**
     * Separação entre um modelo planejador (que gera um grafo/lista de etapas $E_1, E_2, \dots, E_n$) e modelos executores menores/mais rápidos que resolvem cada etapa individualmente, com um *Replanner* que ajusta o plano conforme os resultados.
  3. **Reflection Pattern (Autoavaliação e Autocorreção):**
     * Loop Gerador $\leftrightarrow$ Crítico: o agente analisa seu próprio output contra critérios de qualidade (ou erros de compilação/validação) e refina a resposta antes de entregá-la ao usuário.
  4. **Comparativo Prático e Implementação:**
     * Latência, consumo de tokens e taxa de sucesso de *ReAct* vs. *Plan-and-Execute* em diferentes cenários; implementação prática com LangChain e LangGraph.
* **Documentações Oficiais e Seções Específicas:**
  * [LangGraph.js – Plan-and-Execute Tutorial](https://langchain-ai.github.io/langgraphjs/tutorials/plan-and-execute/plan-and-execute/).
  * [LangGraph.js – Reflection Tutorial](https://langchain-ai.github.io/langgraphjs/tutorials/reflection/reflection/).
  * [Paper Original ReAct (Yao et al. - arXiv:2210.03629)](https://arxiv.org/abs/2210.03629).

---

### Sessão 4.3 (Unidade 3): Function Calling e Tool Use
* **Posição na Etapa:** Unidade 3 – A ponte entre o raciocínio do modelo e o mundo real.
* **Conteúdo Programático:**
  1. **Princípios de Tool Use e Function Calling em LLMs:**
     * Como o LLM não executa o código diretamente, mas emite uma intenção estruturada (`tool_calls` com nome da função e argumentos JSON) que o runtime da aplicação executa e devolve como mensagem `tool`.
     * *Parallel Tool Calling*: execução concorrente (`Promise.all`) quando o modelo solicita múltiplas ferramentas no mesmo turno.
  2. **Design de Schemas JSON / Zod de Alta Confiabilidade:**
     * Uso estratégico de descrições semânticas (`.describe()`), enums estritos, valores default e validação de tipos para evitar que o modelo invente parâmetros inválidos.
     * Padrão de retorno de erro amigável ao LLM (*Self-Healing Tool Calls*): devolver o erro de validação da tool para que o próprio agente corrija os parâmetros na próxima iteração.
  3. **Conexão com Ecossistemas Externos & Implementação Prática:**
     * Integração com APIs REST, bancos de dados SQL/NoSQL, webhooks de automação e servidores MCP.
     * **Lab Prático:** Construção de um agente que cria, executa, verifica e ajusta tarefas operando ferramentas externas reais.
* **Documentações Oficiais e Seções Específicas:**
  * [OpenAI Function Calling Guide](https://platform.openai.com/docs/guides/function-calling) – *Seções: Best practices for defining functions, Parallel function calling e Strict mode*.
  * [Anthropic Tool Use Guide](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview) – *Seção: Handling tool use and tool result content blocks*.

---

### Sessão 4.4 (Unidade 4): Memória e Reflexão em Agentes Autônomos
* **Posição na Etapa:** Unidade 4 – Persistência cognitiva e aprendizado contínuo.
* **Conteúdo Programático:**
  1. **Os 4 Tipos de Memória em Agentes:**
     * **Memória de Curto Prazo (Working Memory / Thread State):** O histórico de mensagens e variáveis de estado da sessão atual (gerenciado via *Checkpointers*).
     * **Memória de Longo Prazo Semântica:** Fatos estruturados, preferências do usuário e conhecimento de domínio persistidos entre sessões.
     * **Memória Episódica:** Registro de experiências e trajetórias passadas bem-sucedidas (usadas como *few-shot examples* dinâmicos para tarefas futuras similares).
     * **Memória Procedural / Contextual:** Regras e instruções operacionais atualizadas ao longo do tempo.
  2. **Armazenamento, Recuperação via Embeddings e Reflection Loops:**
     * Estratégias de extração de memória em background (*Memory Consolidation*) e busca híbrida por relevância + recência (*Time-Weighted Vector Search*).
     * *Reflection Loops* aplicados a assistentes pessoais, *debugging* automatizado e melhoria incremental da lógica do agente.
* **Documentações Oficiais e Seções Específicas:**
  * [LangGraph.js – Memory & Persistence Concepts](https://langchain-ai.github.io/langgraphjs/concepts/memory/) – *Seções: Short-term memory (Thread-level) vs Long-term memory (`InMemoryStore` / DB Store), Semantic, Episodic & Procedural memory*.

---

### Sessão 4.5 (Unidade 5): Gerenciamento de Contextos
* **Posição na Etapa:** Unidade 5 – Engenharia de janela de contexto em execuções longas.
* **Conteúdo Programático:**
  1. **O que é o "Contexto Ativo" e Como Estruturá-lo:**
     * Prevenção do fenômeno *Context Rot / Lost in the Middle* (degradação de raciocínio quando a janela de contexto fica poluída com outputs verbosos de ferramentas antigas).
  2. **Técnicas de Context Pruning e Context Stitching:**
     * **Context Pruning (Poda):** Remoção seletiva de resultados de tools antigos, truncamento inteligente de payloads grandes e sumarização progressiva (*Rolling Summary*) das mensagens mais antigas (`trimMessages` / `RemoveMessage`).
     * **Context Stitching (Costura):** Montagem Just-in-Time do prompt combinando apenas o resumo da missão, os fatos relevantes da memória longa e as últimas $N$ interações brutas.
  3. **Contextos Compartilhados em Múltiplos Agentes:**
     * Balanceamento arquitetural entre **Contexto Global** (memória coletiva / *Blackboard Pattern*) e **Contexto Local** (*scratchpad* privado de cada agente especialista para não poluir os demais).
* **Documentações Oficiais e Seções Específicas:**
  * [LangGraph.js – How to Manage Conversation History](https://langchain-ai.github.io/langgraphjs/how-tos/manage-conversation-history/) – *Filtragem, sumarização e poda de mensagens no estado do grafo*.

---

### Sessão 4.6 (Unidade 6): LangGraph e Workflows Complexos
* **Posição na Etapa:** Unidade 6 – Orquestração baseada em máquinas de estado e grafos cíclicos.
* **Conteúdo Programático:**
  1. **LangGraph como Orquestrador de Fluxos Agênticos:**
     * Por que grafos cíclicos (*State Machines*) superam DAGs lineares (chains tradicionais) para construir agentes que precisam tentar novamente, voltar etapas ou iterar até atingir qualidade.
  2. **Modelagem de Grafos de Execução:**
     * **State (`Annotation.Root`):** Definição tipada do esquema de estado e funções *Reducer* (como cada nó atualiza ou concatena propriedades do estado).
     * **Nodes:** Funções assíncronas que recebem o estado atual e retornam atualizações parciais.
     * **Edges & Conditional Edges (`addConditionalEdges`):** Roteamento dinâmico baseado na decisão do LLM ou em regras de negócio.
  3. **Resiliência e Depuração em Grafos:**
     * Controle de dependências, execução de ramos em paralelo (*Fan-out / Fan-in* e API `Send`), *Fallback Handlers*, *Retry Policies* por nó e inspeção visual via *LangGraph Studio*.
* **Documentações Oficiais e Seções Específicas:**
  * [LangGraph.js – Low-Level Concepts (State, Nodes, Edges)](https://langchain-ai.github.io/langgraphjs/concepts/low_level/).
  * [LangGraph.js – Branching & Map-Reduce (`Send` API)](https://langchain-ai.github.io/langgraphjs/how-tos/map-reduce/).

---

### Sessão 4.7 (Unidade 7): Observabilidade e Limites de Autonomia
* **Posição na Etapa:** Unidade 7 – Controle operacional, segurança e governança de agentes.
* **Conteúdo Programático:**
  1. **Métricas, Logs e Rastreabilidade (Auditoria):**
     * Instrumentação de cada passo da trajetória do agente: árvore de execução (*spans*), latência por nó, tokens consumidos, tools invocadas e justificativa de cada decisão autônoma.
  2. **Guardrails e Human-in-the-Loop (HITL):**
     * Uso de interrupções persistentes (`interrupt()` no LangGraph) para pausar a execução do grafo antes de uma ação crítica (ex.: deletar registro, enviar e-mail para cliente, aprovar reembolso), salvar o estado no banco, aguardar aprovação/edição humana e retomar do ponto exato (`Command({ resume })`).
  3. **Prevenção de Runaway Loops e Ética na Autonomia:**
     * Limites rígidos de recursão (`recursionLimit`), orçamento máximo em dólares por execução, detecção de ciclos repetitivos de chamadas idênticas e delimitação ética do escopo de atuação do agente.
* **Documentações Oficiais e Seções Específicas:**
  * [LangGraph.js – Human-in-the-Loop Concepts (`interrupt` & `Command`)](https://langchain-ai.github.io/langgraphjs/concepts/human_in_the_loop/).
  * [LangGraph.js – Recursion Limit & Error Handling](https://langchain-ai.github.io/langgraphjs/how-tos/recursion-limit/).

---

### Sessão 4.8 (Unidade 8): Projeto Prático – Agent que Automatiza Tarefas Complexas
* **Posição na Etapa:** Unidade 8 (Projeto Integrador de Single-Agent Avançado).
* **Conteúdo Programático:**
  1. **Escopo da Implementação:**
     * Desenvolvimento completo de um agente autônomo em TypeScript + LangGraph dotado de:
       * Planejamento adaptativo (*Plan & Re-plan*).
       * Execução de tarefas reais via APIs externas e servidores MCP.
       * Registro estruturado de logs, traces e *feedback loops* de autocorreção.
       * Controle de contexto (*pruning*) e memória persistente com *Checkpointer*.
  2. **Avaliação e Benchmarks:**
     * Medição objetiva do agente através de métricas de **Eficácia** (taxa de conclusão da tarefa), **Autonomia** (número médio de intervenções humanas necessárias) e **Resiliência** (capacidade de recuperação diante de erros simulados de API).
* **Documentações Oficiais e Seções Específicas:**
  * [LangSmith – Evaluating Agents (Trajectory, Single-Step & End-to-End Evaluation)](https://docs.smith.langchain.com/evaluation/concepts#evaluating-agents).

---

### Sessão 4.9 (Unidade 9): Multi-Agent Systems (MAS)
* **Posição na Etapa:** Unidade 9 – Sistemas distribuídos de múltiplos agentes cooperativos.
* **Conteúdo Programático:**
  1. **Por que e Quando Dividir em Múltiplos Agentes:**
     * Quando um único agente possui ferramentas demais ($>15\text{–}20$ tools) ou instruções conflitantes, degradando a escolha de ferramentas.
     * Conceitos de colaboração: orquestração centralizada, coordenação coreografada, delegação e negociação.
  2. **Os 5 Padrões Arquiteturais Multiagente:**
     * **Supervisor Pattern:** Um agente roteador central delega subtarefas para agentes trabalhadores especialistas e consolida o resultado.
     * **Hierarchical (Supervisores em Níveis):** Árvore de equipes de agentes (subgrafos com seus próprios supervisores).
     * **Group Chat / Network:** Agentes conversam em um canal compartilhado contribuindo para a solução.
     * **Delegation / Handoffs:** Passagem direta de controle e estado de um agente especialista para outro.
     * **Consensus / Debate:** Múltiplos agentes propõem soluções independentes e votam ou debatem até convergir.
  3. **Implementação Prática & Casos Reais do Mercado:**
     * Comunicação assíncrona, troca de mensagens tipadas e isolamento de estado entre subgrafos.
     * Análise arquitetural de casos reais: **Claude Code / Subagents**, **CrewAI**, **AutoGen** e **Agentarium**.
     * **Lab Prático:** Implementação em LangGraph.js de um sistema multiagente cooperativo ($\text{Agente Analista} \rightarrow \text{Agente Planejador} \rightarrow \text{Agente Executor} \rightarrow \text{Agente Revisor/QA}$).
* **Documentações Oficiais e Seções Específicas:**
  * [LangGraph.js – Multi-Agent Systems Concepts](https://langchain-ai.github.io/langgraphjs/concepts/multi_agent/) – *Seções: Network, Supervisor, Hierarchical e Custom multi-agent workflow*.
  * [LangGraph.js – Multi-Agent Supervisor & Subgraphs Tutorials](https://langchain-ai.github.io/langgraphjs/tutorials/multi_agent/multi_agent_collaboration/).
