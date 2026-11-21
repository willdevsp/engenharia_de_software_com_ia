## Why

Com a infraestrutura multi-módulo definida em `plataforma-multimodulo`, o curso precisa agora do conteúdo completo e auditado do **Módulo 02: APIs de IA Generativa e Prompt Engineering** (Etapa 2 de 12, 25 horas sugeridas, mapeado em `Docs/modulo-02-apis-ia-generativa-e-prompt-engineering.md`). A entrega amplia a plataforma Web, o APK Android único e a biblioteca Kindle Colorsoft (`.EPUB` independente do Módulo 02) seguindo integralmente as skills `course-module-builder` e `course-content-reviewer`.

## What Changes

- **8 Capítulos em Estilo Livro Técnico (`content/modulo-02/chapters/cap-01-*.md` a `cap-08-*.md`):**
  - Cobertura aprofundada das Sessões `2.1` a `2.8` explicando o **por quê** (problema real de engenharia), o **como funciona por dentro** (arquitetura, fluxos de dados e matemática LaTeX válida para KaTeX/EPUB) e o **como aplicar na prática** (código TypeScript/Node.js alinhado aos SDKs oficiais atuais: `openai`, `@anthropic-ai/sdk`, `@google/genai`, `@huggingface/inference`, `@langchain/core`, `zod`, LangSmith/Langfuse/OpenTelemetry).
  - Evolução sem redundância das bases do Módulo 01 (avançando da Sessão `1.6` para prompt engineering programático na `2.3`, e da `1.9` para RAG resiliente e observável em produção na `2.5`).
- **9 Ilustrações Rasterizadas Colorsoft (`content/modulo-02/assets/`):**
  - Criação da capa `cover-modulo-02.png` e de 8 diagramas técnicos em PNG de alto contraste com fundo claro/papel (`#FFFFFF` / `#FAF8F5`) legíveis em 150/300 PPI no Kindle Colorsoft (zero dependência de Mermaid JS).
- **Curadoria e Validação Programática de Vídeos do YouTube (PT-BR Primeiro):**
  - Seleção de vídeos técnicos em português (`pt-BR`) para as 8 sessões (com fallback controlado `language: "en"` apenas quando inexistente em português, registrado explicitamente), 100% aprovados pelo script `verify-youtube-videos.mjs`.
- **8 Bancos de Provas (`content/modulo-02/quizzes/quiz-s01.json` a `quiz-s08.json`):**
  - Elaboração de **25 a 30 questões por sessão** (calibradas à densidade de cada capítulo, totalizando ~218 questões novas) distribuídas equilibradamente entre `conceptual`, `architecture` e `code-practice`, cobrindo 100% dos `subtopics` com `chapterAnchor` válido, `officialDocUrl` e gabarito comentado justificando a resposta correta e refutando os distratores.
- **Auditoria Dupla & Publicação Multiplataforma:**
  - Auditoria nas 4 dimensões via `course-content-reviewer`, validação via `node scripts/validate-content.mjs` e `verify-youtube-videos.mjs`, compilação Web, geração do livro `modulo-02-kindle-colorsoft.epub` e recompilação do APK único `dist-android/engenharia-software-ia.apk`.

## Capabilities

### New Capabilities
- `module-02-content`: Produção completa, auditada e multiplataforma do Módulo 02 (8 capítulos livro técnico, 9 imagens PNG Colorsoft, curadoria de vídeos YouTube PT-BR, 8 provas de 25–30 questões cada, EPUB independente do Módulo 02 e integração no pacote Web/APK único).

### Modified Capabilities
<!-- Nenhuma capability existente é alterada; consome a arquitetura multi-módulo estabelecida pela change `plataforma-multimodulo`. -->

## Impact

- **Novo Conteúdo-Fonte:** `content/modulo-02/chapters/`, `content/modulo-02/assets/` e `content/modulo-02/quizzes/`.
- **Dependência de Pré-Requisito:** A aplicação desta change assume a conclusão prévia da change `plataforma-multimodulo` (compilador, validador e gerador EPUB multi-módulo).
- **Artefatos Compilados e Distribuição:** `public/course-assets/modulo-02/`, `src/generated/courseData.ts`, `dist-kindle/modulo-02-kindle-colorsoft.epub`, `public/downloads/modulo-02-kindle-colorsoft.epub`, `dist/` e `dist-android/engenharia-software-ia.apk`.
