## Purpose

Define o conteúdo autoral completo, os padrões de qualidade editorial, os artefatos visuais e midiáticos, os bancos de avaliação e os entregáveis multiplataforma do **Módulo 02: APIs de IA Generativa e Prompt Engineering** (Sessões `2.1` a `2.8`).

## ADDED Requirements

### Requirement: Complete book-depth chapters covering Sessions 2.1 through 2.8
The repository SHALL include eight technical-book Markdown chapters (`content/modulo-02/chapters/cap-01-*.md` through `cap-08-*.md`) covering Sessions `2.1` through `2.8` of `Docs/modulo-02-apis-ia-generativa-e-prompt-engineering.md`, each containing valid YAML frontmatter (`id: "m02-s01"`..`"m02-s08"`, `module: 2`, `session: "2.1"`..`"2.8"`, `status: "reviewed"`, `subtopics`, `official_docs`, `media.audio_notebooklm: null`), deep architectural explanations, valid KaTeX/EPUB LaTeX formulas, and practical TypeScript/Node.js code aligned with current official provider SDKs without duplicating Module 01 introductory material.

#### Scenario: Authoring overlapping topics with clear Module 02 progression
- **WHEN** authoring Session `2.3` (Programmatic Prompt Engineering) and Session `2.5` (Advanced RAG, Resilience & Observability)
- **THEN** the chapters MUST build upon Sessions `1.6` and `1.9` rather than repeating them, focusing on typed prompt templates, prompt chaining, strict JSON Schema / Zod structured outputs, query rewriting, reranking, exponential backoff with jitter, circuit breakers, fallback chains, and tracing/token cost observability

#### Scenario: Validating Markdown code blocks, currency spans, and LaTeX syntax
- **WHEN** the content validator parses all eight Module 02 chapters
- **THEN** every inline and display LaTeX expression MUST compile cleanly in KaTeX without subscript corruption or unescaped currency `$` collisions, and any fenced code block containing nested triple backticks MUST be wrapped in four-backtick fences

### Requirement: Colorsoft-friendly rasterized illustrations for cover and every session
Module 02 SHALL provide nine high-contrast, light-background (`#FFFFFF` or `#FAF8F5`) PNG assets inside `content/modulo-02/assets/`—comprising `cover-modulo-02.png` and one architectural diagram per chapter (`2.1` through `2.8`)—embedded via standard Markdown image links without relying on runtime Mermaid JavaScript rendering.

#### Scenario: Verifying chapter diagrams for Kindle Colorsoft E-Ink readiness
- **WHEN** inspecting and validating the assets referenced by `content/modulo-02/chapters/*.md`
- **THEN** every chapter MUST reference at least one existing, non-empty PNG diagram on disk formatted with light background, crisp lines, and legible typography at 150/300 PPI

### Requirement: Portuguese-first YouTube video curation with programmatic verification
Each Module 02 chapter frontmatter SHALL declare curated YouTube companion videos in `media.video_url` and `media.videos`, prioritizing Portuguese (`pt-BR`) technical content and restricting English (`language: "en"`) entries strictly to topics lacking adequate Portuguese equivalents, with 100% passing verification.

#### Scenario: Running the YouTube verification script on Module 02 chapters
- **WHEN** `verify-youtube-videos.mjs` checks `content/modulo-02/chapters`
- **THEN** every declared video MUST return HTTP 200 from YouTube oEmbed, report `playabilityStatus === "OK"` and `playableInEmbed === true`, and include explicit `language: "en"` metadata only on documented fallback entries where no equivalent `pt-BR` technical video exists

### Requirement: Session mastery quiz banks of 25 to 30 diagnostic questions
Module 02 SHALL include eight JSON quiz banks (`content/modulo-02/quizzes/quiz-s01.json` through `quiz-s08.json`), each containing between 25 and 30 questions (`m02-sXX-qYY`) balanced across `conceptual`, `architecture`, and `code-practice` cognitive levels, covering 100% of that chapter's `subtopics` with valid `chapterAnchor` targets, official documentation links, and explanations justifying the correct answer and refuting all distractors.

#### Scenario: Tracing a missed Module 02 quiz question back to the chapter
- **WHEN** a learner answers a Module 02 question incorrectly or reviews a gap in the Dashboard
- **THEN** the question's `chapterAnchor` MUST resolve to an existing heading or anchor inside the corresponding Module 02 chapter, and its `officialDocUrl` MUST link to the mapped official documentation for that session

### Requirement: Dual audit approval and multiplatform delivery for Module 02
All Module 02 chapters and quiz banks SHALL achieve `STATUS: APPROVED` under the four dimensions of `course-content-reviewer` and zero validation errors before compiling into the Web bundle, generating the standalone `modulo-02-kindle-colorsoft.epub` book, and packaging the unified Android APK (`dist-android/engenharia-software-ia.apk`).

#### Scenario: Building Web, Kindle EPUB, and unified Android APK with Module 02 included
- **WHEN** content compilation, validation, Kindle EPUB generation, and Android Gradle debug build complete after Module 02 authoring
- **THEN** the Web app and unified Android APK MUST expose both Module 01 and Module 02 seamlessly, and `modulo-02-kindle-colorsoft.epub` MUST pass XHTML/LaTeX self-audit with all 8 chapters, 9 PNG images, and 8 commented exams without embedded audio files
