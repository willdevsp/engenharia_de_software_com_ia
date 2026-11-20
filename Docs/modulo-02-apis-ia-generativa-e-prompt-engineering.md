# Módulo 02: APIs de IA Generativa e Prompt Engineering

> **Etapa do Curso:** Trilha 1 – Fundação & Core AI Engineering (Etapa 2 de 12)  
> **Carga Horária Sugerida:** 25 horas  
> **Foco Técnico:** Mercado AIaaS, SDKs de Provedores (OpenAI, Anthropic, Gemini, Hugging Face), Prompt Chaining, Structured Outputs, Eficiência de Custos e Caching, RAG Avançado com Observabilidade, Integração Back-End em Produção e Modelos Multimodais (Texto, Visão, Áudio, Vídeo e OCR Inteligente).

---

## Mapa de Documentações Oficiais do Módulo

| Tecnologia / Provedor | Documentação Oficial | Seções Específicas Recomendadas para Esta Etapa |
| :--- | :--- | :--- |
| **OpenAI API** | [platform.openai.com/docs](https://platform.openai.com/docs/overview) | [Structured Outputs (JSON Schema)](https://platform.openai.com/docs/guides/structured-outputs), [Prompt Caching](https://platform.openai.com/docs/guides/prompt-caching), [Vision Guide](https://platform.openai.com/docs/guides/vision), [Audio & Whisper](https://platform.openai.com/docs/guides/speech-to-text) |
| **Anthropic Claude API** | [docs.anthropic.com](https://docs.anthropic.com/en/api/getting-started) | [Prompt Chaining](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/chain-prompts), [Prompt Caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching), [Vision & PDF Support](https://docs.anthropic.com/en/docs/build-with-claude/vision) |
| **Google Gemini API** | [ai.google.dev/gemini-api/docs](https://ai.google.dev/gemini-api/docs) | [Context Caching](https://ai.google.dev/gemini-api/docs/caching), [Structured Outputs](https://ai.google.dev/gemini-api/docs/structured-output), [Document Understanding (PDF/OCR)](https://ai.google.dev/gemini-api/docs/document-processing), [Video & Audio Understanding](https://ai.google.dev/gemini-api/docs/video-understanding) |
| **Hugging Face Inference** | [huggingface.co/docs/api-inference](https://huggingface.co/docs/api-inference/index) | [Inference Providers & Serverless API](https://huggingface.co/docs/inference-providers/index), [Hugging Face.js SDK (`@huggingface/inference`)](https://huggingface.co/docs/huggingface.js/inference/README) |
| **LangChain.js** | [js.langchain.com/docs](https://js.langchain.com/docs/introduction/) | [LCEL (LangChain Expression Language)](https://js.langchain.com/docs/concepts/lcel/), [RAG Tutorials](https://js.langchain.com/docs/tutorials/rag/), [Fallbacks & Retries](https://js.langchain.com/docs/how_to/fallbacks/) |
| **LangSmith / Langfuse (Observabilidade)** | [docs.smith.langchain.com](https://docs.smith.langchain.com/) / [langfuse.com/docs](https://langfuse.com/docs) | [Tracing LLM Calls](https://docs.smith.langchain.com/observability), [Token & Cost Tracking](https://langfuse.com/docs/model-usage-and-cost) |

---

## Estrutura de Conteúdo por Sessão (Etapas da Disciplina)

---

### Sessão 2.1: Panorama do Mercado de IA como Serviço (AIaaS)
* **Posição na Etapa:** Unidade 1 – Visão estratégica de produto e arquitetura de valor.
* **Conteúdo Programático:**
  1. **O Fenômeno dos "ChatGPT Wrappers" Multimilionários:**
     * Análise técnica e de produto de empresas reais (ex.: Cursor, Perplexity, Jasper, Harvey, Glean) que construíram avaliações de centenas de milhões de dólares sobre APIs de modelos fundacionais.
     * Por que um "wrapper raso" morre na próxima atualização da OpenAI/Google e o que constitui uma camada de engenharia defensável (*moat*).
  2. **Onde Estão as Oportunidades Reais para Devs e Negócios:**
     * Domínio do contexto proprietário (dados internos, integrações profundas via API/MCP).
     * UX específica de domínio (fluxos que eliminam o chat em branco em favor de ações invisíveis).
     * Orquestração multi-modelo, confiabilidade, baixa latência e conformidade.
* **Referência Técnica da Sessão:**
  * [Sequoia Capital – Generative AI's Act Two](https://www.sequoiacap.com/article/generative-ai-act-two/) – *Análise de retenção e arquitetura de valor em aplicações de IA*.

---

### Sessão 2.2: Principais Provedores de Modelos de IA e Comparativo de APIs
* **Posição na Etapa:** Unidade 1 – Domínio dos SDKs e ecossistemas de API.
* **Conteúdo Programático:**
  1. **Arquitetura e Diferenças de APIs dos 4 Grandes Ecossistemas:**
     * **OpenAI (`openai` npm):** Responses API & Chat Completions, modelos de raciocínio (`o1`/`o3-mini`) vs. modelos multimodais rápidos (`gpt-4o`, `gpt-4o-mini`), *Batch API* (50% de desconto assíncrono) e *Realtime API* (WebSockets/WebRTC).
     * **Anthropic (`@anthropic-ai/sdk`):** Messages API, excelência em codificação e escrita complexa (`Claude 3.7 Sonnet`), *Extended Thinking* (orçamento configurável de tokens de raciocínio) e controle granular de cache.
     * **Google Gemini (`@google/genai`):** Janela de contexto massiva ($1\text{M}$ a $2\text{M}$ tokens), multimodalidade nativa de fábrica (vídeo, áudio, PDF e código no mesmo prompt) e *Grounding with Google Search*.
     * **Hugging Face (`@huggingface/inference`):** Acesso unificado a milhares de modelos especializados (embeddings, classificação, OCR, TTS, LLMs abertos) via *Serverless Inference API* ou *Dedicated Endpoints*.
  2. **Matriz de Seleção:** Qual provedor e modelo escolher para cada requisito de latência, janela de contexto, raciocínio lógico e orçamento.
* **Documentações Oficiais e Seções Específicas:**
  * [OpenAI Models Overview](https://platform.openai.com/docs/models) – *Comparativo de contexto, preços e capacidades*.
  * [Anthropic Models Overview](https://docs.anthropic.com/en/docs/about-claude/models/all-models) – *Tabela comparativa Claude Sonnet, Haiku e Opus*.
  * [Google Gemini Models](https://ai.google.dev/gemini-api/docs/models) – *Especificações Gemini 2.5 Pro e Flash*.
  * [Hugging Face JS Inference SDK](https://huggingface.co/docs/huggingface.js/inference/README).

---

### Sessão 2.3: Engenharia de Prompts Avançada em Código
* **Posição na Etapa:** Unidade 2 – Padrões programáticos de prompt engineering.
* **Conteúdo Programático:**
  1. **Prompt Templates e Parametrização:**
     * Desacoplando prompts do código-fonte: templates tipados, validação de variáveis de entrada, versionamento de prompts e prevenção contra *Prompt Injection* na interpolação de strings.
  2. **Prompt Chaining (Encadeamento de Prompts):**
     * Por que dividir um mega-prompt complexo em uma cadeia sequencial ou paralela de prompts menores aumenta drasticamente a acurácia e reduz a latência.
     * Padrões de encadeamento: $\text{Extração} \rightarrow \text{Transformação} \rightarrow \text{Validação/Crítica} \rightarrow \text{Formatação Final}$.
  3. **Estratégias de Mitigação de Alucinações e Precisão Estrita:**
     * Uso de **Structured Outputs** com validação estrita de schema (Zod + JSON Schema) garantindo 100% de conformidade tipada na resposta.
     * Técnicas de *Grounding* (forçar o modelo a extrair citações literais antes de responder) e *Self-Consistency* (verificação cruzada).
* **Documentações Oficiais e Seções Específicas:**
  * [Anthropic – Chain Complex Prompts](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/chain-prompts) – *Seções: Why chain prompts e Example workflows*.
  * [OpenAI – Structured Outputs Guide](https://platform.openai.com/docs/guides/structured-outputs) – *Seção: Using Zod with the JavaScript SDK (`zodResponseFormat`)*.
  * [Anthropic – Reduce Hallucinations](https://docs.anthropic.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-hallucinations).

---

### Sessão 2.4: Boas Práticas de Consistência e Custo-Eficiência
* **Posição na Etapa:** Unidade 3 – Engenharia financeira e determinismo em chamadas de API.
* **Conteúdo Programático:**
  1. **Desenhando Chamadas de API Pensando em Custo (Tokenomics):**
     * Como tokens de saída (*output tokens*) custam de $3\times$ a $5\times$ mais que tokens de entrada: técnicas para respostas concisas e schemas enxutos.
     * Uso de *Batch APIs* para cargas não-síncronas (processamento noturno, catalogação, relatórios) com redução de $50\%$ no custo.
  2. **Técnicas de Cache e Reuso de Contexto:**
     * **Prompt Caching Nativo (OpenAI, Anthropic, Gemini):** Como estruturar o prefixo estático do prompt (instruções de sistema, exemplos few-shot, documentos base) para obter até $75\%\text{–}90\%$ de desconto nos tokens lidos do cache e redução drástica no *Time to First Token (TTFT)*.
     * **Application-Level Caching:** Cache exato (hash SHA-256 do payload no Redis) e cache semântico.
  3. **Tornando o Comportamento dos Modelos Previsível:**
     * Controle de hiperparâmetros de amostragem: `temperature` ($0.0$ para tarefas analíticas/extração), `top_p`, `seed` de reprodutibilidade, `max_tokens` e `stop_sequences`.
* **Documentações Oficiais e Seções Específicas:**
  * [OpenAI Prompt Caching Guide](https://platform.openai.com/docs/guides/prompt-caching) – *Seção: Structuring prompts for optimal cache hits*.
  * [Anthropic Prompt Caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching) – *Seção: `cache_control: {"type": "ephemeral"}` placement*.
  * [Google Gemini Context Caching](https://ai.google.dev/gemini-api/docs/caching).

---

### Sessão 2.5: RAG Avançado na Prática (Orquestração, Resiliência e Observabilidade)
* **Posição na Etapa:** Unidade 3 – Evoluindo do RAG básico para pipelines resilientes de produção.
* **Conteúdo Programático:**
  1. **Orquestração de Fluxos com LangChain.js e Pipes:**
     * Composição declarativa de fluxos de recuperação, *Query Rewriting* (reescrita da pergunta do usuário para melhorar a busca), *Multi-Query Retrieval* e *Reranking* dos documentos recuperados.
  2. **Gerenciamento de Erros, Timeouts e Re-tentativas:**
     * Tratamento resiliente de erros `429 Too Many Requests` e `503 Overloaded`: implementação de *Exponential Backoff with Jitter*.
     * *Circuit Breakers* e *Fallback Chains* (ex.: se `gpt-4o` falhar ou exceder $4\text{s}$ de timeout, redirecionar transparentemente para `claude-3-7-sonnet` ou `gemini-2.5-flash`).
  3. **Logging, Observabilidade e Depuração em Apps de IA:**
     * Por que `console.log` não basta para depurar sistemas probabilísticos.
     * Instrumentação de traces completos (inputs, chunks recuperados pelo RAG, latência de cada etapa, contagem de tokens e custo em dólares por requisição) usando **LangSmith**, **Langfuse** ou **OpenTelemetry**.
* **Documentações Oficiais e Seções Específicas:**
  * [LangChain.js – How to Add Fallbacks to a Runnable](https://js.langchain.com/docs/how_to/fallbacks/) – *Seção: Fallback for LLM API errors*.
  * [LangSmith Observability Quickstart (JS/TS)](https://docs.smith.langchain.com/observability/how_to_guides/trace_with_langchain).
  * [OpenAI – Rate Limits & Error Mitigation](https://platform.openai.com/docs/guides/rate-limits) – *Seção: Retrying with exponential backoff*.

---

### Sessão 2.6: Mão na Massa – Integrando IA a um Back-End Existente
* **Posição na Etapa:** Unidade 4 (Projeto Prático 1 do Módulo) – Engenharia de software aplicada no servidor.
* **Conteúdo Programático:**
  1. **Arquitetura da Integração Back-End (Node.js / TypeScript):**
     * Isolamento da camada de IA através do padrão *Adapter / Gateway* (evitando acoplar os controllers HTTP diretamente ao SDK da OpenAI).
     * Streaming de respostas em tempo real para o cliente via **Server-Sent Events (SSE)**.
  2. **Autenticação, Segurança, Versionamento e Testes:**
     * Gestão segura de chaves de API, autenticação JWT/API Key na rota, *rate limiting* por usuário autenticado e validação de payload.
     * Versionamento de prompts e configurações de modelo junto ao código.
     * **Testes Automatizados para IA:** Testes unitários determinísticos (com *mocks/fixtures* da resposta da API) separados de testes de integração/avaliação (*evals*).
* **Documentações Oficiais e Seções Específicas:**
  * [OpenAI Node.js SDK Official Repository](https://github.com/openai/openai-node) – *Seções: Streaming responses, TypeScript definitions, Retries e Timeouts*.
  * [MDN – Using Server-Sent Events (SSE)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events).

---

### Sessão 2.7: Modelos Multimodais (Texto, Imagem, Áudio e Vídeo)
* **Posição na Etapa:** Unidade 5 – Expandindo aplicações além do texto.
* **Conteúdo Programático:**
  1. **Arquitetura e Critérios de Uso de Modelos Multimodais:**
     * Modelos nativamente multimodais (*early-fusion*, como Gemini 2.5 e GPT-4o) vs. pipelines compostos (*stitching*: Whisper STT $\rightarrow$ LLM $\rightarrow$ TTS).
  2. **Domínio das APIs Multimodais:**
     * **Visão (OpenAI Vision, Claude Vision, Gemini Vision):** Envio de imagens via URL ou Base64, controle de resolução/custo de tokens de imagem (`detail: "low" | "high"`), detecção de coordenadas (*bounding boxes*) e leitura de gráficos.
     * **Áudio (OpenAI Whisper, GPT-4o Audio, Gemini Audio):** Transcrição (*Speech-to-Text*) com *timestamps* por palavra, tradução direta, diarização e síntese de voz natural (*Text-to-Speech* com baixa latência).
     * **Vídeo (Gemini Multimodal):** Processamento nativo de arquivos de vídeo longos (frames + trilha de áudio sincronizados) para busca de momentos exatos e sumarização temporal.
* **Documentações Oficiais e Seções Específicas:**
  * [OpenAI Vision Guide](https://platform.openai.com/docs/guides/vision) – *Seção: Calculating costs & managing image detail*.
  * [OpenAI Audio & Speech-to-Text Guide](https://platform.openai.com/docs/guides/speech-to-text) – *Seção: Timestamps & Prompting Whisper*.
  * [Google Gemini Video Understanding Guide](https://ai.google.dev/gemini-api/docs/video-understanding) – *Seção: Referencing timestamps in the video*.

---

### Sessão 2.8: Aplicações Práticas Multimodais (OCR Inteligente, Análise de Mídia e Bots)
* **Posição na Etapa:** Unidade 5 (Projeto Prático 2 do Módulo) – Construção de 3 soluções reais de mercado.
* **Conteúdo Programático:**
  1. **Lab 1 – Construindo um OCR Inteligente de Documentos:**
     * Superando o OCR tradicional baseado em regex/coordenadas fixas: extração semântica de notas fiscais, recibos, CNH/RG, tabelas complexas e contratos em PDF diretamente para um schema JSON validado via Zod.
     * Tratamento de documentos multi-página, páginas rotacionadas ou fotografadas com celular.
  2. **Lab 2 – Pipeline de Análise de Mídia (Imagem e Vídeo):**
     * Extração automatizada de metadados, catalogação de produtos por foto, moderação de conteúdo visual e geração de capítulos/insights a partir de gravações de vídeo.
  3. **Lab 3 – Bot Multimodal Completo:**
     * Construção de um assistente que recebe mensagens de texto, notas de voz (áudio), fotos e documentos, unifica o contexto da conversa e responde em texto ou voz.
* **Documentações Oficiais e Seções Específicas:**
  * [Google Gemini Document Processing (PDF & Vision OCR)](https://ai.google.dev/gemini-api/docs/document-processing) – *Seção: Structured data extraction from PDFs and tables*.
  * [Anthropic Claude – PDF Support](https://docs.anthropic.com/en/docs/build-with-claude/pdf-support) – *Análise visual e textual combinada de páginas PDF*.
