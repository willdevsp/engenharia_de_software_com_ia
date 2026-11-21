## 1. Preparação da Estrutura e Pré-Requisito Multi-Módulo

- [x] 1.1 Verificar que a change `plataforma-multimodulo` está aplicada e criar a árvore de diretórios `content/modulo-02/chapters`, `content/modulo-02/assets` e `content/modulo-02/quizzes`

## 2. Geração de Ilustrações Colorsoft-Friendly (9 Assets PNG)

- [x] 2.1 Gerar via `image-generator` a capa `content/modulo-02/assets/cover-modulo-02.png` e os 4 diagramas da primeira metade (`cap-01-aiaas-moat-architecture.png` a `cap-04-tokenomics-caching-hyperparams.png`) em fundo claro `#FFFFFF`/`#FAF8F5` de alto contraste; verificar existência física, tamanho não vazio e legibilidade E-Ink
- [x] 2.2 Gerar via `image-generator` os 4 diagramas da segunda metade (`cap-05-rag-avancado-resiliencia-tracing.png` a `cap-08-labs-ocr-midia-bot-multimodal.png`) no mesmo padrão Colorsoft-friendly; verificar existência física e legibilidade dos 9 PNGs em `content/modulo-02/assets/`

## 3. Curadoria de Vídeos do YouTube (PT-BR Primeiro)

- [x] 3.1 Pesquisar e mapear vídeos públicos e incorporáveis no YouTube (prioridade absoluta `pt-BR`, com fallback `language: "en"` documentado apenas onde inexistir equivalente em português) para todas as 8 sessões (`2.1` a `2.8`), verificando títulos e canais exatos via `oembed` antes de preencher os frontmatters

## 4. Autoria dos Capítulos em Estilo Livro Técnico (Sessões 2.1 a 2.8)

- [x] 4.1 Escrever os capítulos da Unidade 1 (`cap-01-panorama-mercado-aiaas.md` e `cap-02-provedores-modelos-e-apis.md`) cobrindo mercado AIaaS/moats e comparativo profundo dos 4 ecossistemas (`openai`, `@anthropic-ai/sdk`, `@google/genai`, `@huggingface/inference`) com frontmatter completo, imagens, LaTeX válido e `media.audio_notebooklm: null`; validar com `node scripts/validate-content.mjs`
- [x] 4.2 Escrever os capítulos das Unidades 2 e 3 (`cap-03-engenharia-prompts-em-codigo.md`, `cap-04-consistencia-e-custo-eficiencia.md` e `cap-05-rag-avancado-resiliencia-observabilidade.md`) cobrindo templates tipados, chaining, Structured Outputs/Zod, tokenomics/Batch/Prompt Caching, LCEL, query rewrite/reranking, backoff+jitter, circuit breakers/fallbacks e tracing (LangSmith/Langfuse/OTel) sem repetir `1.6`/`1.9`; validar com `node scripts/validate-content.mjs`
- [x] 4.3 Escrever os capítulos das Unidades 4 e 5 (`cap-06-integrando-ia-backend-producao.md`, `cap-07-modelos-multimodais-apis.md` e `cap-08-aplicacoes-praticas-multimodais.md`) cobrindo Gateway/Adapter + SSE + segurança + evals, early-fusion vs stitching multimodal (Visão, Áudio, Vídeo) e os 3 labs práticos (OCR PDF->Zod, análise de mídia e bot multimodal); validar com `node scripts/validate-content.mjs`

## 5. Bancos de Provas Diagnósticas (25 a 30 Questões por Sessão)

- [x] 5.1 Criar `content/modulo-02/quizzes/quiz-s01.json` (25 Qs), `quiz-s02.json` (30 Qs), `quiz-s03.json` (28 Qs) e `quiz-s04.json` (25 Qs) com equilíbrio entre `conceptual`, `architecture` e `code-practice`, cobrindo 100% dos `subtopics` e âncoras `chapterAnchor`; validar com `node scripts/validate-content.mjs`
- [x] 5.2 Criar `content/modulo-02/quizzes/quiz-s05.json` (30 Qs), `quiz-s06.json` (28 Qs), `quiz-s07.json` (25 Qs) e `quiz-s08.json` (30 Qs) com explicações comentadas e refutação dos distratores + links oficiais; validar com `node scripts/validate-content.mjs` garantindo zero erros de schema, LaTeX e âncoras

## 6. Auditoria Dupla Obrigatória (`course-content-reviewer` + Scripts)

- [x] 6.1 Executar `node .agents/skills/course-module-builder/scripts/verify-youtube-videos.mjs content/modulo-02/chapters` e `node scripts/validate-content.mjs`, confirmando status `VALID` e zero erros de incorporação/URL nos vídeos
- [x] 6.2 Aplicar o protocolo completo das 4 dimensões de `.agents/skills/course-content-reviewer/SKILL.md` sobre os 8 capítulos, 9 imagens e 8 provas do Módulo 02, corrigindo qualquer apontamento até atingir `STATUS: APPROVED` integral

## 7. Compilação, Kindle Colorsoft EPUB e APK Único Android

- [x] 7.1 Executar `node scripts/compile-content.mjs`, `npx.cmd tsc --noEmit`, `npm.cmd run build` e `npm.cmd run build:kindle`, verificando a geração de `public/course-assets/modulo-02/`, `dist-kindle/modulo-02-kindle-colorsoft.epub` e `public/downloads/modulo-02-kindle-colorsoft.epub` sem vazamento de tokens/LaTeX
- [x] 7.2 Sincronizar Capacitor e recompilar o APK único (`npx.cmd cap sync android` + `.\gradlew.bat assembleDebug`), atualizando `dist-android/engenharia-software-ia.apk`, e inspecionar na aplicação Web compilada a navegação entre Página Inicial, dropdown e Módulo 02 (confirmando painéis de Áudio e Vídeo fechados por padrão)
