# Módulo 01: Fundamentos de IA e LLMs para Programadores

> **Etapa do Curso:** Trilha 1 – Fundação & Core AI Engineering (Etapa 1 de 12)  
> **Carga Horária Sugerida:** 30 horas  
> **Foco Técnico:** Fundamentos de IA/ML/DL, Arquitetura Transformer, Web Machine Learning em JavaScript, Prompt Engineering Prático, IDEs AI-First, Introdução a MCP, RAG com PostgreSQL (`pgvector`), Modelos Locais (Ollama) e Introdução a Agentes.

---

## Mapa de Documentações Oficiais do Módulo

| Tecnologia / Conceito | Documentação Oficial | Seções Específicas Recomendadas para Esta Etapa |
| :--- | :--- | :--- |
| **TensorFlow.js (Web ML)** | [tensorflow.org/js](https://www.tensorflow.org/js/guide) | [Tensors & Operations](https://www.tensorflow.org/js/guide/tensors_operations), [Train Models in JS](https://www.tensorflow.org/js/guide/train_models), [Layers API](https://www.tensorflow.org/js/guide/models_and_layers) |
| **MediaPipe Web (Visão/Jogos)** | [ai.google.dev/edge/mediapipe](https://ai.google.dev/edge/mediapipe/solutions/guide) | [Vision Tasks for Web](https://ai.google.dev/edge/mediapipe/solutions/vision/object_detector/web_js), [Hand/Pose Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js) |
| **OpenAI Platform** | [platform.openai.com/docs](https://platform.openai.com/docs/overview) | [Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering), [Vector Embeddings](https://platform.openai.com/docs/guides/embeddings), [Tokenizer Tool](https://platform.openai.com/tokenizer) |
| **Google Gemini API** | [ai.google.dev/gemini-api/docs](https://ai.google.dev/gemini-api/docs) | [Prompt Design Strategies](https://ai.google.dev/gemini-api/docs/prompting-strategies), [Embeddings Guide](https://ai.google.dev/gemini-api/docs/embeddings) |
| **Anthropic Claude** | [docs.anthropic.com](https://docs.anthropic.com/en/docs/welcome) | [Prompt Engineering Overview](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview), [System Prompts](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/system-prompts) |
| **Cursor IDE** | [docs.cursor.com](https://docs.cursor.com/) | [Rules for AI (`.cursorrules` / `.cursor/rules`)](https://docs.cursor.com/context/rules-for-ai), [Composer & Agent Mode](https://docs.cursor.com/chat/agent), [@Symbols & Context](https://docs.cursor.com/context/@-symbols/overview) |
| **Windsurf IDE** | [docs.windsurf.com](https://docs.windsurf.com/) | [Cascade Flows](https://docs.windsurf.com/windsurf/cascade), [Memories & Rules](https://docs.windsurf.com/windsurf/memories) |
| **VS Code Copilot** | [code.visualstudio.com/docs/copilot](https://code.visualstudio.com/docs/copilot/overview) | [Custom Instructions](https://code.visualstudio.com/docs/copilot/copilot-customization), [Copilot Edits & Agent Mode](https://code.visualstudio.com/docs/copilot/copilot-edits) |
| **Model Context Protocol (MCP)** | [modelcontextprotocol.io](https://modelcontextprotocol.io/introduction) | [Core Architecture](https://modelcontextprotocol.io/docs/concepts/architecture), [Quickstart for Users/Devs](https://modelcontextprotocol.io/quickstart) |
| **n8n AI & MCP** | [docs.n8n.io/advanced-ai](https://docs.n8n.io/advanced-ai/) | [MCP Client & Server Trigger](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolmcp/), [AI Agents in n8n](https://docs.n8n.io/advanced-ai/examples/understand-agents/) |
| **pgvector (PostgreSQL)** | [github.com/pgvector/pgvector](https://github.com/pgvector/pgvector) | [Querying & Distance Operators (`<=>`, `<->`)](https://github.com/pgvector/pgvector#querying), [HNSW & IVFFlat Indexing](https://github.com/pgvector/pgvector#indexing), [Node.js Integration (`pgvector-node`)](https://github.com/pgvector/pgvector-node) |
| **OpenRouter** | [openrouter.ai/docs](https://openrouter.ai/docs/quick-start) | [Model Routing & Fallbacks](https://openrouter.ai/docs/features/model-routing), [OpenAI SDK Compatibility](https://openrouter.ai/docs/quick-start) |
| **Ollama** | [github.com/ollama/ollama](https://github.com/ollama/ollama/tree/main/docs) | [REST API Reference](https://github.com/ollama/ollama/blob/main/docs/api.md), [Modelfile Specification](https://github.com/ollama/ollama/blob/main/docs/modelfile.md), [Ollama JS SDK](https://github.com/ollama/ollama-js) |

---

## Estrutura de Conteúdo por Sessão (Etapas da Disciplina)

---

### Sessão 1.1: História e Contexto da Inteligência Artificial
* **Posição na Etapa:** Unidade 1 – Abertura conceitual e evolução histórica.
* **Conteúdo Programático:**
  1. **Origens da "Máquina Inteligente":** Dos autômatos clássicos, lógica booleana e Máquina de Turing (1936) ao Teste de Turing (1950) e o Workshop de Dartmouth (1956).
  2. **IA Simbólica vs. Conexionismo:** Sistemas especialistas baseados em regras determinísticas, os "Invernos da IA" e o renascimento através do aprendizado estatístico e redes neurais (Perceptron ao Backpropagation).
  3. **Linha do Tempo Moderna:**
     * *Anos 1990–2000:* Machine Learning Clássico (SVMs, Random Forests, Regressão).
     * *2012 (AlexNet):* Explosão do Deep Learning com uso de GPUs.
     * *2017 ("Attention Is All You Need"):* Surgimento da arquitetura Transformer.
     * *2020–Presente:* Era dos Foundation Models, LLMs (GPT-3/4, Gemini, Claude, Llama), Reasoning Models e Agentes Autônomos.
* **Leitura Técnica / Documentação da Sessão:**
  * Artigo Fundacional: [Attention Is All You Need (Vaswani et al., 2017 - arXiv:1706.03762)](https://arxiv.org/abs/1706.03762) – *Seção 3: Model Architecture*.

---

### Sessão 1.2: Introdução a LLMs (Large Language Models)
* **Posição na Etapa:** Unidade 1 – Fundamentos de modelos generativos de linguagem.
* **Conteúdo Programático:**
  1. **Taxonomia:** Revisão estruturada das fronteiras entre Inteligência Artificial (campo amplo), Machine Learning (sistemas que aprendem de dados), Deep Learning (redes neurais profundas em múltiplas camadas) e GenAI/LLMs.
  2. **Como Funcionam os LLMs por Dentro:**
     * **Tokenização:** Como textos e códigos são convertidos em sub-palavras e IDs numéricos (BPE - *Byte-Pair Encoding*, `cl100k_base`, `o200k_base`).
     * **Embeddings:** Representação densa de tokens em espaços vetoriais multidimensionais onde proximidade geométrica reflete proximidade semântica.
     * **Transformers & Self-Attention:** Como o mecanismo de atenção calcula pesos de relevância entre todos os tokens da janela de contexto simultaneamente ($Q, K, V$ – *Query, Key, Value*).
     * **Treinamento em 3 Estágios:** *Pre-training* auto-supervisionado (previsão do próximo token) $\rightarrow$ *Supervised Fine-Tuning (SFT)* $\rightarrow$ *RLHF / DPO* (alinhamento humano).
  3. **Panorama de Modelos Atuais:** ChatGPT/GPT-4o/o3 (OpenAI), Gemini 2.5 Pro/Flash (Google), Claude 3.5/3.7 Sonnet (Anthropic), Llama 3/4 (Meta) e DeepSeek.
* **Documentações Oficiais e Seções Específicas:**
  * [OpenAI Tokenizer & Token Concepts](https://platform.openai.com/tokenizer) – *Seção: How tokens work in language models*.
  * [Google Machine Learning Crash Course – LLMs](https://developers.google.com/machine-learning/crash-course/llm) – *Seções: Transformers, Self-Attention e Tokenization*.

---

### Sessão 1.3: Fundamentos de Web Machine Learning
* **Posição na Etapa:** Unidade 2 – Matemática intuitiva e execução de ML no navegador/Node.js.
* **Conteúdo Programático:**
  1. **Por que WebML para Programadores JavaScript:** Execução client-side com aceleração de hardware (WebGL e WebGPU), zero custo de servidor de inferência, baixa latência e privacidade total dos dados do usuário.
  2. **Tensores na Prática:**
     * O que é um Tensor: escalares (0D), vetores (1D), matrizes (2D) e tensores N-dimensionais (`shape`, `dtype`, `rank`, `strides`).
     * Álgebra linear essencial aplicada em código: produto escalar (*dot product*), multiplicação matricial e *broadcasting*.
     * Gerenciamento de memória de GPU no navegador (`tf.tidy()` e `.dispose()`).
  3. **Como Redes Neurais Aprendem:**
     * Estrutura de camadas densas (*Dense/Fully Connected*), convolucionais (CNN) e recorrentes.
     * Funções de ativação (`ReLU`, `Sigmoid`, `Softmax`).
     * Ciclo de aprendizado: *Forward Pass* $\rightarrow$ Cálculo de Erro (*Loss Function*: MSE, Cross-Entropy) $\rightarrow$ *Backpropagation* $\rightarrow$ Otimizador (*SGD*, *Adam*) atualizando pesos e vieses.
* **Documentações Oficiais e Seções Específicas:**
  * [TensorFlow.js Guide – Tensors and Operations](https://www.tensorflow.org/js/guide/tensors_operations) – *Seções: Shapes and types, Memory management (`tf.tidy`)*.
  * [MDN WebGPU API Specification](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API) – *Seção: Concepts and usage for compute shaders*.

---

### Sessão 1.4: Criando sua Primeira IA do Zero em JavaScript
* **Posição na Etapa:** Unidade 2 (Laboratório Prático 1) – Construção ponta a ponta.
* **Conteúdo Programático:**
  1. **Passo a Passo da Primeira Rede Neural em JS:**
     * Coleta, normalização (Min-Max Scaling) e embaralhamento (*shuffling*) do conjunto de dados em JavaScript.
     * Definição da topologia do modelo (`tf.sequential()`, camadas ocultas e camada de saída).
     * Compilação do modelo definindo otimizador (`tf.train.adam`), função de perda e métricas de acurácia.
  2. **O Ciclo Completo de Engenharia de ML:**
     * **Dados:** Separação entre conjuntos de treino e validação.
     * **Treino:** Execução de épocas (`model.fit`), monitoramento de *loss* por época e prevenção de *overfitting*.
     * **Validação:** Avaliação com dados nunca vistos pelo modelo.
     * **Inferência:** Persistência do modelo (`IndexedDB` / `localStorage` / filesystem) e execução de predições em tempo real (`model.predict`).
* **Documentações Oficiais e Seções Específicas:**
  * [TensorFlow.js – Train Models](https://www.tensorflow.org/js/guide/train_models) – *Seções: Monitoring training e Saving and loading models*.
  * [TensorFlow.js API Reference – `tf.LayersModel.fit`](https://js.tensorflow.org/api/latest/#tf.LayersModel.fit).

---

### Sessão 1.5: Projetos Práticos com ML na Web (Vídeo e Jogos)
* **Posição na Etapa:** Unidade 2 (Laboratório Prático 2) – Deep Learning aplicado em tempo real no browser.
* **Conteúdo Programático:**
  1. **ML com Vídeo em Tempo Real no Browser:**
     * Captura de stream via `navigator.mediaDevices.getUserMedia` e processamento frame a frame em `<canvas>`.
     * Aplicação de modelos pré-treinados de Visão Computacional: detecção de objetos (COCO-SSD), rastreamento facial/corporal (*Face Mesh*, *Pose/Hand Landmarker*), segmentação de fundo e filtros inteligentes.
  2. **ML Aplicado a Jogos Web:**
     * Controle de jogos via gestos ou expressões capturadas pela webcam.
     * Criação de bots inteligentes com redes neurais / aprendizado por reforço básico ou classificação de estado em tempo real.
     * Efeitos dinâmicos adaptativos guiados por inferência local a 60 FPS.
* **Documentações Oficiais e Seções Específicas:**
  * [Google MediaPipe Solutions for Web](https://ai.google.dev/edge/mediapipe/solutions/guide) – *Seções: Vision tasks -> Object Detector (Web/JS) e Hand Landmarker (Web/JS)*.
  * [TensorFlow.js Pre-trained Models Repository](https://www.tensorflow.org/js/models) – *Seções: Body Segmentation, Pose Detection, Object Detection*.

---

### Sessão 1.6: Prompt Engineering na Prática para Desenvolvedores
* **Posição na Etapa:** Unidade 3 – Produtividade técnica imediata com LLMs.
* **Conteúdo Programático:**
  1. **Anatomia de um Prompt de Alta Precisão:**
     * Papel/Persona Técnica (*Role*), Contexto de Arquitetura, Instrução Direta, Restrições Negativas e Formato de Saída Esperado.
     * Técnicas essenciais: *Zero-Shot*, *Few-Shot Prompting* (exemplos de entrada/saída) e *Chain-of-Thought (CoT)* (raciocínio passo a passo).
  2. **Padrões de Prompts para o Ciclo de Desenvolvimento:**
     * **Codar:** Geração de módulos tipados, implementação de padrões de projeto e conversão entre linguagens.
     * **Debugar:** Análise de *stack traces*, isolamento de *race conditions* e reprodução mínima de bugs.
     * **Refatorar e Testar:** Extração de funções puras, geração de testes unitários (Jest/Vitest) cobrindo *edge cases*.
     * **Documentar e Aprender:** Geração de JSDoc/TSDoc, diagramas Mermaid de fluxo e uso do método Feynman assistido por IA para dominar novas stacks rapidamente.
* **Documentações Oficiais e Seções Específicas:**
  * [Anthropic Prompt Engineering Interactive Tutorial & Guide](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview) – *Seções: Be clear and direct, Use examples (multishot), Let Claude think (CoT), Use XML tags*.
  * [OpenAI Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering) – *Seção: Six strategies for getting better results*.

---

### Sessão 1.7: Ferramentas de IA para Acelerar sua Vida como Dev
* **Posição na Etapa:** Unidade 3 – IDEs AI-Native e cultura *Vibe Coding*.
* **Conteúdo Programático:**
  1. **História e Arquitetura do Cursor:** Como a transição de simples autocompletar (LSP tradicional) para edição preditiva multi-arquivo (*Shadow Workspace*, *Cursor Tab*, *Composer* e *Agent Mode*) redefiniu o fluxo de engenharia.
  2. **Comparativo Técnico Prático: VS Code (GitHub Copilot) vs. Cursor vs. Windsurf:**
     * Indexação local da codebase via embeddings.
     * Modos de operação: *Ask/Chat*, *Edit* e *Agentic Execution* (execução autônoma de comandos no terminal e auto-correção de erros de lint/build).
  3. **Padronizando a IA com `.cursorrules` (e `.cursor/rules/*.mdc`):**
     * Como codificar convenções de arquitetura, stack tecnológica, padrões de nomenclatura, estilo de testes e proibições do projeto para que a IA gere código indistinguível do time sênior.
  4. **O Conceito de *Vibe Coding* e o Case `@levelsio` (Pieter Levels):**
     * Análise técnica e de negócios de como desenvolvedores solo constroem, validam e escalam Micro-SaaS faturando $+\$100\text{k/mês}$ combinando velocidade de prototipação por IA, stack enxuta e foco no problema do usuário.
     * Limites do *Vibe Coding*: onde a velocidade encontra a dívida técnica e a segurança.
* **Documentações Oficiais e Seções Específicas:**
  * [Cursor Documentation – Rules for AI](https://docs.cursor.com/context/rules-for-ai) – *Seções: Project Rules (`.cursor/rules`), User Rules e `.cursorrules`*.
  * [Windsurf Documentation – Cascade & Memories](https://docs.windsurf.com/windsurf/cascade) – *Seção: `.windsurfrules` and Workspace Context*.
  * [VS Code – Custom Instructions for Copilot](https://code.visualstudio.com/docs/copilot/copilot-customization) – *Seção: `.github/copilot-instructions.md`*.

---

### Sessão 1.8: MCPs e Automação para Devs
* **Posição na Etapa:** Unidade 4 – Conectando a IA do desenvolvedor ao mundo externo.
* **Conteúdo Programático:**
  1. **Introdução Prática ao MCP (Model Context Protocol):**
     * Como o protocolo aberto permite plugar ferramentas externas diretamente no Cursor, Windsurf, Claude Desktop ou agentes customizados.
  2. **Três Pilares de Automação Dev com MCP:**
     * **Geração e Execução de Testes Automatizados:** Usando MCPs de browser (Playwright/Puppeteer MCP) para inspecionar o DOM real e gerar/rodar testes E2E automaticamente.
     * **Consulta a Documentações Atualizadas:** Uso de servidores MCP de documentação (ex.: Context7, Docs MCP) para eliminar alucinações com versões antigas de bibliotecas.
     * **Navegação Web e Extração de Dados:** Uso de MCPs de busca e scraping (Brave Search, Firecrawl, Fetch MCP) diretamente do fluxo de codificação.
  3. **Orquestração Visual com n8n MCP:**
     * Como expor workflows do **n8n** como ferramentas MCP para um agente e como um agente no n8n consome servidores MCP externos.
* **Documentações Oficiais e Seções Específicas:**
  * [Model Context Protocol – Official Servers Repository](https://github.com/modelcontextprotocol/servers) – *Seções: Playwright/Puppeteer, Fetch, Filesystem, Git e Postgres MCPs*.
  * [n8n Documentation – MCP Client Tool & MCP Server Trigger](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolmcp/).

---

### Sessão 1.9: RAG, Embeddings e Busca Semântica (Projeto com JS e Postgres)
* **Posição na Etapa:** Unidade 5 (Projeto Prático Principal do Módulo) – Memória externa e busca vetorial.
* **Conteúdo Programático:**
  1. **Por que RAG (*Retrieval-Augmented Generation*) é Essencial:**
     * Superando a data de corte de treinamento (*knowledge cutoff*), reduzindo alucinações e injetando dados privados da empresa sem precisar re-treinar o modelo.
  2. **Fundamentos de Embeddings e Vector Databases:**
     * Como modelos de embedding (`text-embedding-3-small`, `text-embedding-004`) transformam parágrafos em vetores (ex.: $1536$ ou $768$ dimensões).
     * Matemática da *Similarity Search*: Distância Euclidiana ($L_2$), Produto Interno (*Inner Product*) e **Similaridade de Cosseno** (*Cosine Similarity*).
  3. **Projeto Prático: Criando o Primeiro RAG com JavaScript e PostgreSQL (`pgvector`):**
     * Subindo PostgreSQL com extensão `vector` via Docker.
     * Estratégia de *Chunking* (divisão de documentos com *overlap*).
     * Pipeline de Ingestão em Node.js: leitura de documentos $\rightarrow$ geração de embeddings $\rightarrow$ `INSERT` na tabela com coluna `vector(1536)`.
     * Pipeline de Consulta e Geração: embedding da pergunta do usuário $\rightarrow$ query SQL com operador de distância de cosseno (`<=>`) $\rightarrow$ montagem do prompt aumentado com os trechos recuperados $\rightarrow$ resposta fundamentada do LLM.
* **Documentações Oficiais e Seções Específicas:**
  * [pgvector Official Documentation](https://github.com/pgvector/pgvector) – *Seções: Getting Started, Querying (`<=>` cosine distance) e Indexing (HNSW)*.
  * [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings) – *Seções: How to get embeddings e Use cases (Question answering using embeddings-based search)*.

---

### Sessão 1.10: Modelos Open-Source vs. Proprietários (OpenRouter e Ollama)
* **Posição na Etapa:** Unidade 6 – Independência de provedor e soberania de execução.
* **Conteúdo Programático:**
  1. **Matriz Comparativa: Modelos Proprietários vs. Open-Weights/Open-Source:**
     * Análise de Custo em escala, Privacidade/Compliance (dados que não podem sair da infraestrutura local), Latência, Customização e *Vendor Lock-in*.
  2. **Orquestrando Múltiplos Modelos com OpenRouter:**
     * Como usar uma única interface compatível com o SDK da OpenAI para alternar entre centenas de modelos (Claude, Gemini, Llama, Mistral, DeepSeek).
     * Configuração de *fallback* automático quando um provedor sofre indisponibilidade ou *rate limit*.
  3. **Rodando LLMs e Modelos de Embedding Localmente com Ollama:**
     * Instalação, gerenciamento de modelos quantizados (GGUF: 4-bit, 8-bit), customização via `Modelfile` e consumo da API local (`http://localhost:11434`) em aplicações Node.js/TypeScript.
* **Documentações Oficiais e Seções Específicas:**
  * [OpenRouter Documentation](https://openrouter.ai/docs/quick-start) – *Seções: Using the OpenAI SDK, Model Routing e Provider Routing*.
  * [Ollama API & JS Library Docs](https://github.com/ollama/ollama/blob/main/docs/api.md) – *Seções: Generate a chat completion (`/api/chat`) e Generate embeddings (`/api/embed`)*.

---

### Sessão 1.11: Introdução a Agents e Automação Avançada
* **Posição na Etapa:** Unidade 6 – Fechamento do Módulo 1 e ponte para os módulos seguintes.
* **Conteúdo Programático:**
  1. **De Chatbots Passivos a Agentes Ativos:**
     * O que define um Agente de IA: capacidade de raciocinar sobre um objetivo, decompor etapas, invocar ferramentas externas (*Tool Calling*), observar o resultado da ação e iterar até concluir a missão.
  2. **Agentes Autônomos na Engenharia de Software:**
     * Exemplos reais de arquitetura de agentes que planejam features, editam múltiplos arquivos, rodam suítes de testes, leem erros de compilação e abrem Pull Requests.
* **Documentações Oficiais e Seções Específicas:**
  * [Anthropic Engineering Blog – Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents) – *Seções: Workflows vs. Agents, Tool Use e Coding Agents*.
