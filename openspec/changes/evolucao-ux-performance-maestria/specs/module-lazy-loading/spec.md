## Purpose

Divide a compilação de conteúdo e o empacotamento da aplicação entre um catálogo leve carregado na abertura e chunks dinâmicos por módulo sob demanda, garantindo abertura rápida na Tela Inicial e escalabilidade limpa até todos os 12 módulos.

## ADDED Requirements

### Requirement: Lightweight eager catalog with per-module dynamic content chunks
The content compiler SHALL generate a lightweight eager catalog module containing course module descriptors, lightweight session summaries, and module asset manifests without full Markdown chapter bodies or full question pools, alongside an independent dynamically importable module bundle for each authored module.

#### Scenario: Opening Course Home with lightweight initial payload
- **WHEN** the user opens the application on the Course Home view
- **THEN** the initial JavaScript execution MUST load only the core application and lightweight catalog metadata to render all 12 module cards, lock states, progress counters, and mastery metrics without eagerly downloading or parsing full chapter Markdown or quiz banks from every module

#### Scenario: Loading full module data on demand when opening a module
- **WHEN** the learner opens an unlocked module from the Course Home page or via the header module switcher
- **THEN** the system MUST dynamically load that specific module's compiled chunk (`chapters` and `quizzes`), render a clean loading indicator while resolving if needed, and keep already-loaded modules cached in memory for instant subsequent navigation

#### Scenario: Loading module data on demand for Home EPUB export
- **WHEN** the learner triggers Kindle `.EPUB` export for an unlocked module directly from the Course Home page before opening that module
- **THEN** the system MUST automatically load that module's compiled chunk in the background if not yet cached and proceed seamlessly with EPUB generation

### Requirement: Vendor and content chunk separation in production builds
The production bundler configuration SHALL separate heavy third-party libraries and per-module content payloads into distinct build chunks that remain 100% functional offline inside the Android WebView.

#### Scenario: Inspecting Vite production build output across multiple authored modules
- **WHEN** the production build completes with multiple authored modules (`modulo-01`, `modulo-02`, and future modules)
- **THEN** the build output MUST emit separate chunk files per authored module and avoid bundling all modules' full chapter bodies and quiz pools into the main entry chunk
