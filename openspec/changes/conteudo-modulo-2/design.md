## Context

Ver `proposal.md` para a motivação geral. Esta change executa a produção autoral e a publicação do **Módulo 02: APIs de IA Generativa e Prompt Engineering**, seguindo o mapa curricular oficial em `Docs/modulo-02-apis-ia-generativa-e-prompt-engineering.md`, o workflow de 7 etapas de `.agents/skills/course-module-builder/SKILL.md` (com as armadilhas de `references/templates-and-pitfalls.md`) e a auditoria em 4 dimensões de `.agents/skills/course-content-reviewer/SKILL.md`.

**Pré-requisito de ordem:** A infraestrutura multi-módulo definida na change `plataforma-multimodulo` deve estar aplicada antes da compilação e empacotamento final desta change, para que `content/modulo-02/` seja compilado, validado, exposto na Página Inicial/dropdown e exportado para `modulo-02-kindle-colorsoft.epub` sem alterações adicionais em código-fonte da aplicação.

## Goals / Non-Goals

**Goals:**
- Entregar 8 capítulos aprofundados estilo livro técnico (`2.1` a `2.8`) com rigor frente às documentações oficiais da OpenAI, Anthropic, Google Gemini, Hugging Face, LangChain.js e LangSmith/Langfuse.
- Produzir 9 imagens PNG Colorsoft-friendly (`cover-modulo-02.png` + 8 diagramas arquiteturais).
- Curar e validar programaticamente vídeos complementares do YouTube (PT-BR primeiro).
- Criar 8 bancos de provas com 25 a 30 questões por sessão (calibradas à densidade de cada capítulo) cobrindo 100% dos subtópicos e âncoras.
- Aprovar tudo em auditoria dupla (`course-content-reviewer` + scripts) e gerar Web, `modulo-02-kindle-colorsoft.epub` e APK único atualizado (`dist-android/engenharia-software-ia.apk`).

**Non-Goals:**
- Alterar código React/TypeScript ou scripts de build da plataforma (responsabilidade exclusiva da change `plataforma-multimodulo`).
- Criar ou hospedar arquivos de áudio `.m4a`/`.mp3` no repositório ou no `.EPUB` (todos os capítulos mantêm `media.audio_notebooklm: null` para gerenciamento via nuvem Archive.org + Firestore com `moduleId: 2`).

## Decisions

### 1. Mapa de Arquivos, Capítulos e Orçamento de Questões (25–30 por Sessão)
- **Decisão:** Adotar nomenclatura padronizada alinhada ao Módulo 01:
  - `2.1` $\rightarrow$ `cap-01-panorama-mercado-aiaas.md`, `cap-01-aiaas-moat-architecture.png`, `quiz-s01.json` (**25 questões**)
  - `2.2` $\rightarrow$ `cap-02-provedores-modelos-e-apis.md`, `cap-02-providers-api-matrix.png`, `quiz-s02.json` (**30 questões** — cobre 4 ecossistemas de APIs e SDKs distintos)
  - `2.3` $\rightarrow$ `cap-03-engenharia-prompts-em-codigo.md`, `cap-03-prompt-chaining-structured-outputs.png`, `quiz-s03.json` (**28 questões** — templates, chaining, Zod/JSON Schema, grounding e mitigação de injection/alucinação)
  - `2.4` $\rightarrow$ `cap-04-consistencia-e-custo-eficiencia.md`, `cap-04-tokenomics-caching-hyperparams.png`, `quiz-s04.json` (**25 questões**)
  - `2.5` $\rightarrow$ `cap-05-rag-avancado-resiliencia-observabilidade.md`, `cap-05-rag-avancado-resiliencia-tracing.png`, `quiz-s05.json` (**30 questões** — LCEL/pipes, query rewrite/multi-query/reranking, backoff+jitter, circuit breaker, fallbacks e LangSmith/Langfuse/OTel)
  - `2.6` $\rightarrow$ `cap-06-integrando-ia-backend-producao.md`, `cap-06-backend-gateway-sse-evals.png`, `quiz-s06.json` (**28 questões** — Adapter/Gateway, SSE streaming, segurança/rate-limit, versionamento de prompts e testes determinísticos vs evals)
  - `2.7` $\rightarrow$ `cap-07-modelos-multimodais-apis.md`, `cap-07-multimodal-early-fusion-vs-stitching.png`, `quiz-s07.json` (**25 questões**)
  - `2.8` $\rightarrow$ `cap-08-aplicacoes-praticas-multimodais.md`, `cap-08-labs-ocr-midia-bot-multimodal.png`, `quiz-s08.json` (**30 questões** — 3 labs completos: OCR PDF->Zod, pipeline mídia/vídeo e bot multimodal)
  - Capa: `cover-modulo-02.png`
- **Alternativa considerada:** Fixar exatamente 25 questões em todas as 8 sessões. *Rejeitado* conforme alinhamento com o usuário ("entre 25 a 30, crie mais se ver q tem necessidade"), permitindo aprofundamento extra nas sessões de maior superfície de API (`2.2`, `2.3`, `2.5`, `2.6`, `2.8`) respeitando o teto de 30.

### 2. Fronteira Editorial com Módulo 01 e Alinhamento aos SDKs Oficiais Atuais
- **Decisão:**
  - **Zero redundância com Módulo 01:** A Sessão `2.3` assume que o aluno já domina XML tags, Zero-Shot/Few-Shot/CoT da `1.6` e foca exclusivamente em **engenharia programática de prompts em código** (factories tipadas de templates, validação com Zod, encadeamento sequencial/paralelo, *Structured Outputs* via `zodResponseFormat`/JSON Schema, *Grounding* e *Self-Consistency*). A Sessão `2.5` parte do RAG básico `pgvector` da `1.9` direto para **orquestração avançada, recuperação híbrida/reranking, tolerância a falhas e observabilidade**.
  - **SDKs atuais (sem bibliotecas legadas):** Exemplos TypeScript/Node.js usarão `openai` (Responses API, Chat Completions, `zodResponseFormat`, Batch, Vision, Whisper/Audio), `@anthropic-ai/sdk` (Messages API, Extended Thinking, `cache_control: { type: "ephemeral" }`, PDF support), `@google/genai` (SDK unificado atual em vez do antigo `@google/generative-ai`, Context Caching, Structured Output, Document/Video Understanding), `@huggingface/inference`, `@langchain/core` (LCEL & `withFallbacks`) e `zod`, sempre verificados contra os links oficiais do `Docs/modulo-02-*.md`.

### 3. Padrão Visual Kindle Colorsoft para os 9 Assets PNG
- **Decisão:** Gerar capa e os 8 diagramas com `image-generator` usando especificações explícitas para tela E-Ink Kaleido 3: fundo branco puro ou papel suave (`#FFFFFF` / `#FAF8F5`), zero blocos escuros/dark mode pesados, traços limpos em azul-marinho/índigo/teal/âmbar de alto contraste e rótulos em português com tipografia grande legível a 150/300 PPI.

### 4. Curadoria de Vídeos PT-BR e Validação Programática
- **Decisão:** Pesquisar vídeos reais e públicos no YouTube com foco em canais técnicos lusófonos para todas as 8 sessões. Somente adicionar fallback em inglês (com `language: "en"` obrigatório e justificativa documentada) se um tópico específico (ex.: técnicas recentes de Prompt Caching ou Context Caching de APIs específicas) não tiver cobertura técnica adequada em português. Tudo validado por `node .agents/skills/course-module-builder/scripts/verify-youtube-videos.mjs content/modulo-02/chapters`.

### 5. Higiene de LaTeX, Markdown e EPUB desde a Autoria
- **Decisão:** Seguir estritamente as lições registradas em `templates-and-pitfalls.md`:
  - Cifrões monetários em textos de Tokenomics (`2.1`, `2.4`, `2.7`) devem ser grafados como `US\$` ou fora de spans `$...$` para não colidirem com o parser KaTeX/EPUB.
  - Exemplos de prompts em Markdown que contenham ` ``` ` internos serão envolvidos em cercas externas de **4 crases** (```` ````markdown ````).
  - Toda fórmula matemática será validada por `node scripts/validate-content.mjs` e pela auto-auditoria XHTML do `scripts/build-epub.mjs`.

## Risks / Trade-offs

- **[Risk] Tópicos muito recentes (ex.: Prompt Caching da Anthropic/OpenAI, Responses API, Gemini Context Caching) terem poucos vídeos técnicos aprofundados em PT-BR** $\rightarrow$ *Mitigação:* Priorizar vídeos PT-BR sobre APIs de IA / Prompt Engineering / LangChain / Node.js Back-End / RAG e, apenas onde não houver equivalente PT-BR específico, incluir fallback oficial/técnico em inglês com `language: "en"` explícito e validado.
- **[Risk] Evolução rápida dos SDKs (`@google/genai`, OpenAI Responses API, LangChain.js v0.3+) gerar assinaturas desatualizadas** $\rightarrow$ *Mitigação:* Consultar/conferir as documentações oficiais listadas no mapa antes de escrever cada capítulo e validar cada snippet durante a auditoria do `course-content-reviewer`.
- **[Risk] Volume extenso (8 capítulos densos + ~218 questões + 9 imagens) elevar risco de erro de âncora ou sintaxe** $\rightarrow$ *Mitigação:* Produzir em 3 lotes (Unidade 1, Unidades 2–3, Unidades 4–5) executando `validate-content.mjs` ao final de cada lote antes da auditoria final.
